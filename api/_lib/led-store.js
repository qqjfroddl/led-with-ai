// 인생관리AI앱 외부 API — 데이터 계층
// 서버 비밀키(RLS 우회)로 PostgREST를 직접 부르므로, 사용자 범위는 여기서 강제한다.
// ⛔ 이 파일 밖에서 PostgREST를 부르지 않는다. 모든 요청은 scoped()를 거쳐
//    user_id=eq.<소유자> 필터가 붙는다 (tests/led-api.test.js가 이를 검사한다).

import { ApiError, addDays, isRoutineDue, parseSchedule } from './led-rules.js';

const TODO_SELECT = '*,project_task:project_tasks(id,project:projects(id,name))';

export function createStore({ supabaseUrl, secretKey, userId, fetchImpl = fetch }) {
  if (!userId) throw new Error('userId가 없습니다.');

  async function request(method, table, params, { body, prefer } = {}) {
    // 모든 테이블 요청에 소유자 필터를 강제한다
    params.set('user_id', `eq.${userId}`);
    const headers = {
      apikey: secretKey,
      Authorization: `Bearer ${secretKey}`,
      Accept: 'application/json'
    };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (prefer) headers.Prefer = prefer;

    const response = await fetchImpl(`${supabaseUrl}/rest/v1/${table}?${params}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body)
    });
    const text = await response.text();
    if (!response.ok) {
      console.error(`[led-api] ${method} ${table} ${response.status}: ${text.slice(0, 300)}`);
      throw new ApiError(502, `DB 요청이 실패했습니다 (${table}, ${response.status}).`);
    }
    return text ? JSON.parse(text) : null;
  }

  const scoped = {
    select: (table, query = {}) => request('GET', table, new URLSearchParams(query)),
    insert: (table, row) =>
      request('POST', table, new URLSearchParams({ select: '*' }), {
        body: { ...row, user_id: userId },
        prefer: 'return=representation'
      }),
    upsert: (table, row, onConflict) =>
      request('POST', table, new URLSearchParams({ select: '*', on_conflict: onConflict }), {
        body: { ...row, user_id: userId },
        prefer: 'resolution=merge-duplicates,return=representation'
      }),
    update: (table, filter, patch) =>
      request('PATCH', table, new URLSearchParams({ ...filter, select: '*' }), {
        body: patch,
        prefer: 'return=representation'
      })
  };

  async function getTodo(id) {
    const rows = await scoped.select('todos', { id: `eq.${id}`, 'deleted_at': 'is.null', select: '*' });
    if (!rows?.length) throw new ApiError(404, '할일을 찾을 수 없습니다.');
    return rows[0];
  }

  // today.js toggleTodo와 같은 규칙: 연결된 활성 할일이 전부 끝나야 프로젝트 할일도 완료
  async function syncProjectTask(projectTaskId) {
    const linked = await scoped.select('todos', {
      project_task_id: `eq.${projectTaskId}`,
      deleted_at: 'is.null',
      carried_over_at: 'is.null',
      skipped_at: 'is.null',
      select: 'is_done'
    });
    const allDone = linked.length > 0 && linked.every((todo) => todo.is_done);
    await scoped.update('project_tasks', { id: `eq.${projectTaskId}` }, {
      is_done: allDone,
      done_at: allDone ? new Date().toISOString() : null
    });
  }

  return {
    async getDay(date) {
      const [todos, routines, logs, reflections] = await Promise.all([
        scoped.select('todos', {
          date: `eq.${date}`,
          deleted_at: 'is.null',
          select: TODO_SELECT,
          order: 'category.asc,is_done.asc,display_order.asc.nullslast,pinned.desc,created_at.asc'
        }),
        scoped.select('routines', { select: '*' }),
        scoped.select('routine_logs', { date: `eq.${date}`, checked: 'is.true', select: 'routine_id' }),
        scoped.select('daily_reflections', { date: `eq.${date}`, select: '*' })
      ]);
      const checked = new Set(logs.map((log) => log.routine_id));
      const dueRoutines = routines
        .filter((routine) => isRoutineDue(routine, date))
        .map((routine) => ({
          id: routine.id,
          title: routine.title,
          slot: parseSchedule(routine)?.category ?? null,
          checked: checked.has(routine.id)
        }));
      return { todos, routines: dueRoutines, reflection: reflections[0] ?? null };
    },

    listTodos({ from, to, status, query }) {
      const params = {
        deleted_at: 'is.null',
        select: TODO_SELECT,
        order: 'date.asc,category.asc,created_at.asc',
        limit: '200'
      };
      const range = [];
      if (from) range.push(`date.gte.${from}`);
      if (to) range.push(`date.lte.${to}`);
      if (range.length) params.and = `(${range.join(',')})`;
      if (status === 'open') {
        Object.assign(params, { is_done: 'is.false', carried_over_at: 'is.null', skipped_at: 'is.null' });
      } else if (status === 'done') {
        params.is_done = 'is.true';
      }
      if (query) params.title = `ilike.*${query.replace(/[*,()]/g, ' ')}*`;
      return scoped.select('todos', params);
    },

    async addTodo({ date, category, title, memo, due_date }) {
      const [todo] = await scoped.insert('todos', {
        date,
        category,
        title,
        memo: memo ?? null,
        due_date: due_date ?? null,
        priority: null,
        pinned: false
      });
      return todo;
    },

    async updateTodo(id, patch) {
      const todo = await getTodo(id);
      const change = { ...patch };
      if ('is_done' in change) change.done_at = change.is_done ? new Date().toISOString() : null;
      const [updated] = await scoped.update('todos', { id: `eq.${id}` }, change);

      if (todo.project_task_id) {
        if ('is_done' in patch) await syncProjectTask(todo.project_task_id);
        if ('title' in patch) {
          await scoped.update('project_tasks', { id: `eq.${todo.project_task_id}` }, { title: patch.title });
        }
      }
      return updated;
    },

    // today.js carryOverTodo와 같은 규칙: 대상 날짜로 복제하고 원본에 carried_over_at을 남긴다.
    // 프로젝트·반복업무 할일은 대상 날짜에 이미 같은 할일이 있으면 복제하지 않는다.
    async carryOverTodo(id, toDate) {
      const original = await getTodo(id);
      if (original.is_done) throw new ApiError(409, '이미 완료한 할일은 이월할 수 없습니다.');
      if (original.carried_over_at || original.skipped_at) {
        throw new ApiError(409, '이미 이월했거나 포기한 할일입니다.');
      }
      if (toDate <= original.date) throw new ApiError(400, 'to_date는 원래 날짜보다 뒤여야 합니다.');

      const now = new Date().toISOString();
      const linkKey = original.project_task_id
        ? ['project_task_id', original.project_task_id]
        : original.recurring_task_id
          ? ['recurring_task_id', original.recurring_task_id]
          : null;

      if (linkKey) {
        const existing = await scoped.select('todos', {
          [linkKey[0]]: `eq.${linkKey[1]}`,
          date: `eq.${toDate}`,
          deleted_at: 'is.null',
          select: 'id'
        });
        if (existing.length) {
          await scoped.update('todos', { id: `eq.${id}` }, { carried_over_at: now });
          return { todo: null, already_exists: existing[0].id };
        }
      }

      const [copy] = await scoped.insert('todos', {
        date: toDate,
        category: original.category,
        title: original.title,
        memo: original.memo,
        due_date: original.due_date,
        priority: original.priority,
        pinned: original.pinned,
        is_done: false,
        done_at: null,
        display_order: null,
        project_task_id: original.project_task_id || null,
        recurring_task_id: original.recurring_task_id || null
      });
      await scoped.update('todos', { id: `eq.${id}` }, { carried_over_at: now });

      // 프로젝트 할일은 기간이 지났으면 대상 날짜까지 늘린다 (end_date 우선, 없으면 옛 due_date)
      if (original.project_task_id) {
        const [task] = await scoped.select('project_tasks', {
          id: `eq.${original.project_task_id}`,
          select: 'end_date,due_date'
        });
        if (task?.end_date && task.end_date < toDate) {
          await scoped.update('project_tasks', { id: `eq.${original.project_task_id}` }, { end_date: toDate });
        } else if (!task?.end_date && task?.due_date && task.due_date < toDate) {
          await scoped.update('project_tasks', { id: `eq.${original.project_task_id}` }, { due_date: toDate });
        }
      }
      return { todo: copy, already_exists: null };
    },

    async skipTodo(id) {
      const original = await getTodo(id);
      if (original.is_done || original.carried_over_at || original.skipped_at) {
        throw new ApiError(409, '열린 할일만 포기할 수 있습니다.');
      }
      const [updated] = await scoped.update('todos', { id: `eq.${id}` }, { skipped_at: new Date().toISOString() });
      return updated;
    },

    async listRoutines(date) {
      const routines = await scoped.select('routines', { select: '*', order: 'created_at.asc' });
      return routines
        .filter((routine) => isRoutineDue(routine, date) || !routine.deleted_at)
        .map((routine) => {
          const schedule = parseSchedule(routine) ?? {};
          return {
            id: routine.id,
            title: routine.title,
            slot: schedule.category ?? null,
            type: schedule.type ?? null,
            days: schedule.days ?? null,
            due_on_date: isRoutineDue(routine, date)
          };
        });
    },

    async checkRoutine(routineId, date, checked) {
      const routines = await scoped.select('routines', { id: `eq.${routineId}`, select: '*' });
      if (!routines.length) throw new ApiError(404, '루틴을 찾을 수 없습니다.');
      if (!isRoutineDue(routines[0], date)) {
        throw new ApiError(409, `이 루틴은 ${date}에 해당하지 않습니다.`);
      }
      const [log] = await scoped.upsert(
        'routine_logs',
        { routine_id: routineId, date, checked },
        'user_id,routine_id,date'
      );
      return log;
    },

    // 앱 화면은 네 칸을 통째로 덮어쓰지만, API는 보낸 칸만 바꾼다
    async saveReflection(date, fields) {
      const [existing] = await scoped.select('daily_reflections', { date: `eq.${date}`, select: '*' });
      const merged = {
        grateful: existing?.grateful ?? null,
        well_done: existing?.well_done ?? null,
        regret: existing?.regret ?? null,
        tomorrow_promise: existing?.tomorrow_promise ?? null,
        ...fields
      };
      const [saved] = await scoped.upsert('daily_reflections', { date, ...merged }, 'user_id,date');
      return saved;
    },

    async listProjects() {
      const projects = await scoped.select('projects', { select: '*', order: 'created_at.asc' });
      const tasks = await scoped.select('project_tasks', { select: '*', order: 'created_at.asc' });
      return projects.map((project) => ({
        ...project,
        tasks: tasks.filter((task) => task.project_id === project.id)
      }));
    },

    // 주간 요약: 날짜별 할일 완료·루틴 실천 수
    async getWeekSummary(start) {
      const end = addDays(start, 6);
      const [todos, routines, logs] = await Promise.all([
        scoped.select('todos', {
          and: `(date.gte.${start},date.lte.${end})`,
          deleted_at: 'is.null',
          select: 'date,is_done,carried_over_at,skipped_at'
        }),
        scoped.select('routines', { select: '*' }),
        scoped.select('routine_logs', {
          and: `(date.gte.${start},date.lte.${end})`,
          checked: 'is.true',
          select: 'date,routine_id'
        })
      ]);
      const days = [];
      for (let offset = 0; offset < 7; offset += 1) {
        const date = addDays(start, offset);
        const dayTodos = todos.filter((todo) => todo.date === date && !todo.carried_over_at && !todo.skipped_at);
        const due = routines.filter((routine) => isRoutineDue(routine, date)).map((routine) => routine.id);
        const done = new Set(logs.filter((log) => log.date === date).map((log) => log.routine_id));
        days.push({
          date,
          todos_done: dayTodos.filter((todo) => todo.is_done).length,
          todos_total: dayTodos.length,
          routines_done: due.filter((id) => done.has(id)).length,
          routines_total: due.length
        });
      }
      return { start, end, days };
    }
  };
}

// 이메일로 소유자 id를 찾는다 (profiles는 id가 곧 user id)
export async function resolveUserId({ supabaseUrl, secretKey, email, fetchImpl = fetch }) {
  const params = new URLSearchParams({ email: `eq.${email}`, select: 'id' });
  const response = await fetchImpl(`${supabaseUrl}/rest/v1/profiles?${params}`, {
    headers: { apikey: secretKey, Authorization: `Bearer ${secretKey}`, Accept: 'application/json' }
  });
  if (!response.ok) throw new ApiError(502, `프로필 조회가 실패했습니다 (${response.status}).`);
  const rows = await response.json();
  if (rows.length !== 1) {
    throw new ApiError(500, `LED_API_USER_EMAIL에 해당하는 프로필이 ${rows.length}개입니다. 1개여야 합니다.`);
  }
  return rows[0].id;
}
