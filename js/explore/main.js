import { MIN_LEVEL, MAX_LEVEL, MAX_SELECTABLE_LEVEL, JOURNAL_MULTIPLIERS } from './data.js';
import { expTable } from './expTable.js';
import { computeResults, computeTargetPlan } from './calc.js';
import { renderResults, renderComingSoon, renderMaxLevel, renderTargetPlan, toggleLockedVisibility } from './render.js';
import { initTheme } from '../theme.js';

const TARGET_MAX = 170;
const ROUTES = ['/normal', '/target'];
const DEFAULT_ROUTE = '/normal';

function currentRoute() {
    const hash = window.location.hash.slice(1);
    return ROUTES.includes(hash) ? hash : DEFAULT_ROUTE;
}

function navigate() {
    const route = currentRoute();
    document.querySelectorAll('[data-view]').forEach(el => {
        el.hidden = el.dataset.view !== route;
    });
    document.querySelectorAll('[data-route]').forEach(el => {
        el.classList.toggle('active', el.dataset.route === route);
    });
}

// 경험치 % 입력: 0 이상 100 미만으로 맞추고 입력칸도 고쳐 쓴다.
function readPercent(input) {
    let pct = parseFloat(input.value);
    if (isNaN(pct) || pct < 0) pct = 0;
    if (pct >= 100) pct = 99.9999;
    if (pct !== parseFloat(input.value)) input.value = pct;
    return pct;
}

function readJournalMultiplier(name) {
    const selected = document.querySelector(`input[name="${name}"]:checked`);
    return JOURNAL_MULTIPLIERS[selected ? selected.value : '0'] ?? 1.0;
}

function readNormalInputs() {
    const lvInput = document.getElementById('userLevel');
    const pctInput = document.getElementById('currentPercent');

    let lv = parseInt(lvInput.value);
    if (!lv) lv = MIN_LEVEL;
    if (lv > MAX_SELECTABLE_LEVEL) lv = MAX_SELECTABLE_LEVEL;
    if (lv !== parseInt(lvInput.value)) lvInput.value = lv;

    return {
        level: lv,
        currentPct: readPercent(pctInput),
        expMultiplier: readJournalMultiplier('journal-normal'),
    };
}

function calculate() {
    const { level, currentPct, expMultiplier } = readNormalInputs();

    if (level === MAX_LEVEL) {
        renderMaxLevel();
        return;
    }
    if (expTable[level] === 0) {
        renderComingSoon();
        return;
    }

    const results = computeResults(level, currentPct, expMultiplier);
    renderResults(results, expTable[level]);
}

function readTargetInputs() {
    const curLvInput = document.getElementById('targetCurrentLevel');
    const curPctInput = document.getElementById('targetCurrentPercent');
    const tgtLvInput = document.getElementById('targetGoalLevel');

    let curLv = parseInt(curLvInput.value);
    if (!curLv || curLv < MIN_LEVEL) curLv = MIN_LEVEL;
    if (curLv > TARGET_MAX - 1) curLv = TARGET_MAX - 1;

    let tgtLv = parseInt(tgtLvInput.value);
    if (!tgtLv) tgtLv = TARGET_MAX;
    if (tgtLv > TARGET_MAX) tgtLv = TARGET_MAX;
    if (tgtLv <= curLv) tgtLv = curLv + 1;

    if (curLv !== parseInt(curLvInput.value)) curLvInput.value = curLv;
    if (tgtLv !== parseInt(tgtLvInput.value)) tgtLvInput.value = tgtLv;

    return {
        currentLevel: curLv,
        currentPct: readPercent(curPctInput),
        targetLevel: tgtLv,
        expMultiplier: readJournalMultiplier('journal-target'),
    };
}

function calculateTarget() {
    const { currentLevel, currentPct, targetLevel, expMultiplier } = readTargetInputs();
    const plan = computeTargetPlan(currentLevel, currentPct, targetLevel, expMultiplier);
    renderTargetPlan(plan, currentLevel, targetLevel);
}

document.getElementById('resultBody').addEventListener('click', e => {
    if (e.target.closest('.divider-row')) toggleLockedVisibility();
});
document.querySelectorAll('#userLevel, #currentPercent').forEach(input => {
    input.addEventListener('keydown', e => {
        if (e.key === 'Enter') calculate();
    });
});
document.querySelectorAll('#targetCurrentLevel, #targetCurrentPercent, #targetGoalLevel').forEach(input => {
    input.addEventListener('keydown', e => {
        if (e.key === 'Enter') calculateTarget();
    });
});
document.getElementById('normalCalcBtn').addEventListener('click', calculate);
document.getElementById('targetCalcBtn').addEventListener('click', calculateTarget);
window.addEventListener('hashchange', navigate);

initTheme();
navigate();
calculate();
calculateTarget();
