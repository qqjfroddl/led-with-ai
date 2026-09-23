#!/usr/bin/env node
// 인생관리AI앱 MCP 서버 (stdio) — 소장님 본인 계정의 할일·루틴·성찰을 클로드에서 조작한다
// 실제 데이터 처리는 앱 서버(/api/v1)가 하고, 여기는 도구 정의와 표시만 맡는다.

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

import { DEFAULT_BASE_URL, createClient, loadToken } from './client.js';
import { formatDay, formatTodos, formatWeek } from './format.js';

const CATEGORY = z
  .enum(['work', 'job', 'self_dev', 'personal'])
  .describe('할일 영역: work=Work, job=Job, self_dev=Growth, personal=Personal');
const DATE = z
  .string()
  .regex(/^(\d{4}-\d{2}-\d{2}|today)$/)
  .describe('YYYY-MM-DD 또는 today (한국 시간 기준). 생략하면 오늘');
const ID = z.string().uuid();

let api;
function client() {
  api ??= createClient({ baseUrl: process.env.LED_API_BASE_URL || DEFAULT_BASE_URL, token: loadToken() });
  return api;
}

const text = (value) => ({ content: [{ type: 'text', text: value }] });
const json = (value) => text(JSON.stringify(value, null, 2));

// 오류는 예외 대신 isError 응답으로 돌려 에이전트가 다음 행동을 고를 수 있게 한다
function tool(handler) {
  return async (args) => {
    try {
      return await handler(args);
    } catch (error) {
      return { isError: true, content: [{ type: 'text', text: `실패: ${error.message}` }] };
    }
  };
}

const READ = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true };
const WRITE = { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true };
const WRITE_IDEMPOTENT = { ...WRITE, idempotentHint: true };

const server = new McpServer({ name: 'led-mcp', version: '0.1.0' });

server.registerTool('led_get_day', {
  title: '하루 보기',
  description: '하루의 할일(영역별)·해당 루틴과 체크 여부·일일 성찰을 보여준다. 할일·루틴 id도 함께 나온다.',
  inputSchema: { date: DATE.optional() },
  annotations: READ
}, tool(async ({ date }) => text(formatDay(await client()('GET', 'day', { query: { date } })))));

server.registerTool('led_list_todos', {
  title: '할일 찾기',
  description: '기간·상태·제목 검색으로 할일을 찾는다 (최신순, 최대 200건). 기간을 안 주면 오늘까지만 본다 — 반복 할일이 먼 미래까지 미리 만들어져 있으니 앞으로의 할일은 from을 준다. 미완료 할일 모아보기, 특정 할일 id 찾기에 쓴다.',
  inputSchema: {
    from: DATE.optional().describe('시작일 (포함)'),
    to: DATE.optional().describe('종료일 (포함)'),
    status: z.enum(['all', 'open', 'done']).default('all').describe('open=미완료(이월·포기 제외), done=완료'),
    q: z.string().max(100).optional().describe('제목에 들어간 말')
  },
  annotations: READ
}, tool(async (args) => text(formatTodos((await client()('GET', 'todos', { query: args })).todos))));

server.registerTool('led_add_todo', {
  title: '할일 추가',
  description: '할일을 하나 추가한다. 영역(category)은 반드시 정해야 한다 — 모호하면 사용자에게 묻는다.',
  inputSchema: {
    title: z.string().min(1).max(500),
    category: CATEGORY,
    date: DATE.optional(),
    memo: z.string().optional(),
    due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe('마감일 YYYY-MM-DD')
  },
  annotations: WRITE
}, tool(async (args) => json(await client()('POST', 'todos', { body: args }))));

server.registerTool('led_complete_todo', {
  title: '할일 완료/취소',
  description: '할일을 완료(done=true) 또는 미완료(done=false)로 바꾼다. 프로젝트 할일이면 프로젝트 쪽도 함께 맞춘다.',
  inputSchema: { id: ID, done: z.boolean().default(true) },
  annotations: WRITE_IDEMPOTENT
}, tool(async ({ id, done }) => json(await client()('PATCH', `todos/${id}`, { body: { is_done: done } }))));

server.registerTool('led_update_todo', {
  title: '할일 고치기',
  description: '할일의 제목·메모·영역·마감일·고정 여부를 고친다. 날짜를 옮기려면 led_carry_over_todo를 쓴다.',
  inputSchema: {
    id: ID,
    title: z.string().min(1).max(500).optional(),
    memo: z.string().nullable().optional(),
    category: CATEGORY.optional(),
    due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
    pinned: z.boolean().optional()
  },
  annotations: WRITE_IDEMPOTENT
}, tool(async ({ id, ...patch }) => json(await client()('PATCH', `todos/${id}`, { body: patch }))));

server.registerTool('led_carry_over_todo', {
  title: '할일 이월',
  description: '미완료 할일을 뒤 날짜로 넘긴다 (앱의 「이어가기」와 같음: 새 날짜에 복제, 원본은 이월 표시). to_date 생략 시 오늘.',
  inputSchema: { id: ID, to_date: DATE.optional() },
  annotations: WRITE
}, tool(async ({ id, to_date }) => json(await client()('POST', `todos/${id}/carry-over`, { body: { to_date } }))));

server.registerTool('led_skip_todo', {
  title: '할일 포기',
  description: '미완료 할일을 포기 처리한다 (앱의 「포기」와 같음, 삭제 아님).',
  inputSchema: { id: ID },
  annotations: WRITE
}, tool(async ({ id }) => json(await client()('POST', `todos/${id}/skip`))));

server.registerTool('led_list_routines', {
  title: '루틴 목록',
  description: '활성 루틴 목록과 주기, 그 날짜에 해당하는지(due_on_date)를 보여준다.',
  inputSchema: { date: DATE.optional() },
  annotations: READ
}, tool(async ({ date }) => json(await client()('GET', 'routines', { query: { date } }))));

server.registerTool('led_check_routine', {
  title: '루틴 체크',
  description: '루틴 실천을 체크(checked=true)하거나 해제한다. 그 날짜에 해당하지 않는 루틴은 거절된다.',
  inputSchema: { routine_id: ID, date: DATE.optional(), checked: z.boolean().default(true) },
  annotations: WRITE_IDEMPOTENT
}, tool(async ({ routine_id, date, checked }) =>
  json(await client()('POST', `routines/${routine_id}/check`, { body: { date, checked } }))));

server.registerTool('led_save_reflection', {
  title: '일일 성찰 쓰기',
  description: '일일 성찰의 네 칸 중 보낸 칸만 저장한다 (나머지 칸은 그대로). 빈 문자열이나 null은 그 칸을 비운다.',
  inputSchema: {
    date: DATE.optional(),
    grateful: z.string().nullable().optional().describe('감사한 일'),
    well_done: z.string().nullable().optional().describe('잘한 일'),
    regret: z.string().nullable().optional().describe('아쉬운 일'),
    tomorrow_promise: z.string().nullable().optional().describe('내일의 다짐')
  },
  annotations: WRITE_IDEMPOTENT
}, tool(async ({ date, ...fields }) =>
  json(await client()('PUT', `reflections/${date ?? 'today'}`, { body: fields }))));

server.registerTool('led_list_projects', {
  title: '프로젝트 보기',
  description: '프로젝트와 그 하위 할일 목록을 보여준다 (읽기 전용).',
  inputSchema: {},
  annotations: READ
}, tool(async () => json(await client()('GET', 'projects'))));

server.registerTool('led_get_week', {
  title: '주간 요약',
  description: '시작일부터 7일간 날짜별 할일 완료 수와 루틴 실천 수를 보여준다.',
  inputSchema: { start: DATE.optional().describe('주 시작일. 생략하면 이번 주 월요일') },
  annotations: READ
}, tool(async ({ start }) => text(formatWeek(await client()('GET', 'week', { query: { start } })))));

await server.connect(new StdioServerTransport());
