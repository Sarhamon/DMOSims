import { initTheme } from '../theme.js';
import { escapeHtml } from '../format.js';
import { draws } from './drawData.js';
import { addItems, getTotalCount, subscribe } from './inventory.js';
import { flipCardWrap, revealAllRowHTML, setupFlip } from './flipCard.js';
import { maybeUpgrade } from './upgrade.js';
import { byGradeRank, gradeClass, pullWeighted, gradeSummary, autoReveal } from './common.js';

const drawMeta = document.getElementById('drawMeta');
const pull1Btn = document.getElementById('pull1Btn');
const resetBtn = document.getElementById('resetBtn');
const autoRevealCheck = document.getElementById('autoRevealCheck');
const statTotal = document.getElementById('statTotal');
const statGradeList = document.getElementById('statGradeList');
const resultGrid = document.getElementById('resultGrid');
const resultCount = document.getElementById('resultCount');

let currentDraw = null;
let stats = { tickets: 0, total: 0, byGrade: {} };

function populatePicker() {
    const picker = document.getElementById('drawPicker');
    const activeSection = document.getElementById('drawActiveSection');
    picker.innerHTML = draws.map((d, i) =>
        `<label class="buff-toggle">
            <input type="radio" name="draw-pick" value="${i}" class="buff-check">
            <span class="buff-toggle-name">${escapeHtml(d.name).replace('디지털 드로우', '<br>디지털 드로우')}</span>
        </label>`
    ).join('');
    picker.querySelectorAll('input').forEach(radio => {
        radio.addEventListener('change', () => {
            currentDraw = draws[parseInt(radio.value, 10)];
            updateDrawMeta();
            resetStats();
            activeSection.hidden = false;
        });
    });
}

function updateDrawMeta() {
    if (!currentDraw) { drawMeta.textContent = '—'; return; }
    drawMeta.textContent = `1회당 ${currentDraw.pullCount}개 · 총 ${currentDraw.items.length}종 · ${gradeSummary(currentDraw.items)}`;
    pull1Btn.textContent = `1회 뽑기 (${currentDraw.pullCount}개)`;
}

function resetStats() {
    stats = { tickets: 0, total: 0, byGrade: {} };
    renderStats();
    renderResults([]);
}

function renderStats() {
    statTotal.textContent = `${stats.total.toLocaleString()}개 (${stats.tickets.toLocaleString()}회 사용)`;
    const grades = Object.keys(stats.byGrade).sort(byGradeRank);
    if (grades.length === 0) {
        statGradeList.innerHTML = stats.total > 0
            ? '<span class="empty-msg-inline">카드를 공개하면 등급이 표시됩니다.</span>'
            : '<span class="empty-msg-inline">아직 뽑은 결과가 없습니다.</span>';
        return;
    }
    const revealedTotal = Object.values(stats.byGrade).reduce((s, v) => s + v, 0);
    statGradeList.innerHTML = grades.map(g => {
        const count = stats.byGrade[g];
        const pct = ((count / revealedTotal) * 100).toFixed(2);
        return `<span class="stat-grade ${gradeClass(g)}">
            <span class="g-label">${escapeHtml(g)}</span>
            <span class="g-count">${count}</span>
            <span class="g-pct">${pct}%</span>
        </span>`;
    }).join('');
}

function renderResults(items) {
    resultCount.textContent = items.length ? `(${items.length}회)` : '';
    resultGrid.classList.toggle('cols-3', items.length === 6);
    if (!items.length) {
        resultGrid.innerHTML = '<div class="empty-msg">뽑기 버튼을 눌러주세요.</div>';
        return;
    }
    const parts = [];
    if (items.length > 1) parts.push(revealAllRowHTML());
    for (const it of items) {
        let back;
        let extraClass;
        if (it._upgraded) {
            back = `<div class="back-stage back-stage-original ${gradeClass(it._orig.grade)}">
                <span class="r-grade">${escapeHtml(it._orig.grade)}</span>
                <span class="r-name">${escapeHtml(it._orig.name)}</span>
            </div>
            <div class="back-stage back-stage-upgraded ${gradeClass(it.grade)}">
                <span class="r-grade">${escapeHtml(it.grade)}</span>
                <span class="r-name">${escapeHtml(it.name)}</span>
                <span class="upgrade-tag">⬆ 등급업</span>
            </div>`;
            extraClass = 'upgraded';
        } else {
            back = `<span class="r-grade">${escapeHtml(it.grade)}</span>
                <span class="r-name">${escapeHtml(it.name)}</span>`;
            extraClass = '';
        }
        parts.push(flipCardWrap(back, gradeClass(it.grade), extraClass, { grade: escapeHtml(it.grade) }));
    }
    resultGrid.innerHTML = parts.join('');
    setupFlip(resultGrid, onCardReveal);
    autoReveal(resultGrid, autoRevealCheck);
}

function onCardReveal(card) {
    const grade = card.dataset.grade;
    if (!grade) return;
    stats.byGrade[grade] = (stats.byGrade[grade] || 0) + 1;
    renderStats();
}

function pull(tickets) {
    if (!currentDraw) return;
    const totalItems = tickets * currentDraw.pullCount;
    const results = [];
    for (let i = 0; i < totalItems; i++) {
        results.push(maybeUpgrade(pullWeighted(currentDraw.items), currentDraw.items));
    }
    stats.tickets += tickets;
    stats.total += totalItems;
    addItems(results.map(r => ({ name: r.name, grade: r.grade, category: 'evolution' })));
    renderStats();
    renderResults(results);
}

function updateInvCount() {
    const el = document.getElementById('invCount');
    if (el) el.textContent = `인벤토리: ${getTotalCount().toLocaleString()}개`;
}

pull1Btn.addEventListener('click', () => pull(1));
resetBtn.addEventListener('click', resetStats);
subscribe(updateInvCount);

initTheme();
populatePicker();
updateInvCount();
