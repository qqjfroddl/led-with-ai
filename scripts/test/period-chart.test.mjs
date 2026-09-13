// 기간 리듬 차트 단위 테스트 (2026-09-13)
// 사용: node scripts/test/period-chart.test.mjs
// 확인: 구간 수·막대 높이 범위·값 없음 처리·성찰 점·표 행 수·옛 데이터 형태(dailyPossible 없음)에서도 안 죽는가
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';

const ROOT = new URL('../../', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const { buildBuckets, renderPeriodChart } = await import(pathToFileURL(`${ROOT}/src/components/PeriodChart.js`).href);

let n = 0;
const t = (name, fn) => { fn(); n++; console.log('✓', name); };

const weekDays = ['2026-09-07', '2026-09-08', '2026-09-09', '2026-09-10', '2026-09-11', '2026-09-12', '2026-09-13'];
const week = {
  todos: { dailyStats: Object.fromEntries(weekDays.map((d, i) => [d, { total: i === 6 ? 0 : 5, completed: i }])) },
  routines: { dailyChecks: { '2026-09-07': 3, '2026-09-08': 4, '2026-09-13': 0 }, dailyPossible: Object.fromEntries(weekDays.map((d, i) => [d, i === 5 ? 0 : 4])) },
  reflections: { writtenDates: ['2026-09-07', '2026-09-10'] },
};

t('주간: 요일 7구간, 월요일부터, 부분 표기 M/D', () => {
  const b = buildBuckets(week, 'week');
  assert.equal(b.length, 7);
  assert.deepEqual(b.map((x) => x.label), ['월', '화', '수', '목', '금', '토', '일']);
  assert.equal(b[0].sub, '9/7');
});
t('주간: 실천율 = 체크/가능, 가능 0이면 null, 완료율 전체 0이면 null', () => {
  const b = buildBuckets(week, 'week');
  assert.equal(b[0].routine.rate, 75);
  assert.equal(b[1].routine.rate, 100);
  assert.equal(b[2].routine.rate, 0);       // 체크 없음·가능 4 → 0%
  assert.equal(b[5].routine.rate, null);    // 가능 0 → 없음
  assert.equal(b[6].todo.rate, null);       // 할일 0건 → 없음
  assert.equal(b[3].todo.rate, 60);
});
t('주간: 성찰 점은 작성한 날에만', () => {
  const b = buildBuckets(week, 'week');
  assert.deepEqual(b.map((x) => x.reflections), [1, 0, 0, 1, 0, 0, 0]);
});
t('주간: 옛 데이터 형태(dailyPossible·writtenDates 없음)에서도 죽지 않고 실천율은 없음 처리', () => {
  const old = { todos: week.todos, routines: { dailyChecks: week.routines.dailyChecks }, reflections: {} };
  const b = buildBuckets(old, 'week');
  assert.equal(b.length, 7);
  assert.ok(b.every((x) => x.routine.rate === null));
  assert.ok(renderPeriodChart(old, 'week').includes('pc-bar--none'));
});

t('월간: 1일부터 7일씩, 30일이면 5구간(마지막 29~30일), 합산', () => {
  const days = Array.from({ length: 30 }, (_, i) => `2026-09-${String(i + 1).padStart(2, '0')}`);
  const month = {
    todos: { dailyStats: Object.fromEntries(days.map((d) => [d, { total: 2, completed: 1 }])) },
    routines: { dailyChecks: Object.fromEntries(days.map((d) => [d, 1])), dailyPossible: Object.fromEntries(days.map((d) => [d, 2])) },
    reflections: { writtenDates: days.slice(0, 3) },
  };
  const b = buildBuckets(month, 'month');
  assert.equal(b.length, 5);
  assert.deepEqual(b.map((x) => x.sub), ['1~7일', '8~14일', '15~21일', '22~28일', '29~30일']);
  assert.equal(b[0].routine.rate, 50);
  assert.equal(b[0].todo.completed, 7);
  assert.equal(b[0].reflections, 3);
  assert.equal(b[4].todo.total, 4);
});

t('연간: 12구간, 월별 possible/checked·total/completed·성찰 수', () => {
  const year = {
    todos: { monthlyStats: { 1: { total: 10, completed: 8 }, 9: { total: 4, completed: 1 } } },
    routines: { monthlyStats: { 1: { possible: 100, checked: 90 }, 9: { possible: 40, checked: 0 } } },
    reflections: { monthlyStats: { 1: 20 } },
  };
  const b = buildBuckets(year, 'year');
  assert.equal(b.length, 12);
  assert.equal(b[0].label, '1');      // 축 라벨은 숫자만 (폰 폭에서 "10월11월12월"이 붙어 읽힘)
  assert.equal(b[0].name, '1월');     // 툴팁·표는 N월
  assert.ok(renderPeriodChart(year, 'year').includes('<th scope="row">10월</th>'));
  assert.equal(b[0].routine.rate, 90);
  assert.equal(b[0].todo.rate, 80);
  assert.equal(b[0].reflections, 20);
  assert.equal(b[8].routine.rate, 0);
  assert.equal(b[2].routine.rate, null); // 자료 없는 달
});

t('렌더: 막대 높이는 0~100%만, 구간마다 title, 범례 3항목, 표 행 = 구간 수', () => {
  const html = renderPeriodChart(week, 'week');
  const heights = [...html.matchAll(/height: (\d+)%/g)].map((m) => Number(m[1]));
  assert.ok(heights.length > 0 && heights.every((h) => h >= 0 && h <= 100));
  assert.equal((html.match(/class="pc-col"/g) || []).length, 7);
  assert.equal((html.match(/<tr><th scope="row">/g) || []).length, 7);
  assert.equal((html.match(/<li>/g) || []).length, 3);
  assert.ok(html.includes('<!-- chart:start -->') && html.includes('<!-- chart:end -->'));
  assert.ok(html.includes('월 (9/7) · 루틴 75% (3/4) · 할일 0% (0/5) · 성찰 1일'));
});
t('렌더: 기록이 전혀 없으면 빈 상태 문구, 재료 자체가 없으면 빈 문자열', () => {
  const empty = { todos: { dailyStats: Object.fromEntries(weekDays.map((d) => [d, { total: 0, completed: 0 }])) }, routines: { dailyChecks: {}, dailyPossible: {} }, reflections: { writtenDates: [] } };
  assert.ok(renderPeriodChart(empty, 'week').includes('pc-empty'));
  assert.equal(renderPeriodChart({ todos: { dailyStats: {} }, routines: {}, reflections: {} }, 'week'), '');
});

console.log(`period-chart: ${n} tests passed`);
