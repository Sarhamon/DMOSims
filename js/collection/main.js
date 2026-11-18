import { collections } from './collectionData.js';
import { initTheme } from '../theme.js';
import { loadJSON, saveJSON } from '../storage.js';

const STORAGE_KEY = 'dmo_collection_checked';

// 플랫 스탯(EXP·SCD 외 수치 보너스)은 추후 지원 예정이라 선택 불가.
const isPending = (effect) => effect.unit === '';

const keyOf = (ci, ei) => `${ci}:${ei}`;

const checked = new Set(loadJSON(STORAGE_KEY, []));
const saveChecked = () => saveJSON(STORAGE_KEY, [...checked]);

function bonusText(effect) {
    return `${effect.target} +${effect.value}${effect.unit}`;
}

function renderGrid() {
    const grid = document.getElementById('grid');
    grid.innerHTML = collections.map((col, ci) => {
        const rows = col.effects.map((eff, ei) => {
            const pending = isPending(eff);
            const id = `eff-${ci}-${ei}`;
            const isChecked = checked.has(keyOf(ci, ei));
            return `
                <label class="effect-row${pending ? ' pending' : ''}" for="${id}">
                    <input type="checkbox" id="${id}" data-key="${keyOf(ci, ei)}"
                        ${isChecked ? 'checked' : ''} ${pending ? 'disabled' : ''}>
                    <span class="effect-cond">${eff.cond}</span>
                    <span class="effect-bonus">${bonusText(eff)}</span>
                    ${pending ? '<span class="pending-tag">추후 추가 예정</span>' : ''}
                </label>`;
        }).join('');
        return `
            <div class="collection-card" data-name="${col.name}">
                <div class="collection-head">
                    <span class="collection-name">${col.name}</span>
                    <span class="collection-size">${col.size}종</span>
                </div>
                <div class="effect-list">${rows}</div>
            </div>`;
    }).join('');
}

function renderSummary() {
    const totals = new Map(); // target -> { value, unit }
    for (const k of checked) {
        const [ci, ei] = k.split(':').map(Number);
        const eff = collections[ci]?.effects[ei];
        if (!eff || isPending(eff)) continue;
        const prev = totals.get(eff.target);
        totals.set(eff.target, { value: (prev?.value ?? 0) + eff.value, unit: eff.unit });
    }

    const box = document.getElementById('summary');
    if (totals.size === 0) {
        box.innerHTML = '<p class="summary-empty">완료한 수집 효과를 체크하면 합산 결과가 표시됩니다.</p>';
        return;
    }

    // EXP를 항상 맨 위로, 나머지는 이름순.
    const entries = [...totals.entries()].sort((a, b) => {
        if (a[0] === 'EXP') return -1;
        if (b[0] === 'EXP') return 1;
        return a[0].localeCompare(b[0], 'ko');
    });

    box.innerHTML = entries.map(([target, { value, unit }]) =>
        `<div class="summary-item"><span class="summary-target">${target}</span><span class="summary-value">+${value}${unit}</span></div>`
    ).join('');
}

function applyFilter(term) {
    const q = term.trim().toLowerCase();
    document.querySelectorAll('.collection-card').forEach(card => {
        const name = card.dataset.name.toLowerCase();
        card.hidden = q !== '' && !name.includes(q);
    });
}

document.getElementById('grid').addEventListener('change', e => {
    const cb = e.target.closest('input[type="checkbox"]');
    if (!cb) return;
    if (cb.checked) checked.add(cb.dataset.key);
    else checked.delete(cb.dataset.key);
    saveChecked();
    renderSummary();
});

document.getElementById('search').addEventListener('input', e => applyFilter(e.target.value));

document.getElementById('resetBtn').addEventListener('click', () => {
    checked.clear();
    saveChecked();
    renderGrid();
    renderSummary();
});

initTheme();
renderGrid();
renderSummary();
