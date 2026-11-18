import { loadJSON, saveJSON } from '../storage.js';

const STORAGE_KEY = 'dmokit_inventory';
const PITY_STORAGE_KEY = 'dmokit_pity';

// U등급이라도 진화 아이템이 아닌 예외 (항상 other)
const U_OTHER_EXCEPTIONS = new Set(['봉인된 얼티밋 크로스로더']);

let state = loadJSON(STORAGE_KEY, { items: {} });
let pityState = loadJSON(PITY_STORAGE_KEY, {});

// 기존 저장분 중 U등급은 모두 진화 아이템으로 정정 (예외 제외)
for (const it of Object.values(state.items)) {
    if (it.grade === 'U' && !U_OTHER_EXCEPTIONS.has(it.name)) it.category = 'evolution';
}
const listeners = new Set();

function notify() {
    saveJSON(STORAGE_KEY, state);
    saveJSON(PITY_STORAGE_KEY, pityState);
    for (const fn of listeners) fn();
}

export function subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
}

export function addItems(items) {
    for (const it of items) {
        // U등급은 모두 진화 아이템으로 분류 (예외 제외)
        const forceEvolution = it.grade === 'U' && !U_OTHER_EXCEPTIONS.has(it.name);
        const category = forceEvolution ? 'evolution' : it.category;
        const existing = state.items[it.name];
        if (existing) {
            existing.count++;
            if (forceEvolution) existing.category = 'evolution';
            else if (!existing.category && category) existing.category = category;
        } else {
            state.items[it.name] = {
                name: it.name,
                grade: it.grade,
                category: category || 'evolution',
                count: 1,
            };
        }
    }
    notify();
}

export function consumeItems(names) {
    for (const name of names) {
        const slot = state.items[name];
        if (!slot || slot.count <= 0) {
            throw new Error(`Cannot consume "${name}": not in inventory`);
        }
        slot.count--;
        if (slot.count === 0) delete state.items[name];
    }
    notify();
}

export function getAll(category = null) {
    const items = Object.values(state.items);
    if (category === null) return items;
    return items.filter(it => (it.category || 'evolution') === category);
}

export function getByGrade(grade, category = null) {
    return getAll(category).filter(it => it.grade === grade);
}

export function getCountByGrade(category = null) {
    const counts = {};
    for (const it of getAll(category)) {
        counts[it.grade] = (counts[it.grade] || 0) + it.count;
    }
    return counts;
}

export function getTotalCount(category = null) {
    return getAll(category).reduce((s, it) => s + it.count, 0);
}

export function clearAll() {
    state = { items: {} };
    pityState = {};
    notify();
}

export function getPity(groupName) {
    return pityState[groupName] || 0;
}

export function incrementPity(groupName) {
    pityState[groupName] = (pityState[groupName] || 0) + 1;
    notify();
    return pityState[groupName];
}

export function resetPity(groupName) {
    delete pityState[groupName];
    notify();
}
