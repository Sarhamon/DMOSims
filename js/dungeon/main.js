import { GROUPS } from './data.js';
import { initTheme } from '../theme.js';
import { loadJSON, saveJSON } from '../storage.js';
import { formatBits, escapeHtml } from '../format.js';

const STORE_KEY = 'dmo_dungeon_clears';
const T = 1_000_000; // 1T = 1,000,000B
const bits = t => Math.round(t * T); // 0.2T 같은 소수 보상의 부동소수 오차 제거

const grid = document.getElementById('dungeonGrid');

// 그룹마다 클리어할 던전 하나를 고르면, 공유 보상 횟수를 모두 그 던전에서 받은 것으로 본다.
// 던전 하나짜리 그룹은 카드 자체가 선택 토글, 여러 던전이 묶인 그룹은 카드 안에 던전별 토글.
function render() {
    const saved = loadJSON(STORE_KEY, {});
    const input = (g, gi, d, di) =>
        `<input type="checkbox" name="dg-${gi}" value="${di}"${saved[g.label] === d.name ? ' checked' : ''}>`;
    const stat = (label, value) =>
        `<span class="dg-stat"><span>${label}</span><b>${value}</b></span>`;

    grid.innerHTML = GROUPS.map((g, gi) => {
        if (g.dungeons.length === 1) {
            const d = g.dungeons[0];
            return `<label class="dg-card dg-pick">
                <span class="dg-head">${input(g, gi, d, 0)}<span class="dg-name">${escapeHtml(d.name)}</span></span>
                ${stat('1회 보상', formatBits(bits(d.t)))}
                ${stat('기여도 컷', d.cut ? `${d.cut}억` : '-')}
            </label>`;
        }
        const options = g.dungeons.map((d, di) => `<label class="dg-option dg-pick">
                <span class="dg-head">${input(g, gi, d, di)}<span class="dg-name">${escapeHtml(d.name)}</span></span>
                ${stat('1회 보상', formatBits(bits(d.t)))}
            </label>`).join('');
        return `<div class="dg-card dg-card--group">
            <div class="dg-group-title"><span class="dg-name">${escapeHtml(g.label)}</span><span class="dg-group-meta">보상 ${g.count}회 공유 · 하나만 선택</span></div>
            <div class="dg-options">${options}</div>
        </div>`;
    }).join('');
    calculate();
}

function calculate() {
    let total = 0;
    const state = {};
    GROUPS.forEach((g, gi) => {
        const checked = grid.querySelector(`input[name="dg-${gi}"]:checked`);
        if (!checked) return;
        const d = g.dungeons[Number(checked.value)];
        total += bits(d.t) * g.count;
        // 데이터 순서가 바뀌어도 선택이 유지되도록 순번 대신 이름으로 저장
        state[g.label] = d.name;
    });
    document.getElementById('dungeonTotal').textContent = formatBits(total);
    saveJSON(STORE_KEY, state);
}

// 체크박스로 해제할 수 있게 하되, 그룹당 하나만 선택되도록 같은 그룹의 나머지는 해제
grid.addEventListener('change', e => {
    if (e.target.checked) {
        grid.querySelectorAll(`input[name="${e.target.name}"]`).forEach(el => {
            if (el !== e.target) el.checked = false;
        });
    }
    calculate();
});

render();
initTheme();
