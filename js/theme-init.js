// <head>에서 CSS보다 먼저 동기 실행: 저장된 다크 모드를 첫 렌더 전에 적용해 깜빡임을 막는다.
// 키 이름은 theme.js의 STORAGE_KEY와 같아야 한다.
if (localStorage.getItem('dmo_theme') === 'dark') {
    document.documentElement.classList.add('dark-mode');
}
