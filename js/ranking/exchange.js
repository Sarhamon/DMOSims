// 무한의 투기장 교환 리스트 (우가몬)
// 영광 시리즈 재료의 단계별 환산값(영광의 편린 기준).
// 편린 → 파편 → 증표 → 초월의 증표는 각 10:1로 위로만 교환되고, 역방향은 불가하다.

export const EQUIV = {
    '영광의 편린': 1,
    '영광의 파편': 10,
    '영광의 증표': 100,
    '초월의 증표': 1000,
};

// out: 1회 교환 시 나오는 결과물 수량, mats: 소모 재료, tradable: 거래 가능 여부
export const EXCHANGE_GROUPS = [
    {
        currency: '영광의 편린',
        items: [
            { name: '영광의 파편', out: 1, mats: [{ name: '영광의 편린', qty: 10 }], tradable: false },
            { name: '옵션 변경 스톤 [지급용]', out: 5, mats: [{ name: '영광의 편린', qty: 10 }], tradable: false },
            { name: '수치 변경 스톤 [지급용]', out: 5, mats: [{ name: '영광의 편린', qty: 10 }], tradable: false },
            { name: '강화 해킹 툴 [지급용]', out: 3, mats: [{ name: '영광의 편린', qty: 10 }], tradable: false },
            { name: '강화 백업 칩 [지급용]', out: 1, mats: [{ name: '영광의 편린', qty: 25 }], tradable: false },
            { name: '명찰 강화 해킹 툴 [지급용]', out: 1, mats: [{ name: '영광의 편린', qty: 10 }], tradable: false },
            { name: '명찰 강화 백업 칩 [지급용]', out: 1, mats: [{ name: '영광의 편린', qty: 25 }], tradable: false },
        ],
    },
    {
        currency: '영광의 파편',
        items: [
            { name: '영광의 증표', out: 1, mats: [{ name: '영광의 파편', qty: 10 }], tradable: false },
            { name: '옵션 변경 재봉틀', out: 5, mats: [{ name: '영광의 파편', qty: 5 }], tradable: true },
            { name: '수치 변경 재봉틀', out: 5, mats: [{ name: '영광의 파편', qty: 5 }], tradable: true },
            { name: '씰 마스터 패키지', out: 1, mats: [{ name: '영광의 파편', qty: 30 }, { name: '영광의 증표', qty: 2 }], tradable: true },
            { name: '크로스로더 선택 상자', out: 1, mats: [{ name: '영광의 파편', qty: 40 }, { name: '영광의 증표', qty: 2 }], tradable: true },
            { name: '랜덤 고스트 키링 상자', out: 1, mats: [{ name: '영광의 파편', qty: 30 }], tradable: true },
            { name: '랜덤 프론티어 장비 상자', out: 1, mats: [{ name: '영광의 파편', qty: 50 }, { name: '영광의 증표', qty: 5 }], tradable: true },
            { name: '얼티밋 데이터 소환 티켓', out: 2, mats: [{ name: '영광의 파편', qty: 40 }, { name: '영광의 증표', qty: 1 }], tradable: true },
            { name: 'SSS+ 디지몬 선택 상자', out: 1, mats: [{ name: '영광의 파편', qty: 40 }], tradable: true },
        ],
    },
    {
        currency: '영광의 증표',
        items: [
            { name: '초월의 증표', out: 1, mats: [{ name: '영광의 증표', qty: 10 }], tradable: false },
            { name: 'X 에너지', out: 5, mats: [{ name: '영광의 증표', qty: 20 }], tradable: true },
            { name: '스킬 메모리 Lv.4 선택 상자', out: 1, mats: [{ name: '영광의 증표', qty: 30 }], tradable: true },
            { name: '최상급 스킬 메모리 선택 상자', out: 1, mats: [{ name: '영광의 증표', qty: 30 }], tradable: true },
            { name: '진화 데이터 추출 키트 [지급용]', out: 1, mats: [{ name: '영광의 증표', qty: 40 }], tradable: false },
            { name: '진화 데이터 추출 키트 (증표 80)', out: 1, mats: [{ name: '영광의 증표', qty: 80 }], tradable: true },
            { name: '진화 데이터 추출 키트 (증표 50 + 초월 1)', out: 1, mats: [{ name: '영광의 증표', qty: 50 }, { name: '초월의 증표', qty: 1 }], tradable: true },
            { name: 'U등급 디지몬 선택 상자', out: 1, mats: [{ name: '영광의 증표', qty: 80 }, { name: '초월의 증표', qty: 1 }], tradable: true },
        ],
    },
];
