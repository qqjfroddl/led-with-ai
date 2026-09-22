// 끝단 테스트: 실제 MCP 서버 프로세스 → HTTP → API 핸들러 → 메모리 DB
// Vercel이 하는 일(경로 재작성·쿼리·JSON 본문 파싱)은 아래 어댑터가 흉내 낸다.

import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { after, before, test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

import { createHandler } from '../api/v1.js';
import { hashToken } from '../api/_lib/led-auth.js';
import { TOKEN, baseSeed, createFakeDb, id } from '../tests/support/fake-postgrest.js';

const db = createFakeDb(baseSeed());
const handler = createHandler({
  environment: {
    SUPABASE_URL: 'https://example.supabase.co',
    SUPABASE_SECRET_KEY: 'sb_secret_test',
    LED_API_TOKEN_SHA256: hashToken(TOKEN),
    LED_API_USER_EMAIL: 'owner@example.com'
  },
  fetchImpl: db.fetchImpl,
  failDelayMs: 0
});

let httpServer;
let client;

before(async () => {
  httpServer = createServer(async (req, res) => {
    const url = new URL(req.url, 'http://local');
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const raw = Buffer.concat(chunks).toString('utf8');
    const query = Object.fromEntries(url.searchParams);
    query.path = url.pathname.replace(/^\/api\/v1\/?/, '');
    const response = {
      statusCode: 200,
      setHeader: (name, value) => res.setHeader(name, value),
      status(code) { this.statusCode = code; return this; },
      json(body) { res.statusCode = this.statusCode; res.end(JSON.stringify(body)); return this; }
    };
    await handler({ method: req.method, headers: req.headers, query, body: raw ? JSON.parse(raw) : undefined }, response);
  });
  await new Promise((resolve) => httpServer.listen(0, '127.0.0.1', resolve));

  client = new Client({ name: 'e2e', version: '0.0.0' });
  await client.connect(new StdioClientTransport({
    command: process.execPath,
    args: [fileURLToPath(new URL('./server.js', import.meta.url))],
    env: { ...process.env, LED_API_BASE_URL: `http://127.0.0.1:${httpServer.address().port}`, LED_API_TOKEN: TOKEN }
  }));
});

after(async () => {
  await client?.close();
  httpServer?.close();
});

const call = async (name, args = {}) => {
  const result = await client.callTool({ name, arguments: args });
  return { ...result, text: result.content.map((part) => part.text).join('\n') };
};

test('도구 12개가 등록되고 읽기/쓰기 표시가 붙어 있다', async () => {
  const { tools } = await client.listTools();
  assert.equal(tools.length, 12);
  assert.ok(tools.every((tool) => tool.name.startsWith('led_')));
  assert.equal(tools.find((tool) => tool.name === 'led_get_day').annotations.readOnlyHint, true);
  assert.equal(tools.find((tool) => tool.name === 'led_add_todo').annotations.readOnlyHint, false);
  assert.ok(tools.every((tool) => tool.annotations.destructiveHint === false));
});

test('하루 보기 → 할일 추가 → 완료 → 성찰 → 주간 요약', async () => {
  const day = await call('led_get_day', { date: '2026-09-23' });
  assert.match(day.text, /### Work\n- \[ \] 원고 3장/);
  assert.match(day.text, /- \[x\] 물 한 잔/);
  assert.match(day.text, /감사한 일: 가족/);
  assert.doesNotMatch(day.text, /남의 할일/);

  const added = await call('led_add_todo', { title: 'MCP 시험', category: 'self_dev', date: '2026-09-23' });
  assert.ok(!added.isError, added.text);
  const newId = JSON.parse(added.text).todo.id;

  assert.ok(!(await call('led_complete_todo', { id: newId })).isError);
  assert.ok(!(await call('led_save_reflection', { date: '2026-09-23', tomorrow_promise: '실기기 확인' })).isError);

  const after = await call('led_get_day', { date: '2026-09-23' });
  assert.match(after.text, /### Growth\n- \[x\] MCP 시험/);
  assert.match(after.text, /내일의 다짐: 실기기 확인/);

  const week = await call('led_get_week', { start: '2026-09-21' });
  assert.match(week.text, /\| 2026-09-23 \| 2\/3 \| 1\/1 \|/);
});

test('오류는 isError로 돌아오고 이유를 알려준다', async () => {
  const wrongOwner = await call('led_complete_todo', { id: id(4) });
  assert.equal(wrongOwner.isError, true);
  assert.match(wrongOwner.text, /찾을 수 없습니다/);

  const notDue = await call('led_check_routine', { routine_id: id(11), date: '2026-09-23' });
  assert.equal(notDue.isError, true);
  assert.match(notDue.text, /해당하지 않습니다/);
});
