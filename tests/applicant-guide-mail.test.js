import assert from 'node:assert/strict';
import test from 'node:test';

import { handleAccessRequestAlert } from '../api/access-request-alert.js';
import {
  GUIDE_LINKS,
  buildGuideEmail,
  readGuideMailConfig
} from '../api/_lib/applicant-guide-mail.js';

const ENV = {
  SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_SECRET_KEY: 'secret-test-key',
  RESEND_API_KEY: 're_test',
  GMAIL_APP_PASSWORD: 'abcd efgh ijkl mnop'
};
const ID = '0f8fad5b-d9cb-469f-a165-70867728950e';
const NOW = new Date('2026-10-22T13:00:00Z');

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

function freshRow(overrides = {}) {
  return {
    id: ID,
    name: '홍길동',
    google_email: 'hong@gmail.com',
    motivation: '루틴을 꾸준히 하고 싶습니다.',
    created_at: new Date(NOW.getTime() - 30 * 1000).toISOString(),
    ...overrides
  };
}

// Supabase·Resend·SMTP를 흉내 낸다. 요청 종류별로 응답을 바꿀 수 있다
async function run({
  row = freshRow(),
  recent = [],
  claimRows = [{ id: ID }],
  resendStatus = 200,
  smtpError = null,
  env = ENV
} = {}) {
  const previousEnv = {};
  for (const key of Object.keys(ENV)) {
    previousEnv[key] = process.env[key];
    if (env[key] === undefined) delete process.env[key];
    else process.env[key] = env[key];
  }

  const calls = [];
  const fetchImplementation = async (url, init = {}) => {
    const text = String(url);
    calls.push({ url: text, init });
    if (text.includes('resend.com')) {
      return new Response(JSON.stringify({ id: 'email-1' }), { status: resendStatus });
    }
    if (init.method === 'PATCH') {
      const releasing = JSON.parse(init.body).guide_sent_at === null;
      return new Response(JSON.stringify(releasing ? [{ id: ID }] : claimRows), { status: 200 });
    }
    if (text.includes('guide_sent_at=gte')) {
      return new Response(JSON.stringify(recent), { status: 200 });
    }
    return new Response(JSON.stringify(row ? [row] : []), { status: 200 });
  };

  const sentMails = [];
  const guideTransport = {
    async sendMail(message) {
      if (smtpError) throw smtpError;
      sentMails.push(message);
      return { messageId: 'smtp-1' };
    }
  };

  const response = createResponse();
  try {
    await handleAccessRequestAlert({ method: 'POST', body: { id: ID }, headers: {} }, response, {
      fetchImplementation,
      guideTransport,
      now: NOW
    });
  } finally {
    for (const [key, value] of Object.entries(previousEnv)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }

  const patches = calls.filter((c) => c.init.method === 'PATCH');
  return { response, calls, patches, sentMails };
}

test('새 신청서면 신청자 주소로 안내 메일 한 통, 발송 표시는 비어 있을 때만 채운다', async () => {
  const { response, patches, sentMails } = await run();
  assert.equal(response.statusCode, 200);
  assert.equal(response.body.sent, true);
  assert.equal(response.body.guide, 'sent');

  assert.equal(sentMails.length, 1);
  assert.equal(sentMails[0].to, 'hong@gmail.com');
  assert.match(sentMails[0].from, /<matt@deeptactlearning\.com>$/);

  assert.equal(patches.length, 1);
  assert.match(patches[0].url, /guide_sent_at=is\.null/);
  assert.match(patches[0].url, new RegExp(`id=eq\\.${ID}`));
});

test('같은 주소로 24시간 안에 이미 보냈으면 보내지 않는다 (남의 주소 반복 발송 방지)', async () => {
  const { response, calls, patches, sentMails } = await run({ recent: [{ id: 'other' }] });
  assert.equal(response.statusCode, 200);
  assert.equal(response.body.guide, 'skipped_recent');
  assert.equal(sentMails.length, 0);
  assert.equal(patches.length, 0);

  const history = calls.find((c) => c.url.includes('guide_sent_at=gte'));
  assert.match(history.url, /google_email=eq\.hong%40gmail\.com/);
  assert.match(history.url, new RegExp(`id=neq\\.${ID}`));
  // 24시간 전 시각으로 찾는다
  assert.match(decodeURIComponent(history.url), /gte\.2026-10-21T13:00:00\.000Z/);
});

test('동시에 두 번 불려 표시를 못 채웠으면 보내지 않는다', async () => {
  const { response, sentMails } = await run({ claimRows: [] });
  assert.equal(response.body.guide, 'skipped_already_sent');
  assert.equal(sentMails.length, 0);
});

test('안내 메일 발송이 실패하면 표시를 되돌리고, 소장님 알림은 그대로 성공한다', async () => {
  const { response, patches } = await run({ smtpError: new Error('Invalid login') });
  assert.equal(response.statusCode, 200);
  assert.equal(response.body.sent, true);
  assert.equal(response.body.guide, 'failed');

  assert.equal(patches.length, 2);
  assert.equal(JSON.parse(patches[1].init.body).guide_sent_at, null);
  assert.doesNotMatch(patches[1].url, /is\.null/);
});

test('소장님 알림이 실패해도 신청자 안내 메일은 나간다', async () => {
  const { response, sentMails } = await run({ resendStatus: 500 });
  assert.equal(response.statusCode, 502);
  assert.equal(response.body.guide, 'sent');
  assert.equal(sentMails.length, 1);
});

test('앱 비밀번호가 없으면 안내 메일만 끄고 소장님 알림은 보낸다', async () => {
  const { response, calls, sentMails } = await run({ env: { ...ENV, GMAIL_APP_PASSWORD: undefined } });
  assert.equal(response.statusCode, 200);
  assert.equal(response.body.guide, 'disabled');
  assert.equal(sentMails.length, 0);
  assert.equal(calls.filter((c) => c.url.includes('resend.com')).length, 1);
});

test('10분 지난 신청서로는 안내 메일도 보내지 않는다', async () => {
  const old = new Date(NOW.getTime() - 11 * 60 * 1000).toISOString();
  const { response, sentMails, patches } = await run({ row: freshRow({ created_at: old }) });
  assert.equal(response.body.guide, 'stale');
  assert.equal(sentMails.length, 0);
  assert.equal(patches.length, 0);
});

test('readGuideMailConfig: 띄어쓰기는 지우고 16자일 때만 켠다', () => {
  assert.equal(readGuideMailConfig({ GMAIL_APP_PASSWORD: 'abcd efgh ijkl mnop' }).enabled, true);
  assert.equal(readGuideMailConfig({ GMAIL_APP_PASSWORD: 'abcdefghijklmnop' }).password, 'abcdefghijklmnop');
  assert.equal(readGuideMailConfig({ GMAIL_APP_PASSWORD: 'abcd efgh ijkl mno' }).enabled, false);
  // vercel env pull 이 sensitive 값 대신 내려주는 가림 문구
  assert.equal(readGuideMailConfig({ GMAIL_APP_PASSWORD: '[SENSITIVE]' }).enabled, false);
  assert.equal(readGuideMailConfig({}).enabled, false);
  assert.equal(readGuideMailConfig({}).user, 'matt@deeptactlearning.com');
});

test('buildGuideEmail: 링크 4개·승인 안내·이스케이프', () => {
  const email = buildGuideEmail(freshRow({ name: '<b>홍\n길동</b>' }));
  for (const link of GUIDE_LINKS) {
    assert.ok(email.html.includes(`href="${link.url}"`), link.label);
    assert.ok(email.text.includes(link.url), link.label);
  }
  assert.equal(GUIDE_LINKS.length, 4);
  assert.match(email.text, /승인되면 바로 사용하실 수 있습니다/);
  assert.match(email.text, /hong@gmail\.com/);
  assert.doesNotMatch(email.html, /<b>홍/);
  assert.match(email.html, /&lt;b&gt;홍 길동/);
  assert.doesNotMatch(email.subject, /\n/);
});

test('buildGuideEmail: 이름이 비면 「신청자님」', () => {
  assert.match(buildGuideEmail({ name: '  ', google_email: 'a@b.co' }).text, /^신청자님/);
});
