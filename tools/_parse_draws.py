"""
Parse _raw_draws.txt into drawData.js
Format: lines are tab-separated. Each draw starts with: <draw_name>\t<prob>%\t<item>\t<grade>
Subsequent items: <prob>%\t<item>\t<grade>

pullCount inference:
- name starts with "레전드" → 10
- name contains "[N회]" → N
- otherwise → 6 (default)
"""
import re
import json
import sys
from pathlib import Path

def infer_pull_count(name):
    m = re.search(r'\[(\d+)회\]', name)
    if m:
        return int(m.group(1))
    if name.startswith('레전드'):
        return 10
    return 6

HERE = Path(__file__).parent
RAW = HERE / "_raw_draws.txt"
OUT = HERE.parent / "js" / "gacha" / "drawData.js"

PROB_RE = re.compile(r'(\d+\.\d+)%')

draws = []
current = None
errors = []

with RAW.open(encoding="utf-8") as f:
    for lineno, raw_line in enumerate(f, 1):
        line = raw_line.rstrip("\n")
        if not line.strip():
            continue

        m = PROB_RE.search(line)
        if not m:
            errors.append(f"L{lineno}: no probability found: {line!r}")
            continue

        pre = line[:m.start()].rstrip("\t ")
        after = line[m.end():].lstrip("\t ")
        prob = float(m.group(1))

        # If there's text before the probability, this is the start of a NEW draw
        if pre:
            current = {"name": pre, "pullCount": infer_pull_count(pre), "items": []}
            draws.append(current)

        if current is None:
            errors.append(f"L{lineno}: item without a draw: {line!r}")
            continue

        # Parse `<item>\t<grade>` from after
        parts = after.split("\t")
        parts = [p.strip() for p in parts if p.strip()]
        if len(parts) < 2:
            # fallback: split by whitespace, grade is the last token
            tokens = after.strip().rsplit(None, 1)
            if len(tokens) == 2:
                item_name, grade = tokens
            else:
                errors.append(f"L{lineno}: cannot parse item/grade: {line!r}")
                continue
        else:
            item_name = parts[0]
            grade = parts[1]

        current["items"].append({
            "probability": prob,
            "name": item_name.strip(),
            "grade": grade.strip(),
        })

# Verify sums
print(f"Parsed {len(draws)} draws")
for d in draws:
    total = sum(it["probability"] for it in d["items"])
    flag = "OK" if abs(total - 100.0) < 0.5 else "MISMATCH"
    print(f"  [{flag}] {d['name']!s:60s} pullCount={d['pullCount']:2d} items={len(d['items']):3d} total={total:.2f}%")

if errors:
    print("\nERRORS:", file=sys.stderr)
    for e in errors:
        print("  " + e, file=sys.stderr)
    sys.exit(1)

# Emit JS
lines = [
    "// Auto-generated from _raw_draws.txt by _parse_draws.py",
    "// Each item: { probability, name, grade } — order intentional.",
    "",
    "export const draws = [",
]
for d in draws:
    name_js = json.dumps(d["name"], ensure_ascii=False)
    lines.append(f"    {{")
    lines.append(f"        name: {name_js},")
    lines.append(f"        pullCount: {d['pullCount']},")
    lines.append(f"        items: [")
    for it in d["items"]:
        nm = json.dumps(it["name"], ensure_ascii=False)
        gr = json.dumps(it["grade"], ensure_ascii=False)
        lines.append(f"            {{ probability: {it['probability']}, name: {nm}, grade: {gr} }},")
    lines.append(f"        ],")
    lines.append(f"    }},")
lines.append("];")
lines.append("")

OUT.write_text("\n".join(lines), encoding="utf-8")
print(f"\nWrote {OUT}")
