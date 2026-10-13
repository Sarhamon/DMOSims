import { loadTheme, toggleTheme } from '../theme.js';
import { moduleFusions } from './moduleData.js';
import { GRADES as BOX_TYPES, DAILY, WEEKLY } from '../quest/questData.js';
import { flipCardWrap, revealAllRowHTML, setupFlip } from './flipCard.js';
import { createUpgrader } from './upgrade.js';

const GRADE_ORDER = ['U', 'SSS+', 'SSS', 'SS+', 'SS', 'S+', 'S', 'A+', 'A', 'N'];
const FUSION_BATCH_SIZE = 10;
const STORAGE_KEY = 'dmokit_module';
// 등급 상자에서 나올 수 있는 등급 (모두 동일 확률 가정)
const BOX_GRADES = { NA: ['N', 'A', 'A+'], S: ['S', 'S+'], SP: ['S+', 'SS'], SS: ['SS', 'SS+'] };
const maybeUpgrade = createUpgrader(moduleFusions);

const el = id => document.getElementById(id);
const boxList = el('boxList');
const openBoxesBtn = el('openBoxesBtn');
const openSummary = el('openSummary');
const fusionAvail = el('fusionAvail');
const fuse10Btn = el('fuse10Btn');
const fuseAllBtn = el('fuseAllBtn');
const fusionResultGrid = el('fusionResultGrid');
const fusionResultCount = el('fusionResultCount');
const autoRevealCheck = el('autoRevealCheck');
const invCount = el('invCount');
const invSummary = el('invSummary');
const invGrid = el('invGrid');

// 낮은 등급부터 합성해야 결과가 상위 합성 재료로 이어진다.
const ascFusions = [...moduleFusions].sort((a, b) => gradeRank(b.inputGrade) - gradeRank(a.inputGrade));
let currentMode = 'auto';

function load() {
    try {
        const s = JSON.parse(localStorage.getItem(STORAGE_KEY));
        if (s && s.boxes && s.items) return s;
    } catch {}
    return { boxes: {}, items: {} };
}
let state = load();
function save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch {}
}

function gradeRank(g) {
    const i = GRADE_ORDER.indexOf(g);
    return i === -1 ? 999 : i;
}
function gradeClass(g) { return 'grade-' + g.replace('+', 'plus'); }
function escapeHtml(s) {
    return s.replace(/[&<>"']/g, c => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
}
const pickUniform = arr => arr[Math.floor(Math.random() * arr.length)];

function pullOne(items) {
    const total = items.reduce((s, i) => s + i.probability, 0);
    const roll = Math.random() * total;
    let acc = 0;
    for (const item of items) {
        acc += item.probability;
        if (roll < acc) return item;
    }
    return items[items.length - 1];
}

function addItem(name, grade) {
    const slot = state.items[name] || (state.items[name] = { name, grade, count: 0 });
    slot.count++;
}

function countOfGrade(grade) {
    return Object.values(state.items).filter(it => it.grade === grade).reduce((s, it) => s + it.count, 0);
}

// 많이 가진 것부터 소모
function consumeGrade(grade, count) {
    const items = Object.values(state.items).filter(it => it.grade === grade).sort((a, b) => b.count - a.count);
    for (const it of items) {
        while (it.count > 0 && count > 0) { it.count--; count--; }
        if (it.count === 0) delete state.items[it.name];
        if (count === 0) break;
    }
}

// ── 상자 ──
// 등급별 상자 내용물: 퀘스트 보상은 [지급용] 모듈. 공격/방어/보조형을 먼저 고르고, 그 안에서 세부 종류를 고른다.
const boxPool = {};
for (const grade of Object.values(BOX_GRADES).flat()) {
    if (boxPool[grade]) continue;
    const group = moduleFusions.find(g => g.inputGrade === grade);
    const byType = {};
    for (const r of group.results) {
        if (r.grade !== grade || !r.name.endsWith('[지급용]')) continue;
        const type = r.name.split(' ')[0];
        (byType[type] || (byType[type] = [])).push(r.name);
    }
    boxPool[grade] = Object.values(byType);
}

function grantQuests(quests, times = 1) {
    for (const q of quests) state.boxes[q.grade] = (state.boxes[q.grade] || 0) + q.n * times;
    save();
    render();
}

function openBoxes() {
    const gained = {};
    for (const [key, n] of Object.entries(state.boxes)) {
        for (let i = 0; i < n; i++) {
            const grade = pickUniform(BOX_GRADES[key]);
            addItem(pickUniform(pickUniform(boxPool[grade])), grade);
            gained[grade] = (gained[grade] || 0) + 1;
        }
    }
    state.boxes = {};
    save();
    openSummary.innerHTML = Object.keys(gained).length
        ? '획득: ' + gradeChips(gained)
        : '';
    render();
}

// ── 합성 ──
function activeFusions() {
    return currentMode === 'auto' ? ascFusions : ascFusions.filter(g => g.inputGrade === currentMode);
}

function fuseOnce() {
    for (const group of activeFusions()) {
        if (countOfGrade(group.inputGrade) < group.inputCount) continue;
        consumeGrade(group.inputGrade, group.inputCount);
        const result = maybeUpgrade(pullOne(group.results), group.results);
        addItem(result.name, result.grade);
        return result;
    }
    return null;
}

function fuse(limit) {
    const results = [];
    while (results.length < limit) {
        const r = fuseOnce();
        if (!r) break;
        results.push(r);
    }
    if (!results.length) {
        alert('합성 가능한 모듈이 부족합니다.');
        return;
    }
    save();
    if (limit === Infinity) renderSummary(results);
    else renderCards(results, limit);
    render();
}

function renderCards(results, requested) {
    let suffix = `(${results.length}회 합성)`;
    if (requested > results.length) suffix += ` · 재료 부족으로 ${requested - results.length}회 중단`;
    fusionResultCount.textContent = suffix;
    const cards = results.length > 1 ? [revealAllRowHTML()] : [];
    for (const r of results) {
        cards.push(flipCardWrap(buildFlipBack(r), gradeClass(r.grade), r._upgraded ? 'upgraded' : ''));
    }
    fusionResultGrid.innerHTML = cards.join('');
    setupFlip(fusionResultGrid);
    if (autoRevealCheck.checked) {
        const btn = fusionResultGrid.querySelector('.reveal-all-btn');
        if (btn) btn.click();
        else fusionResultGrid.querySelector('.flip-card:not(.revealed)')?.click();
    }
}

function buildFlipBack(it) {
    const face = (grade, name) => `<span class="r-grade">${escapeHtml(grade)}</span>
            <span class="r-name">${escapeHtml(name)}</span>`;
    if (!it._upgraded) return face(it.grade, it.name);
    return `<div class="back-stage back-stage-original ${gradeClass(it._orig.grade)}">${face(it._orig.grade, it._orig.name)}</div>
        <div class="back-stage back-stage-upgraded ${gradeClass(it.grade)}">${face(it.grade, it.name)}
            <span class="upgrade-tag">⬆ 등급업</span>
        </div>`;
}

function renderSummary(results) {
    const upgraded = results.filter(r => r._upgraded).length;
    fusionResultCount.textContent = `(${results.length.toLocaleString()}회 합성 · 등급업 ${upgraded.toLocaleString()}회)`;
    const byGrade = {};
    for (const r of results) byGrade[r.grade] = (byGrade[r.grade] || 0) + 1;
    fusionResultGrid.innerHTML = `<div class="stat-grade-list">${gradeChips(byGrade)}</div>`;
}

// ── 렌더 ──
function gradeChips(counts) {
    return Object.keys(counts).sort((a, b) => gradeRank(a) - gradeRank(b))
        .map(g => `<span class="stat-grade ${gradeClass(g)}"><span class="g-label">${escapeHtml(g)}</span><span class="g-count">${counts[g].toLocaleString()}</span></span>`)
        .join('');
}

function renderBoxes() {
    const total = Object.values(state.boxes).reduce((s, n) => s + n, 0);
    boxList.innerHTML = BOX_TYPES.map(b => `<div class="summary-item">
        <span class="summary-target quest-grade grade-${b.cls}">${b.label} 상자</span>
        <span class="summary-value">${(state.boxes[b.key] || 0).toLocaleString()}</span>
    </div>`).join('');
    openBoxesBtn.disabled = total === 0;
}

function renderFusionAvail() {
    let possible = 0;
    for (const g of activeFusions()) possible += Math.floor(countOfGrade(g.inputGrade) / g.inputCount);
    fuse10Btn.disabled = fuseAllBtn.disabled = possible === 0;
    fusionAvail.textContent = possible > 0 ? `현재 재료로 ${possible}회 합성 가능` : '합성 가능한 모듈이 없습니다.';
}

function renderInventory() {
    const items = Object.values(state.items).sort((a, b) =>
        gradeRank(a.grade) - gradeRank(b.grade) || a.name.localeCompare(b.name));
    const counts = {};
    for (const it of items) counts[it.grade] = (counts[it.grade] || 0) + it.count;
    const total = items.reduce((s, it) => s + it.count, 0);
    invCount.textContent = `모듈: ${total.toLocaleString()}개`;
    invSummary.innerHTML = items.length ? gradeChips(counts) : '<span class="empty-msg-inline">모듈 없음</span>';
    invGrid.innerHTML = items.length
        ? items.map(it => `<div class="inv-item ${gradeClass(it.grade)}">
            <span class="inv-grade">${escapeHtml(it.grade)}</span>
            <span class="inv-name">${escapeHtml(it.name)}</span>
            <span class="inv-num">×${it.count}</span>
        </div>`).join('')
        : '<div class="empty-msg">상자를 열면 모듈이 이곳에 쌓입니다.</div>';
}

function render() {
    renderBoxes();
    renderFusionAvail();
    renderInventory();
}

el('grantDailyBtn').addEventListener('click', () => grantQuests(DAILY));
el('grantWeeklyBtn').addEventListener('click', () => grantQuests(WEEKLY));
el('grantWeekBtn').addEventListener('click', () => { grantQuests(DAILY, 7); grantQuests(WEEKLY); });
openBoxesBtn.addEventListener('click', openBoxes);
fuse10Btn.addEventListener('click', () => fuse(FUSION_BATCH_SIZE));
fuseAllBtn.addEventListener('click', () => fuse(Infinity));
el('clearInvBtn').addEventListener('click', () => {
    if (!confirm('상자와 모듈 인벤토리를 모두 초기화합니다. 계속하시겠습니까?')) return;
    state = { boxes: {}, items: {} };
    save();
    openSummary.innerHTML = '';
    render();
});
document.querySelectorAll('input[name="fusion-mode"]').forEach(radio => {
    radio.addEventListener('change', () => { currentMode = radio.value; renderFusionAvail(); });
});
document.querySelector('.theme-toggle').addEventListener('click', toggleTheme);

// 퀘스트 1회분 보상 표시
const sumByBox = quests => BOX_TYPES
    .map(b => [b, quests.filter(q => q.grade === b.key).reduce((s, q) => s + q.n, 0)])
    .filter(([, n]) => n > 0)
    .map(([b, n]) => `<span class="quest-grade grade-${b.cls}">${b.label}</span> ×${n}`)
    .join(' · ');
el('dailyReward').innerHTML = sumByBox(DAILY);
el('weeklyReward').innerHTML = sumByBox(WEEKLY);

loadTheme();
render();
