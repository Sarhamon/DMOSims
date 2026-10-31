// 돌파 전역 최적 DP의 순수 로직 (DOM·워커 비의존 → 워커와 노드 테스트에서 공용).
//
// 상태 = (위치 p0..p4 각 0~10, 확률단계 0~5). 40회 캡은 무시한다:
//   실측상 캡 포함/무시의 최적값 차이가 0.0002 미만(최적 플레이는 거의 항상 40회 전에
//   끝나거나 멈춤) → 캡 무시 DP가 사실상 진짜 전역 최적이면서 상태수 15배·시간 100배 절약.
// 목적함수 = Σ행 (수집값 / |행 최대치|)의 기대값. '멈춤'(0) 옵션 포함.

import { CELLS, STAGE_TABLE, PROB_MIN, PROB_MAX } from './breakthroughData.js';

const NPOS = 11 * 11 * 11 * 11 * 11; // 161051
const idx = (p0, p1, p2, p3, p4) => ((((p0 * 11 + p1) * 11 + p2) * 11 + p3) * 11 + p4);

// 기대값이 사실상 동률(노이즈)일 때 증가행 우선 추천하기 위한 허용오차.
const TIE_EPS = 0.005;

// 옵션의 정적 정보: 정규화 분모 den=|행 최대치|, 칸값 누적합 prefix.
export function makeInfos(opts) {
    return opts.map(o => {
        const bonus = o.bonus ?? {};
        const rowMax = o.base.reduce((a, b) => a + b, 0) +
            Object.values(bonus).reduce((a, b) => a + b, 0);
        const den = Math.abs(rowMax) || 1;
        const prefix = [0];
        for (let k = 0; k < CELLS; k++) prefix[k + 1] = prefix[k] + (o.base[k] + (bonus[k] ?? 0));
        return { den, prefix, kind: o.kind }; // kind는 동률 타이브레이크용(빌드 땐 미사용)
    });
}
const rangeNorm = (info, a, b) => (info.prefix[b] - info.prefix[a]) / info.den;

// 전역 최적 가치표 빌드. 반환: Float64Array[NPOS*6], V[idx*6 + (prob-25)/10].
// 위치합 내림차순(각 좌표 10→0 중첩) = 자식(한 좌표 더 큼)이 먼저 채워지는 위상순서.
export function buildDP(opts) {
    const infos = makeInfos(opts);
    const V = new Float64Array(NPOS * 6);
    for (let p0 = 10; p0 >= 0; p0--)
    for (let p1 = 10; p1 >= 0; p1--)
    for (let p2 = 10; p2 >= 0; p2--)
    for (let p3 = 10; p3 >= 0; p3--)
    for (let p4 = 10; p4 >= 0; p4--) {
        const pos = [p0, p1, p2, p3, p4];
        const base = idx(p0, p1, p2, p3, p4) * 6;
        for (let pi = 0; pi < 6; pi++) {
            const prob = 25 + pi * 10;
            const [s1, s2, s3] = STAGE_TABLE[prob];
            const di = (Math.max(PROB_MIN, prob - 10) - 25) / 10;
            const ui = (Math.min(PROB_MAX, prob + 10) - 25) / 10;
            let best = 0; // 멈춤
            for (let i = 0; i < 5; i++) {
                if (pos[i] >= CELLS) continue;
                const q = actionQ(V, infos, pos, i, prob, s1, s2, s3, di, ui);
                if (q > best) best = q;
            }
            V[base + pi] = best;
        }
    }
    return V;
}

// 한 행 i 클릭의 기대값: 즉시 정규화 이득 + 다음 상태의 최적값 V.
// 성공 adv칸(prob↓, 값 획득) / 실패(+1칸, prob↑, 값 없음). 실패 자식 = adv1 위치.
function actionQ(V, infos, pos, i, prob, s1, s2, s3, di, ui) {
    const info = infos[i];
    const p = pos[i];
    const a1 = Math.min(p + 1, CELLS), a2 = Math.min(p + 2, CELLS), a3 = Math.min(p + 3, CELLS);
    const o = pos[i];
    pos[i] = a1; const c1 = idx(pos[0], pos[1], pos[2], pos[3], pos[4]) * 6;
    pos[i] = a2; const c2 = idx(pos[0], pos[1], pos[2], pos[3], pos[4]) * 6;
    pos[i] = a3; const c3 = idx(pos[0], pos[1], pos[2], pos[3], pos[4]) * 6;
    pos[i] = o;
    return (s1 / 100) * (rangeNorm(info, p, a1) + V[c1 + di])
        + (s2 / 100) * (rangeNorm(info, p, a2) + V[c2 + di])
        + (s3 / 100) * (rangeNorm(info, p, a3) + V[c3 + di])
        + ((100 - prob) / 100) * V[c1 + ui]; // 실패: a1칸으로, 이득 0
}

// 현재 상태에서 최적 행을 1-스텝 평가로 결정. 반환 { best, stop, qs }.
export function bestAction(V, infos, pos, prob) {
    const [s1, s2, s3] = STAGE_TABLE[prob];
    const di = (Math.max(PROB_MIN, prob - 10) - 25) / 10;
    const ui = (Math.min(PROB_MAX, prob + 10) - 25) / 10;
    const qs = pos.map(() => null);
    let best = 0; // 멈춤 기준선
    let bestI = -1;
    for (let i = 0; i < pos.length; i++) {
        if (pos[i] >= CELLS) continue;
        const q = actionQ(V, infos, pos, i, prob, s1, s2, s3, di, ui);
        qs[i] = q;
        if (q > best) { best = q; bestI = i; }
    }
    // 동률(노이즈)이면 증가행 우선: 최선 근처의 증가행이 있으면 그쪽.
    if (bestI >= 0 && infos[bestI].kind !== 'inc') {
        for (let i = 0; i < pos.length; i++) {
            if (qs[i] !== null && infos[i].kind === 'inc' && qs[i] >= best - TIE_EPS) { bestI = i; break; }
        }
    }
    return { best: bestI, stop: bestI === -1, qs };
}
