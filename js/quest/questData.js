// 모듈 퀘스트 목록 — quest 체크 페이지와 모듈 융합 시뮬레이터가 함께 쓴다.
export const GRADES = [
    { key: 'NA',  label: 'N~A+',   cls: 'na' },
    { key: 'S',   label: 'S~S+',   cls: 's' },
    { key: 'SP',  label: 'S+~SS',  cls: 'sp' },
    { key: 'SS',  label: 'SS~SS+', cls: 'ss' },
];
// id는 저장 키로 쓰이므로 바꾸지 않는다.
export const DAILY = [
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
export const WEEKLY = [
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
