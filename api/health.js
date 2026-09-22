// 외부 API 설정 점검 — 로그인 없이 열리므로 값은 한 글자도 싣지 않는다.
// 전부 정상이면 200 ok, 하나라도 빠지거나 DB가 안 닿으면 503 degraded.

import { REQUIRED_ENV, inspectConfig } from './_lib/led-auth.js';

export function createHealthHandler({ environment = process.env, fetchImpl = fetch } = {}) {
  return async function handler(request, response) {
    response.setHeader('Cache-Control', 'no-store');
    const { missing, problems, config } = inspectConfig(environment);
    const configured = Object.fromEntries(REQUIRED_ENV.map((name) => [name, !missing.includes(name)]));

    let database = 'skipped';
    if (config.supabaseUrl && config.secretKey && !problems.SUPABASE_URL) {
      try {
        const result = await fetchImpl(`${config.supabaseUrl}/rest/v1/profiles?select=id&limit=1`, {
          headers: { apikey: config.secretKey, Authorization: `Bearer ${config.secretKey}` }
        });
        database = result.ok ? 'ok' : `error ${result.status}`;
      } catch {
        database = 'unreachable';
      }
    }

    const ok = missing.length === 0 && Object.keys(problems).length === 0 && database === 'ok';
    return response.status(ok ? 200 : 503).json({
      status: ok ? 'ok' : 'degraded',
      configured,
      missing,
      problems,
      database
    });
  };
}

export default createHealthHandler();
