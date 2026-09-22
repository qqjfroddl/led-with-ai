// 인생관리AI앱 외부 API v1 — 소장님 본인 계정 기록을 조회·추가·수정한다
// 경로: vercel.json이 /api/v1/<경로>를 /api/v1?path=<경로>로 넘긴다.
// 삭제 API는 두지 않는다 (삭제는 앱 화면에서만).

import { assertAuthorized, inspectConfig } from './_lib/led-auth.js';
import { createStore, resolveUserId } from './_lib/led-store.js';
import {
  ApiError,
  ROUTINE_SLOTS,
  TODO_CATEGORIES,
  assertCategory,
  assertDate,
  assertId,
  assertTitle,
  getKstToday,
  groupTodos,
  mondayOf,
  pickReflection,
  pickTodoPatch,
  summarizeTodo
} from './_lib/led-rules.js';

function sendJson(response, status, body) {
  response.setHeader('Cache-Control', 'no-store');
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  return response.status(status).json(body);
}

function readBody(request) {
  const body = request.body;
  if (body === undefined || body === null || body === '') return {};
  if (typeof body === 'string') {
    try {
      return JSON.parse(body);
    } catch {
      throw new ApiError(400, '요청 본문이 JSON이 아닙니다.');
    }
  }
  if (typeof body !== 'object' || Array.isArray(body)) throw new ApiError(400, '요청 본문은 JSON 객체여야 합니다.');
  return body;
}

function routePath(request) {
  const raw = request.query?.path;
  const path = Array.isArray(raw) ? raw.join('/') : raw ?? '';
  return path.split('/').filter(Boolean);
}

function dateParam(value) {
  if (value === undefined || value === '' || value === 'today') return getKstToday();
  return assertDate(value);
}

// 라우트 표 — [메서드, 경로 패턴, 처리 함수]. :로 시작하는 자리는 순서대로 params로 넘어간다
const ROUTES = [
  ['GET', 'meta', () => ({
    today: getKstToday(),
    todo_categories: TODO_CATEGORIES,
    routine_slots: ROUTINE_SLOTS,
    reflection_fields: {
      grateful: '감사한 일',
      well_done: '잘한 일',
      regret: '아쉬운 일',
      tomorrow_promise: '내일의 다짐'
    }
  })],

  ['GET', 'day', async (store, { query }) => {
    const date = dateParam(query.date);
    const { todos, routines, reflection } = await store.getDay(date);
    return { date, todos: groupTodos(todos), routines, reflection };
  }],

  ['GET', 'todos', async (store, { query }) => {
    const status = query.status ?? 'all';
    if (!['all', 'open', 'done'].includes(status)) throw new ApiError(400, 'status는 all, open, done 중 하나입니다.');
    const todos = await store.listTodos({
      from: query.from ? assertDate(query.from, 'from') : undefined,
      to: query.to ? assertDate(query.to, 'to') : undefined,
      status,
      query: query.q ? String(query.q).slice(0, 100) : undefined
    });
    return { todos: todos.map(summarizeTodo) };
  }],

  ['POST', 'todos', async (store, { body }) => {
    const todo = await store.addTodo({
      date: dateParam(body.date),
      category: assertCategory(body.category),
      title: assertTitle(body.title),
      memo: body.memo ? String(body.memo) : null,
      due_date: body.due_date ? assertDate(body.due_date, 'due_date') : null
    });
    return { status: 201, body: { todo: summarizeTodo(todo) } };
  }],

  ['PATCH', 'todos/:id', async (store, { params, body }) => {
    const todo = await store.updateTodo(assertId(params[0]), pickTodoPatch(body));
    return { todo: summarizeTodo(todo) };
  }],

  ['POST', 'todos/:id/carry-over', async (store, { params, body }) => {
    const result = await store.carryOverTodo(assertId(params[0]), dateParam(body.to_date));
    return {
      todo: result.todo ? summarizeTodo(result.todo) : null,
      already_exists: result.already_exists
    };
  }],

  ['POST', 'todos/:id/skip', async (store, { params }) => {
    return { todo: summarizeTodo(await store.skipTodo(assertId(params[0]))) };
  }],

  ['GET', 'routines', async (store, { query }) => {
    return { routines: await store.listRoutines(dateParam(query.date)) };
  }],

  ['POST', 'routines/:id/check', async (store, { params, body }) => {
    const checked = body.checked === undefined ? true : body.checked;
    if (typeof checked !== 'boolean') throw new ApiError(400, 'checked는 true/false여야 합니다.');
    const log = await store.checkRoutine(assertId(params[0]), dateParam(body.date), checked);
    return { routine_id: log.routine_id, date: log.date, checked: log.checked };
  }],

  ['PUT', 'reflections/:date', async (store, { params, body }) => {
    const date = params[0] === 'today' ? getKstToday() : assertDate(params[0]);
    return { reflection: await store.saveReflection(date, pickReflection(body)) };
  }],

  ['GET', 'projects', async (store) => ({ projects: await store.listProjects() })],

  ['GET', 'week', async (store, { query }) => {
    return store.getWeekSummary(query.start ? dateParam(query.start) : mondayOf(getKstToday()));
  }]
];

export function matchRoute(method, segments) {
  let pathMatched = false;
  for (const [routeMethod, pattern, handle] of ROUTES) {
    const parts = pattern.split('/');
    if (parts.length !== segments.length) continue;
    const params = [];
    const matched = parts.every((part, index) => {
      if (part.startsWith(':')) {
        params.push(decodeURIComponent(segments[index]));
        return true;
      }
      return part === segments[index];
    });
    if (!matched) continue;
    pathMatched = true;
    if (routeMethod === method) return { handle, params };
  }
  return { handle: null, pathMatched };
}

// 콜드 스타트마다 한 번만 이메일→id를 찾는다
let cachedOwner = null;

export function createHandler({ environment = process.env, fetchImpl = fetch, failDelayMs } = {}) {
  return async function handler(request, response) {
    try {
      const { ok, missing, problems, config } = inspectConfig(environment);
      if (!ok) {
        console.error('[led-api] 설정 누락·오류', { missing, problems: Object.keys(problems) });
        throw new ApiError(503, 'API 설정이 완료되지 않았습니다. /api/health를 확인하세요.');
      }

      await assertAuthorized(request, config.tokenHash, { failDelayMs });

      const segments = routePath(request);
      const { handle, params, pathMatched } = matchRoute(request.method, segments);
      if (!handle) {
        throw new ApiError(pathMatched ? 405 : 404, `${request.method} /api/v1/${segments.join('/')} 경로가 없습니다.`);
      }

      if (cachedOwner?.email !== config.userEmail) {
        const userId = await resolveUserId({
          supabaseUrl: config.supabaseUrl,
          secretKey: config.secretKey,
          email: config.userEmail,
          fetchImpl
        });
        cachedOwner = { email: config.userEmail, userId };
      }
      const store = createStore({
        supabaseUrl: config.supabaseUrl,
        secretKey: config.secretKey,
        userId: cachedOwner.userId,
        fetchImpl
      });

      const result = await handle(store, {
        params,
        query: request.query ?? {},
        body: ['POST', 'PATCH', 'PUT'].includes(request.method) ? readBody(request) : {}
      });
      if (result && typeof result.status === 'number' && 'body' in result) {
        return sendJson(response, result.status, result.body);
      }
      return sendJson(response, 200, result);
    } catch (error) {
      if (error instanceof ApiError) return sendJson(response, error.status, { error: error.message });
      console.error('[led-api] 처리 중 오류', error);
      return sendJson(response, 500, { error: '서버 오류가 발생했습니다.' });
    }
  };
}

export function resetOwnerCache() {
  cachedOwner = null;
}

export default createHandler();
