// 인생관리AI앱 사용 신청서 (/apply)
// 로그인 없이 열리는 화면. 넣기만 하고 읽지 않는다(RLS: 익명 INSERT만 허용).
import { getSupabase } from './config/supabase.js';
import {
  NOTION_GUIDE_URL,
  isLikelyGoogleEmail,
  normalizeRequest,
  validateRequest
} from './utils/accessRequest.js';

const form = document.getElementById('apply-form');
const submitButton = document.getElementById('apply-submit');
const formError = document.getElementById('form-error');
const emailInput = document.getElementById('f-email');
const emailHint = document.getElementById('email-hint');

document.getElementById('notion-link').href = NOTION_GUIDE_URL;

function showErrors(errors) {
  form.querySelectorAll('[data-error-for]').forEach((el) => {
    const message = errors[el.dataset.errorFor] || '';
    el.textContent = message;
    const input = form.elements[el.dataset.errorFor];
    if (input) input.setAttribute('aria-invalid', message ? 'true' : 'false');
  });
  const first = Object.keys(errors)[0];
  if (first) form.elements[first]?.focus();
}

function setSubmitting(on) {
  submitButton.disabled = on;
  submitButton.textContent = on ? '보내는 중…' : '신청하기';
}

function showDone(email) {
  document.getElementById('done-email').textContent = email;
  document.getElementById('apply-form-view').hidden = true;
  const done = document.getElementById('apply-done-view');
  done.hidden = false;
  done.focus();
  window.scrollTo({ top: 0 });
}

// 소장님 알림 메일. 실패해도 신청은 이미 저장됐으므로 신청자 화면에는 영향을 주지 않는다
function notifyOwner(id) {
  fetch('/api/access-request-alert', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id }),
    keepalive: true
  }).catch((error) => console.warn('[Apply] 알림 요청 실패:', error));
}

emailInput.addEventListener('blur', () => {
  const email = emailInput.value.trim().toLowerCase();
  emailHint.hidden = !email || !email.includes('@') || isLikelyGoogleEmail(email);
});

// 칸을 고치기 시작하면 그 칸의 오류는 지운다
form.addEventListener('input', (event) => {
  const el = form.querySelector(`[data-error-for="${event.target.name}"]`);
  if (el && el.textContent) {
    el.textContent = '';
    event.target.setAttribute('aria-invalid', 'false');
  }
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  formError.textContent = '';

  // 봇이 숨은 칸을 채웠으면 저장하지 않고 접수된 것처럼 보인다
  if (form.elements.website.value) {
    showDone('');
    return;
  }

  const request = normalizeRequest({
    name: form.elements.name.value,
    google_email: form.elements.google_email.value,
    motivation: form.elements.motivation.value
  });
  const errors = validateRequest(request);
  showErrors(errors);
  if (Object.keys(errors).length > 0) return;

  setSubmitting(true);
  try {
    const supabase = await getSupabase();
    if (!supabase) throw new Error('supabase_unavailable');
    // 익명은 저장한 행을 다시 읽을 수 없으므로(RLS) id를 여기서 만들어 알림 경로에 넘긴다
    const id = globalThis.crypto?.randomUUID?.();
    const { error } = await supabase
      .from('access_requests')
      .insert(id ? { ...request, id } : request);
    if (error) throw error;
    if (id) notifyOwner(id);
    showDone(request.google_email);
  } catch (error) {
    console.error('[Apply] 신청 저장 실패:', error);
    formError.textContent = navigator.onLine === false
      ? '인터넷 연결이 끊겨 있습니다. 연결을 확인한 뒤 다시 눌러 주세요.'
      : '신청을 저장하지 못했습니다. 잠시 뒤 다시 눌러 주시고, 계속 안 되면 ledhelper@daum.net으로 알려 주세요.';
    setSubmitting(false);
  }
});
