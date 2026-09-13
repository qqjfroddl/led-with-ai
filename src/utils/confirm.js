// 확인창 (2026-09-13, 장준식) — confirm() 27곳을 대체한다. toast.js(alert 137곳)와 같은 원리.
// 브라우저 기본 confirm은 테마를 못 따르고, 폰에서는 주소가 붙은 시스템 창이라 "개발 중인 도구"처럼 보였다(7/18 진단).
// <dialog>.showModal()을 쓴다 — 포커스 가둠·Esc·스크린리더 역할이 브라우저에서 온다. 배경 클릭은 취소. 스타일은 main.css .confirm
// 사용:
//   if (!(await confirmDialog('이 할일을 삭제하시겠습니까?', { confirmText: '삭제', danger: true }))) return;
//   const ok = await confirmDialog('AI가 이번 주 활동을 분석하여 성찰을 생성합니다.\n\n계속하시겠습니까?', { confirmText: '생성' });
// 문구 규칙(기존 confirm 문구를 그대로 옮기기 위한 것): 빈 줄로 나눈 첫 문단이 제목, 나머지가 본문.
//   문단이 하나면 첫 문장(., ?, ! 뒤)이 제목이고 뒤가 본문. 한 문장이면 제목만. title을 주면 그 규칙을 건너뛴다.
// danger: 되돌릴 수 없는 일(삭제·제외·덮어쓰기). 확인 버튼이 붉어지고 초기 포커스는 '취소'에 간다(Enter 한 번에 지워지지 않게).

const ICONS = {
  ask: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/></svg>',
  danger: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4M12 17h.01"/></svg>',
};

let dialog = null;
let pending = null; // 열려 있는 확인창의 resolve — 한 번에 하나만 연다

/** 문구를 제목·본문으로 나눈다 (⚠️ 이모지는 아이콘이 대신하므로 뗀다) */
export function splitMessage(message, title) {
  const text = String(message ?? '').replace(/⚠️\s*/g, '').trim();
  if (title) return { title: String(title), body: text };
  const paragraphs = text.split(/\n\s*\n/);
  if (paragraphs.length > 1) return { title: paragraphs[0].trim(), body: paragraphs.slice(1).join('\n\n').trim() };
  const m = text.match(/^(.+?[.?!])\s+(\S[\s\S]*)$/);
  if (m) return { title: m[1], body: m[2] };
  return { title: text, body: '' };
}

function build() {
  const el = document.createElement('dialog');
  el.className = 'confirm';
  el.setAttribute('aria-labelledby', 'confirm-title');
  el.setAttribute('aria-describedby', 'confirm-msg');
  el.innerHTML = `
    <form method="dialog" class="confirm-box">
      <div class="confirm-icon" aria-hidden="true"></div>
      <h2 id="confirm-title" class="confirm-title"></h2>
      <p id="confirm-msg" class="confirm-msg"></p>
      <div class="confirm-actions">
        <button type="button" class="confirm-cancel">취소</button>
        <button type="submit" class="confirm-ok" value="ok">확인</button>
      </div>
    </form>`;
  el.querySelector('.confirm-cancel').addEventListener('click', () => el.close('cancel'));
  el.addEventListener('click', (e) => { if (e.target === el) el.close('cancel'); }); // 배경 클릭: form이 상자를 다 덮으니 target이 dialog면 배경이다
  el.addEventListener('close', () => {
    const resolve = pending;
    pending = null;
    resolve?.(el.returnValue === 'ok'); // Esc는 returnValue를 안 바꾼다('') → 취소
    el.returnValue = '';
  });
  document.body.appendChild(el);
  return el;
}

/**
 * @param {string|{message:string,title?:string,confirmText?:string,cancelText?:string,danger?:boolean}} message
 * @param {{title?:string,confirmText?:string,cancelText?:string,danger?:boolean}} [opts]
 * @returns {Promise<boolean>} 확인이면 true, 취소·Esc·배경 클릭이면 false
 */
export function confirmDialog(message, opts = {}) {
  if (typeof document === 'undefined') return Promise.resolve(false);
  const o = message && typeof message === 'object' ? message : { message, ...opts };
  if (typeof HTMLDialogElement === 'undefined' || !HTMLDialogElement.prototype.showModal) {
    return Promise.resolve(window.confirm(String(o.message ?? ''))); // 옛 브라우저 안전망
  }
  if (!dialog || !dialog.isConnected) dialog = build();
  if (pending) { const prev = pending; pending = null; prev(false); } // 겹쳐 열리면 앞 것은 취소로 끝낸다

  const { title, body } = splitMessage(o.message, o.title);
  const kind = o.danger ? 'danger' : 'ask';
  const icon = dialog.querySelector('.confirm-icon');
  icon.innerHTML = ICONS[kind];
  icon.dataset.kind = kind;
  dialog.querySelector('.confirm-title').textContent = title;
  const msg = dialog.querySelector('.confirm-msg');
  msg.textContent = body;
  msg.hidden = !body;
  const ok = dialog.querySelector('.confirm-ok');
  ok.textContent = o.confirmText || '확인';
  ok.dataset.kind = kind;
  const cancel = dialog.querySelector('.confirm-cancel');
  cancel.textContent = o.cancelText || '취소';

  return new Promise((resolve) => {
    pending = resolve;
    if (!dialog.open) dialog.showModal();
    (o.danger ? cancel : ok).focus();
  });
}

export default confirmDialog;
