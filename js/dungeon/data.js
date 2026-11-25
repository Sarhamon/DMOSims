// 던전 클리어 보상 데이터
// 같은 그룹의 던전은 입장 횟수 · 보상 획득 횟수를 공유한다. 횟수는 매주 화요일 초기화.
// t: 1회 클리어 보상(T, 1T = 1000M), count: 그룹 공유 주간 보상 획득 횟수
// cut: 기여도 컷(억). 1인 던전(상점가 · 악몽)과 솔플 위주인 로얄 베이스는 없음.
// T 보상이 없는 하위 던전과 실제로 가지 않는 EASY(카이저의 기지 · 파괴와 재생)는 제외.
export const GROUPS = [
    {
        label: '7대 마왕의 성역 : 벨페몬',
        count: 1,
        dungeons: [
            { name: '7대 마왕의 성역 : 벨페몬', t: 40, cut: 7 },
        ],
    },
    {
        label: '7대 마왕의 성역 : 발바몬',
        count: 1,
        dungeons: [
            { name: '7대 마왕의 성역 : 발바몬', t: 40, cut: 3.7 },
        ],
    },
    {
        label: '네버랜드',
        count: 3,
        dungeons: [
            { name: '네버랜드', t: 15, cut: 8 },
        ],
    },
    {
        label: '다크 웹',
        count: 3,
        dungeons: [
            { name: '다크 웹', t: 15, cut: 1.7 },
        ],
    },
    {
        label: '카이저의 기지',
        count: 3,
        dungeons: [
            { name: '카이저의 기지 [NORMAL]', t: 15, cut: 2.1 },
        ],
    },
    {
        label: '디지몬 카이저',
        count: 3,
        dungeons: [
            { name: '디지몬 카이저 [NORMAL]', t: 5, cut: 1.1 },
        ],
    },
    {
        label: '파괴와 재생',
        count: 3,
        dungeons: [
            { name: '파괴와 재생 [NORMAL]', t: 1, cut: 1 },
        ],
    },
    {
        label: '로얄 베이스',
        count: 3,
        dungeons: [
            { name: '로얄 베이스 [HARD]', t: 0.1 },
        ],
    },
    {
        label: '상점가 · 악몽',
        count: 3,
        dungeons: [
            // 화면에서 3열 2행: 1행 악몽, 2행 상점가 (각 HARD → NORMAL → EASY)
            { name: '악몽 [HARD]', t: 80 },
            { name: '악몽 [NORMAL]', t: 60 },
            { name: '악몽 [EASY]', t: 10 },
            { name: '상점가 (Hard)', t: 32 },
            { name: '상점가 [NORMAL]', t: 20 },
            { name: '상점가 [EASY]', t: 5 },
        ],
    },
];
