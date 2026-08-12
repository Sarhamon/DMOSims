import { meta, decks, digimon, missing } from './reportMeta.js';

/* 디지몬 → 덱 → 결과 3단계.
   결과 데이터는 디지몬을 고른 시점에 data/dNN.js 를 동적으로 불러온다. */

const $ = (s) => document.querySelector(s);
const n = (v) => v.toLocaleString('ko-KR');
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const byName = [...digimon].sort((a, b) => a.name.localeCompare(b.name, 'ko'));
const cache = new Map();

let picked = null;   // 디지몬 이름. null 이면 디지몬 목록
let deckIdx = null;  // decks 의 인덱스. null 이면 덱 목록
let rows = null;     // 현재 디지몬의 결과 37개 (decks 와 같은 순서)

async function load(name) {
    if (!cache.has(name)) {
        const file = digimon.find((d) => d.name === name).file;
        cache.set(name, (await import(`./data/${file}.js`)).default);
    }
    return cache.get(name);
}

/* 총 딜 내림차순으로 본 덱 순서 — 목록 표와 셀렉트가 같이 쓴다 */
function deckOrder() {
    return decks
        .map((deck, i) => ({ deck, i, r: rows[i] }))
        .sort((a, b) => b.r.total - a.r.total);
}

function chip(slot, t) {
    return `<span class="slot-chip slot-${slot}">${slot}스${t === undefined ? '' : `<span class="t">${t.toFixed(1)}</span>`}</span>`;
}
const seq = (arr, withTime) => arr
    .map((x) => (withTime ? chip(x.slot, x.t) : chip(x)))
    .join('<span class="arrow">&rsaquo;</span>');

const effChips = (deck) => deck.effects
    .map(([cond, eff]) => `<span class="eff-chip"><b>${esc(eff)}</b>${cond === '상시' ? '' : `<i>${esc(cond)}</i>`}</span>`)
    .join('');

const deckMult = (deck) => `배수 x${deck.mult.toFixed(2)}${deck.atk ? ` · 공격력 +${deck.atk}%` : ''}`;

const BOLT = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" aria-hidden="true"><path d="M13.4 2.6 5.6 13.4h5.1L10.6 21.4 18.4 10.6h-5.1Z"/></svg>`;

/* ---------- 고정 영역 ------------------------------------------------- */
function renderStatic() {
    $('#metaDuration').innerHTML = `${meta.duration}<span class="u">초</span>`;
    $('#metaSp').innerHTML = `${meta.spTotal}<span class="u">점</span>`;
    $('#metaCount').innerHTML = `${digimon.length}<span class="u">마리</span>`;
    $('#metaDecks').innerHTML = `${decks.length}<span class="u">개</span>`;

    $('#missingCount').textContent = `${missing.length}마리`;
    $('#missingList').innerHTML = missing
        .map((m) => `<li>${esc(m.name)}<span class="why">${esc(m.reason)}</span></li>`).join('');
    $('#listCount').textContent = `${digimon.length} Available`;

    $('#pickSel').innerHTML = byName
        .map((d) => `<option value="${esc(d.name)}">${esc(d.name)}</option>`).join('');

    $('#pickGrid').innerHTML = byName.map((d, i) => `
        <button type="button" class="module" data-name="${esc(d.name)}">
            <span class="module-idx mono">${String(i + 1).padStart(2, '0')}</span>
            <span class="module-icon">${BOLT}</span>
            <h3 class="module-title">${esc(d.name)}</h3>
            <p class="module-desc">
                <span class="dg-sub">덱 ${decks.length}개 비교</span>
            </p>
            <span class="module-tag mono">
                Deal Cycle
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <path d="M2 8h11M9 4l4 4-4 4"/>
                </svg>
            </span>
        </button>`).join('');
}

/* ---------- 디지몬 머리말 (덱 목록 · 상세 공용) ------------------------ */
function digimonHead(sub) {
    const notes = digimon.find((d) => d.name === picked).notes;
    return `
        <div class="dg-head">
            <span class="dg-rank mono">${sub}</span>
            <h2 class="dg-title">${esc(picked)}</h2>
            ${notes.map((t) => `<p class="dg-aoe-note">${esc(t)}</p>`).join('')}
        </div>`;
}

/* ---------- 2단계 · 덱 목록 -------------------------------------------- */
function renderDecks() {
    const order = deckOrder();
    const max = order[0].r.total;

    $('#viewDecks').innerHTML = `
        ${digimonHead(`Decks 01 / ${decks.length}`)}

        <div class="section-head mono">
            <h2>Deck</h2>
            <span class="rule"></span>
            <span class="count">Total Damage</span>
        </div>
        <div class="panel panel--flush">
            <div class="table-container">
                <table class="rp-t rp-deck-t">
                    <thead>
                        <tr>
                            <th class="rp-rank">순위</th>
                            <th style="text-align:left">덱</th>
                            <th>총 딜</th>
                            <th>DPS</th>
                            <th>시전 점유율</th>
                        </tr>
                    </thead>
                    <tbody>${order.map(({ deck, i, r }, k) => `
                        <tr class="rp-row ${k === 0 ? 'rank-1' : ''}" data-deck="${i}">
                            <td class="rp-rank">${k + 1}</td>
                            <td class="col-name">
                                <b class="deck-name">${esc(deck.name)}</b>
                                <span class="deck-meta mono">${esc(deck.type)} · ${deckMult(deck)}</span>
                                <span class="deck-effs">${effChips(deck)}</span>
                            </td>
                            <td class="col-num">
                                <b>${n(r.total)}</b>
                                <span class="rp-track"><span class="rp-fill" style="width:${(r.total / max * 100).toFixed(1)}%"></span></span>
                            </td>
                            <td class="col-num">${n(r.dps)}</td>
                            <td>${r.uptime.toFixed(1)}%</td>
                        </tr>`).join('')}
                    </tbody>
                </table>
            </div>
            <p class="table-hint mono">← 좌우로 스크롤 →</p>
        </div>`;
}

/* ---------- 3단계 · 덱별 결과 ------------------------------------------ */
function skillTable(r) {
    const body = r.skills.map((s) => s.off ? `
        <tr class="rp-off">
            <td class="col-name"><span class="rp-skill-name">${chip(s.slot)}${esc(s.name)}</span></td>
            <td>Lv.${s.lv}</td>
            <td colspan="4">투자 X &middot; 딜사이클 제외</td>
        </tr>` : `
        <tr>
            <td class="col-name"><span class="rp-skill-name">${chip(s.slot)}${esc(s.name)}</span></td>
            <td><b>Lv.${s.lv}</b></td>
            <td>${s.pts}점</td>
            <td class="col-num">${n(s.coef)}</td>
            <td class="col-num">${s.hits}회</td>
            <td>
                <span class="rp-share">
                    <b>${s.share.toFixed(1)}%</b>
                    <span class="rp-track"><span class="rp-fill" style="width:${s.share.toFixed(1)}%"></span></span>
                </span>
            </td>
        </tr>`).join('');

    return `<div class="table-container"><table class="rp-t">
        <thead><tr>
            <th style="text-align:left">스킬</th><th>레벨</th><th>포인트</th>
            <th>계수</th><th>시전</th><th>딜지분</th>
        </tr></thead>
        <tbody>${body}</tbody>
    </table></div>`;
}

function buildTable(r) {
    const body = r.builds.map((b) => `
        <tr class="${b.rank === 1 ? 'rank-1' : ''}">
            <td class="rp-rank">${b.rank}위</td>
            <td class="col-name" style="font-family:var(--mono);font-weight:500">${esc(b.build)}</td>
            <td class="col-num"><b>${n(b.total)}</b></td>
            <td class="col-percent">${b.diff === 0 ? '기준' : `${b.diff.toFixed(2)}%`}</td>
        </tr>`).join('');

    return `<div class="table-container"><table class="rp-t">
        <thead><tr>
            <th class="rp-rank">순위</th><th style="text-align:left">빌드</th>
            <th>총 딜</th><th>1위 대비</th>
        </tr></thead>
        <tbody>${body}</tbody>
    </table></div>`;
}

function renderDetail() {
    const order = deckOrder();
    const rank = order.findIndex((o) => o.i === deckIdx);
    const deck = decks[deckIdx];
    const r = rows[deckIdx];

    const steady = r.steady.length
        ? `<div class="rp-seq">${seq(r.steady, false)}<span class="loop">반복</span></div>`
        : `<p class="rp-note">고정 반복 패턴이 없습니다. 아래 <b>사용 우선순위</b>대로 쿨이 도는 대로 사용하세요.</p>`;

    const prio = r.priority.map((p) => `
        <li class="slot-${p.slot}">
            ${chip(p.slot)}
            <span class="p-name">${esc(p.name)}</span>
            <span class="p-dps">${n(p.dps)}<span class="unit">/초</span></span>
            <span class="p-cd">쿨 ${p.cd}초 &middot; 시전 ${p.cast.toFixed(1)}초</span>
        </li>`).join('');

    $('#viewDetail').innerHTML = `
        ${digimonHead(`Deck ${String(rank + 1).padStart(2, '0')} / ${decks.length}`)}

        <div class="panel rp-block deck-card">
            <h3 class="section-title">${esc(deck.name)} <span class="hint">${esc(deck.type)}</span></h3>
            <p class="deck-meta mono">${deckMult(deck)}</p>
            <div class="deck-effs">${effChips(deck)}</div>
            <dl class="hero-stats">
                <div><dt class="mono">총 딜</dt><dd>${n(r.total)}</dd></div>
                <div><dt class="mono">DPS</dt><dd>${n(r.dps)}</dd></div>
                <div><dt class="mono">시전 점유율</dt><dd>${r.uptime.toFixed(1)}<span class="u">% · 유휴 ${r.idle}초</span></dd></div>
                ${r.selfBuff ? `<div><dt class="mono">자버프 적용</dt><dd>${r.selfBuff[0]}<span class="u">/ ${r.selfBuff[1]}회</span></dd></div>` : ''}
            </dl>
        </div>

        <div class="panel rp-block">
            <h3 class="section-title">스킬포인트 투자 추천 <span class="hint">${r.spUsed} / ${meta.spTotal} 점 사용</span></h3>
            ${skillTable(r)}
        </div>

        <div class="panel rp-block">
            <h3 class="section-title">딜사이클</h3>
            <p class="rp-subhead">오프닝 <span class="hint">진입 직후 60초</span></p>
            <div class="rp-seq">${seq(r.opening, true)}</div>
            <p class="rp-subhead">안정 구간 <span class="hint">${r.steady.length ? '반복 패턴' : 'No Fixed Loop'}</span></p>
            ${steady}
        </div>

        <div class="panel rp-block">
            <h3 class="section-title">사용 우선순위 <span class="hint">시전 1초당 딜 순</span></h3>
            <ul class="rp-prio">${prio}</ul>
        </div>

        <div class="panel rp-block">
            <h3 class="section-title">대안 빌드 <span class="hint">1위 대비 · 상위 ${r.builds.length}개</span></h3>
            ${buildTable(r)}
        </div>`;

    $('#deckSel').innerHTML = order
        .map(({ deck: d, i }, k) => `<option value="${i}">${k + 1}위 · ${esc(d.name)}</option>`).join('');
    $('#deckSel').value = deckIdx;
}

/* ---------- 화면 전환 --------------------------------------------------- */
async function render() {
    if (picked !== null && rows === null) rows = await load(picked);

    const list = picked === null;
    const detail = !list && deckIdx !== null;

    $('#viewList').hidden = !list;
    $('#viewDecks').hidden = list || detail;
    $('#viewDetail').hidden = !detail;
    $('#detailBar').hidden = list;
    $('#deckField').hidden = !detail;

    if (list) {
        $('#crumb').textContent = 'Report';
    } else {
        detail ? renderDetail() : renderDecks();
        $('#pickSel').value = picked;
        $('#crumb').textContent = detail ? `${picked} / ${decks[deckIdx].name}` : picked;
    }
}

/* 주소 해시로 상태를 남겨 새로고침 / 뒤로가기를 지원한다 */
function writeHash() {
    const q = picked === null ? ''
        : `#d=${encodeURIComponent(picked)}${deckIdx === null ? '' : `&k=${deckIdx}`}`;
    if (location.hash !== q) location.hash = q;
    else readHash();
}

function readHash() {
    const p = new URLSearchParams(location.hash.slice(1));
    const d = p.get('d');
    const next = d && digimon.some((x) => x.name === d) ? d : null;

    if (next !== picked) { picked = next; rows = null; }

    const k = Number(p.get('k'));
    deckIdx = picked !== null && p.has('k') && Number.isInteger(k) && decks[k] ? k : null;

    render();
    window.scrollTo({ top: 0 });
}

/* ---------- 이벤트 ------------------------------------------------------ */
$('#pickGrid').addEventListener('click', (e) => {
    const btn = e.target.closest('.module');
    if (btn) { picked = btn.dataset.name; rows = null; deckIdx = null; writeHash(); }
});
$('#viewDecks').addEventListener('click', (e) => {
    const tr = e.target.closest('.rp-row');
    if (tr) { deckIdx = Number(tr.dataset.deck); writeHash(); }
});
$('#pickSel').addEventListener('change', (e) => {
    picked = e.target.value; rows = null; deckIdx = null; writeHash();
});
$('#deckSel').addEventListener('change', (e) => { deckIdx = Number(e.target.value); writeHash(); });
$('#backBtn').addEventListener('click', () => {
    if (deckIdx !== null) deckIdx = null;
    else { picked = null; rows = null; }
    writeHash();
});

window.addEventListener('hashchange', readHash);

renderStatic();
readHash();
