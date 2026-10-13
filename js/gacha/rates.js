import { loadTheme, toggleTheme } from '../theme.js';
import { draws } from './drawData.js';
import { summons, tierLabel } from './summonData.js';
import { fusions } from './fusionData.js';
import { moduleFusions } from './moduleData.js';

const GRADE_ORDER = ['U', 'SSS+', 'SSS', 'SS+', 'SS', 'S+', 'S', 'A+', 'A', 'N'];

const tabs = document.getElementById('rateTabs');
const poolSelect = document.getElementById('poolSelect');
const poolMeta = document.getElementById('poolMeta');
const rateList = document.getElementById('rateList');
const rateCount = document.getElementById('rateCount');

let currentCat = 'draw';

function gradeRank(grade) {
    const idx = GRADE_ORDER.indexOf(grade);
    return idx === -1 ? 999 : idx;
}

function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
}

function gradeClass(grade) {
    return 'grade-' + grade.replace('+', 'plus');
}

function formatProb(p) {
    return Number(p).toFixed(2) + '%';
}

function getPools(cat) {
    if (cat === 'draw') return draws;
    if (cat === 'summon') return summons;
    if (cat === 'module') return moduleFusions;
    return fusions;
}

function getItems(pool, cat) {
    if (cat === 'fusion' || cat === 'module') return pool.results;
    return pool.items;
}

function sortItems(items) {
    return [...items].sort((a, b) => {
        const dr = gradeRank(a.grade) - gradeRank(b.grade);
        if (dr !== 0) return dr;
        return b.probability - a.probability;
    });
}

function gradeSummary(items) {
    const byGrade = {};
    for (const it of items) byGrade[it.grade] = (byGrade[it.grade] || 0) + 1;
    const grades = Object.keys(byGrade).sort((a, b) => gradeRank(a) - gradeRank(b));
    return grades.map(g => `${g} ${byGrade[g]}`).join(' / ');
}

function populatePoolSelector() {
    const pools = getPools(currentCat);
    poolSelect.innerHTML = pools.map((p, i) => {
        const label = currentCat === 'summon' && p.pity
            ? `${tierLabel(p.pity.every)} · ${p.name}`
            : p.name;
        return `<option value="${i}">${escapeHtml(label)}</option>`;
    }).join('');
}

function rowHTML(it) {
    return `<div class="rate-row ${gradeClass(it.grade)}">
        <span class="rate-grade">${escapeHtml(it.grade)}</span>
        <span class="rate-name">${escapeHtml(it.name)}</span>
        <span class="rate-prob">${formatProb(it.probability)}</span>
    </div>`;
}

function renderPool() {
    const pools = getPools(currentCat);
    const pool = pools[parseInt(poolSelect.value, 10)];
    if (!pool) {
        rateList.innerHTML = '<div class="empty-msg">풀을 선택해주세요.</div>';
        poolMeta.textContent = '—';
        rateCount.textContent = '';
        return;
    }

    const items = getItems(pool, currentCat);
    const sorted = sortItems(items);

    const metaParts = [`총 ${items.length}종`, gradeSummary(items)];
    if (currentCat === 'draw' && pool.pullCount) {
        metaParts.unshift(`1회당 ${pool.pullCount}개`);
    }
    if (currentCat === 'fusion' || currentCat === 'module') {
        metaParts.unshift(`${pool.inputGrade} ${pool.inputCount}개 → 1개`);
    }
    poolMeta.textContent = metaParts.filter(Boolean).join(' · ');
    rateCount.textContent = `(${items.length}종)`;

    const parts = [sorted.map(rowHTML).join('')];

    if (currentCat === 'summon' && pool.pity) {
        const r = pool.pity.reward;
        parts.push(`<div class="rate-pity-header">${escapeHtml(pool.pity.every)}회마다 천장 보상 (확정)</div>`);
        parts.push(`<div class="rate-row ${gradeClass(r.grade)} rate-pity-row">
            <span class="rate-grade">${escapeHtml(r.grade)}</span>
            <span class="rate-name">${escapeHtml(r.name)}</span>
            <span class="rate-prob">확정</span>
        </div>`);
    }

    if (currentCat === 'fusion' && pool.pity && pool.pity.results) {
        const pityItems = sortItems(pool.pity.results);
        parts.push(`<div class="rate-pity-header">${escapeHtml(pool.pity.every)}회마다 천장 풀 (추가 1개 지급)</div>`);
        parts.push(pityItems.map(rowHTML).join(''));
    }

    rateList.innerHTML = parts.join('');
}

function setCategory(cat) {
    currentCat = cat;
    for (const btn of tabs.querySelectorAll('.mode-btn')) {
        btn.classList.toggle('active', btn.dataset.cat === cat);
    }
    populatePoolSelector();
    renderPool();
}

tabs.addEventListener('click', e => {
    const btn = e.target.closest('.mode-btn');
    if (!btn) return;
    setCategory(btn.dataset.cat);
});
poolSelect.addEventListener('change', renderPool);
document.querySelector('.theme-toggle').addEventListener('click', toggleTheme);

loadTheme();
setCategory('draw');
