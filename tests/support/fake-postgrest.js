// 테스트용 메모리 PostgREST — API 단위 테스트와 MCP 끝단 테스트가 함께 쓴다

export const OWNER = '11111111-1111-4111-8111-111111111111';
export const OTHER = '22222222-2222-4222-8222-222222222222';
export const TOKEN = 'led_test_token_value';
export const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;


// ── 메모리 PostgREST: 앱이 쓰는 필터 문법만 흉내 낸다 ──
export function createFakeDb(seed) {
  const tables = structuredClone(seed);
  const calls = [];

  function matches(row, key, expr) {
    if (key === 'and') {
      return expr.slice(1, -1).split(',').every((part) => {
        const [column, op, value] = part.split('.');
        return op === 'gte' ? row[column] >= value : row[column] <= value;
      });
    }
    const [op, ...rest] = expr.split('.');
    const value = rest.join('.');
    if (op === 'eq') return String(row[key]) === value;
    if (op === 'is') return value === 'null' ? row[key] == null : row[key] === (value === 'true');
    if (op === 'ilike') return String(row[key]).toLowerCase().includes(value.replaceAll('*', '').toLowerCase());
    throw new Error(`fake db: 모르는 연산 ${expr}`);
  }

  const RESERVED = new Set(['select', 'order', 'limit', 'on_conflict']);

  async function fetchImpl(url, { method = 'GET', body } = {}) {
    const parsed = new URL(url);
    const table = parsed.pathname.replace('/rest/v1/', '');
    const params = Object.fromEntries(parsed.searchParams);
    calls.push({ method, table, params });
    const rows = (tables[table] ??= []);
    const filters = Object.entries(params).filter(([key]) => !RESERVED.has(key));
    const selected = rows.filter((row) => filters.every(([key, expr]) => matches(row, key, expr)));
    const reply = (data, status = 200) => new Response(JSON.stringify(data), { status });

    if (method === 'GET') {
      if (table === 'todos') {
        return reply(selected.map((row) => ({
          ...row,
          project_task: row.project_task_id
            ? { id: row.project_task_id, project: { id: 'p', name: '책 원고' } }
            : null
        })));
      }
      return reply(selected);
    }
    if (method === 'PATCH') {
      const patch = JSON.parse(body);
      selected.forEach((row) => Object.assign(row, patch));
      return reply(selected);
    }
    if (method === 'POST') {
      const row = JSON.parse(body);
      const conflict = params.on_conflict?.split(',');
      const existing = conflict && rows.find((r) => conflict.every((key) => r[key] === row[key]));
      if (existing) {
        Object.assign(existing, row);
        return reply([existing], 201);
      }
      const created = { id: id(9000 + rows.length), created_at: '2026-09-23T00:00:00Z', ...row };
      rows.push(created);
      return reply([created], 201);
    }
    return reply({ message: 'method not allowed' }, 405);
  }

  return { tables, calls, fetchImpl };
}

export function baseSeed() {
  return {
    profiles: [
      { id: OWNER, email: 'owner@example.com' },
      { id: OTHER, email: 'other@example.com' }
    ],
    todos: [
      { id: id(1), user_id: OWNER, date: '2026-09-23', category: 'work', title: '원고 3장', is_done: false, deleted_at: null, carried_over_at: null, skipped_at: null, project_task_id: null, recurring_task_id: null },
      { id: id(2), user_id: OWNER, date: '2026-09-23', category: 'personal', title: '운동', is_done: true, deleted_at: null, carried_over_at: null, skipped_at: null, project_task_id: null, recurring_task_id: null },
      { id: id(3), user_id: OWNER, date: '2026-09-22', category: 'job', title: '프로젝트 할일', is_done: false, deleted_at: null, carried_over_at: null, skipped_at: null, project_task_id: id(50), recurring_task_id: null },
      { id: id(4), user_id: OTHER, date: '2026-09-23', category: 'work', title: '남의 할일', is_done: false, deleted_at: null, carried_over_at: null, skipped_at: null, project_task_id: null, recurring_task_id: null },
      { id: id(5), user_id: OWNER, date: '2026-09-23', category: 'work', title: '지운 할일', is_done: false, deleted_at: '2026-09-23T01:00:00Z', carried_over_at: null, skipped_at: null, project_task_id: null, recurring_task_id: null }
    ],
    project_tasks: [
      { id: id(50), user_id: OWNER, project_id: 'p', title: '프로젝트 할일', is_done: false, done_at: null, end_date: '2026-09-22', due_date: null }
    ],
    projects: [{ id: 'p', user_id: OWNER, name: '책 원고', created_at: '2026-01-01' }],
    routines: [
      { id: id(10), user_id: OWNER, title: '물 한 잔', schedule: { type: 'daily', category: 'morning', active_from_date: '2026-01-01' }, created_at: '2026-01-01', deleted_at: null },
      { id: id(11), user_id: OWNER, title: '주간 회고', schedule: '{"type":"weekly","days":[7],"category":"night","active_from_date":"2026-01-01"}', created_at: '2026-01-01', deleted_at: null },
      { id: id(12), user_id: OTHER, title: '남의 루틴', schedule: { type: 'daily', category: 'morning' }, created_at: '2026-01-01', deleted_at: null }
    ],
    routine_logs: [{ id: id(20), user_id: OWNER, routine_id: id(10), date: '2026-09-23', checked: true }],
    daily_reflections: [
      { id: id(30), user_id: OWNER, date: '2026-09-23', grateful: '가족', well_done: null, regret: null, tomorrow_promise: null }
    ]
  };
}
