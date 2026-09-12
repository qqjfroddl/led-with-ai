// 토스트 알림 (2026-09-12, 장준식) — alert() 137곳을 대체한다.
// alert는 브라우저 기본 모달이라 화면을 멈추고, 모바일에서는 "개발 중인 도구"처럼 보였다(7/18 진단).
// 사용: toast('저장되었습니다.')  /  toast('오류가 났습니다.', 'error')
// 종류를 안 주면 문구로 추정한다(오류·실패 → error, 해주세요 → warn, 되었습니다 → success). 스타일은 main.css .toast

const ICONS = {
  success: '<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>',
  error: '<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>',
  warn: '<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4M12 17h.01"/></svg>',
  info: '<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>',
};
const DURATION = { success: 2600, info: 3200, warn: 3800, error: 5000 };
const MAX_VISIBLE = 3;

/** 문구로 종류를 추정한다 — 기존 alert 문구를 바꾸지 않고 옮기기 위한 규칙 */
export function inferType(message) {
  const m = String(message);
  if (/오류|실패|초과|없습니다|불가|잘못|찾을 수|Error|error/.test(m)) return 'error';
  if (/해주세요|하세요|선택|입력|확인/.test(m)) return 'warn';
  if (/되었습니다|완료|성공|저장|보냈습니다|삭제됨/.test(m)) return 'success';
  return 'info';
}

function region() {
  let el = document.querySelector('.toast-region');
  if (!el) {
    el = document.createElement('div');
    el.className = 'toast-region';
    document.body.appendChild(el);
  }
  return el;
}

function dismiss(el) {
  if (!el.isConnected || el.classList.contains('is-leaving')) return;
  el.classList.add('is-leaving');
  const done = () => el.remove();
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) done();
  else el.addEventListener('animationend', done, { once: true });
}

/**
 * @param {string} message 표시할 문구
 * @param {'success'|'error'|'warn'|'info'} [type] 생략하면 문구로 추정
 * @param {{duration?: number}} [opts]
 */
export function toast(message, type, opts = {}) {
  if (typeof document === 'undefined') return;
  const kind = ICONS[type] ? type : inferType(message);
  const host = region();
  while (host.children.length >= MAX_VISIBLE) host.firstElementChild.remove();

  const el = document.createElement('div');
  el.className = 'toast';
  el.dataset.type = kind;
  el.setAttribute('role', kind === 'error' ? 'alert' : 'status');
  el.innerHTML = `${ICONS[kind]}<span class="toast-text"></span>`;
  el.querySelector('.toast-text').textContent = String(message); // 문구는 텍스트로만(HTML 주입 방지)
  el.addEventListener('click', () => dismiss(el));
  host.appendChild(el);

  const ms = opts.duration ?? DURATION[kind];
  setTimeout(() => dismiss(el), ms);
  return el;
}

export default toast;
