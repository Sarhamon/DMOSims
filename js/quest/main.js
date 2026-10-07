import { lastDailyReset, isStale } from './reset.js';
import { loadTheme, toggleTheme } from '../theme.js';

const GRADES = [
    { key: 'NA',  label: 'N~A+',   cls: 'na' },
    { key: 'S',   label: 'S~S+',   cls: 's' },
    { key: 'SP',  label: 'S+~SS',  cls: 'sp' },
    { key: 'SS',  label: 'SS~SS+', cls: 'ss' },
];
// id는 저장 키로 쓰이므로 바꾸지 않는다.
const DAILY = [
    { id: 'd1', npc: '<닷트 대장> 고동혁', name: '디지소울 서킷', where: '요코하마 마을, 카이저의 영역, 프론티어 지역을 제외한 전 지역', grade: 'NA', n: 3 },
    { id: 'd2', npc: '<카이저의 영역 안내자> 브이몬', name: '카이저의 영역', where: '카이저의 영역[NORMAL]', grade: 'NA', n: 2 },
    { id: 'd3', npc: '<디지털 월드> 보코몬', name: '터미널 지하', where: '터미널 지하[NORMAL]', grade: 'NA', n: 2 },
    { id: 'd4', npc: '<시작의 숲> 신태일', name: '바다의 지배자! 메탈시드라몬', where: '해룡의 지배 구역[NORMAL]', grade: 'NA', n: 3 },
    { id: 'd5', npc: '<꼭두각시의 숲> 신태일', name: '숲의 지배자! 피노키몬', where: '인형의 집 앞마당[NORMAL]', grade: 'NA', n: 3 },
    { id: 'd6', npc: '<지하 도시> 신태일', name: '도시의 지배자! 파워드라몬', where: '제국의 뒷면[NORMAL]', grade: 'NA', n: 3 },
    { id: 'd7', npc: '<악몽의 꼭대기> 신태일', name: '악몽의 꼭두각시! 피에몬', where: '광대의 무대[NORMAL]', grade: 'NA', n: 3 },
    { id: 'd8', npc: '<무의 공간> 신태일', name: '어둠의 극치! 아포카리몬', where: '무의 공간[NORMAL]', grade: 'NA', n: 3 },
    { id: 'd9', npc: '<베르단디 터미널> 듀크몬X', name: '로얄 베이스(Hard)', where: '로얄 베이스[HARD]', grade: 'S', n: 2 },
];
const WEEKLY = [
    { id: 'w1',  npc: '<카이저의 영역 안내자> 브이몬', name: '카이저의 영역', where: '카이저의 영역[NORMAL]', grade: 'NA', n: 6 },
    { id: 'w2',  npc: '<디지털 월드> 보코몬', name: '터미널 지하', where: '터미널 지하[NORMAL]', grade: 'NA', n: 6 },
    { id: 'w3',  npc: '<D-터미널> 길몬', name: '사성수 던전 [노멀]', where: '사성수 던전[NORMAL], 황룡몬 던전[NORMAL]', grade: 'NA', n: 6 },
    { id: 'w4',  npc: '<베르단디 터미널> 듀크몬X', name: '로얄 베이스(Hard)', where: '로얄 베이스[HARD]', grade: 'S', n: 4 },
    { id: 'w5',  npc: '<D-터미널> 보코몬', name: '파괴와 재생 [쉬움]', where: '파괴와 재생[EASY]', grade: 'S', n: 4 },
    { id: 'w6',  npc: '<D-터미널> 보코몬', name: '파괴와 재생 (1)', where: '파괴와 재생[NORMAL]', grade: 'S', n: 6 },
    { id: 'w7',  npc: '<D-터미널> 브이몬', name: '디지몬 카이저', where: '디지몬 카이저[NORMAL]', grade: 'SP', n: 4 },
    { id: 'w8',  npc: '<D-터미널> 은하준', name: '상점가(Easy)', where: '상점가[EASY]', grade: 'SP', n: 4 },
    { id: 'w9',  npc: '<D-터미널> 은하준', name: '상점가(Normal)', where: '상점가[NORMAL]', grade: 'SP', n: 6 },
    { id: 'w10', npc: '<D-터미널> 브이몬', name: '카이저의 기지(Easy)', where: '카이저의 기지[EASY]', grade: 'SS', n: 1 },
    { id: 'w11', npc: '<D-터미널> 브이몬', name: '카이저의 기지(Normal)', where: '카이저의 기지[NORMAL]', grade: 'SS', n: 2 },
    { id: 'w12', npc: '<D-터미널> 장한솔', name: '다크 웹', where: '다크 웹[NORMAL]', grade: 'SS', n: 2 },
    { id: 'w13', npc: '<D-터미널> 장한솔', name: '네버랜드', where: '네버랜드[NORMAL]', grade: 'SS', n: 2 },
    { id: 'w14', npc: '<D-터미널> 브이몬', name: '악몽 [Hard]', where: '악몽[Hard]', grade: 'SS', n: 3 },
];
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
