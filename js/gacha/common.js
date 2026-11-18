// 가챠 페이지 공용: 등급 정렬·표시, 가중 랜덤, 결과 카드 자동 공개.
import { escapeHtml } from '../format.js';

export const GRADE_ORDER = ['U', 'SSS+', 'SSS', 'SS+', 'SS', 'S+', 'S', 'A+', 'A', 'N'];

export function gradeRank(grade) {
    const i = GRADE_ORDER.indexOf(grade);
    return i === -1 ? 999 : i;
}

export const byGradeRank = (a, b) => gradeRank(a) - gradeRank(b);

export function gradeClass(grade) {
    return 'grade-' + grade.replace('+', 'plus');
}

// probability 합계 기준으로 1개 뽑기.
export function pullWeighted(items) {
    const total = items.reduce((s, it) => s + it.probability, 0);
    const roll = Math.random() * total;
    let acc = 0;
    for (const item of items) {
        acc += item.probability;
        if (roll < acc) return item;
    }
    return items[items.length - 1];
}

// "U 2 / SSS+ 18 / ..." 형태의 등급별 종류 수.
export function gradeSummary(items) {
    const byGrade = {};
    for (const it of items) byGrade[it.grade] = (byGrade[it.grade] || 0) + 1;
    return Object.keys(byGrade).sort(byGradeRank).map(g => `${g} ${byGrade[g]}`).join(' / ');
}

// { 등급: 개수 } → 등급 칩 HTML.
export function gradeChips(counts) {
    return Object.keys(counts).sort(byGradeRank)
        .map(g => `<span class="stat-grade ${gradeClass(g)}"><span class="g-label">${escapeHtml(g)}</span><span class="g-count">${counts[g].toLocaleString()}</span></span>`)
        .join('');
}

// 모듈 합성 비용 표기 (M 단위, 1T = 1000M).
export function formatCostM(m) {
    const t = Math.floor(m / 1000), rest = m % 1000;
    if (!t) return `${rest}M`;
    return rest ? `${t.toLocaleString()}T ${rest}M` : `${t.toLocaleString()}T`;
}

// "자동 공개"가 켜져 있으면 방금 그린 카드를 모두 공개.
export function autoReveal(grid, checkbox) {
    if (!checkbox?.checked) return;
    const btn = grid.querySelector('.reveal-all-btn');
    if (btn) btn.click();
    else grid.querySelector('.flip-card:not(.revealed)')?.click();
}
