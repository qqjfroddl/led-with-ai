// API 응답을 대화창에서 읽기 좋은 마크다운으로 바꾼다. id는 후속 조작용으로 남긴다.

const CATEGORY_LABEL = { work: 'Work', job: 'Job', self_dev: 'Growth', personal: 'Personal' };
const SLOT_LABEL = { morning: '모닝루틴', daytime: '데이타임 루틴', night: '나이트루틴' };
const STATUS_MARK = { open: '[ ]', done: '[x]', carried_over: '[→ 이월]', skipped: '[× 포기]' };
const REFLECTION_LABEL = {
  grateful: '감사한 일',
  well_done: '잘한 일',
  regret: '아쉬운 일',
  tomorrow_promise: '내일의 다짐'
};

function todoLine(todo, { withDate = false } = {}) {
  const extras = [
    withDate ? todo.date : null,
    withDate ? CATEGORY_LABEL[todo.category] ?? todo.category : null,
    todo.project ? `프로젝트: ${todo.project}` : null,
    todo.recurring ? '반복업무' : null,
    todo.due_date ? `마감 ${todo.due_date}` : null
  ].filter(Boolean);
  const suffix = extras.length ? ` (${extras.join(' · ')})` : '';
  const memo = todo.memo ? `\n    메모: ${todo.memo}` : '';
  return `- ${STATUS_MARK[todo.status] ?? todo.status} ${todo.title}${suffix} \`${todo.id}\`${memo}`;
}

export function formatDay(day) {
  const lines = [`# ${day.date}`, '', '## 할일'];
  for (const [category, todos] of Object.entries(day.todos)) {
    if (!todos.length) continue;
    lines.push(`### ${CATEGORY_LABEL[category] ?? category}`, ...todos.map((todo) => todoLine(todo)));
  }
  if (Object.values(day.todos).every((todos) => !todos.length)) lines.push('(할일 없음)');

  lines.push('', '## 루틴');
  if (!day.routines.length) lines.push('(이 날 해당 루틴 없음)');
  for (const slot of Object.keys(SLOT_LABEL)) {
    const routines = day.routines.filter((routine) => routine.slot === slot);
    if (!routines.length) continue;
    lines.push(`### ${SLOT_LABEL[slot]}`);
    lines.push(...routines.map((r) => `- ${r.checked ? '[x]' : '[ ]'} ${r.title} \`${r.id}\``));
  }

  lines.push('', '## 일일 성찰');
  const reflection = day.reflection ?? {};
  for (const [key, label] of Object.entries(REFLECTION_LABEL)) {
    lines.push(`- ${label}: ${reflection[key] || '(비어 있음)'}`);
  }
  return lines.join('\n');
}

export function formatTodos(todos) {
  if (!todos.length) return '조건에 맞는 할일이 없습니다.';
  return [`${todos.length}건`, ...todos.map((todo) => todoLine(todo, { withDate: true }))].join('\n');
}

export function formatWeek(week) {
  const lines = [`# ${week.start} ~ ${week.end}`, '', '| 날짜 | 할일 완료 | 루틴 실천 |', '|---|---|---|'];
  for (const day of week.days) {
    lines.push(`| ${day.date} | ${day.todos_done}/${day.todos_total} | ${day.routines_done}/${day.routines_total} |`);
  }
  const sum = (key) => week.days.reduce((total, day) => total + day[key], 0);
  lines.push(`| **합계** | ${sum('todos_done')}/${sum('todos_total')} | ${sum('routines_done')}/${sum('routines_total')} |`);
  return lines.join('\n');
}
