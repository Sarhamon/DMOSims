// localStorage JSON 읽기/쓰기. 저장소를 쓸 수 없거나 값이 깨졌으면 fallback.
export function loadJSON(key, fallback = null) {
    try {
        return JSON.parse(localStorage.getItem(key)) ?? fallback;
    } catch {
        return fallback;
    }
}

export function saveJSON(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch {}
}
