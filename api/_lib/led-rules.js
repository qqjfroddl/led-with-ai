// 인생관리AI앱 외부 API — 업무 규칙(순수 함수)
// 화면 코드(src/pages/today.js)와 같은 규칙을 서버에서 재현한다.
// 규칙을 바꾸면 today.js와 이 파일을 함께 고친다.

export const TODO_CATEGORIES = {
  work: 'Work',
  job: 'Job',
  self_dev: 'Growth',
  personal: 'Personal'
};

export const ROUTINE_SLOTS = {
  morning: '모닝루틴',
  daytime: '데이타임 루틴',
  night: '나이트루틴'
};

export const REFLECTION_FIELDS = ['grateful', 'well_done', 'regret', 'tomorrow_promise'];

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// 앱은 모든 날짜를 한국 시간 기준으로 다룬다
export function getKstToday(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function addDays(date, days) {
  const base = new Date(`${date}T00:00:00Z`);
  base.setUTCDate(base.getUTCDate() + days);
  return base.toISOString().slice(0, 10);
}

export function assertDate(value, name = 'date') {
  if (typeof value !== 'string' || !DATE_PATTERN.test(value)) {
    throw new ApiError(400, `${name}은(는) YYYY-MM-DD 형식이어야 합니다.`);
  }
  // 2026-02-31 같은 없는 날짜를 거른다
  if (new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) !== value) {
    throw new ApiError(400, `${name} ${value}은(는) 없는 날짜입니다.`);
  }
  return value;
}

export function assertId(value, name = 'id') {
  if (typeof value !== 'string' || !UUID_PATTERN.test(value)) {
    throw new ApiError(400, `${name} 형식이 올바르지 않습니다.`);
  }
  return value;
}

export function assertCategory(value) {
  if (!Object.hasOwn(TODO_CATEGORIES, value)) {
    throw new ApiError(
      400,
      `category는 ${Object.keys(TODO_CATEGORIES).join(', ')} 중 하나여야 합니다.`
    );
  }
  return value;
}

export function assertTitle(value) {
  const title = typeof value === 'string' ? value.trim() : '';
  if (!title) throw new ApiError(400, 'title이 비어 있습니다.');
  if (title.length > 500) throw new ApiError(400, 'title은 500자 이하여야 합니다.');
  return title;
}

export function parseSchedule(routine) {
  if (typeof routine.schedule !== 'string') return routine.schedule;
  try {
    return JSON.parse(routine.schedule);
  } catch {
    return null;
  }
}

// today.js isRoutineDue와 같은 판정: 적용 시작일 <= 날짜 < 비활성화일, 그리고 주기 일치
export function isRoutineDue(routine, date) {
  const schedule = parseSchedule(routine);
  if (!schedule || typeof schedule !== 'object') return false;

  const activeFrom = schedule.active_from_date || routine.created_at?.substring(0, 10);
  if (!activeFrom || activeFrom > date) return false;

  const deletedAt = routine.deleted_at?.substring(0, 10);
  if (deletedAt && deletedAt <= date) return false;

  if (schedule.type === 'daily') return true;
  if (schedule.type === 'weekly') {
    const dayOfWeek = new Date(`${date}T00:00:00Z`).getUTCDay();
    return Boolean(schedule.days?.includes(dayOfWeek === 0 ? 7 : dayOfWeek));
  }
  if (schedule.type === 'monthly') {
    return schedule.month === `${date.substring(0, 7)}-01`;
  }
  return false;
}

// PATCH로 바꿀 수 있는 할일 필드만 골라 검사한다
export function pickTodoPatch(body) {
  const patch = {};
  if ('title' in body) patch.title = assertTitle(body.title);
  if ('memo' in body) patch.memo = body.memo === null ? null : String(body.memo);
  if ('category' in body) patch.category = assertCategory(body.category);
  if ('due_date' in body) {
    patch.due_date = body.due_date === null ? null : assertDate(body.due_date, 'due_date');
  }
  if ('pinned' in body) patch.pinned = Boolean(body.pinned);
  if ('is_done' in body) {
    if (typeof body.is_done !== 'boolean') throw new ApiError(400, 'is_done은 true/false여야 합니다.');
    patch.is_done = body.is_done;
  }
  if (Object.keys(patch).length === 0) {
    throw new ApiError(400, '바꿀 필드가 없습니다. (title, memo, category, due_date, pinned, is_done)');
  }
  return patch;
}

export function pickReflection(body) {
  const fields = {};
  for (const key of REFLECTION_FIELDS) {
    if (key in body) {
      const value = body[key];
      fields[key] = value === null || value === '' ? null : String(value);
    }
  }
  if (Object.keys(fields).length === 0) {
    throw new ApiError(400, `적을 항목이 없습니다. (${REFLECTION_FIELDS.join(', ')})`);
  }
  return fields;
}

// 할일 목록을 화면과 같은 순서로 정렬한 뒤 카테고리별로 묶는다
export function groupTodos(todos) {
  const groups = Object.fromEntries(Object.keys(TODO_CATEGORIES).map((key) => [key, []]));
  for (const todo of todos) {
    (groups[todo.category] ??= []).push(summarizeTodo(todo));
  }
  return groups;
}

export function summarizeTodo(todo) {
  let status = todo.is_done ? 'done' : 'open';
  if (todo.carried_over_at) status = 'carried_over';
  if (todo.skipped_at) status = 'skipped';
  return {
    id: todo.id,
    date: todo.date,
    category: todo.category,
    title: todo.title,
    memo: todo.memo ?? null,
    status,
    due_date: todo.due_date ?? null,
    pinned: Boolean(todo.pinned),
    project: todo.project_task?.project?.name ?? null,
    recurring: Boolean(todo.recurring_task_id)
  };
}

// 그 날짜가 속한 주의 월요일 (주간 요약 기본값)
export function mondayOf(date) {
  const day = new Date(`${date}T00:00:00Z`).getUTCDay();
  return addDays(date, day === 0 ? -6 : 1 - day);
}
