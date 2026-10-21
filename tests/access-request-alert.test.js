import assert from 'node:assert/strict';
import test from 'node:test';

import handler, { isFresh, readId } from '../api/access-request-alert.js';
import { ALERT_RECIPIENT } from '../api/daily-applicant-alert.js';

const CONFIG = {
  SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_SECRET_KEY: 'secret-test-key',
  RESEND_API_KEY: 're_test'
};
const ID = '0f8fad5b-d9cb-469f-a165-70867728950e';

function createResponse() {
  return {
    headers: {},
    statusCode: 200,
    body: undefined,
    setHeader(name, value) {
      this.headers[name] = value;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    }
  };
}

// 환경변수와 전역 fetch를 바꿔 끼우고, 호출 기록을 돌려준다
async function run({ body, method = 'POST', rows = [], supabaseStatus = 200, env = CONFIG }) {
  const previousEnv = {};
  for (const key of Object.keys(CONFIG)) {
    previousEnv[key] = process.env[key];
    if (env[key] === undefined) delete process.env[key];
    else process.env[key] = env[key];
  }
  const previousFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, init = {}) => {
    calls.push({ url: String(url), init });
    if (String(url).includes('/rest/v1/access_requests')) {
      return new Response(JSON.stringify(rows), { status: supabaseStatus });
    }
    return new Response(JSON.stringify({ id: 'email-1' }), { status: 200 });
  };

  const response = createResponse();
  try {
    await handler({ method, body, headers: {} }, response);
  } finally {
    globalThis.fetch = previousFetch;
    for (const [key, value] of Object.entries(previousEnv)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
  return { response, calls, emailCalls: calls.filter((c) => c.url.includes('resend.com')) };
}

function freshRow(overrides = {}) {
  return {
    id: ID,
    name: '홍길동',
    google_email: 'hong@gmail.com',
    motivation: '루틴을 꾸준히 하고 싶습니다.',
    created_at: new Date().toISOString(),
    ...overrides
  };
}

test('POST가 아니면 405', async () => {
  const { response, calls } = await run({ method: 'GET', body: { id: ID } });
  assert.equal(response.statusCode, 405);
  assert.equal(calls.length, 0);
});

test('id가 uuid가 아니면 DB도 메일도 건드리지 않는다', async () => {
  for (const body of [{}, { id: 'abc' }, { id: `${ID}&id=neq.x` }, 'not-json', { id: 123 }]) {
    const { response, calls } = await run({ body });
    assert.equal(response.statusCode, 400, JSON.stringify(body));
    assert.equal(calls.length, 0);
  }
});

test('환경변수가 없으면 500이고 메일을 보내지 않는다', async () => {
  const { response, emailCalls } = await run({
    body: { id: ID },
    env: { ...CONFIG, RESEND_API_KEY: undefined }
  });
  assert.equal(response.statusCode, 500);
  assert.equal(emailCalls.length, 0);
});

test('DB에 없는 신청서 id면 404이고 메일을 보내지 않는다', async () => {
  const { response, emailCalls } = await run({ body: { id: ID }, rows: [] });
  assert.equal(response.statusCode, 404);
  assert.equal(emailCalls.length, 0);
});

test('10분 지난 신청서로는 다시 알리지 않는다', async () => {
  const old = new Date(Date.now() - 11 * 60 * 1000).toISOString();
  const { response, emailCalls } = await run({ body: { id: ID }, rows: [freshRow({ created_at: old })] });
  assert.equal(response.statusCode, 200);
  assert.equal(response.body.sent, false);
  assert.equal(emailCalls.length, 0);
});

test('새 신청서면 DB 값으로 소장님께 한 통 보내고 중복 방지 키를 건다', async () => {
  const { response, calls, emailCalls } = await run({
    // 화면이 다른 내용을 끼워 보내도 무시하고 DB 값만 쓴다
    body: JSON.stringify({ id: ID.toUpperCase(), name: '가짜', motivation: '스팸' }),
    rows: [freshRow()]
  });
  assert.equal(response.statusCode, 200);
  assert.equal(response.body.sent, true);

  const lookup = calls.find((c) => c.url.includes('/rest/v1/access_requests'));
  assert.match(lookup.url, new RegExp(`id=eq.${ID}`));
  assert.equal(lookup.init.headers.Authorization, 'Bearer secret-test-key');

  assert.equal(emailCalls.length, 1);
  const sent = JSON.parse(emailCalls[0].init.body);
  assert.deepEqual(sent.to, [ALERT_RECIPIENT]);
  assert.equal(emailCalls[0].init.headers['Idempotency-Key'], `life-ai-access-request-${ID}`);
  assert.match(sent.subject, /홍길동/);
  assert.match(sent.text, /hong@gmail\.com/);
  assert.match(sent.text, /루틴을 꾸준히/);
  assert.doesNotMatch(sent.text, /스팸|가짜/);
});

test('신청서 내용의 HTML은 이스케이프하고 제목엔 줄바꿈이 없다', async () => {
  const { emailCalls } = await run({
    body: { id: ID },
    rows: [freshRow({ name: '<b>홍\n길동</b>', motivation: '<script>alert(1)</script>' })]
  });
  const sent = JSON.parse(emailCalls[0].init.body);
  assert.doesNotMatch(sent.html, /<script>/);
  assert.match(sent.html, /&lt;script&gt;/);
  assert.doesNotMatch(sent.subject, /\n/);
});

test('Supabase 조회가 실패하면 502이고 메일을 보내지 않는다', async () => {
  const { response, emailCalls } = await run({ body: { id: ID }, supabaseStatus: 500 });
  assert.equal(response.statusCode, 502);
  assert.equal(emailCalls.length, 0);
});

test('isFresh: 10분 경계와 시계 오차', () => {
  const now = new Date('2026-10-21T10:00:00Z');
  assert.equal(isFresh('2026-10-21T09:50:30Z', now), true);
  assert.equal(isFresh('2026-10-21T09:49:00Z', now), false);
  assert.equal(isFresh('2026-10-21T10:00:30Z', now), true);
  assert.equal(isFresh('2026-10-21T10:05:00Z', now), false);
  assert.equal(isFresh('not-a-date', now), false);
});

test('readId: 소문자로 정규화한다', () => {
  assert.equal(readId({ id: ID.toUpperCase() }), ID);
  assert.equal(readId(null), null);
});
