// 모듈 퀘스트 초기화 시각 계산 — 한국 시간(KST, UTC+9, 서머타임 없음) 기준.
//   일일: 매일 00:00
//   주간: 매주 화요일 08:00
// GitHub Pages는 서버가 없으므로, 페이지가 열릴 때(및 열려 있는 동안 주기적으로)
// 마지막 저장 시각이 직전 초기화 시각보다 이전이면 체크를 비우는 방식으로 쓴다.

const HOUR = 3600 * 1000;
const DAY = 24 * HOUR;
const KST = 9 * HOUR;

const WEEKLY_DOW = 2;       // 0=일 … 2=화
const WEEKLY_HOUR = 8;

// now 시점 기준 가장 최근 일일 초기화 시각(ms).
export function lastDailyReset(now = Date.now()) {
    return Math.floor((now + KST) / DAY) * DAY - KST;
}

// now 시점 기준 가장 최근 주간 초기화 시각(ms).
export function lastWeeklyReset(now = Date.now()) {
    const day = Math.floor((now + KST - WEEKLY_HOUR * HOUR) / DAY);
    const dow = (day + 4) % 7; // 1970-01-01은 목요일
    const daysSince = (dow - WEEKLY_DOW + 7) % 7;
    return (day - daysSince) * DAY + WEEKLY_HOUR * HOUR - KST;
}

// savedAt(ms) 이후 해당 종류의 초기화가 지났는지.
export function isStale(savedAt, kind, now = Date.now()) {
    const last = kind === 'weekly' ? lastWeeklyReset(now) : lastDailyReset(now);
    return !savedAt || savedAt < last;
}
