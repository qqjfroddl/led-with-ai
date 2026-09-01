import assert from 'node:assert/strict';
import test from 'node:test';

import handler, { ALERT_RECIPIENT, getKstDate } from '../api/daily-applicant-alert.js';

const CONFIG = {
  SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_SECRET_KEY: 'secret-test-key',
  RESEND_API_KEY: 're_test',
  CRON_SECRET: 'cron-test-secret'
};

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

async function withEnvironment(callback) {
  const previous = {};
  for (const [key, value] of Object.entries(CONFIG)) {
    previous[key] = process.env[key];
    process.env[key] = value;
  }
  try {
    await callback();
  } finally {
    for (const key of Object.keys(CONFIG)) {
      if (previous[key] === undefined) delete process.env[key];
      else process.env[key] = previous[key];
    }
  }
}

test('KST 날짜를 YYYY-MM-DD로 만든다', () => {
  assert.equal(getKstDate(new Date('2026-09-01T15:30:00Z')), '2026-09-02');
});

test('승인되지 않은 호출은 거절한다', async () => {
  await withEnvironment(async () => {
    const response = createResponse();
    await handler({ method: 'GET', headers: {} }, response);
    assert.equal(response.statusCode, 401);
    assert.equal(response.body.error, 'unauthorized');
  });
});

test('대기자가 없으면 메일을 보내지 않는다', async () => {
  await withEnvironment(async () => {
    const originalFetch = global.fetch;
    let calls = 0;
    global.fetch = async () => {
      calls += 1;
      return new Response(JSON.stringify([]), { status: 200 });
    };
    try {
      const response = createResponse();
      await handler(
        { method: 'GET', headers: { authorization: 'Bearer cron-test-secret' } },
        response
      );
      assert.equal(response.statusCode, 200);
      assert.deepEqual(response.body, { ok: true, sent: false, pendingCount: 0 });
      assert.equal(calls, 1);
    } finally {
      global.fetch = originalFetch;
    }
  });
});

test('대기자가 있으면 matt 주소로 한 통만 보낸다', async () => {
  await withEnvironment(async () => {
    const originalFetch = global.fetch;
    const requests = [];
    global.fetch = async (url, options = {}) => {
      requests.push({ url: String(url), options });
      if (String(url).includes('supabase.co')) {
        return new Response(
          JSON.stringify([
            {
              id: 'user-1',
              name: '홍길동',
              email: 'applicant@example.com',
              created_at: '2026-09-01T10:00:00Z'
            }
          ]),
          { status: 200 }
        );
      }
      return new Response(JSON.stringify({ id: 'email-1' }), { status: 200 });
    };
    try {
      const response = createResponse();
      await handler(
        { method: 'GET', headers: { authorization: 'Bearer cron-test-secret' } },
        response
      );
      assert.equal(response.statusCode, 200);
      assert.equal(response.body.sent, true);
      assert.equal(response.body.pendingCount, 1);
      assert.equal(requests.length, 2);

      const emailRequest = requests[1];
      const emailBody = JSON.parse(emailRequest.options.body);
      assert.deepEqual(emailBody.to, [ALERT_RECIPIENT]);
      assert.match(emailBody.subject, /승인 대기 신청자 1명/);
      assert.match(emailBody.html, /홍길동/);
      assert.match(emailBody.html, /관리자 화면에서 확인/);
      assert.match(emailRequest.options.headers['Idempotency-Key'], /^life-ai-pending-\d{4}-\d{2}-\d{2}$/);
    } finally {
      global.fetch = originalFetch;
    }
  });
});
