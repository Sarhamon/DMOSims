import { initTheme } from '../theme.js';
import { escapeHtml } from '../format.js';
import { fusions } from './fusionData.js';
import {
    addItems, consumeItems, getAll, getByGrade, getCountByGrade,
    getTotalCount, clearAll, getPity, incrementPity, resetPity, subscribe
} from './inventory.js';
import { flipCardWrap, revealAllRowHTML, setupFlip } from './flipCard.js';
import { maybeUpgrade } from './upgrade.js';
import { gradeRank, gradeClass, pullWeighted, gradeChips, autoReveal } from './common.js';

const FUSION_BATCH_SIZE = 10;

const fusionAvail = document.getElementById('fusionAvail');
const fuse10Btn = document.getElementById('fuse10Btn');
const pityDisplay = document.getElementById('pityDisplay');
const fusionResultGrid = document.getElementById('fusionResultGrid');
const fusionResultCount = document.getElementById('fusionResultCount');
const autoRevealCheck = document.getElementById('autoRevealCheck');
const invCount = document.getElementById('invCount');
const clearInvBtn = document.getElementById('clearInvBtn');
const invSections = [
    {
        category: 'evolution',
        countEl: document.getElementById('invEvolutionCount'),
        summaryEl: document.getElementById('invEvolutionSummary'),
        gridEl: document.getElementById('invEvolutionGrid'),
        emptyMsg: '드로우/융합 결과가 이곳에 쌓입니다.',
    },
    {
        category: 'other',
        countEl: document.getElementById('invOtherCount'),
        summaryEl: document.getElementById('invOtherSummary'),
        gridEl: document.getElementById('invOtherGrid'),
        emptyMsg: '데이터 소환 결과가 이곳에 쌓입니다.',
    },
];

const sortedFusions = [...fusions].sort((a, b) => gradeRank(b.inputGrade) - gradeRank(a.inputGrade));

let currentMode = 'auto';

function getActiveFusions() {
    if (currentMode === 'auto') return sortedFusions;
    return sortedFusions.filter(g => g.inputGrade === currentMode);
}

function pickAutoConsume(grade, count) {
    const itemsCopy = getByGrade(grade, 'evolution').map(it => ({ ...it }))
        .sort((a, b) => b.count - a.count);
    const picked = [];
    for (const item of itemsCopy) {
        while (item.count > 0 && picked.length < count) {
            picked.push(item.name);
            item.count--;
        }
        if (picked.length >= count) break;
    }
    return picked;
}

function fuseOne(group, consumedNames) {
    consumeItems(consumedNames);
    const result = maybeUpgrade(pullWeighted(group.results), group.results);
    addItems([{ name: result.name, grade: result.grade, category: 'evolution' }]);
    let pityResult = null;
    if (group.pity) {
        const counter = incrementPity(group.name);
        if (counter >= group.pity.every) {
            pityResult = maybeUpgrade(pullWeighted(group.pity.results), group.pity.results);
            addItems([{ name: pityResult.name, grade: pityResult.grade, category: 'evolution' }]);
            resetPity(group.name);
        }
    }
    return { result, pityResult, sourceGrade: group.inputGrade };
}

function updateFusionAvail() {
    let totalPossible = 0;
    for (const group of getActiveFusions()) {
        const avail = getByGrade(group.inputGrade, 'evolution').reduce((s, i) => s + i.count, 0);
        totalPossible += Math.floor(avail / group.inputCount);
    }
    const enabled = totalPossible > 0;
    if (fuse10Btn) fuse10Btn.disabled = !enabled;
    if (fusionAvail) {
        fusionAvail.textContent = enabled
            ? `총 ${totalPossible}회 합성 가능`
            : '합성 가능한 아이템이 없습니다.';
    }
}

function renderPity() {
    if (!pityDisplay) return;
    const pityGroups = fusions.filter(g => g.pity);
    if (!pityGroups.length) { pityDisplay.innerHTML = ''; return; }
    pityDisplay.innerHTML = pityGroups.map(g => {
        const cur = getPity(g.name);
        const max = g.pity.every;
        const pct = Math.min(100, (cur / max) * 100);
        return `<div class="pity-row">
            <span class="pity-label">${escapeHtml(g.name)} 천장</span>
            <div class="pity-bar"><div class="pity-bar-fill" style="width:${pct}%"></div></div>
            <span class="pity-num">${cur} / ${max}</span>
        </div>`;
    }).join('');
}

function renderInventorySection({ category, countEl, summaryEl, gridEl, emptyMsg }) {
    if (!summaryEl || !gridEl) return;
    const items = getAll(category);
    const total = items.reduce((s, it) => s + it.count, 0);
    if (countEl) countEl.textContent = total > 0 ? `(${total.toLocaleString()}개)` : '';

    const counts = getCountByGrade(category);
    summaryEl.innerHTML = Object.keys(counts).length
        ? gradeChips(counts)
        : '<span class="empty-msg-inline">아이템 없음</span>';

    if (!items.length) {
        gridEl.innerHTML = `<div class="empty-msg">${emptyMsg}</div>`;
        return;
    }
    const sorted = [...items].sort((a, b) => {
        const r = gradeRank(a.grade) - gradeRank(b.grade);
        if (r !== 0) return r;
        return a.name.localeCompare(b.name);
    });

    gridEl.innerHTML = sorted.map(it => {
        const cls = `inv-item ${gradeClass(it.grade)}`;
        return `<div class="${cls}" data-name="${escapeHtml(it.name)}" data-grade="${escapeHtml(it.grade)}">
            <span class="inv-grade">${escapeHtml(it.grade)}</span>
            <span class="inv-name">${escapeHtml(it.name)}</span>
            <span class="inv-num">×${it.count}</span>
        </div>`;
    }).join('');
}

function renderInventory() {
    if (invCount) invCount.textContent = `인벤토리: ${getTotalCount().toLocaleString()}개`;
    for (const section of invSections) renderInventorySection(section);
}

function buildFlipBack(it, gradeSuffix = '', extraHtml = '') {
    if (!it._upgraded) {
        return `<span class="r-grade">${escapeHtml(it.grade)}${gradeSuffix}</span>
            <span class="r-name">${escapeHtml(it.name)}</span>${extraHtml}`;
    }
    return `<div class="back-stage back-stage-original ${gradeClass(it._orig.grade)}">
        <span class="r-grade">${escapeHtml(it._orig.grade)}${gradeSuffix}</span>
        <span class="r-name">${escapeHtml(it._orig.name)}</span>${extraHtml}
    </div>
    <div class="back-stage back-stage-upgraded ${gradeClass(it.grade)}">
        <span class="r-grade">${escapeHtml(it.grade)}${gradeSuffix}</span>
        <span class="r-name">${escapeHtml(it.name)}</span>${extraHtml}
        <span class="upgrade-tag">⬆ 등급업</span>
    </div>`;
}

function renderResults(batches, requestedTickets, executedTickets) {
    if (!fusionResultCount || !fusionResultGrid) return;
    const totalResults = batches.reduce((s, b) => s + 1 + (b.pityResult ? 1 : 0), 0);
    let suffix = `(${executedTickets}회 합성, ${totalResults}개 획득)`;
    if (requestedTickets > executedTickets) {
        suffix += ` · 재료 부족으로 ${requestedTickets - executedTickets}회 중단`;
    }
    fusionResultCount.textContent = suffix;

    const cards = [];
    if (totalResults > 1) cards.push(revealAllRowHTML());
    for (const b of batches) {
        const back = buildFlipBack(b.result);
        const extra = b.result._upgraded ? 'upgraded' : '';
        cards.push(flipCardWrap(back, gradeClass(b.result.grade), extra));
        if (b.pityResult) {
            const pityLabel = `<span class="pity-tag">${escapeHtml(b.sourceGrade)} 합성 천장</span>`;
            const pityBack = buildFlipBack(b.pityResult, ' ⭐', pityLabel);
            const pityExtra = 'pity-card' + (b.pityResult._upgraded ? ' upgraded' : '');
            cards.push(flipCardWrap(pityBack, gradeClass(b.pityResult.grade), pityExtra));
        }
    }
    fusionResultGrid.innerHTML = cards.length ? cards.join('') : '<div class="empty-msg">결과 없음</div>';
    setupFlip(fusionResultGrid);
    autoReveal(fusionResultGrid, autoRevealCheck);
}

function fuseAuto(tickets) {
    const batches = [];
    let executed = 0;
    const activeFusions = getActiveFusions();

    for (let i = 0; i < tickets; i++) {
        let fusedThisRound = false;

        for (const group of activeFusions) {
            const grade = group.inputGrade;
            const avail = getByGrade(grade, 'evolution').reduce((s, item) => s + item.count, 0);

            if (avail >= group.inputCount) {
                const consumed = pickAutoConsume(grade, group.inputCount);
                const fusion = fuseOne(group, consumed);
                batches.push(fusion);
                executed++;
                fusedThisRound = true;
                break;
            }
        }

        if (!fusedThisRound) break;
    }

    if (executed === 0) {
        alert('합성 가능한 아이템이 부족합니다.');
        return;
    }

    renderResults(batches, tickets, executed);
    updateFusionAvail();
}

function onClearInventory() {
    if (!confirm('인벤토리와 천장 카운터를 모두 초기화합니다. 계속하시겠습니까?')) return;
    clearAll();
}

if (fuse10Btn) fuse10Btn.addEventListener('click', () => fuseAuto(FUSION_BATCH_SIZE));
if (clearInvBtn) clearInvBtn.addEventListener('click', onClearInventory);

document.querySelectorAll('input[name="fusion-mode"]').forEach(radio => {
    radio.addEventListener('change', () => {
        currentMode = radio.value;
        updateFusionAvail();
    });
});

subscribe(() => {
    updateFusionAvail();
    renderPity();
    renderInventory();
});

initTheme();
updateFusionAvail();
renderPity();
renderInventory();