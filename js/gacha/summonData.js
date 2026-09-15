// 데이터 소환 - 캡슐 종류별 확률 풀.
// 각 아이템: { probability, name, grade, category } (category: 'evolution' | 'other')
// pity.every 회마다 pity.reward를 고정 보장으로 추가 지급.

// 천장 횟수별 소환 등급 라벨 (30: 레전드, 50: 스페셜, 100: 일반, 150: 프리미엄)
export function tierLabel(every) {
    if (every === 30) return '레전드 데이터 소환';
    if (every === 50) return '스페셜 데이터 소환';
    if (every === 100) return '일반 데이터 소환';
    if (every === 150) return '프리미엄 데이터 소환';
    return `${every}회 천장`;
}

export const summons = [
    {
        id: "costume-advanced",
        name: "상급 코스튬",
        pity: {
            every: 50,
            reward: { name: "코스튬 수선가위", grade: "SSS", category: "other" },
        },
        items: [
            { probability: 0.20, name: "상급 코스튬 제작 쿠폰", grade: "U", category: "other" },
            { probability: 0.30, name: "최상급 코스튬 수선가위", grade: "SSS+", category: "other" },
            { probability: 1.00, name: "테이머즈 일상복 코스튬 상자", grade: "SSS", category: "other" },
            { probability: 1.00, name: "고스트게임 방과후 코스튬 상자", grade: "SSS", category: "other" },
            { probability: 1.50, name: "강화 디지클론 세트 상자", grade: "SS+", category: "other" },
            { probability: 4.00, name: "테이머 씰 선택 상자", grade: "SS", category: "other" },
            { probability: 3.00, name: "돌파 옵션 주사위 2개", grade: "SS", category: "other" },
            { probability: 3.00, name: "디지털 에너지 드링크", grade: "SS", category: "other" },
            { probability: 5.50, name: "수치 변경 스톤 20개", grade: "S+", category: "other" },
            { probability: 5.50, name: "옵션 변경 스톤 20개", grade: "S+", category: "other" },
            { probability: 15.00, name: "맛있는 백금바나나 100개", grade: "S", category: "other" },
            { probability: 15.00, name: "JMT 백금바나나 100개", grade: "S", category: "other" },
            { probability: 20.00, name: "백금 바나나 200개", grade: "A+", category: "other" },
            { probability: 25.00, name: "스페셜 치킨 콤보 200개", grade: "A+", category: "other" },
        ],
    },
    {
        id: "legend-ultimatedata",
        name: "궁극 디지털 데이터",
        pity: {
            every: 30,
            reward: { name: "궁극 디지털 데이터 [지급용]", grade: "U", category: "other" },
        },
        items: [
            { probability: 0.10, name: "궁극 디지털 데이터 [지급용]", grade: "U", category: "other" },
            { probability: 0.50, name: "놀라운 힘의 응축체[SSS+]", grade: "SSS+", category: "evolution" },
            { probability: 1.00, name: "힘의 응축체[SSS]", grade: "SSS", category: "evolution" },
            { probability: 1.00, name: "궁극 강화 디지클론 세트 상자", grade: "SSS", category: "other" },
            { probability: 1.20, name: "옵션 변경 재봉틀 5개", grade: "SSS", category: "other" },
            { probability: 1.20, name: "수치 변경 재봉틀 5개", grade: "SSS", category: "other" },
            { probability: 1.50, name: "고급 디지터리 파워 결정체 5개", grade: "SSS", category: "other" },
            { probability: 1.50, name: "돌파 옵션 주사위 2개", grade: "SS", category: "other" },
            { probability: 2.00, name: "디지털 에너지 드링크", grade: "SS", category: "other" },
            { probability: 5.00, name: "호메오스타시스의 열매 40개", grade: "SS", category: "other" },
            { probability: 5.00, name: "옵션 변경 스톤 40개", grade: "S+", category: "other" },
            { probability: 5.00, name: "수치 변경 스톤 40개", grade: "S+", category: "other" },
            { probability: 15.00, name: "맛있는 백금바나나 100개", grade: "S", category: "other" },
            { probability: 15.00, name: "JMT 백금바나나 100개", grade: "S", category: "other" },
            { probability: 20.00, name: "백금 바나나 200개", grade: "A+", category: "other" },
            { probability: 25.00, name: "스페셜 치킨 콤보 200개", grade: "A+", category: "other" },
        ],
    },
    {
        id: "grief-premium",
        name: "비탄의 심장",
        pity: {
            every: 150,
            reward: { name: "비탄의 심장", grade: "U", category: "other" },
        },
        items: [
            { probability: 0.05, name: "비탄의 심장", grade: "U", category: "other" },
            { probability: 0.10, name: "궁극 디지털 데이터", grade: "U", category: "other" },
            { probability: 0.45, name: "랜덤 프론티어 장비 상자", grade: "SSS+", category: "other" },
            { probability: 0.50, name: "놀라운 힘의 응축체[SSS+]", grade: "SSS+", category: "evolution" },
            { probability: 0.70, name: "옵션 변경 재봉틀 15개", grade: "SSS", category: "other" },
            { probability: 0.70, name: "수치 변경 재봉틀 15개", grade: "SSS", category: "other" },
            { probability: 1, name: "힘의 응축체[SSS]", grade: "SSS", category: "evolution" },
            { probability: 1, name: "진화 데이터 추출 키트", grade: "SSS", category: "evolution" },
            { probability: 1, name: "18단계 더블 강화칩 상자 3개", grade: "SSS", category: "other" },
            { probability: 1, name: "얼티밋 티켓 보장형 상자", grade: "SSS", category: "other" },
            { probability: 1, name: "궁극 강화 디지클론 세트 상자", grade: "SSS", category: "other" },
            { probability: 1, name: "옵션 변경 스톤 150개", grade: "SSS", category: "other" },
            { probability: 1, name: "수치 변경 스톤 150개", grade: "SSS", category: "other" },
            { probability: 1, name: "고급 디지터리 파워 결정체 5개", grade: "SSS", category: "other" },
            { probability: 1, name: "올라가는 디지터리 파워 결정체 2개", grade: "SSS", category: "other" },
            { probability: 2, name: "디지터리 파워 결정체 10개", grade: "SS+", category: "other" },
            { probability: 2, name: "궁극 강화 디지클론 큐브 2개", grade: "SS+", category: "other" },
            { probability: 2.5, name: "돌파 올인원 상자", grade: "SS+", category: "other" },
            { probability: 3, name: "옵션 변경 스톤 100개", grade: "SS", category: "other" },
            { probability: 3, name: "수치 변경 스톤 100개", grade: "SS", category: "other" },
            { probability: 5, name: "호메오스타시스의 열매 40개", grade: "SS", category: "other" },
            { probability: 6, name: "옵션 변경 스톤 50개", grade: "S+", category: "other" },
            { probability: 6, name: "수치 변경 스톤 50개", grade: "S+", category: "other" },
            { probability: 9, name: "ALL 강화칩 R17~R20 랜덤박스", grade: "S+", category: "other" },
            { probability: 20, name: "씰 랜덤 합본 상자", grade: "S", category: "other" },
            { probability: 30, name: "얼티밋 마일리지 쿠폰", grade: "A+", category: "other" },
        ],
    },
    {
        id: "grief-normal",
        name: "비탄의 심장",
        pity: {
            every: 100,
            reward: { name: "비탄의 심장 [지급용]", grade: "U", category: "other" },
        },
        items: [
            { probability: 0.05, name: "비탄의 심장 [지급용]", grade: "U", category: "other" },
            { probability: 0.10, name: "궁극 디지털 데이터 [지급용]", grade: "U", category: "other" },
            { probability: 0.45, name: "랜덤 프론티어 장비 상자", grade: "SSS+", category: "other" },
            { probability: 0.50, name: "놀라운 힘의 응축체[SSS+]", grade: "SSS+", category: "evolution" },
            { probability: 0.70, name: "옵션 변경 재봉틀 15개", grade: "SSS", category: "other" },
            { probability: 0.70, name: "수치 변경 재봉틀 15개", grade: "SSS", category: "other" },
            { probability: 1, name: "힘의 응축체[SSS]", grade: "SSS", category: "evolution" },
            { probability: 1, name: "18단계 더블 강화칩 상자 3개", grade: "SSS", category: "other" },
            { probability: 1, name: "데이터 소환 티켓: 얼티밋 상자[지급용]", grade: "SSS", category: "other" },
            { probability: 1, name: "궁극 강화 디지클론 세트 상자", grade: "SSS", category: "other" },
            { probability: 1, name: "옵션 변경 스톤 150개", grade: "SSS", category: "other" },
            { probability: 1, name: "수치 변경 스톤 150개", grade: "SSS", category: "other" },
            { probability: 1, name: "고급 디지터리 파워 결정체 5개", grade: "SSS", category: "other" },
            { probability: 1, name: "올라가는 디지터리 파워 결정체 2개", grade: "SSS", category: "other" },
            { probability: 2, name: "디지터리 파워 결정체 10개", grade: "SS+", category: "other" },
            { probability: 2, name: "궁극 강화 디지클론 큐브 2개", grade: "SS+", category: "other" },
            { probability: 2.5, name: "돌파 올인원 상자", grade: "SS+", category: "other" },
            { probability: 3, name: "옵션 변경 스톤 100개", grade: "SS", category: "other" },
            { probability: 3, name: "수치 변경 스톤 100개", grade: "SS", category: "other" },
            { probability: 5, name: "호메오스타시스의 열매 40개", grade: "SS", category: "other" },
            { probability: 6, name: "옵션 변경 스톤 50개", grade: "S+", category: "other" },
            { probability: 6, name: "수치 변경 스톤 50개", grade: "S+", category: "other" },
            { probability: 9, name: "ALL 강화칩 R17~R20 랜덤박스", grade: "S+", category: "other" },
            { probability: 20, name: "씰 랜덤 합본 상자", grade: "S", category: "other" },
            { probability: 30, name: "얼티밋 마일리지 쿠폰", grade: "A+", category: "other" },
        ],
    },
];
