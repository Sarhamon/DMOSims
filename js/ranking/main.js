import { NONSEASON_TIERS, SEASON_TIERS, RANKER_TIERS } from './data.js';
import { EXCHANGE_GROUPS, EQUIV } from './exchange.js';
import { loadTheme, toggleTheme } from '../theme.js';

// 시즌 진행 순서: 비시즌 1차(3주) → 비시즌 2차(3주) → 시즌 던전(2주) → 휴식(1주)
const PHASES = [
    { label: '비시즌 1차', weeks: 3, season: false },
    { label: '비시즌 2차', weeks: 3, season: false },
    { label: '시즌 던전', weeks: 2, season: true },
];
const REST_WEEKS = 1;

// 재료 단계: 편린 → 파편 → 증표 → 초월의 증표 (오름차순)
const TIER_NAMES = Object.keys(EQUIV);
const TIER_W = Object.values(EQUIV);

// 영광 재료만 단계별로 나눠 영광의 편린 환산값 배열로 집계
function tierValues(list) {
    const v = TIER_W.map(() => 0);
    list.forEach(({ name, qty }) => {
        const i = TIER_NAMES.indexOf(name);
        if (i >= 0) v[i] += qty * TIER_W[i];
    });
    return v;
}

// 교환 아이템 1개당 단계별 비용
function tierCost(item) {
    return tierValues(item.mats).map(v => v / item.out);
}

// 재료는 위 단계로만 교환되므로, 각 단계의 비용은 그 단계 이하의 재고로만 지불할 수 있다.
// 낮은 단계부터 지불하고 남은 재고만 위 단계로 올려 단계별 부족분을 구한다.
function shortfall(stock, cost) {
    let carry = 0;
    return TIER_W.map((_, i) => {
        const have = stock[i] + carry;
        const next = TIER_W[i + 1];
        carry = next ? Math.floor(Math.max(0, have - cost[i]) / next) * next : 0;
        return Math.max(0, cost[i] - have);
    });
}

function buildExchangeUI() {
    // 등급 라디오 그룹 채우기
    const radio = (group, label, value, checked) =>
        `<label class="radio-option"><span class="label-text">${label}</span><input type="radio" name="${group}" value="${value}"${checked ? ' checked' : ''}></label>`;
    const shortLabel = t => t.label.replace('랭킹 ', '');

    document.getElementById('expNonseason').innerHTML =
        NONSEASON_TIERS.map((t, i) => radio('expNonseason', shortLabel(t), i, i === 0)).join('');
    document.getElementById('expSeason').innerHTML =
        SEASON_TIERS.map((t, i) => radio('expSeason', shortLabel(t), i, i === 0)).join('');
    document.getElementById('expRanker').innerHTML =
        radio('expRanker', '없음', -1, true) +
        RANKER_TIERS.map((t, i) => radio('expRanker', shortLabel(t), i, false)).join('');
    document.getElementById('expPhase').innerHTML =
        PHASES.map((ph, i) => radio('expPhase', ph.label, i, i === 0)).join('');

    // 교환 목록: 재료별 카드 3열
    const cols = EXCHANGE_GROUPS.map((group, gi) => {
        const items = group.items.map((item, ii) => {
            const outText = item.out > 1 ? ` [${item.out}개]` : '';
            return `<label class="ex-item"><input type="radio" name="exTarget" data-ex="${gi}-${ii}"> ${item.name}${outText}</label>`;
        }).join('');
        return `<details class="ex-group"><summary>${group.currency} 교환</summary>${items}</details>`;
    }).join('');

    document.getElementById('exchangeList').innerHTML =
        `<div class="result-grid cols-3">${cols}</div>`;
}

function calculateExchange() {
    const result = document.getElementById('exchangeResult');

    const checked = document.querySelector('input[data-ex]:checked');
    if (!checked) {
        result.innerHTML = '<span class="ex-float-hint">목표 아이템을 선택하세요</span>';
        return;
    }
    const [gi, ii] = checked.dataset.ex.split('-').map(Number);
    const item = EXCHANGE_GROUPS[gi].items[ii];

    const cost = tierCost(item);
    const own = OWN_IDS.map((id, i) => (parseInt(document.getElementById(id).value) || 0) * TIER_W[i]);
    const remaining = shortfall(own, cost);

    const wi = parseInt(document.querySelector('input[name="expNonseason"]:checked').value);
    const si = parseInt(document.querySelector('input[name="expSeason"]:checked').value);
    const ri = parseInt(document.querySelector('input[name="expRanker"]:checked').value);
    const pi = parseInt(document.querySelector('input[name="expPhase"]:checked').value);
    // 체크포인트 보상: 80라운드까지는 10라운드마다 영광의 편린 15개, 90~100라운드는 매 라운드 영광의 증표 1개.
    // 시즌 던전은 100라운드 보스 포함, 비시즌 던전은 100라운드 보상 제외.
    const round = Math.min(parseInt(document.getElementById('clearRound').value) || 0, 100);
    const cpPyeonrin = Math.min(Math.floor(round / 10), 8) * 15;
    const jeungpyoSeason = Math.max(0, round - 89);
    const jeungpyoNonseason = Math.max(0, Math.min(round, 99) - 89);
    // 던전 1회차당 단계별 수급량
    const nonseasonIncome = tierValues([
        ...NONSEASON_TIERS[wi].rewards,
        { name: '영광의 편린', qty: cpPyeonrin },
        { name: '영광의 증표', qty: jeungpyoNonseason },
    ]);
    const seasonIncome = tierValues([
        ...SEASON_TIERS[si].rewards,
        ...(ri >= 0 ? RANKER_TIERS[ri].rewards : []),
        { name: '영광의 편린', qty: cpPyeonrin },
        { name: '영광의 증표', qty: jeungpyoSeason },
    ]);

    // 한 시즌(비시즌 2회 + 시즌 1회) 수급량. 부족한 단계는 그 단계 이하의 수급으로만 채워진다.
    const cycle = nonseasonIncome.map((v, i) => v * 2 + seasonIncome[i]);
    let supplied = true;
    for (let i = 0, below = 0; i < TIER_W.length; i++) {
        below += cycle[i];
        if (remaining[i] > 0 && below === 0) supplied = false;
    }

    let timeText;
    if (remaining.every(v => v <= 0)) {
        timeText = '✅ 바로 제작 가능';
    } else if (!supplied) {
        timeText = '⚠️ 수급 불가';
    } else {
        // 현재 진행 중인 단계(보상 미수령)부터 한 단계씩 누적해 목표 달성 시점을 찾는다
        let stock = own.slice();
        let weeks = 0;
        let seasons = 1;
        let p = pi;
        while (shortfall(stock, cost).some(v => v > 0)) {
            const phase = PHASES[p];
            weeks += phase.weeks;
            const income = phase.season ? seasonIncome : nonseasonIncome;
            stock = stock.map((v, i) => v + income[i]);
            if (phase.season && shortfall(stock, cost).some(v => v > 0)) {
                weeks += REST_WEEKS;
                seasons++;
            }
            p = (p + 1) % PHASES.length;
        }
        timeText = `${weeks}주 / ${seasons}시즌`;
    }

    result.innerHTML =
        `<span class="ex-float-item">${item.name}</span><span class="ex-float-time">${timeText}</span>`;
}

const STORE_KEY = 'dmo_ranking_exchange';
const OWN_IDS = ['ownPyeonrin', 'ownPapyeon', 'ownJeungpyo', 'ownChowol'];

function saveState() {
    const checked = document.querySelector('input[data-ex]:checked');
    const state = {
        target: checked ? checked.dataset.ex : null,
        own: OWN_IDS.map(id => document.getElementById(id).value),
        nonseason: document.querySelector('input[name="expNonseason"]:checked').value,
        season: document.querySelector('input[name="expSeason"]:checked').value,
        ranker: document.querySelector('input[name="expRanker"]:checked').value,
        phase: document.querySelector('input[name="expPhase"]:checked').value,
        round: document.getElementById('clearRound').value,
    };
    localStorage.setItem(STORE_KEY, JSON.stringify(state));
}

function loadState() {
    let state;
    try { state = JSON.parse(localStorage.getItem(STORE_KEY)); } catch { state = null; }
    if (!state) return;

    const setRadio = (name, value) => {
        const el = document.querySelector(`input[name="${name}"][value="${value}"]`);
        if (el) el.checked = true;
    };
    setRadio('expNonseason', state.nonseason);
    setRadio('expSeason', state.season);
    setRadio('expRanker', state.ranker);
    setRadio('expPhase', state.phase);

    if (state.round !== undefined) document.getElementById('clearRound').value = state.round;

    if (Array.isArray(state.own)) {
        OWN_IDS.forEach((id, i) => {
            if (state.own[i] !== undefined) document.getElementById(id).value = state.own[i];
        });
    }
    if (state.target) {
        const t = document.querySelector(`input[data-ex="${state.target}"]`);
        if (t) {
            t.checked = true;
            t.closest('details')?.setAttribute('open', '');
        }
    }
}

function update() {
    calculateExchange();
    saveState();
}

document.getElementById('exchangeList').addEventListener('change', update);
[...OWN_IDS, 'clearRound'].forEach(id => {
    document.getElementById(id).addEventListener('input', update);
});
['expNonseason', 'expSeason', 'expRanker', 'expPhase'].forEach(id => {
    document.getElementById(id).addEventListener('change', update);
});
document.querySelector('.theme-toggle').addEventListener('click', toggleTheme);

buildExchangeUI();
loadState();
calculateExchange();
loadTheme();
