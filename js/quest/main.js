import { lastDailyReset, isStale } from './reset.js';
import { loadTheme, toggleTheme } from '../theme.js';
import { GRADES, DAILY, WEEKLY } from './questData.js';

const STORE_KEY = 'dmo-quest-check:v1';
const KST = 9 * 3600 * 1000;

// 한국 시간 기준 오늘 날짜 (YYYY-MM-DD)
function todayKey() {
    return new Date(lastDailyReset() + KST).toISOString().slice(0, 10);
}
function load() {
    let s = null;
    try { s = JSON.parse(localStorage.getItem(STORE_KEY)); } catch {}
    if (!s || typeof s !== 'object') s = {};
    return {
        dailyDate: s.dailyDate || todayKey(),
        daily: s.daily || {},
        weekly: s.weekly || {},
        resets: Array.isArray(s.resets) ? s.resets : [],
    };
}
function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch {}
}
let state = load();

function rollDaily() {
    const t = todayKey();
    if (state.dailyDate !== t) { state.dailyDate = t; state.daily = {}; save(); }
}
// 마지막 초기화 이후 화요일 8시(KST)가 지났으면 주간 체크를 비운다.
function rollWeekly() {
    const last = state.resets.length ? Date.parse(state.resets[state.resets.length - 1]) : 0;
    if (isStale(last, 'weekly')) {
        state.weekly = {};
        state.resets.push(new Date().toISOString());
        state.resets = state.resets.slice(-10);
        save();
    }
}

const WEEKDAY = ['일', '월', '화', '수', '목', '금', '토'];
function fmt(iso) {
    const d = new Date(iso);
    return `${d.getMonth() + 1}월 ${d.getDate()}일 (${WEEKDAY[d.getDay()]}) ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function renderList(listEl, quests, done, onToggle) {
    listEl.innerHTML = '';
    for (const q of quests) {
        const g = GRADES.find(x => x.key === q.grade);
        const on = !!done[q.id];
        const label = document.createElement('label');
        label.className = `quest-row${on ? ' done' : ''}`;
        label.innerHTML = `
            <input type="checkbox"${on ? ' checked' : ''}>
            <span class="quest-info"><span class="quest-name"></span><span class="quest-meta"></span></span>
            <span class="quest-reward"><span class="quest-grade grade-${g.cls}">${g.label}</span> × ${q.n}</span>`;
        label.querySelector('.quest-name').textContent = q.name;
        label.querySelector('.quest-meta').textContent = `${q.npc} · ${q.where}`;
        label.querySelector('input').addEventListener('change', e => onToggle(q.id, e.target.checked));
        listEl.appendChild(label);
    }
}
function renderTotals(el, quests, done) {
    el.innerHTML = '';
    for (const g of GRADES) {
        const qs = quests.filter(q => q.grade === g.key);
        if (!qs.length) continue;
        const max = qs.reduce((a, q) => a + q.n, 0);
        const got = qs.filter(q => done[q.id]).reduce((a, q) => a + q.n, 0);
        const div = document.createElement('div');
        div.className = 'summary-item';
        div.innerHTML = `<span class="summary-target quest-grade grade-${g.cls}">${g.label}</span><span class="summary-value">${got} / ${max}</span>`;
        el.appendChild(div);
    }
}
function countText(quests, done) {
    return `${quests.filter(q => done[q.id]).length} / ${quests.length}`;
}

function render() {
    rollDaily();
    rollWeekly();
    const now = new Date();
    document.getElementById('dailySub').textContent = `${now.getMonth() + 1}월 ${now.getDate()}일 (${WEEKDAY[now.getDay()]}) · 매일 0시 자동 초기화`;
    document.getElementById('dailyCount').textContent = countText(DAILY, state.daily);
    renderList(document.getElementById('dailyList'), DAILY, state.daily, (id, v) => {
        rollDaily();
        if (v) state.daily[id] = true; else delete state.daily[id];
        save(); render();
    });
    renderTotals(document.getElementById('dailyTotals'), DAILY, state.daily);

    document.getElementById('weeklyCount').textContent = countText(WEEKLY, state.weekly);
    renderList(document.getElementById('weeklyList'), WEEKLY, state.weekly, (id, v) => {
        if (v) state.weekly[id] = true; else delete state.weekly[id];
        save(); render();
    });
    renderTotals(document.getElementById('weeklyTotals'), WEEKLY, state.weekly);

    const tl = document.getElementById('resetTimeline');
    tl.innerHTML = '';
    const recent = state.resets.slice(-2).reverse();
    if (!recent.length) {
        tl.innerHTML = '<li>아직 초기화 기록이 없어요.</li>';
    } else {
        recent.forEach((iso, i) => {
            const li = document.createElement('li');
            li.textContent = `${i === 0 ? '최근 초기화' : '이전 초기화'} · ${fmt(iso)}`;
            tl.appendChild(li);
        });
    }
}

document.getElementById('weeklyReset').addEventListener('click', () => {
    if (!confirm('주간 퀘스트 체크를 모두 지울까요?')) return;
    state.weekly = {};
    state.resets.push(new Date().toISOString());
    state.resets = state.resets.slice(-10);
    save(); render();
});
document.addEventListener('visibilitychange', () => { if (!document.hidden) render(); });
setInterval(render, 60 * 1000);
window.addEventListener('storage', e => { if (e.key === STORE_KEY) { state = load(); render(); } });
document.querySelector('.theme-toggle').addEventListener('click', toggleTheme);

loadTheme();
render();
