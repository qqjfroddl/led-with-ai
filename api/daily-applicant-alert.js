const ALERT_RECIPIENT = 'matt@deeptactlearning.com';
const DEFAULT_ALERT_FROM = '인생관리AI앱 <onboarding@resend.dev>';
const ADMIN_URL = 'https://led-with-ai.vercel.app/admin.html';
const RESEND_ENDPOINT = 'https://api.resend.com/emails';

function sendJson(response, status, body) {
  response.setHeader('Cache-Control', 'no-store');
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  return response.status(status).json(body);
}

function getHeader(request, name) {
  const value = request.headers?.[name] ?? request.headers?.[name.toLowerCase()];
  return Array.isArray(value) ? value[0] : value;
}

function getKstDate(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function formatKstDateTime(value) {
  if (!value) return '신청 시각 미상';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '신청 시각 미상';
  return new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(date);
}

function requireConfig(environment) {
  const supabaseUrl = environment.SUPABASE_URL || environment.VITE_SUPABASE_URL;
  const supabaseSecretKey =
    environment.SUPABASE_SECRET_KEY || environment.SUPABASE_SERVICE_ROLE_KEY;
  const resendApiKey = environment.RESEND_API_KEY;
  const from = environment.APPLICANT_ALERT_FROM || DEFAULT_ALERT_FROM;
  const cronSecret = environment.CRON_SECRET;

  const missing = [];
  if (!supabaseUrl) missing.push('SUPABASE_URL');
  if (!supabaseSecretKey) missing.push('SUPABASE_SECRET_KEY');
  if (!resendApiKey) missing.push('RESEND_API_KEY');
  if (!cronSecret) missing.push('CRON_SECRET');

  return {
    missing,
    supabaseUrl: supabaseUrl?.replace(/\/$/, ''),
    supabaseSecretKey,
    resendApiKey,
    from,
    cronSecret
  };
}

async function fetchPendingApplicants(config, fetchImplementation) {
  const query = new URLSearchParams({
    select: 'id,email,name,created_at',
    status: 'eq.pending',
    order: 'created_at.asc'
  });
  const response = await fetchImplementation(
    `${config.supabaseUrl}/rest/v1/profiles?${query.toString()}`,
    {
      headers: {
        apikey: config.supabaseSecretKey,
        Authorization: `Bearer ${config.supabaseSecretKey}`
      }
    }
  );

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Supabase pending lookup failed (${response.status}): ${detail}`);
  }

  const applicants = await response.json();
  if (!Array.isArray(applicants)) {
    throw new Error('Supabase pending lookup returned a non-array response');
  }
  return applicants;
}

function buildEmail(applicants, kstDate) {
  const rows = applicants
    .map((applicant) => {
      const name = escapeHtml(applicant.name || '이름 미입력');
      const email = escapeHtml(applicant.email || '이메일 미입력');
      const requestedAt = escapeHtml(formatKstDateTime(applicant.created_at));
      return `<li style="margin:0 0 12px"><strong>${name}</strong><br>${email}<br><span style="color:#667085">${requestedAt}</span></li>`;
    })
    .join('');

  const textRows = applicants
    .map((applicant, index) => {
      const name = applicant.name || '이름 미입력';
      const email = applicant.email || '이메일 미입력';
      return `${index + 1}. ${name} / ${email} / ${formatKstDateTime(applicant.created_at)}`;
    })
    .join('\n');

  return {
    subject: `[인생관리AI앱] 승인 대기 신청자 ${applicants.length}명`,
    html: `
      <div style="font-family:Arial,'Noto Sans KR',sans-serif;color:#1d2939;line-height:1.6;max-width:600px;margin:auto">
        <h1 style="font-size:22px;margin:0 0 8px">승인 대기 신청자가 있습니다</h1>
        <p style="margin:0 0 20px;color:#475467">${escapeHtml(kstDate)} 기준 ${applicants.length}명이 기다리고 있습니다.</p>
        <ol style="padding-left:24px;margin:0 0 24px">${rows}</ol>
        <a href="${ADMIN_URL}" style="display:inline-block;background:#2e3142;color:#fff;text-decoration:none;padding:12px 18px;border-radius:8px">관리자 화면에서 확인</a>
        <p style="margin:24px 0 0;color:#98a2b3;font-size:12px">대기 신청자가 없으면 이 메일은 발송되지 않습니다.</p>
      </div>
    `,
    text: `인생관리AI앱 승인 대기 신청자가 ${applicants.length}명 있습니다.\n\n${textRows}\n\n관리자 화면: ${ADMIN_URL}`
  };
}

async function sendApplicantEmail(config, applicants, kstDate, fetchImplementation) {
  const email = buildEmail(applicants, kstDate);
  const response = await fetchImplementation(RESEND_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.resendApiKey}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': `life-ai-pending-${kstDate}`
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

export default async function handler(request, response) {
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    return sendJson(response, 405, { ok: false, error: 'method_not_allowed' });
  }

  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error('[daily-applicant-alert] Missing configuration: CRON_SECRET');
    return sendJson(response, 500, { ok: false, error: 'configuration_missing' });
  }

  if (getHeader(request, 'authorization') !== `Bearer ${cronSecret}`) {
    return sendJson(response, 401, { ok: false, error: 'unauthorized' });
  }

  const config = requireConfig(process.env);
  if (config.missing.length > 0) {
    console.error('[daily-applicant-alert] Missing configuration:', config.missing.join(', '));
    return sendJson(response, 500, { ok: false, error: 'configuration_missing' });
  }

  try {
    const applicants = await fetchPendingApplicants(config, fetch);
    if (applicants.length === 0) {
      return sendJson(response, 200, { ok: true, sent: false, pendingCount: 0 });
    }

    const kstDate = getKstDate();
    const result = await sendApplicantEmail(config, applicants, kstDate, fetch);
    console.info(`[daily-applicant-alert] Sent daily alert for ${applicants.length} pending applicant(s)`);
    return sendJson(response, 200, {
      ok: true,
      sent: true,
      pendingCount: applicants.length,
      messageId: result.id
    });
  } catch (error) {
    console.error('[daily-applicant-alert] Failed:', error);
    return sendJson(response, 502, { ok: false, error: 'notification_failed' });
  }
}

export {
  ALERT_RECIPIENT,
  DEFAULT_ALERT_FROM,
  buildEmail,
  fetchPendingApplicants,
  getKstDate,
  requireConfig,
  sendApplicantEmail
};
