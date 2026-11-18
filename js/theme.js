// 키 이름은 js/theme-init.js와 같아야 한다.
const STORAGE_KEY = 'dmo_theme';

function applyTheme(isDark) {
    const btn = document.querySelector('.theme-toggle');
    document.documentElement.classList.toggle('dark-mode', isDark);
    
    if (btn) {
        btn.innerHTML = isDark ? '☀️' : '🌙';
        btn.setAttribute('aria-pressed', String(isDark));
        btn.setAttribute('aria-label', isDark ? '라이트모드로 전환' : '다크모드로 전환');
    }
}

export function toggleTheme() {
    const isDark = !document.documentElement.classList.contains('dark-mode');
    applyTheme(isDark);
    localStorage.setItem(STORAGE_KEY, isDark ? 'dark' : 'light');
}

export function loadTheme() {
    applyTheme(document.documentElement.classList.contains('dark-mode'));
}

// 페이지 공통: 테마 버튼 연결 + 현재 테마 반영.
export function initTheme() {
    document.querySelector('.theme-toggle')?.addEventListener('click', toggleTheme);
    loadTheme();
}
