// 골든 테스트: 합친 기간 컴포넌트(PeriodStats·PeriodInsights)가 옛 3벌·2벌과 같은 입력에 같은 HTML을 내는가
// 사용: node scripts/test/golden-period-components.mjs [git-ref]   (기본 ref: 옛 파일이 마지막으로 있던 커밋)
// 옛 파일은 git에서 꺼내 임시 폴더에 두고 import 한다 — 로그인 없이 리뷰 화면 컴포넌트를 검증하는 방법.
import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const ROOT = new URL('../../', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const REF = process.argv[2] || process.env.GOLDEN_REF || '8a18d20';
const TMP = `${ROOT}/.golden-tmp`;
mkdirSync(TMP, { recursive: true });

const OLD_FILES = ['WeeklyStats', 'MonthlyStats', 'YearlyStats', 'WeeklyInsights', 'MonthlyInsights'];
const old = {};
for (const f of OLD_FILES) {
  const src = execSync(`git show ${REF}:src/components/${f}.js`, { cwd: ROOT, encoding: 'utf8' });
  writeFileSync(`${TMP}/${f}.js`, src);
  old[f] = await import(pathToFileURL(`${TMP}/${f}.js`).href);
}
const { renderPeriodStats } = await import(pathToFileURL(`${ROOT}/src/components/PeriodStats.js`).href);
const { renderPeriodInsights } = await import(pathToFileURL(`${ROOT}/src/components/PeriodInsights.js`).href);

// ── 픽스처 ──
const byCategory = {
  work: { completionRate: 70, completed: 7, total: 10 },
  job: { completionRate: 50, completed: 5, total: 10 },
  self_dev: { completionRate: 80, completed: 8, total: 10 },
  personal: { completionRate: 0, completed: 0, total: 0 },
  etc: { completionRate: 33.3, completed: 1, total: 3 }, // 라벨·색 표에 없는 카테고리
};
const routineRates = [
  { id: 'r1', title: '물 한 잔', rate: 85.7, totalChecks: 6 },
  { id: 'r2', title: '독서 20분', rate: 0, totalChecks: 0 },
  { id: 'r3', title: '스트레칭', rate: 42.9, totalChecks: 3 },
];
const base = (over = {}) => ({
  todos: { completionRate: 62.5, completed: 25, total: 40, avgDailyTodos: 5.7, byCategory, dailyStats: { '2026-09-07': { completed: 3 }, '2026-09-08': { completed: 5 }, '2026-09-13': { completed: 1 } } },
  routines: { practiceRate: 71.4, totalChecks: 50, totalPossibleChecks: 70, morningRate: 80, nightRate: 60, routineRates, dailyChecks: { '2026-09-07': 4, '2026-09-08': 2 } },
  reflections: { writtenDays: 5, writingRate: 71.4 },
  comparison: { todos: { completionRate: 3.2 }, routines: { practiceRate: -1.5 }, reflections: { writingRate: 0 } },
  insights: [
    { category: 'routines', type: 'positive', message: '루틴을 잘 지켰습니다.' },
    { category: 'todos', type: 'suggestion', message: '할일이 밀리고 있습니다.' },
    { category: 'reflections', type: 'neutral', message: '성찰 5일 기록.' },
    { category: 'todos', type: 'improvement', message: '지난번보다 나아졌습니다.' },
  ],
  ...over,
});
const variants = {
  normal: base(),
  noComparison: base({ comparison: null }),
  flatComparison: base({ comparison: { todos: { completionRate: 0.05 }, routines: {}, reflections: { writingRate: 0 } } }),
  empty: base({ insights: [], routines: { practiceRate: 0, totalChecks: 0, totalPossibleChecks: 0, routineRates: [], dailyChecks: {} }, todos: { completionRate: 0, completed: 0, total: 0, avgDailyTodos: 0, byCategory: { work: { completionRate: 0, completed: 0, total: 0 } }, dailyStats: {} }, reflections: { writtenDays: 0, writingRate: 0 } }),
  bigNumbers: base({ todos: { completionRate: 100, completed: 400, total: 400, avgDailyTodos: 13.3, byCategory, dailyStats: {} } }),
};

let fail = 0, pass = 0, wsOnly = 0;
const stripChart = (s) => s.replace(/\n<!-- chart:start -->[\s\S]*?<!-- chart:end -->\n/g, ''); // 9/13 추가된 차트 블록은 옛 파일에 없다
const ws = (s) => stripChart(s).replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n'); // 줄 끝 공백·연속 빈 줄만 무시 — 블록 요소 사이라 렌더 무관 (차트가 빈 문자열이면 빈 줄이 하나 더 남는다)
function compare(name, a, b) {
  if (a === stripChart(b)) { pass++; return; }
  if (ws(a) === ws(b)) { pass++; wsOnly++; return; }
  fail++;
  let i = 0; while (i < a.length && a[i] === b[i]) i++;
  console.log(`✗ ${name}: 첫 차이 @${i}\n  old: ${JSON.stringify(a.slice(Math.max(0, i - 60), i + 60))}\n  new: ${JSON.stringify(b.slice(Math.max(0, i - 60), i + 60))}`);
}

for (const [vn, v] of Object.entries(variants)) {
  compare(`stats/week/${vn}`, old.WeeklyStats.renderWeeklyStats(v), renderPeriodStats(v, 'week'));
  const m = { ...v, totalDays: 30 };
  compare(`stats/month/${vn}`, old.MonthlyStats.renderMonthlyStats(m), renderPeriodStats(m, 'month'));
  const y = { ...v, totalDays: 365, year: 2026 };
  compare(`stats/year/${vn}`, old.YearlyStats.renderYearlyStats(y), renderPeriodStats(y, 'year'));
  compare(`insights/week/${vn}`, old.WeeklyInsights.renderWeeklyInsights(v), renderPeriodInsights(v, 'week'));
  compare(`insights/month/${vn}`, old.MonthlyInsights.renderMonthlyInsights(m), renderPeriodInsights(m, 'month'));
}
rmSync(TMP, { recursive: true, force: true });
console.log(`golden: ${pass} pass (${wsOnly} of them differ only by trailing spaces), ${fail} fail (ref ${REF})`);
process.exit(fail ? 1 : 0);
