import { loadTheme, toggleTheme } from '../theme.js';
import { moduleFusions } from './moduleData.js';
import { GRADES as BOX_TYPES, DAILY, WEEKLY } from '../quest/questData.js';
import { flipCardWrap, revealAllRowHTML, setupFlip } from './flipCard.js';

const GRADE_ORDER = ['U', 'SSS+', 'SSS', 'SS+', 'SS', 'S+', 'S', 'A+', 'A', 'N'];
const FUSION_BATCH_SIZE = 10;
// 목표 융합에서 재료를 자동 수급하는 최대 주 수
const MAX_WEEKS = 10000;
const STORAGE_KEY = 'dmokit_module';
// 등급 상자에서 나올 수 있는 등급 (모두 동일 확률 가정)
const BOX_GRADES = { NA: ['N', 'A', 'A+'], S: ['S', 'S+'], SP: ['S+', 'SS'], SS: ['SS', 'SS+'] };

const el = id => document.getElementById(id);
const boxList = el('boxList');
const openBoxesBtn = el('openBoxesBtn');
const openSummary = el('openSummary');
const fusionAvail = el('fusionAvail');
const fuse10Btn = el('fuse10Btn');
const targetGradeSel = el('targetGrade');
const targetOptionSel = el('targetOption');
const fuseTargetBtn = el('fuseTargetBtn');
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
        if (s && s.boxes && s.items) return { spent: 0, ...s };
    } catch {}
    return { boxes: {}, items: {}, spent: 0 };
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
// 비용은 M 단위로 들고 있다 (1T = 1000M)
function formatBit(m) {
    const t = Math.floor(m / 1000), rest = m % 1000;
    if (!t) return `${rest}M`;
    return rest ? `${t.toLocaleString()}T ${rest}M` : `${t.toLocaleString()}T`;
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

function addBoxes(quests, times = 1) {
    for (const q of quests) state.boxes[q.grade] = (state.boxes[q.grade] || 0) + q.n * times;
}
const addWeekBoxes = () => { addBoxes(DAILY, 7); addBoxes(WEEKLY); };

function grant(fn) {
    fn();
    save();
    render();
}

function openAllBoxes(gained = {}) {
    for (const [key, n] of Object.entries(state.boxes)) {
        for (let i = 0; i < n; i++) {
            const grade = pickUniform(BOX_GRADES[key]);
            addItem(pickUniform(pickUniform(boxPool[grade])), grade);
            gained[grade] = (gained[grade] || 0) + 1;
        }
    }
    state.boxes = {};
    return gained;
}

function openBoxes() {
    const gained = openAllBoxes();
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

function fuseOnce(fusionList) {
    for (const group of fusionList) {
        if (countOfGrade(group.inputGrade) < group.inputCount) continue;
        consumeGrade(group.inputGrade, group.inputCount);
        const result = pullOne(group.results);
        addItem(result.name, result.grade);
        state.spent += group.cost;
        // 확률표의 상위 등급 40% 가 곧 등급업 확률이다 (추가 등급업 없음)
        return { ...result, cost: group.cost, upgraded: result.grade !== group.inputGrade };
    }
    return null;
}

function fuse(limit) {
    const results = [];
    while (results.length < limit) {
        const r = fuseOnce(activeFusions());
        if (!r) break;
        results.push(r);
    }
    if (!results.length) {
        alert('합성 가능한 모듈이 부족합니다.');
        return;
    }
    save();
    renderCards(results, limit);
    render();
}

// ── 목표 융합 ──
// 옵션 = 이름에서 [지급용] 과 등급 표기를 뗀 것. 예) "공격형 모듈 CT/얼음 [U] [지급용]" → "공격형 모듈 CT/얼음"
const optionOf = name => name.replace(/ \[지급용\]$/, '').replace(/ \[[^\]]+\]$/, '');
const OPTIONS = {};
for (const g of moduleFusions) {
    for (const r of g.results) {
        const list = OPTIONS[r.grade] || (OPTIONS[r.grade] = []);
        const opt = optionOf(r.name);
        if (!list.includes(opt)) list.push(opt);
    }
}

function populateTargetOptions() {
    const opts = OPTIONS[targetGradeSel.value] || [];
    targetOptionSel.innerHTML = '<option value="">아무 옵션</option>'
        + opts.map(o => `<option value="${escapeHtml(o)}">${escapeHtml(o.replace(' 모듈', ''))}</option>`).join('');
}

// 목표 모듈 1개가 나올 때까지 합성한다. 재료가 떨어지면 1주치(일일 ×7 + 주간) 상자를 받아 연다.
// 목표 등급 이하만 합성한다 (목표 등급끼리 합성은 옵션을 다시 굴리는 효과).
function fuseToTarget() {
    const grade = targetGradeSel.value;
    const option = targetOptionSel.value;
    const isTarget = it => it.grade === grade && (!option || optionOf(it.name) === option);
    const fusionList = ascFusions.filter(g => gradeRank(g.inputGrade) >= gradeRank(grade));
    const results = [];
    let weeks = 0;
    let found = null;
    while (true) {
        openAllBoxes();
        found = Object.values(state.items).find(isTarget);
        if (found) break;
        const r = fuseOnce(fusionList);
        if (r) { results.push(r); continue; }
        if (weeks >= MAX_WEEKS) break;
        addWeekBoxes();
        weeks++;
    }
    save();
    renderTargetResult(found, grade, option, results, weeks);
    render();
}

function renderTargetResult(found, grade, option, results, weeks) {
    const targetLabel = `${grade} ${option ? option.replace(' 모듈', '') : '아무 옵션'}`;
    fusionResultCount.textContent = found
        ? `(목표 달성: ${targetLabel})`
        : `(목표 미달성: ${targetLabel} · ${MAX_WEEKS.toLocaleString()}주 수급 후 중단)`;
    const upgraded = results.filter(r => r.upgraded).length;
    const byGrade = {};
    for (const r of results) byGrade[r.grade] = (byGrade[r.grade] || 0) + 1;
    const stat = (label, value) => `<div class="summary-item"><span class="summary-target">${label}</span><span class="summary-value">${value}</span></div>`;
    fusionResultGrid.innerHTML = `<div class="quest-totals">
            ${found ? stat('획득', escapeHtml(found.name)) : ''}
            ${stat('자동 수급', `${weeks.toLocaleString()}주${weeks >= 52 ? ` (약 ${(weeks / 52).toFixed(1)}년)` : ''}`)}
            ${stat('합성', `${results.length.toLocaleString()}회`)}
            ${stat('등급업', `${upgraded.toLocaleString()}회`)}
            ${stat('비용', formatBit(sumCost(results)))}
        </div>
        <div class="stat-grade-list">${gradeChips(byGrade)}</div>`;
}

const sumCost = results => results.reduce((s, r) => s + r.cost, 0);

function renderCards(results, requested) {
    let suffix = `(${results.length}회 합성 · 비용 ${formatBit(sumCost(results))})`;
    if (requested > results.length) suffix += ` · 재료 부족으로 ${requested - results.length}회 중단`;
    fusionResultCount.textContent = suffix;
    const cards = results.length > 1 ? [revealAllRowHTML()] : [];
    for (const r of results) {
        cards.push(flipCardWrap(buildFlipBack(r), gradeClass(r.grade)));
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
    return face(it.grade, it.name) + (it.upgraded ? '<span class="upgrade-tag">⬆ 등급업</span>' : '');
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
    let next = null;
    for (const g of activeFusions()) {
        const n = Math.floor(countOfGrade(g.inputGrade) / g.inputCount);
        if (n && !next) next = g;
        possible += n;
    }
    fuse10Btn.disabled = possible === 0;
    fusionAvail.textContent = possible > 0 ? `현재 재료로 ${possible}회 합성 가능 · 다음 합성: ${next.inputGrade} (${formatBit(next.cost)})` : '합성 가능한 모듈이 없습니다.';
}

function renderInventory() {
    const items = Object.values(state.items).sort((a, b) =>
        gradeRank(a.grade) - gradeRank(b.grade) || a.name.localeCompare(b.name));
    const counts = {};
    for (const it of items) counts[it.grade] = (counts[it.grade] || 0) + it.count;
    const total = items.reduce((s, it) => s + it.count, 0);
    invCount.textContent = `모듈: ${total.toLocaleString()}개 · 누적 비용 ${formatBit(state.spent)}`;
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

el('grantDailyBtn').addEventListener('click', () => grant(() => addBoxes(DAILY)));
el('grantWeeklyBtn').addEventListener('click', () => grant(() => addBoxes(WEEKLY)));
el('grantWeekBtn').addEventListener('click', () => grant(addWeekBoxes));
openBoxesBtn.addEventListener('click', openBoxes);
fuse10Btn.addEventListener('click', () => fuse(FUSION_BATCH_SIZE));
fuseTargetBtn.addEventListener('click', fuseToTarget);
targetGradeSel.addEventListener('change', populateTargetOptions);
el('clearInvBtn').addEventListener('click', () => {
    if (!confirm('상자와 모듈 인벤토리를 모두 초기화합니다. 계속하시겠습니까?')) return;
    state = { boxes: {}, items: {}, spent: 0 };
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
populateTargetOptions();
render();
