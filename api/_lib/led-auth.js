// 인생관리AI앱 외부 API — 설정과 토큰 인증
// 토큰 원문은 서버 어디에도 두지 않는다. 환경변수에는 SHA-256 해시만 둔다.

import { createHash, timingSafeEqual } from 'node:crypto';
import { ApiError } from './led-rules.js';

const TOKEN_HASH_PATTERN = /^[0-9a-f]{64}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const REQUIRED_ENV = ['SUPABASE_URL', 'SUPABASE_SECRET_KEY', 'LED_API_TOKEN_SHA256', 'LED_API_USER_EMAIL'];

export function hashToken(token) {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

// Supabase 주소 형식 검사 — 대시보드 주소를 복사해 넣는 오입력을 연결 전에 잡는다
export function diagnoseSupabaseUrl(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    return '주소 형식이 아닙니다. https://<프로젝트>.supabase.co 형태여야 합니다.';
  }
  if (url.hostname === 'supabase.com' || url.hostname.endsWith('.supabase.com')) {
    return '웹 대시보드 주소가 들어가 있습니다. https://<프로젝트>.supabase.co 로 바꿔 주세요.';
  }
  if (url.protocol !== 'https:' || !url.hostname.endsWith('.supabase.co')) {
    return '호스트가 <프로젝트>.supabase.co가 아닙니다.';
  }
  if (url.pathname !== '/' && url.pathname !== '') {
    return '주소 뒤에 경로가 붙어 있습니다. https://<프로젝트>.supabase.co 까지만 넣어 주세요.';
  }
  return null;
}

// 설정 점검 결과 — 값은 담지 않고 이름과 문제만 담는다
export function inspectConfig(environment) {
  const supabaseUrl = environment.SUPABASE_URL || environment.VITE_SUPABASE_URL;
  const values = {
    SUPABASE_URL: supabaseUrl,
    SUPABASE_SECRET_KEY: environment.SUPABASE_SECRET_KEY || environment.SUPABASE_SERVICE_ROLE_KEY,
    LED_API_TOKEN_SHA256: environment.LED_API_TOKEN_SHA256?.trim().toLowerCase(),
    LED_API_USER_EMAIL: environment.LED_API_USER_EMAIL?.trim()
  };
  const missing = REQUIRED_ENV.filter((name) => !values[name]);
  const problems = {};
  if (values.SUPABASE_URL) {
    const problem = diagnoseSupabaseUrl(values.SUPABASE_URL);
    if (problem) problems.SUPABASE_URL = problem;
  }
  if (values.LED_API_TOKEN_SHA256 && !TOKEN_HASH_PATTERN.test(values.LED_API_TOKEN_SHA256)) {
    problems.LED_API_TOKEN_SHA256 = '토큰 원문이 아니라 64자리 SHA-256 해시를 넣어야 합니다.';
  }
  if (values.LED_API_USER_EMAIL && !EMAIL_PATTERN.test(values.LED_API_USER_EMAIL)) {
    problems.LED_API_USER_EMAIL = '이메일 형식이 아닙니다.';
  }
  return {
    ok: missing.length === 0 && Object.keys(problems).length === 0,
    missing,
    problems,
    config: {
      supabaseUrl: values.SUPABASE_URL?.replace(/\/+$/, ''),
      secretKey: values.SUPABASE_SECRET_KEY,
      tokenHash: values.LED_API_TOKEN_SHA256,
      userEmail: values.LED_API_USER_EMAIL
    }
  };
}

export function getBearerToken(request) {
  const raw = request.headers?.authorization ?? request.headers?.Authorization;
  const header = Array.isArray(raw) ? raw[0] : raw;
  const match = /^Bearer\s+(\S+)$/i.exec(header ?? '');
  return match ? match[1] : null;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function assertAuthorized(request, tokenHash, { failDelayMs = 400 } = {}) {
  // 토큰은 헤더로만 받는다. 쿼리스트링 토큰은 로그·히스토리에 남으므로 받지 않는다
  const token = getBearerToken(request);
  const expected = Buffer.from(tokenHash, 'hex');
  const actual = Buffer.from(token ? hashToken(token) : '', 'hex');
  const ok = actual.length === expected.length && timingSafeEqual(actual, expected);
  if (!ok) {
    await sleep(failDelayMs);
    throw new ApiError(401, '인증 토큰이 없거나 올바르지 않습니다.');
  }
}
