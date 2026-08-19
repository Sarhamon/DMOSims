import { meta, decks, digimon } from './reportMeta.js';

/* 디지몬 → 덱 → 결과 3단계.
   결과 데이터는 디지몬·전투 시간을 고른 시점에 data/dNN-M.js 를 동적으로 불러온다. */

const $ = (s) => document.querySelector(s);
const n = (v) => v.toLocaleString('ko-KR');
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const byName = [...digimon].sort((a, b) => a.name.localeCompare(b.name, 'ko'));
const cache = new Map();

let picked = null;      // 디지몬 이름. null 이면 디지몬 목록
let deckIdx = null;     // decks 의 인덱스. null 이면 덱 목록
let rows = null;        // 현재 디지몬의 결과 37개 (decks 와 같은 순서)
let sortMode = 'own';   // 'own' = 이 디지몬 덱 먼저, 'dmg' = 딜량 순
let dur = meta.durations[0];  // 전투 시간(초)

async function load(name) {
    const key = `${name}/${dur}`;
    if (!cache.has(key)) {
        const file = digimon.find((d) => d.name === name).file;
        cache.set(key, (await import(`./data/${file}-${dur / 60}.js`)).default);
    }
    return cache.get(key);
}

/* 덱 정렬. 어느 쪽이든 총 딜 내림차순이 바탕이고,
   'own' 이면 보고 있는 디지몬이 들어가는 덱을 위로 올린다.
   목록과 상세 셀렉트가 같은 순서를 쓴다. */
function deckOrder() {
    const has = (deck) => (deck.members.includes(picked) ? 0 : 1);
    const rank = sortMode === 'own'
        ? (a, b) => has(a.deck) - has(b.deck) || b.r.total - a.r.total
        : (a, b) => b.r.total - a.r.total;
    return decks.map((deck, i) => ({ deck, i, r: rows[i] })).sort(rank);
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

/* 덱을 채우는 디지몬. 보고 있는 디지몬은 강조한다.
   아직 안 채운 덱은 덱 종류를 대신 보여준다.
   이름 하나를 .mem 으로 묶어 nowrap 을 걸고 사이를 공백으로 이으면,
   줄은 이름 사이에서만 바뀌고 이름 가운데서는 끊기지 않는다. */
const deckSub = (deck) => deck.members.length
    ? deck.members
        .map((m, i, arr) => `<span class="mem">`
            + `<span class="nm${m === picked ? ' on' : ''}">${esc(m)}</span>`
            + `${i < arr.length - 1 ? '<i class="sep">·</i>' : ''}</span>`)
        .join(' ')
    : esc(deck.type);

/* 쉼표가 있는 이름은 조각마다 nowrap 을 걸어 쉼표에서만 줄이 바뀌게 한다.
   쉼표가 없는 이름은 nowrap 을 걸면 카드 밖으로 넘치므로 그대로 둔다. */
const deckTitle = (name) => name.includes(',')
    ? name.split(',').map((part, i, arr) =>
        `<span class="nw">${esc(part.trim())}${i < arr.length - 1 ? ',' : ''}</span>`).join(' ')
    : esc(name);

const BOLT = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" aria-hidden="true"><path d="M13.4 2.6 5.6 13.4h5.1L10.6 21.4 18.4 10.6h-5.1Z"/></svg>`;

/* ---------- 고정 영역 ------------------------------------------------- */
function renderStatic() {
    $('#metaSp').innerHTML = `${meta.spTotal}<span class="u">점</span>`;
    $('#metaCount').innerHTML = `${digimon.length}<span class="u">마리</span>`;
    $('#metaDecks').innerHTML = `${decks.length}<span class="u">개</span>`;

    $('#listCount').textContent = `${digimon.length} Available`;

    $('#durPick').innerHTML = meta.durations.map((d) => `
        <label class="radio-option">
            <span class="label-text">${d / 60}분</span>
            <input type="radio" name="dur" value="${d}">
        </label>`).join('');

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
    const own = decks.filter((d) => d.members.includes(picked)).length;

    $('#viewDecks').innerHTML = `
        ${digimonHead(`Decks 01 / ${decks.length}`)}

        <div class="section-head mono">
            <h2>Deck</h2>
            <span class="rule"></span>
            <span class="count">${own} / ${decks.length}</span>
        </div>
        <div class="journal-radios deck-sort">
            <label class="radio-option">
                <span class="label-text">딜량 순</span>
                <input type="radio" name="deckSort" value="dmg"${sortMode === 'dmg' ? ' checked' : ''}>
            </label>
            <label class="radio-option">
                <span class="label-text">디지몬 포함</span>
                <input type="radio" name="deckSort" value="own"${sortMode === 'own' ? ' checked' : ''}>
            </label>
        </div>
        <div class="module-grid deck-grid">${order.map(({ deck, i }) => `
            <button type="button" class="module deck-mod" data-deck="${i}">
                <span class="deck-head">
                    <span class="module-icon u-badge mono">${deck.u}U</span>
                    <h3 class="module-title">${deckTitle(deck.name)}</h3>
                </span>
                <p class="module-desc deck-meta mono">${deckSub(deck)}</p>
                <div class="deck-effs">${effChips(deck)}</div>
            </button>`).join('')}
        </div>`;
}

/* ---------- 3단계 · 덱별 결과 ------------------------------------------ */
function skillTable(r) {
    const body = r.skills.map((s) => s.off ? `
        <tr class="rp-off">
            <td class="col-name"><span class="rp-skill-name">${chip(s.slot)}${esc(s.name)}</span></td>
            <td>Lv.${s.lv}</td>
            <td colspan="4">기본 &middot; 딜사이클 제외</td>
        </tr>` : `
        <tr>
            <td class="col-name"><span class="rp-skill-name">${chip(s.slot)}${esc(s.name)}</span></td>
            <td><b>Lv.${s.lv}</b></td>
            <td>${s.pts ? `${s.pts}점` : '<span class="pts-base">기본</span>'}</td>
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
            <label class="field-label mono" for="deckSel">덱 바꾸기</label>
            <select id="deckSel" aria-label="덱 선택">${order
                .map(({ deck: d, i }) => `<option value="${i}"${i === deckIdx ? ' selected' : ''}>${d.u}U · ${esc(d.name)}</option>`)
                .join('')}</select>
            ${deck.atk ? `<p class="deck-meta mono">공격력 +${deck.atk}%</p>` : ''}
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
}

/* ---------- 화면 전환 --------------------------------------------------- */
async function render() {
    if (picked !== null && rows === null) rows = await load(picked);

    $(`#durPick input[value="${dur}"]`).checked = true;
    $('#metaDuration').innerHTML = `${dur}<span class="u">초</span>`;

    const list = picked === null;
    const detail = !list && deckIdx !== null;

    $('#viewList').hidden = !list;
    $('#viewDecks').hidden = list || detail;
    $('#viewDetail').hidden = !detail;
    $('#detailBar').hidden = list;

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
    /* 전투 시간은 기본값이 아닐 때만 남긴다 */
    const parts = [
        picked === null ? '' : `d=${encodeURIComponent(picked)}`,
        picked !== null && deckIdx !== null ? `k=${deckIdx}` : '',
        dur === meta.durations[0] ? '' : `t=${dur}`,
    ].filter(Boolean);
    const q = parts.length ? `#${parts.join('&')}` : '';
    if (location.hash !== q) location.hash = q;
    else readHash();
}

function readHash() {
    const p = new URLSearchParams(location.hash.slice(1));
    const d = p.get('d');
    const next = d && digimon.some((x) => x.name === d) ? d : null;

    if (next !== picked) { picked = next; rows = null; }

    const t = Number(p.get('t'));
    const nextDur = meta.durations.includes(t) ? t : meta.durations[0];
    if (nextDur !== dur) { dur = nextDur; rows = null; }

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
    const btn = e.target.closest('.deck-mod');
    if (btn) { deckIdx = Number(btn.dataset.deck); writeHash(); }
});
/* 정렬 칩도 덱 목록을 그릴 때마다 새로 만들어지므로 위임으로 받는다 */
$('#viewDecks').addEventListener('change', (e) => {
    if (e.target.name === 'deckSort') { sortMode = e.target.value; renderDecks(); }
});
/* 덱 인덱스는 모든 디지몬이 공유하므로, 보던 덱을 그대로 두고 디지몬만 갈아끼운다 */
$('#pickSel').addEventListener('change', (e) => {
    picked = e.target.value; rows = null; writeHash();
});
/* 덱 셀렉트는 상세를 그릴 때마다 새로 만들어지므로 바깥에서 위임으로 받는다 */
$('#viewDetail').addEventListener('change', (e) => {
    if (e.target.id === 'deckSel') { deckIdx = Number(e.target.value); writeHash(); }
});
$('#durPick').addEventListener('change', (e) => {
    if (e.target.name === 'dur') { dur = Number(e.target.value); rows = null; writeHash(); }
});
$('#backBtn').addEventListener('click', () => {
    if (deckIdx !== null) deckIdx = null;
    else { picked = null; rows = null; }
    writeHash();
});

window.addEventListener('hashchange', readHash);

renderStatic();
readHash();
