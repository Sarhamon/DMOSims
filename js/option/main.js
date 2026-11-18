import { initTheme } from '../theme.js';
import { formatBits } from '../format.js';
import { loadJSON, saveJSON } from '../storage.js';
import { slots, CURRENCY } from './optionData.js';

// 슬롯 좌표는 eqwind.png(1024×1061) 기준 중심점 퍼센트. 위치 보정은 x/y만 수정.
const SLOTS = [
    // 왼쪽 열 — 장비
    { id: 'emblem',  name: '모자',   group: 'equip', x: 9.5, y: 9 },
    { id: 'glasses', name: '장신구',   group: 'equip', x: 9.5, y: 25 },
    { id: 'top',     name: '상의',   group: 'equip', x: 9.5, y: 41.4 },
    { id: 'bottom',  name: '하의',   group: 'equip', x: 9.5, y: 59 },
    { id: 'gloves',  name: '장갑',   group: 'equip', x: 9.5, y: 75 },
    { id: 'shoes',   name: '신발',   group: 'equip', x: 9.5, y: 91 },
    // 오른쪽 열 — 악세사리
    { id: 'earring',  name: '귀걸이', group: 'accessory', x: 89, y: 9 },
    { id: 'necklace', name: '목걸이', group: 'accessory', x: 89, y: 25 },
    { id: 'belt',     name: '팔찌',   group: 'accessory', x: 89, y: 41.4 },
    { id: 'ring',     name: '반지',   group: 'accessory', x: 89, y: 59 },
    { id: 'card',     name: '디지바이스',   group: 'accessory', x: 89, y: 91 },
];

const GROUP_LABEL = { equip: '장비', accessory: '악세사리' };

const picker = document.getElementById('slotPicker');
const panel = document.getElementById('optPanel');

// 현재 시뮬레이터 상태 { slotId, itemIndex, lines, locked:Set, stones }
let sim = null;

// 부위별 설정 접근. cfg = slots[slotId] ({ group, lines, lockCost, items })
const cfg = () => slots[sim.slotId];
const maxLockOf = c => Math.max(...Object.keys(c.lockCost).map(Number));

const STORAGE_KEY = 'dmo_option';

// resume: 부위별 현재 상태(이어보기) / snaps: 부위별 저장된 결과 스냅샷
const store = loadStore();

function loadStore() {
    const o = loadJSON(STORAGE_KEY, {});
    return { resume: o.resume ?? {}, snaps: o.snaps ?? {}, price: normalizePrice(o.price) };
}

// 가격은 그룹별(accessory=스톤 / equip=재봉틀)로 분리. 레거시(공유) 값은 양쪽에 복사.
function normalizePrice(p) {
    const zero = () => ({ t: 0, m: 0, b: 0 });
    if (!p) return { accessory: zero(), equip: zero() };
    if ('t' in p) return { accessory: { ...zero(), ...p }, equip: { ...zero(), ...p } };
    return { accessory: { ...zero(), ...p.accessory }, equip: { ...zero(), ...p.equip } };
}

const persist = () => saveJSON(STORAGE_KEY, store);

function saveResume() {
    store.resume[sim.slotId] = {
        itemIndex: sim.itemIndex,
        lines: sim.lines.map(o => ({ name: o.name, max: o.max })),
        locked: [...sim.locked],
        stones: sim.stones,
    };
    persist();
}

// 저장된 이어보기 상태로 sim 복원. 데이터가 안 맞으면 false(새로 시작).
function restoreResume(slotId) {
    const r = store.resume[slotId];
    const item = slots[slotId].items[r?.itemIndex];
    if (!r || !item) return false;
    const lines = r.lines.map(l => {
        const name = typeof l === 'string' ? l : l.name;       // 구버전 데이터(이름만) 호환
        const max = typeof l === 'string' ? undefined : l.max;
        return resolveLine(item, name, max);
    });
    if (lines.length !== slots[slotId].lines || lines.some(o => !o)) return false;
    sim = { slotId, itemIndex: r.itemIndex, lines, locked: new Set(r.locked), stones: r.stones };
    return true;
}

function saveSnap() {
    const arr = store.snaps[sim.slotId] ?? (store.snaps[sim.slotId] = []);
    const item = cfg().items[sim.itemIndex];
    arr.push({
        itemIndex: sim.itemIndex,
        itemName: item.name,
        // tier: 뱃지 표시용 · max: 복원용(합친 풀에서 정확한 등급 옵션 식별)
        lines: sim.lines.map(o => ({ name: o.name, val: fmtVal(o), tier: getEquipTier(item, o.name, o.max), max: o.max })),
    });
    persist();
}

function delSnap(i) {
    store.snaps[sim.slotId].splice(i, 1);
    persist();
}

// 스냅샷을 현재 시뮬레이터로 불러오기 (고정 해제, 스톤 카운트는 유지).
function loadSnap(i) {
    const snap = store.snaps[sim.slotId][i];
    const item = cfg().items[snap.itemIndex];
    if (!item) return;
    const lines = snap.lines.map(l => resolveLine(item, l.name, l.max));
    if (lines.some(o => !o)) return;
    sim.itemIndex = snap.itemIndex;
    sim.lines = lines;
    sim.locked = new Set();
    saveResume();
}

function slotBtnHtml(s) {
    return `
        <button class="slot-btn" data-id="${s.id}">
            <img src="../img/slots/${s.id}.png" alt="">
            <span>${s.name}</span>
        </button>`;
}

function renderSlots() {
    const col = g => SLOTS.filter(s => s.group === g).map(slotBtnHtml).join('');
    picker.innerHTML = `
        <div class="slot-col">
            <h3 class="slot-group-title">${GROUP_LABEL.equip}</h3>
            <div class="slot-grid">${col('equip')}</div>
        </div>
        <div class="slot-col">
            <h3 class="slot-group-title">${GROUP_LABEL.accessory}</h3>
            <div class="slot-grid">${col('accessory')}</div>
        </div>`;
}

// 장비 추첨 풀: 줄별 풀(=등급)을 합친 데서 옵션 단위 균등 추첨. 상=마지막 풀, 중=그 앞 풀, 하=첫 풀(1·2줄 동일이라 1개만).
function equipPool(item) {
    const lp = item.linePools;
    return [...lp[lp.length - 1], ...lp[lp.length - 2], ...lp[0]];
}

// 장비(linePools) 전용: 같은 이름 옵션이 풀마다 max가 다를 때 상/중/하옵 판정.
// max 값의 rank(오름차순 정렬 후 위치)로 결정. unique max가 1개면 뱃지 없음.
function getEquipTier(item, optName, optMax) {
    if (!item.linePools) return null;
    const maxSet = [...new Set(
        item.linePools.flatMap(pool => pool.filter(o => o.name === optName).map(o => o.max))
    )].sort((a, b) => a - b);
    if (maxSet.length <= 1) return null;
    const idx = maxSet.indexOf(optMax);
    if (idx === -1) return null;
    const rank = idx / (maxSet.length - 1);
    if (rank >= 0.67) return 'high';
    if (rank >= 0.33) return 'mid';
    return 'low';
}

const TIER_LABEL = { high: '상옵', mid: '중옵', low: '하옵' };

function fmtVal(o) {
    const u = o.unit ?? '';
    const f = n => (o.dp ? n.toFixed(o.dp) : String(n)) + u;
    return o.min === o.max ? f(o.min) : `${f(o.min)} ~ ${f(o.max)}`;
}

// 비트 단위: 1T = 1000M, 1M = 1000B. 가격은 현재 부위의 그룹 것을 사용.
function priceBits() {
    const p = store.price[cfg().group];
    return p.t * 1_000_000 + p.m * 1000 + p.b;
}


function rerollCost() {
    return cfg().lockCost[sim.locked.size];
}

// 저장된 줄을 옵션 객체로 복원. 장비는 합친 풀이라 같은 이름이 등급별로 max가 달라 name+max로 식별
// (구버전 데이터엔 max가 없어 이름만으로 fallback). 악세는 통짜 풀에서 이름으로.
function resolveLine(item, name, max) {
    if (!item.linePools) return item.pool.find(o => o.name === name);
    for (const p of item.linePools) {
        const o = p.find(x => x.name === name && (max === undefined || x.max === max));
        if (o) return o;
    }
    return undefined;
}

// 고정된 줄은 유지하고, 고정 안 된 줄만 다시 추첨.
function rollLines() {
    const item = cfg().items[sim.itemIndex];
    const lines = sim.lines.slice();

    if (item.linePools) {
        // 장비: 상·중·하 풀을 합친 데서 옵션 단위 균등 추첨. 고정 줄만 유지.
        //  · 중·상급 옵션은 4줄 통틀어 같은 옵션이 1개씩만(중복 금지). 하급 옵션은 중복 허용.
        //  · 잠금한 줄의 그 옵션은 다른 줄 추첨에서 제외.
        //  · 등급별 동명 옵션은 개별 취급 — 공격력 상옵과 공격력 중옵은 공존 가능.
        const lp = item.linePools;
        const all = equipPool(item);
        const highOpts = new Set([...lp[lp.length - 1], ...lp[lp.length - 2]]);   // 중·상급 옵션
        const lockedOpts = new Set([...sim.locked].map(i => sim.lines[i]));
        const usedHigh = new Set([...lockedOpts].filter(o => highOpts.has(o)));   // 이미 쓰인 중·상급 옵션
        for (let i = 0; i < cfg().lines; i++) {
            if (sim.locked.has(i)) continue;
            const avail = all.filter(o => !lockedOpts.has(o) && !usedHigh.has(o));
            if (avail.length === 0) break;
            const o = avail[Math.floor(Math.random() * avail.length)];
            if (highOpts.has(o)) usedHigh.add(o);
            lines[i] = o;
        }
        return lines;
    }

    // 악세: 통짜 풀에서 종류별 균등, cap(고정 줄 포함 합산)을 넘긴 종류는 제외.
    const pool = item.pool;
    const used = new Map();
    for (const idx of sim.locked) {
        const name = sim.lines[idx].name;
        used.set(name, (used.get(name) ?? 0) + 1);
    }
    for (let i = 0; i < cfg().lines; i++) {
        if (sim.locked.has(i)) continue;
        const avail = pool.filter(o => (used.get(o.name) ?? 0) < o.cap);
        if (avail.length === 0) break;
        const o = avail[Math.floor(Math.random() * avail.length)];
        used.set(o.name, (used.get(o.name) ?? 0) + 1);
        lines[i] = o;
    }
    return lines;
}

function startSim(slotId) {
    sim = { slotId, itemIndex: 0, lines: new Array(slots[slotId].lines), locked: new Set(), stones: 0 };
    sim.lines = rollLines();
}

function resetSim() {
    sim.locked = new Set();
    sim.stones = 0;
    sim.lines = rollLines();
}

function reroll() {
    sim.stones += rerollCost();
    sim.lines = rollLines();
}

function linesHtml() {
    const item = cfg().items[sim.itemIndex];
    const max = maxLockOf(cfg());
    const lockFull = sim.locked.size >= max;
    return sim.lines.map((o, i) => {
        const locked = sim.locked.has(i);
        const lockBtn = max > 0
            ? `<button class="opt-lock" data-idx="${i}"${!locked && lockFull ? ' disabled' : ''} aria-pressed="${locked}" aria-label="고정">${locked ? '🔒' : '🔓'}</button>`
            : '';
        const t = getEquipTier(item, o.name, o.max);
        const badge = t ? `<span class="opt-tier opt-tier-${t}">${TIER_LABEL[t]}</span>` : '';
        return `
        <li class="opt-line${locked ? ' locked' : ''}">
            <span class="opt-line-name">${o.name}${badge}</span>
            <span class="opt-line-val">${fmtVal(o)}</span>
            ${lockBtn}
        </li>`;
    }).join('');
}

function refresh() {
    document.getElementById('optLines').innerHTML = linesHtml();
    document.getElementById('optCost').textContent = rerollCost();
    updateCost();
}

function snapsHtml(slotId) {
    const arr = store.snaps[slotId] ?? [];
    if (!arr.length) return '<li class="opt-snap-empty">저장된 결과가 없습니다.</li>';
    return arr.map((s, i) => `
        <li class="opt-snap">
            <div class="opt-snap-top">
                <span class="opt-snap-name">${s.itemName}</span>
                <span class="opt-snap-act">
                    <button class="opt-snap-load" data-i="${i}">불러오기</button>
                    <button class="opt-snap-del" data-i="${i}">삭제</button>
                </span>
            </div>
            <div class="opt-snap-lines">${s.lines.map(l => `<span>${l.name}${l.tier ? `<span class="opt-tier opt-tier-${l.tier}">${TIER_LABEL[l.tier]}</span>` : ''} ${l.val}</span>`).join('')}</div>
        </li>`).join('');
}

function renderSnaps() {
    document.getElementById('optSnaps').innerHTML = snapsHtml(sim.slotId);
}

function renderBody() {
    panel.querySelector('.opt-body').innerHTML = simBodyHtml(sim.slotId);
}

function simBodyHtml(slotId) {
    const c = slots[slotId];
    const cur = CURRENCY[c.group];
    const price = store.price[c.group];
    const max = maxLockOf(c);
    const hint = max > 0
        ? `줄을 최대 ${max}개까지 고정(🔒)하고 변경할 수 있습니다.`
        : `옵션 변경 시 ${c.lines}줄 전체가 다시 추첨됩니다.`;
    const options = c.items.map((it, i) =>
        `<option value="${i}"${i === sim.itemIndex ? ' selected' : ''}>${it.name}</option>`
    ).join('');
    return `
        <label class="opt-item-pick">아이템
            <select id="optItem">${options}</select>
        </label>
        <p class="opt-hint">${hint}</p>
        <ol class="opt-lines" id="optLines">${linesHtml()}</ol>
        <div class="opt-actions">
            <button class="opt-reroll" id="optReroll">옵션 변경 · <span id="optCost">${rerollCost()}</span>개</button>
            <label class="opt-price">${cur} 가격
                <span class="opt-price-fields">
                    <input type="number" id="priceT" min="0" inputmode="numeric" value="${price.t}"><i>T</i>
                    <input type="number" id="priceM" min="0" max="999" inputmode="numeric" value="${price.m}"><i>M</i>
                    <input type="number" id="priceB" min="0" max="999" inputmode="numeric" value="${price.b}"><i>B</i>
                </span>
            </label>
        </div>
        <div class="opt-cost">
            <span>${cur} <b id="optStones">${sim.stones}</b>개</span>
            <span>총 비용 <b id="optTotal">${formatBits(sim.stones * priceBits())}</b></span>
            <button class="opt-save" id="optResetStones">사용 갯수 초기화</button>
        </div>
        <div class="opt-saved">
            <div class="opt-saved-head">
                <span>저장된 결과</span>
                <button class="opt-save" id="optSave">＋ 현재 결과 저장</button>
            </div>
            <ul class="opt-snap-list" id="optSnaps">${snapsHtml(slotId)}</ul>
        </div>`;
}

function updateCost() {
    document.getElementById('optStones').textContent = sim.stones;
    document.getElementById('optTotal').textContent = formatBits(sim.stones * priceBits());
}

function bodyHtml(slot) {
    if (slots[slot.id]?.items.length) {
        if (!restoreResume(slot.id)) { startSim(slot.id); saveResume(); }
        return simBodyHtml(slot.id);
    }
    return '<p class="opt-placeholder">옵션 변경 기능 준비 중입니다.</p>';
}

function selectSlot(id) {
    const slot = SLOTS.find(s => s.id === id);
    if (!slot) return;

    picker.querySelectorAll('.slot-btn').forEach(b =>
        b.classList.toggle('selected', b.dataset.id === id));

    panel.innerHTML = `
        <div class="opt-head">
            <div>
                <span class="opt-group">${GROUP_LABEL[slot.group]}</span>
                <h3 class="opt-title">${slot.name}</h3>
            </div>
            <button class="opt-close" id="optClose" aria-label="닫기">✕</button>
        </div>
        <div class="opt-body">${bodyHtml(slot)}</div>`;
    panel.classList.add('open');
}

function clearSelection() {
    sim = null;
    picker.querySelectorAll('.slot-btn.selected').forEach(b => b.classList.remove('selected'));
    panel.classList.remove('open');
    panel.innerHTML = '<p class="opt-empty">부위를 선택하면 옵션 변경 화면이 표시됩니다.</p>';
}

picker.addEventListener('click', e => {
    const btn = e.target.closest('.slot-btn');
    if (!btn) return;
    if (btn.classList.contains('selected')) clearSelection();
    else selectSlot(btn.dataset.id);
});

panel.addEventListener('click', e => {
    if (e.target.closest('#optClose')) { clearSelection(); return; }

    const lockBtn = e.target.closest('.opt-lock');
    if (lockBtn) {
        const idx = Number(lockBtn.dataset.idx);
        if (sim.locked.has(idx)) sim.locked.delete(idx);
        else if (sim.locked.size < maxLockOf(cfg())) sim.locked.add(idx);
        refresh();
        saveResume();
        return;
    }

    if (e.target.closest('#optReroll')) {
        reroll();
        refresh();
        saveResume();
        return;
    }

    if (e.target.closest('#optResetStones')) {
        sim.stones = 0;
        updateCost();
        saveResume();
        return;
    }

    if (e.target.closest('#optSave')) { saveSnap(); renderSnaps(); return; }

    const loadBtn = e.target.closest('.opt-snap-load');
    if (loadBtn) { loadSnap(Number(loadBtn.dataset.i)); renderBody(); return; }

    const delBtn = e.target.closest('.opt-snap-del');
    if (delBtn) { delSnap(Number(delBtn.dataset.i)); renderSnaps(); }
});

panel.addEventListener('change', e => {
    if (e.target.id !== 'optItem') return;
    sim.itemIndex = Number(e.target.value);
    resetSim();
    refresh();
    renderSnaps();
    saveResume();
});

const PRICE_FIELD = { priceT: 't', priceM: 'm', priceB: 'b' };

panel.addEventListener('input', e => {
    const key = PRICE_FIELD[e.target.id];
    if (!key) return;
    let v = parseInt(e.target.value, 10);
    if (isNaN(v) || v < 0) v = 0;
    if (key !== 't' && v > 999) { v = 999; e.target.value = v; }
    const g = cfg().group;
    store.price[g] = { ...store.price[g], [key]: v };
    persist();
    document.getElementById('optTotal').textContent = formatBits(sim.stones * priceBits());
});

initTheme();
renderSlots();
