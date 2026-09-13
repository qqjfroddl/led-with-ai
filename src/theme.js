// 테마 선택 (2026-09-13 소장님 결정 B+C: 종이저널·따뜻한 종이·흰 종이·밤의 종이 + 기기 설정 따르기)
// 원리: <html data-theme="…"> 속성 하나로 paper.css의 토큰 블록이 바뀐다. 요청도 스크립트도 늘지 않는다.
// 첫 화면 깜빡임 방지: index.html <head>의 인라인 스크립트가 같은 규칙으로 속성을 먼저 건다(여기 STORAGE_KEY와 같아야 한다).
// 저장: localStorage 'led-theme' (기기별). 서버에 두지 않는다 — 기기마다 밝기가 다른 게 자연스럽다.

export const STORAGE_KEY = 'led-theme';
export const DEFAULT_THEME = 'paper';

export const THEMES = [
  { id: 'paper', label: '종이저널', hint: '기본', swatch: '#F8F4EC', ink: '#23506B', themeColor: '#F8F4EC' },
  { id: 'warm', label: '따뜻한 종이', hint: '테라코타 포인트', swatch: '#FBF8F3', ink: '#BE6236', themeColor: '#FBF8F3' },
  { id: 'white', label: '흰 종이', hint: '담백한 흰 바탕', swatch: '#FFFFFF', ink: '#2F5BEA', themeColor: '#FFFFFF' },
  { id: 'night', label: '밤의 종이', hint: '어두운 바탕', swatch: '#1B1815', ink: '#8FB5DB', themeColor: '#1B1815' },
  { id: 'auto', label: '기기 설정 따르기', hint: '밤 모드면 밤의 종이', swatch: null, ink: null, themeColor: null },
];

const isValid = (id) => THEMES.some((t) => t.id === id);
const darkQuery = () => (typeof matchMedia === 'function' ? matchMedia('(prefers-color-scheme: dark)') : null);

export function readSavedTheme() {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return isValid(v) ? v : DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
}

/** 실제로 어두운 판이 켜져 있는가 (night, 또는 auto + 기기 밤 모드) */
export function isDarkActive(id = readSavedTheme()) {
  if (id === 'night') return true;
  if (id === 'auto') return !!darkQuery()?.matches;
  return false;
}

export function applyTheme(id, { save = true } = {}) {
  const theme = isValid(id) ? id : DEFAULT_THEME;
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.classList.toggle('is-dark', isDarkActive(theme));
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    const t = THEMES.find((x) => x.id === theme);
    meta.setAttribute('content', t.themeColor ?? (isDarkActive(theme) ? '#1B1815' : '#F8F4EC'));
  }
  if (save) { try { localStorage.setItem(STORAGE_KEY, theme); } catch { /* 사생활 모드 등 */ } }
  document.querySelectorAll('[data-theme-pick]').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.themePick === theme)));
  return theme;
}

function closeMenu() {
  const menu = document.getElementById('theme-menu');
  const btn = document.getElementById('theme-menu-btn');
  if (menu) menu.hidden = true;
  if (btn) btn.setAttribute('aria-expanded', 'false');
}

/** 앱 시작 시 한 번. 메뉴 클릭·바깥 클릭·Esc·기기 밤 모드 변경을 문서 단위로 위임한다 */
export function initTheme() {
  applyTheme(readSavedTheme(), { save: false });
  darkQuery()?.addEventListener?.('change', () => { if (readSavedTheme() === 'auto') applyTheme('auto', { save: false }); });
  document.addEventListener('click', (e) => {
    const pick = e.target.closest?.('[data-theme-pick]');
    if (pick) { applyTheme(pick.dataset.themePick); closeMenu(); return; }
    const btn = e.target.closest?.('#theme-menu-btn');
    const menu = document.getElementById('theme-menu');
    if (btn && menu) {
      const open = menu.hidden;
      menu.hidden = !open;
      btn.setAttribute('aria-expanded', String(open));
      if (open) menu.querySelector('[aria-checked="true"]')?.focus();
      return;
    }
    if (!e.target.closest?.('#theme-menu')) closeMenu();
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenu(); });
}

/** 헤더에 넣을 버튼 + 메뉴 마크업 */
export function themeMenuHtml() {
  const current = readSavedTheme();
  return `
    <div class="theme-menu-wrap">
      <button id="theme-menu-btn" class="theme-btn" type="button" title="화면 테마" aria-label="화면 테마" aria-haspopup="menu" aria-expanded="false" aria-controls="theme-menu">
        <i data-lucide="palette"></i>
      </button>
      <div id="theme-menu" class="theme-menu" role="menu" aria-label="화면 테마" hidden>
        <div class="theme-menu-title">화면 테마</div>
        ${THEMES.map((t) => `
        <button type="button" class="theme-item" role="menuitemradio" data-theme-pick="${t.id}" aria-checked="${t.id === current}">
          <span class="theme-swatch ${t.swatch ? '' : 'theme-swatch--auto'}" style="${t.swatch ? `background: ${t.swatch}; --swatch-ink: ${t.ink};` : ''}" aria-hidden="true"></span>
          <span class="theme-item-text"><b>${t.label}</b><small>${t.hint}</small></span>
          <i data-lucide="check" class="theme-check" aria-hidden="true"></i>
        </button>`).join('')}
      </div>
    </div>`;
}
