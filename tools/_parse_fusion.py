"""
Parse _raw_fusion.txt into fusionData.js

Format:
[MAIN]
<group_name>\t<prob>%\t<item>\t<grade>
<prob>%\t<item>\t<grade>
...
[PITY]
<group_name>\t<N회>\t<prob>%\t<item>\t<grade>
<prob>%\t<item>\t<grade>
...

Each MAIN group consumes 4 items of group's inputGrade.
inputGrade is parsed from group name "X 등급 합성" → "X".
"""
import re
import json
from pathlib import Path

HERE = Path(__file__).parent
RAW = HERE / "_raw_fusion.txt"
OUT = HERE / "fusionData.js"

PROB_RE = re.compile(r'(\d+\.\d+)%')
PITY_HEADER_RE = re.compile(r'^(.+?)\t(\d+)회\t')
GROUP_GRADE_RE = re.compile(r'^(.+?)\s*등급\s*합성$')

def parse_section(lines, is_pity):
    groups = []
    current = None
    for line in lines:
        line = line.rstrip()
        if not line:
            continue
        if is_pity:
            ph = PITY_HEADER_RE.match(line)
            if ph:
                gname = ph.group(1).strip()
                attempts = int(ph.group(2))
                m = re.search(r'(\d+\.\d+)%\s*(.+)', line[ph.end():])
                if not m:
                    raise ValueError(f"bad pity header: {line!r}")
                rest = m.group(2)
                parts = [p.strip() for p in rest.split('\t') if p.strip()]
                if len(parts) < 2:
                    raise ValueError(f"bad pity item: {line!r}")
                current = {"name": gname, "every": attempts, "results": []}
                groups.append(current)
                current["results"].append({
                    "probability": float(m.group(1)),
                    "name": parts[0],
                    "grade": parts[1],
                })
                continue

        m = PROB_RE.search(line)
        if not m:
            raise ValueError(f"no probability: {line!r}")
        pre = line[:m.start()].rstrip('\t ')
        rest = line[m.end():].lstrip('\t ')
        parts = [p.strip() for p in rest.split('\t') if p.strip()]
        if len(parts) < 2:
            raise ValueError(f"bad item line: {line!r}")
        prob = float(m.group(1))
        item_name = parts[0]
        grade = parts[1]

        if pre:
            gm = GROUP_GRADE_RE.match(pre.strip())
            input_grade = gm.group(1).strip() if gm else None
            current = {"name": pre.strip(), "inputGrade": input_grade, "inputCount": 4, "results": []}
            groups.append(current)

        current["results"].append({"probability": prob, "name": item_name, "grade": grade})

    return groups


raw_text = RAW.read_text(encoding="utf-8")
sections = {}
current_section = None
buf = []
for line in raw_text.splitlines():
    if line.strip() in ("[MAIN]", "[PITY]"):
        if current_section:
            sections[current_section] = buf
        current_section = line.strip().strip('[]')
        buf = []
    else:
        buf.append(line)
if current_section:
    sections[current_section] = buf

main_groups = parse_section(sections.get("MAIN", []), is_pity=False)
pity_groups = parse_section(sections.get("PITY", []), is_pity=True)

# Attach pity to main groups
pity_map = {p["name"]: p for p in pity_groups}
for g in main_groups:
    if g["name"] in pity_map:
        p = pity_map[g["name"]]
        g["pity"] = {"every": p["every"], "results": p["results"]}

# Verify sums
print(f"Main: {len(main_groups)} groups, Pity: {len(pity_groups)} groups\n")
for g in main_groups:
    total = sum(r["probability"] for r in g["results"])
    flag = "OK" if abs(total - 100.0) < 0.5 else "MISMATCH"
    pity_info = ""
    if "pity" in g:
        ptotal = sum(r["probability"] for r in g["pity"]["results"])
        pflag = "OK" if abs(ptotal - 100.0) < 0.5 else "MISMATCH"
        pity_info = f" | pity[{g['pity']['every']}회]={ptotal:.2f}% [{pflag}]"
    print(f"  [{flag}] {g['name']!s:18s} input={g['inputGrade']:4s}×{g['inputCount']} results={len(g['results']):3d} total={total:.2f}%{pity_info}")

# Emit JS
lines = [
    "// Auto-generated from _raw_fusion.txt by _parse_fusion.py",
    "// Each fusion group consumes inputCount items of inputGrade → 1 result from `results` (weighted random).",
    "// Groups with `pity`: every Nth attempt also yields 1 additional item from pity.results.",
    "",
    "export const fusions = [",
]
for g in main_groups:
    name_js = json.dumps(g["name"], ensure_ascii=False)
    ig_js = json.dumps(g["inputGrade"], ensure_ascii=False)
    lines.append("    {")
    lines.append(f"        name: {name_js},")
    lines.append(f"        inputGrade: {ig_js},")
    lines.append(f"        inputCount: {g['inputCount']},")
    lines.append(f"        results: [")
    for r in g["results"]:
        nm = json.dumps(r["name"], ensure_ascii=False)
        gr = json.dumps(r["grade"], ensure_ascii=False)
        lines.append(f"            {{ probability: {r['probability']}, name: {nm}, grade: {gr} }},")
    lines.append(f"        ],")
    if "pity" in g:
        lines.append(f"        pity: {{")
        lines.append(f"            every: {g['pity']['every']},")
        lines.append(f"            results: [")
        for r in g["pity"]["results"]:
            nm = json.dumps(r["name"], ensure_ascii=False)
            gr = json.dumps(r["grade"], ensure_ascii=False)
            lines.append(f"                {{ probability: {r['probability']}, name: {nm}, grade: {gr} }},")
        lines.append(f"            ],")
        lines.append(f"        }},")
    lines.append("    },")
lines.append("];")
lines.append("")

OUT.write_text("\n".join(lines), encoding="utf-8")
print(f"\nWrote {OUT}")
