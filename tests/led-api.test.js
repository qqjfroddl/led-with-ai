import assert from 'node:assert/strict';
import test from 'node:test';

import { createHandler, resetOwnerCache } from '../api/v1.js';
import { createHealthHandler } from '../api/health.js';
import { diagnoseSupabaseUrl, hashToken } from '../api/_lib/led-auth.js';
import { assertDate, isRoutineDue } from '../api/_lib/led-rules.js';

import { OTHER, OWNER, TOKEN, baseSeed, createFakeDb, id } from './support/fake-postgrest.js';

const ENV = {
  SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_SECRET_KEY: 'sb_secret_test',
  LED_API_TOKEN_SHA256: hashToken(TOKEN),
  LED_API_USER_EMAIL: 'owner@example.com'
};

function createResponse() {
  return {
    headers: {},
    statusCode: 200,
    body: undefined,
    setHeader(name, value) { this.headers[name] = value; },
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; }
  };
}

async function call(db, method, path, { body, token = TOKEN, query = {}, env = ENV } = {}) {
  resetOwnerCache();
  const handler = createHandler({ environment: env, fetchImpl: db.fetchImpl, failDelayMs: 0 });
  const response = createResponse();
  await handler(
    {
      method,
      headers: token ? { authorization: `Bearer ${token}` } : {},
      query: { ...query, path },
      body
    },
    response
  );
  return response;
}

// 소유자 필터가 빠진 DB 요청이 하나라도 있으면 실패 — profiles 이메일 조회만 예외
function assertAllScoped(db) {
  for (const { table, params, method } of db.calls) {
    if (table === 'profiles') continue;
    assert.equal(params.user_id, `eq.${OWNER}`, `${method} ${table}에 소유자 필터가 없다`);
  }
  assert.ok(db.calls.every(({ method }) => method !== 'DELETE'), 'DELETE 요청이 있으면 안 된다');
}

// ── 인증 ──
test('토큰이 없으면 401, DB는 부르지 않는다', async () => {
  const db = createFakeDb(baseSeed());
  const response = await call(db, 'GET', 'day', { token: null });
  assert.equal(response.statusCode, 401);
  assert.equal(db.calls.length, 0);
});

test('틀린 토큰은 401', async () => {
  const db = createFakeDb(baseSeed());
  assert.equal((await call(db, 'GET', 'day', { token: 'wrong' })).statusCode, 401);
});

test('쿼리스트링 토큰으로는 통과하지 못한다', async () => {
  const db = createFakeDb(baseSeed());
  const response = await call(db, 'GET', 'day', { token: null, query: { token: TOKEN, k: TOKEN } });
  assert.equal(response.statusCode, 401);
});

test('해시 자리에 토큰 원문을 넣으면 503으로 멈춘다', async () => {
  const db = createFakeDb(baseSeed());
  const response = await call(db, 'GET', 'day', { env: { ...ENV, LED_API_TOKEN_SHA256: TOKEN } });
  assert.equal(response.statusCode, 503);
  assert.ok(!JSON.stringify(response.body).includes(TOKEN));
});

test('설정이 빠지면 503', async () => {
  const db = createFakeDb(baseSeed());
  const { LED_API_USER_EMAIL, ...rest } = ENV;
  assert.equal((await call(db, 'GET', 'day', { env: rest })).statusCode, 503);
});

test('없는 경로는 404, 메서드가 틀리면 405', async () => {
  const db = createFakeDb(baseSeed());
  assert.equal((await call(db, 'GET', 'nothing')).statusCode, 404);
  assert.equal((await call(db, 'DELETE', `todos/${id(1)}`)).statusCode, 405);
});

// ── 조회 ──
test('하루 조회: 내 할일만, 지운 할일 제외, 해당 루틴과 체크, 성찰', async () => {
  const db = createFakeDb(baseSeed());
  const response = await call(db, 'GET', 'day', { query: { date: '2026-09-23' } });
  assert.equal(response.statusCode, 200);
  const { todos, routines, reflection } = response.body;
  assert.deepEqual(todos.work.map((t) => t.title), ['원고 3장']);
  assert.equal(todos.personal[0].status, 'done');
  // 2026-09-23은 수요일 → 일요일 루틴(주간 회고)은 빠진다
  assert.deepEqual(routines, [{ id: id(10), title: '물 한 잔', slot: 'morning', checked: true }]);
  assert.equal(reflection.grateful, '가족');
  assertAllScoped(db);
});

test('할일 검색·기간·상태 필터', async () => {
  const db = createFakeDb(baseSeed());
  const response = await call(db, 'GET', 'todos', { query: { from: '2026-09-22', to: '2026-09-23', status: 'open' } });
  assert.deepEqual(response.body.todos.map((t) => t.title).sort(), ['원고 3장', '프로젝트 할일']);
  assert.equal(response.body.todos.find((t) => t.title === '프로젝트 할일').project, '책 원고');
  assertAllScoped(db);
});

test('기간 없는 할일 검색은 오늘까지·최신순 (미래 반복 할일에 200건이 잠식되지 않게)', async () => {
  const { getKstToday } = await import('../api/_lib/led-rules.js');
  const db = createFakeDb(baseSeed());
  await call(db, 'GET', 'todos', { query: {} });
  const { params } = db.calls.find((c) => c.table === 'todos');
  assert.equal(params.and, `(date.lte.${getKstToday()})`);
  assert.match(params.order, /^date\.desc/);

  // 기간을 하나라도 주면 그대로 둔다 — 앞으로의 할일은 from으로 본다
  const db2 = createFakeDb(baseSeed());
  await call(db2, 'GET', 'todos', { query: { from: '2026-10-01' } });
  assert.equal(db2.calls.find((c) => c.table === 'todos').params.and, '(date.gte.2026-10-01)');
});

// ── 쓰기 ──
test('할일 추가는 소유자 id로 들어간다 (본문에 다른 user_id를 넣어도)', async () => {
  const db = createFakeDb(baseSeed());
  const response = await call(db, 'POST', 'todos', {
    body: { title: '  세중 선배 회신  ', category: 'job', date: '2026-09-24', user_id: OTHER }
  });
  assert.equal(response.statusCode, 201);
  const created = db.tables.todos.at(-1);
  assert.equal(created.user_id, OWNER);
  assert.equal(created.title, '세중 선배 회신');
  assertAllScoped(db);
});

test('잘못된 카테고리·빈 제목·없는 날짜는 400', async () => {
  const db = createFakeDb(baseSeed());
  assert.equal((await call(db, 'POST', 'todos', { body: { title: 'x', category: 'growth' } })).statusCode, 400);
  assert.equal((await call(db, 'POST', 'todos', { body: { title: '  ', category: 'work' } })).statusCode, 400);
  assert.equal((await call(db, 'POST', 'todos', { body: { title: 'x', category: 'work', date: '2026-02-30' } })).statusCode, 400);
});

test('남의 할일은 id를 알아도 고칠 수 없다 (404, 원본 그대로)', async () => {
  const db = createFakeDb(baseSeed());
  const response = await call(db, 'PATCH', `todos/${id(4)}`, { body: { is_done: true } });
  assert.equal(response.statusCode, 404);
  assert.equal(db.tables.todos.find((t) => t.id === id(4)).is_done, false);
  assertAllScoped(db);
});

test('프로젝트 할일 완료는 project_tasks까지 동기화한다', async () => {
  const db = createFakeDb(baseSeed());
  const response = await call(db, 'PATCH', `todos/${id(3)}`, { body: { is_done: true } });
  assert.equal(response.statusCode, 200);
  assert.equal(response.body.todo.status, 'done');
  const task = db.tables.project_tasks[0];
  assert.equal(task.is_done, true);
  assert.ok(task.done_at);
  assertAllScoped(db);
});

test('이월: 다음 날로 복제, 원본 표시, 지난 프로젝트 기간 연장', async () => {
  const db = createFakeDb(baseSeed());
  const response = await call(db, 'POST', `todos/${id(3)}/carry-over`, { body: { to_date: '2026-09-23' } });
  assert.equal(response.statusCode, 200);
  assert.equal(response.body.todo.date, '2026-09-23');
  assert.ok(db.tables.todos.find((t) => t.id === id(3)).carried_over_at);
  assert.equal(db.tables.project_tasks[0].end_date, '2026-09-23');
  // 같은 할일을 두 번 이월할 수 없다
  assert.equal((await call(db, 'POST', `todos/${id(3)}/carry-over`, { body: { to_date: '2026-09-24' } })).statusCode, 409);
  assertAllScoped(db);
});

test('포기: skipped_at 기록, 완료한 할일은 409', async () => {
  const db = createFakeDb(baseSeed());
  assert.equal((await call(db, 'POST', `todos/${id(1)}/skip`)).body.todo.status, 'skipped');
  assert.equal((await call(db, 'POST', `todos/${id(2)}/skip`)).statusCode, 409);
});

test('루틴 체크: 해당 날짜 루틴만, 기존 기록은 덮어쓴다', async () => {
  const db = createFakeDb(baseSeed());
  const off = await call(db, 'POST', `routines/${id(10)}/check`, { body: { date: '2026-09-23', checked: false } });
  assert.equal(off.statusCode, 200);
  assert.equal(db.tables.routine_logs.length, 1);
  assert.equal(db.tables.routine_logs[0].checked, false);
  // 일요일 루틴을 수요일에 체크하면 409
  assert.equal((await call(db, 'POST', `routines/${id(11)}/check`, { body: { date: '2026-09-23' } })).statusCode, 409);
  // 남의 루틴은 404
  assert.equal((await call(db, 'POST', `routines/${id(12)}/check`, { body: { date: '2026-09-23' } })).statusCode, 404);
  assertAllScoped(db);
});

test('성찰 저장은 보낸 칸만 바꾸고 나머지는 지킨다', async () => {
  const db = createFakeDb(baseSeed());
  const response = await call(db, 'PUT', 'reflections/2026-09-23', { body: { well_done: 'API 완성' } });
  assert.equal(response.statusCode, 200);
  const saved = db.tables.daily_reflections;
  assert.equal(saved.length, 1);
  assert.equal(saved[0].grateful, '가족');
  assert.equal(saved[0].well_done, 'API 완성');
  assertAllScoped(db);
});

test('주간 요약: 이월·포기 할일은 분모에서 빠진다', async () => {
  const db = createFakeDb(baseSeed());
  const response = await call(db, 'GET', 'week', { query: { start: '2026-09-21' } });
  const wed = response.body.days.find((d) => d.date === '2026-09-23');
  assert.deepEqual(wed, { date: '2026-09-23', todos_done: 1, todos_total: 2, routines_done: 1, routines_total: 1 });
  const sun = response.body.days.find((d) => d.date === '2026-09-27');
  assert.equal(sun.routines_total, 2);
  assertAllScoped(db);
});

// ── 규칙 ──
test('isRoutineDue: 시작일·비활성화일·요일·월간', () => {
  const daily = { schedule: { type: 'daily', active_from_date: '2026-09-10' }, deleted_at: '2026-09-20T03:00:00Z' };
  assert.equal(isRoutineDue(daily, '2026-09-09'), false);
  assert.equal(isRoutineDue(daily, '2026-09-10'), true);
  assert.equal(isRoutineDue(daily, '2026-09-20'), false);
  const sunday = { schedule: { type: 'weekly', days: [7], active_from_date: '2026-01-01' } };
  assert.equal(isRoutineDue(sunday, '2026-09-27'), true);
  assert.equal(isRoutineDue(sunday, '2026-09-28'), false);
  const monthly = { schedule: { type: 'monthly', month: '2026-09-01', active_from_date: '2026-09-01' } };
  assert.equal(isRoutineDue(monthly, '2026-09-30'), true);
  assert.equal(isRoutineDue(monthly, '2026-10-01'), false);
  assert.equal(isRoutineDue({ schedule: 'not json' }, '2026-09-23'), false);
  assert.equal(isRoutineDue({ schedule: { type: 'daily' }, created_at: '2026-09-23T10:00:00Z' }, '2026-09-23'), true);
});

test('assertDate: 틀린 형태를 거른다', () => {
  for (const bad of ['2026-9-3', '2026/09/03', '2026-02-29', '2026-13-01', '', 'today ', 20260903]) {
    assert.throws(() => assertDate(bad), undefined, String(bad));
  }
  assert.equal(assertDate('2028-02-29'), '2028-02-29');
});

test('Supabase 주소 형식 진단: 실제로 잘못 들어올 법한 값들', () => {
  assert.equal(diagnoseSupabaseUrl('https://abc.supabase.co'), null);
  assert.equal(diagnoseSupabaseUrl('https://abc.supabase.co/'), null);
  assert.match(diagnoseSupabaseUrl('https://supabase.com/dashboard/project/abc'), /대시보드/);
  assert.match(diagnoseSupabaseUrl('abc.supabase.co'), /형식/);
  assert.match(diagnoseSupabaseUrl('http://abc.supabase.co'), /호스트/);
  assert.match(diagnoseSupabaseUrl('https://abc.supabase.co/rest/v1'), /경로/);
  assert.match(diagnoseSupabaseUrl('https://led-with-ai.vercel.app'), /호스트/);
});

// ── health ──
test('health: 정상이면 200, 응답에 비밀값이 없다', async () => {
  const db = createFakeDb(baseSeed());
  const response = createResponse();
  await createHealthHandler({ environment: ENV, fetchImpl: db.fetchImpl })({}, response);
  assert.equal(response.statusCode, 200);
  const text = JSON.stringify(response.body);
  for (const secret of Object.values(ENV)) assert.ok(!text.includes(secret), '값이 새면 안 된다');
});

test('health: 누락·오입력이면 503과 이름·원인', async () => {
  const response = createResponse();
  await createHealthHandler({
    environment: { SUPABASE_URL: 'https://supabase.com/dashboard/project/x', LED_API_TOKEN_SHA256: 'raw-token' },
    fetchImpl: async () => { throw new Error('should not call'); }
  })({}, response);
  assert.equal(response.statusCode, 503);
  assert.deepEqual(response.body.missing, ['SUPABASE_SECRET_KEY', 'LED_API_USER_EMAIL']);
  assert.match(response.body.problems.SUPABASE_URL, /대시보드/);
  assert.match(response.body.problems.LED_API_TOKEN_SHA256, /해시/);
  assert.ok(!JSON.stringify(response.body).includes('raw-token'));
});
