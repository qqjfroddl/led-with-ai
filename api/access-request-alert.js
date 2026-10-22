// 사용 신청서(/apply)가 저장되면 소장님께 즉시 알림 메일을 보낸다.
// 화면은 신청서 id만 넘긴다. 메일 내용은 서버 키로 DB에서 다시 읽은 값만 쓴다 —
// 화면이 보낸 값을 믿으면 누구나 이 경로로 임의 메일을 보낼 수 있다.
// 같은 신청서는 Resend 중복 방지 키로 한 번만 보내고, 오래된 신청서로는 보내지 않는다.
// 같은 자리에서 신청자에게도 안내 메일(바로가기·사용법)을 보낸다. 두 메일은 서로의 실패에 영향받지 않는다.
import {
  readGuideMailConfig,
  sendGuideEmail
} from './_lib/applicant-guide-mail.js';
import {
  ALERT_RECIPIENT,
  DEFAULT_ALERT_FROM,
  escapeHtml,
  formatKstDateTime
} from './daily-applicant-alert.js';

const ADMIN_URL = 'https://led-with-ai.vercel.app/admin.html';
const RESEND_ENDPOINT = 'https://api.resend.com/emails';
// 신청 직후 화면이 부르는 경로이므로 넉넉히 10분. 이보다 오래된 신청서는 재알림하지 않는다
const FRESH_WINDOW_MS = 10 * 60 * 1000;
// 신청서는 로그인 없이 누구나 낼 수 있다. 남의 주소로 안내 메일을 되풀이해 보내는 통로가 되지 않게
// 같은 주소에는 하루 한 통만 보낸다
const GUIDE_PER_EMAIL_WINDOW_MS = 24 * 60 * 60 * 1000;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function sendJson(response, status, body) {
  response.setHeader('Cache-Control', 'no-store');
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  return response.status(status).json(body);
}

function readConfig(environment) {
  const supabaseUrl = environment.SUPABASE_URL || environment.VITE_SUPABASE_URL;
  const supabaseSecretKey =
    environment.SUPABASE_SECRET_KEY || environment.SUPABASE_SERVICE_ROLE_KEY;
  const resendApiKey = environment.RESEND_API_KEY;

  const missing = [];
  if (!supabaseUrl) missing.push('SUPABASE_URL');
  if (!supabaseSecretKey) missing.push('SUPABASE_SECRET_KEY');
  if (!resendApiKey) missing.push('RESEND_API_KEY');

  return {
    missing,
    supabaseUrl: supabaseUrl?.replace(/\/$/, ''),
    supabaseSecretKey,
    resendApiKey,
    from: environment.APPLICANT_ALERT_FROM || DEFAULT_ALERT_FROM,
    guide: readGuideMailConfig(environment)
  };
}

function readId(body) {
  let parsed = body;
  if (typeof body === 'string') {
    try {
      parsed = JSON.parse(body);
    } catch {
      return null;
    }
  }
  const id = parsed?.id;
  return typeof id === 'string' && UUID_PATTERN.test(id) ? id.toLowerCase() : null;
}

async function fetchAccessRequest(config, id, fetchImplementation) {
  const query = new URLSearchParams({
    select: 'id,name,google_email,motivation,created_at',
    id: `eq.${id}`
  });
  const response = await fetchImplementation(
    `${config.supabaseUrl}/rest/v1/access_requests?${query.toString()}`,
    { headers: supabaseHeaders(config) }
  );
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Supabase access request lookup failed (${response.status}): ${detail}`);
  }
  const rows = await response.json();
  return Array.isArray(rows) ? rows[0] ?? null : null;
}

function supabaseHeaders(config, extra = {}) {
  return {
    apikey: config.supabaseSecretKey,
    Authorization: `Bearer ${config.supabaseSecretKey}`,
    ...extra
  };
}

// 같은 주소로 최근 24시간 안에 안내 메일이 나갔는지
async function guideSentRecently(config, row, now, fetchImplementation) {
  const query = new URLSearchParams({
    select: 'id',
    google_email: `eq.${row.google_email}`,
    id: `neq.${row.id}`,
    guide_sent_at: `gte.${new Date(now.getTime() - GUIDE_PER_EMAIL_WINDOW_MS).toISOString()}`,
    limit: '1'
  });
  const response = await fetchImplementation(
    `${config.supabaseUrl}/rest/v1/access_requests?${query.toString()}`,
    { headers: supabaseHeaders(config) }
  );
  if (!response.ok) {
    throw new Error(`Supabase guide history lookup failed (${response.status}): ${await response.text()}`);
  }
  const rows = await response.json();
  return Array.isArray(rows) && rows.length > 0;
}

// guide_sent_at이 비어 있을 때만 채운다. 동시에 두 번 불려도 한쪽만 행을 돌려받으므로 한 통만 나간다
async function setGuideSentAt(config, id, value, fetchImplementation, { onlyIfEmpty }) {
  const query = new URLSearchParams({ id: `eq.${id}` });
  if (onlyIfEmpty) query.set('guide_sent_at', 'is.null');
  const response = await fetchImplementation(
    `${config.supabaseUrl}/rest/v1/access_requests?${query.toString()}`,
    {
      method: 'PATCH',
      headers: supabaseHeaders(config, {
        'Content-Type': 'application/json',
        Prefer: 'return=representation'
      }),
      body: JSON.stringify({ guide_sent_at: value })
    }
  );
  if (!response.ok) {
    throw new Error(`Supabase guide claim failed (${response.status}): ${await response.text()}`);
  }
  const rows = await response.json();
  return Array.isArray(rows) && rows.length > 0;
}

async function deliverGuide(config, row, now, { fetchImplementation, guideTransport }) {
  if (!config.guide.enabled) return 'disabled';
  if (await guideSentRecently(config, row, now, fetchImplementation)) return 'skipped_recent';

  const claimed = await setGuideSentAt(config, row.id, now.toISOString(), fetchImplementation, {
    onlyIfEmpty: true
  });
  if (!claimed) return 'skipped_already_sent';

  try {
    await sendGuideEmail(config.guide, row, guideTransport ?? undefined);
  } catch (error) {
    // 못 보냈으면 표시를 되돌려 소급 발송 대상에 다시 잡히게 한다
    await setGuideSentAt(config, row.id, null, fetchImplementation, { onlyIfEmpty: false }).catch(
      (releaseError) => console.error('[access-request-alert] Guide claim release failed:', releaseError)
    );
    throw error;
  }
  return 'sent';
}

function isFresh(createdAt, now) {
  const created = new Date(createdAt).getTime();
  if (Number.isNaN(created)) return false;
  // 시계 오차로 created_at이 살짝 미래일 수 있어 음수 쪽은 1분까지 허용
  const age = now.getTime() - created;
  return age >= -60 * 1000 && age <= FRESH_WINDOW_MS;
}

function buildAccessRequestEmail(row) {
  const name = row.name || '이름 미입력';
  const email = row.google_email || '이메일 미입력';
  const motivation = row.motivation || '';
  const requestedAt = formatKstDateTime(row.created_at);
  // 제목에 줄바꿈이 섞이지 않게 한 줄로 만든다
  const subjectName = name.replace(/\s+/g, ' ').slice(0, 50);

  return {
    subject: `[인생관리AI앱] 새 사용 신청 — ${subjectName}`,
    html: `
      <div style="font-family:Arial,'Noto Sans KR',sans-serif;color:#1d2939;line-height:1.6;max-width:600px;margin:auto">
        <h1 style="font-size:22px;margin:0 0 8px">새 사용 신청이 들어왔습니다</h1>
        <p style="margin:0 0 20px;color:#475467">${escapeHtml(requestedAt)}</p>
        <p style="margin:0 0 4px"><strong>${escapeHtml(name)}</strong></p>
        <p style="margin:0 0 16px">${escapeHtml(email)}</p>
        <p style="margin:0 0 4px;color:#475467;font-size:14px">신청 동기</p>
        <p style="margin:0 0 24px;white-space:pre-wrap">${escapeHtml(motivation)}</p>
        <a href="${ADMIN_URL}" style="display:inline-block;background:#2e3142;color:#fff;text-decoration:none;padding:12px 18px;border-radius:8px">관리자 화면에서 확인</a>
        <p style="margin:24px 0 0;color:#98a2b3;font-size:12px">승인은 신청자가 이 구글 계정으로 처음 로그인한 뒤 「승인 대기」에서 합니다.</p>
      </div>
    `,
    text: `인생관리AI앱 새 사용 신청\n\n이름: ${name}\n구글 이메일: ${email}\n신청 시각: ${requestedAt}\n\n신청 동기:\n${motivation}\n\n관리자 화면: ${ADMIN_URL}`
  };
}

async function sendAccessRequestEmail(config, row, fetchImplementation) {
  const email = buildAccessRequestEmail(row);
  const response = await fetchImplementation(RESEND_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.resendApiKey}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': `life-ai-access-request-${row.id}`
    },
    body: JSON.stringify({
      from: config.from,
      to: [ALERT_RECIPIENT],
      subject: email.subject,
      html: email.html,
      text: email.text
    })
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Resend send failed (${response.status}): ${detail}`);
  }
  return response.json();
}

// 테스트에서 fetch·SMTP를 바꿔 끼울 수 있게 본체를 따로 둔다
async function handleAccessRequestAlert(request, response, deps = {}) {
  const fetchImplementation = deps.fetchImplementation ?? fetch;
  const now = deps.now ?? new Date();

  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return sendJson(response, 405, { ok: false, error: 'method_not_allowed' });
  }

  const id = readId(request.body);
  if (!id) return sendJson(response, 400, { ok: false, error: 'invalid_id' });

  const config = readConfig(process.env);
  if (config.missing.length > 0) {
    console.error('[access-request-alert] Missing configuration:', config.missing.join(', '));
    return sendJson(response, 500, { ok: false, error: 'configuration_missing' });
  }
  if (!config.guide.enabled) {
    console.warn('[access-request-alert] GMAIL_APP_PASSWORD missing or not 16 chars — applicant guide disabled');
  }

  let row;
  try {
    row = await fetchAccessRequest(config, id, fetchImplementation);
  } catch (error) {
    console.error('[access-request-alert] Failed:', error);
    return sendJson(response, 502, { ok: false, error: 'notification_failed' });
  }
  if (!row) return sendJson(response, 404, { ok: false, error: 'not_found' });
  if (!isFresh(row.created_at, now)) {
    return sendJson(response, 200, { ok: true, sent: false, guide: 'stale', reason: 'stale' });
  }

  const [ownerResult, guideResult] = await Promise.allSettled([
    sendAccessRequestEmail(config, row, fetchImplementation),
    deliverGuide(config, row, now, { fetchImplementation, guideTransport: deps.guideTransport })
  ]);

  const guide = guideResult.status === 'fulfilled' ? guideResult.value : 'failed';
  if (guideResult.status === 'rejected') {
    console.error('[access-request-alert] Guide mail failed:', guideResult.reason);
  } else {
    console.info('[access-request-alert] Guide mail', guide, id);
  }

  if (ownerResult.status === 'rejected') {
    console.error('[access-request-alert] Failed:', ownerResult.reason);
    return sendJson(response, 502, { ok: false, error: 'notification_failed', guide });
  }
  console.info('[access-request-alert] Sent alert for access request', id);
  return sendJson(response, 200, { ok: true, sent: true, messageId: ownerResult.value.id, guide });
}

export default function handler(request, response) {
  return handleAccessRequestAlert(request, response);
}

export { buildAccessRequestEmail, handleAccessRequestAlert, isFresh, readId };
