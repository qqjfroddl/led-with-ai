// 인생관리AI앱 외부 API 클라이언트 — MCP 서버가 쓴다
// 토큰은 파일에서 읽고, 어떤 경우에도 출력·오류 메시지에 싣지 않는다.

import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

export const DEFAULT_BASE_URL = 'https://led-with-ai.vercel.app';
export const DEFAULT_TOKEN_FILE = join(homedir(), '.secrets', 'led-api-token');

export function loadToken(environment = process.env) {
  if (environment.LED_API_TOKEN) return environment.LED_API_TOKEN.trim();
  const file = environment.LED_API_TOKEN_FILE || DEFAULT_TOKEN_FILE;
  try {
    const token = readFileSync(file, 'utf8').trim();
    if (token) return token;
  } catch {
    // 아래에서 안내 문구로 처리
  }
  throw new Error(
    `API 토큰 파일이 없습니다: ${file}\n` +
      '앱 저장소의 scripts/led-api/new-token.mjs로 토큰을 만들고, 해시를 Vercel에 넣은 뒤 다시 시도하세요.'
  );
}

export function createClient({ baseUrl, token, fetchImpl = fetch }) {
  const root = baseUrl.replace(/\/+$/, '');

  return async function api(method, path, { query, body } = {}) {
    const url = new URL(`${root}/api/v1/${path}`);
    for (const [key, value] of Object.entries(query ?? {})) {
      if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value));
    }
    let response;
    try {
      response = await fetchImpl(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
          ...(body === undefined ? {} : { 'Content-Type': 'application/json' })
        },
        body: body === undefined ? undefined : JSON.stringify(body)
      });
    } catch (error) {
      throw new Error(`앱 서버에 연결하지 못했습니다 (${root}): ${error.message}`);
    }
    const text = await response.text();
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = null;
    }
    if (!response.ok) {
      const reason = data?.error ?? `HTTP ${response.status}`;
      const hint = {
        401: ' — 토큰이 서버 해시와 맞지 않습니다. 토큰을 새로 만들었다면 Vercel 해시 교체와 재배포가 필요합니다.',
        503: ` — 서버 설정이 덜 됐습니다. ${root}/api/health 에서 빠진 항목을 확인하세요.`
      }[response.status] ?? '';
      throw new Error(`${reason}${hint}`);
    }
    return data;
  };
}
