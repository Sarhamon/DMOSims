"""
Parse report/source/*.txt + deck.csv into js/report/reportMeta.js and js/report/data/dNN.js

리포트 1개 = 디지몬 1마리, 그 안에 덱 37개 블록이 들어 있다.
덱 순서는 모든 리포트가 동일하므로 덱 목록은 reportMeta.js 에 한 번만 담고,
디지몬별 결과 37개는 data/dNN.js 로 쪼개 화면에서 그때그때 불러 쓴다.

파일명을 dNN 으로 두는 이유: 디지몬 이름에 콜론(라스트 에볼루션: 인연)이 들어가 파일명으로 못 쓴다.
"""
import csv
import json
import re
import sys
from pathlib import Path

HERE = Path(__file__).parent
SRC = HERE.parent / "report" / "source"
OUT_META = HERE.parent / "js" / "report" / "reportMeta.js"
OUT_DATA = HERE.parent / "js" / "report" / "data"

HEAD_RE = re.compile(r'^전투 (\d+)초 .*?스킬포인트 (\d+)점')
DECK_RE = re.compile(r'^\[덱 (\d+)/(\d+)\] (.+?) \((.+?)\)\s+배수 x([\d.]+), 공격력 \+(\d+)%')
SP_RE = re.compile(r'\[ 스킬포인트 투자 추천 \]\s+(\d+) / (\d+) 점 사용')
SKILL_RE = re.compile(r'^\s*(\d)스 (.+?)\s+Lv\.(\d+)\s+(\d+)점\s+계수\s+([\d,]+)\s+(\d+)회\s+딜지분\s+([\d.]+)%')
SKILL_OFF_RE = re.compile(r'^\s*(\d)스 (.+?)\s+Lv\.(\d+)\s+투자 X')
TOTAL_RE = re.compile(r'총 딜 ([\d,]+)\s+DPS ([\d,]+)\s+시전 점유율 ([\d.]+)% \(유휴 (\d+)초\)')
SELF_RE = re.compile(r'자버프 적용 (\d+)/(\d+)회')
PRIO_RE = re.compile(r'^\s*\d+\. (\d)스 (.+?)\s{2,}([\d,]+)/초\s+쿨 (\d+)초\s+시전 ([\d.]+)초(.*)$')
BUILD_RE = re.compile(r'^\s*(\d+)위\s+(.+?)\s{2,}([\d,]+)\s+([+-][\d.]+)%')
OPEN_RE = re.compile(r'(\d)스\(([\d.]+)\)')
U_RE = re.compile(r'(\d+)U')

num = lambda s: int(s.replace(',', ''))
errors = []


def parse_decks_csv():
    """덱 옵션. 키는 (실제 덱 이름, 덱 종류) — 덱 종류만으로는 겹치는 행이 있다."""
    rows = {}
    with (SRC / "deck.csv").open(encoding="utf-8-sig", newline="") as f:
        for r in csv.reader(f):
            if not r or r[0] == "덱 종류":
                continue
            effects = [[r[i].strip(), r[i + 1].strip()]
                       for i in (1, 3, 5, 7) if r[i].strip() not in ("-", "")]
            rows[(r[9].strip(), r[0].strip())] = effects
    return rows


def parse_members_csv():
    """덱을 채우는 디지몬. 손으로 채워 넣는 파일이라 아직 빈 칸이 있을 수 있다."""
    rows = {}
    path = SRC / "deck_members.csv"
    if not path.exists():
        errors.append(f"{path.name} 이 없음")
        return rows
    with path.open(encoding="utf-8-sig", newline="") as f:
        for r in csv.reader(f):
            if not r or r[0] == "덱 종류":
                continue
            # 디지몬 이름에 쉼표가 들어가므로 / 로 나눈다
            rows[(r[1].strip(), r[0].strip())] = [x.strip() for x in r[2].split("/") if x.strip()]
    return rows


def parse_report(path):
    lines = path.read_text(encoding="utf-8").split("\n")

    m = HEAD_RE.match(lines[0])
    if not m:
        errors.append(f"{path.name}: 첫 줄에서 전투 시간/스킬포인트를 못 읽음")
        return None
    duration, sp_total = int(m.group(1)), int(m.group(2))

    name = next(l[4:].strip() for l in lines if l.startswith("### "))
    notes, blocks, cur = [], [], None

    for l in lines:
        if cur is None and l.startswith("  ") and ":" in l and not l.startswith("["):
            notes.append(l.strip())
            continue

        m = DECK_RE.match(l)
        if m:
            cur = {"deck": m.group(3), "type": m.group(4),
                   "mult": float(m.group(5)), "atk": int(m.group(6)),
                   "skills": [], "opening": [], "steady": [], "priority": [], "builds": []}
            blocks.append(cur)
            continue
        if cur is None:
            continue

        if m := SP_RE.search(l):
            cur["spUsed"] = int(m.group(1))
        elif m := SKILL_RE.match(l):
            cur["skills"].append({"slot": int(m.group(1)), "name": m.group(2).strip(),
                                  "lv": int(m.group(3)), "pts": int(m.group(4)),
                                  "coef": num(m.group(5)), "hits": int(m.group(6)),
                                  "share": float(m.group(7))})
        elif m := SKILL_OFF_RE.match(l):
            cur["skills"].append({"slot": int(m.group(1)), "name": m.group(2).strip(),
                                  "lv": int(m.group(3)), "off": True})
        elif m := TOTAL_RE.search(l):
            cur.update(total=num(m.group(1)), dps=num(m.group(2)),
                       uptime=float(m.group(3)), idle=int(m.group(4)))
        elif m := SELF_RE.search(l):
            cur["selfBuff"] = [int(m.group(1)), int(m.group(2))]
        elif m := PRIO_RE.match(l):
            cur["priority"].append({"slot": int(m.group(1)), "name": m.group(2).strip(),
                                    "dps": num(m.group(3)), "cd": int(m.group(4)),
                                    "cast": float(m.group(5))})
        elif m := BUILD_RE.match(l):
            cur["builds"].append({"rank": int(m.group(1)), "build": m.group(2).strip(),
                                  "total": num(m.group(3)), "diff": float(m.group(4))})
        elif "(반복)" in l:
            cur["steady"] = [int(s) for s in re.findall(r'(\d)스', l)]
        elif "스(" in l and ">" in l:
            cur["opening"] += [{"slot": int(a), "t": float(b)} for a, b in OPEN_RE.findall(l)]

    for i, b in enumerate(blocks, 1):
        for key in ("spUsed", "total", "dps", "uptime", "idle"):
            if key not in b:
                errors.append(f"{name} 덱 {i}: {key} 없음")
        for key in ("skills", "opening", "priority", "builds"):
            if not b[key]:
                errors.append(f"{name} 덱 {i}: {key} 비어 있음")

    return {"name": name, "notes": notes, "duration": duration,
            "spTotal": sp_total, "blocks": blocks}


def main():
    reports = [parse_report(p) for p in sorted(SRC.glob("report-*.txt"))]
    reports = [r for r in reports if r]
    if not reports:
        sys.exit("리포트를 못 찾음")

    durations = {r["duration"] for r in reports}
    sp_totals = {r["spTotal"] for r in reports}
    if len(durations) > 1 or len(sp_totals) > 1:
        errors.append(f"리포트마다 기준이 다름: 전투 {durations}, 스킬포인트 {sp_totals}")

    # 덱 집합은 모든 리포트가 같지만 정렬 순서는 리포트마다 다르다.
    # 첫 리포트 순서를 기준으로 삼고, 나머지 리포트의 결과를 그 순서에 맞춰 다시 늘어놓는다.
    deck_key = [(b["deck"], b["type"]) for b in reports[0]["blocks"]]
    for r in reports:
        by_key = {(b["deck"], b["type"]): b for b in r["blocks"]}
        if set(by_key) != set(deck_key) or len(by_key) != len(r["blocks"]):
            errors.append(f"{r['name']}: 덱 구성이 첫 리포트와 다름")
            continue
        for k in deck_key:
            b = by_key[k]
            ref = reports[0]["blocks"][deck_key.index(k)]
            if (b["mult"], b["atk"]) != (ref["mult"], ref["atk"]):
                errors.append(f"{r['name']} / {k[0]}: 배수·공격력이 첫 리포트와 다름")
        r["blocks"] = [by_key[k] for k in deck_key]

    csv_effects = parse_decks_csv()
    for k in deck_key:
        if k not in csv_effects:
            errors.append(f"deck.csv 에 없는 덱: {k[0]} ({k[1]})")

    csv_members = parse_members_csv()
    for k in csv_members:
        if k not in deck_key:
            errors.append(f"deck_members.csv 의 덱을 리포트에서 못 찾음: {k[0]} ({k[1]})")

    # 덱 종류에 박힌 U 수 — "머시풀 1U 파피몬쪽" 처럼 끝이 아닌 자리에 오기도 한다
    decks = []
    for b in reports[0]["blocks"]:
        m = U_RE.search(b["type"])
        if not m:
            errors.append(f"덱 종류에서 U 수를 못 읽음: {b['type']}")
        decks.append({"name": b["deck"], "type": b["type"], "u": int(m.group(1)) if m else 0,
                      "mult": b["mult"], "atk": b["atk"],
                      "effects": csv_effects.get((b["deck"], b["type"]), []),
                      "members": csv_members.get((b["deck"], b["type"]), [])})

    digimon = [{"name": r["name"], "file": f"d{i:02d}", "notes": r["notes"]}
               for i, r in enumerate(reports, 1)]

    if errors:
        print("\n".join(errors), file=sys.stderr)
        sys.exit(f"{len(errors)}건 오류 — 생성 중단")

    OUT_DATA.mkdir(parents=True, exist_ok=True)
    banner = "// Auto-generated from report/source/*.txt by tools/_parse_report.py\n"
    dump = lambda o: json.dumps(o, ensure_ascii=False, separators=(",", ":"))

    OUT_META.write_text(
        banner
        + "// 덱 순서는 모든 디지몬이 동일하다. data/dNN.js 의 결과 배열도 이 순서를 따른다.\n\n"
        + f"export const meta = {dump({'duration': reports[0]['duration'], 'spTotal': reports[0]['spTotal']})};\n\n"
        + f"export const decks = {dump(decks)};\n\n"
        + f"export const digimon = {dump(digimon)};\n",
        encoding="utf-8")

    for d, r in zip(digimon, reports):
        body = [{k: v for k, v in b.items() if k not in ("deck", "type", "mult", "atk")}
                for b in r["blocks"]]
        (OUT_DATA / f"{d['file']}.js").write_text(
            banner + f"// {r['name']}\n\nexport default {dump(body)};\n", encoding="utf-8")

    print(f"디지몬 {len(digimon)}마리, 덱 {len(decks)}개, 결과 {len(digimon) * len(decks)}건")
    print(f"  {OUT_META}")
    print(f"  {OUT_DATA}\\d01.js ~ d{len(digimon):02d}.js")


if __name__ == "__main__":
    main()
