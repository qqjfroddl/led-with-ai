// 디자인 테마 스위치 (2026-09-12, 장준식)
// 소장님이 실제 데이터로 디자인 방향을 테스트하기 위한 임시 스위치.
// 선택 방법: 헤더의 「디자인」 셀렉트, 또는 URL ?theme=paper|white|warm|default
// 저장 위치: localStorage 'led-theme' (기기별). 방향이 확정되면 이 파일과 themes.css는 정리한다.

export const THEMES = [
  { id: 'default', label: '디자인: 현재' },
  { id: 'paper', label: '1안 종이 저널' },
  { id: 'white', label: '4안 흰 종이·하단 탭' },
  { id: 'warm', label: '5안 오늘의 링' },
];

const STORAGE_KEY = 'led-theme';

function isValid(id) {
  return THEMES.some(t => t.id === id);
}

/** URL 파라미터 → 저장값 → 기본값 순으로 테마를 정한다 */
export function resolveTheme() {
  try {
    const fromUrl = new URLSearchParams(window.location.search).get('theme');
    if (fromUrl && isValid(fromUrl)) {
      localStorage.setItem(STORAGE_KEY, fromUrl);
      return fromUrl;
    }
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved && isValid(saved) ? saved : 'default';
  } catch {
    return 'default';
  }
}

export function applyTheme(id) {
  const theme = isValid(id) ? id : 'default';
  document.documentElement.dataset.theme = theme;
  try { localStorage.setItem(STORAGE_KEY, theme); } catch { /* 사생활 모드 등 */ }
}

/** 앱 시작 시 한 번 호출. 셀렉트 변경 이벤트도 여기서 위임 등록한다 */
export function initTheme() {
  applyTheme(resolveTheme());
  document.addEventListener('change', (e) => {
    if (e.target && e.target.id === 'theme-switch') {
      applyTheme(e.target.value);
    }
  });
}

/** 헤더에 넣을 셀렉트 마크업 */
export function themeSwitcherHtml() {
  const current = resolveTheme();
  return `
    <select id="theme-switch" class="theme-switch" title="디자인 테마 (테스트용)" aria-label="디자인 테마">
      ${THEMES.map(t => `<option value="${t.id}" ${t.id === current ? 'selected' : ''}>${t.label}</option>`).join('')}
    </select>`;
}
