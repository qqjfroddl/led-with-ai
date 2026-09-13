// 기간 리듬 차트 — 주간(요일별)·월간(주차별)·연간(월별) 달성률 막대 (2026-09-13 소장님 승인, 장준식)
// 리뷰 화면에 이미 있는 총량 숫자를 다시 그리지 않는다. 차트가 답하는 질문은 "언제 잘되고 언제 무너지는가"다.
// 계열 2개: 루틴 실천율(체크/가능), 할일 완료율(완료/전체). 성찰 작성은 구간 아래 점으로.
// 형태: HTML 막대(플롯 높이 고정, 막대 높이 %) — SVG보다 폰 폭에서 글자가 안 줄어든다.
// 색: paper.css --t-chart-routine / --t-chart-todo (dataviz 검증기 통과: CVD ΔE 19.6, 정상 25.7).
// 접근성: 범례 항상 표시, 구간마다 title·aria-label, 표 보기(details) 제공. 값이 없는 구간(가능 0)은 막대 없음.

const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];

const TITLE = { week: '요일별 리듬', month: '주차별 리듬', year: '월별 리듬' };

const rate = (num, den) => (den > 0 ? Math.round((num / den) * 100) : null);

/** 통계 객체를 구간 배열로. 기간마다 재료가 다르다 */
export function buildBuckets(stats, period) {
  const { todos = {}, routines = {}, reflections = {} } = stats || {};
  if (period === 'year') {
    const out = [];
    for (let m = 1; m <= 12; m++) {
      const t = todos.monthlyStats?.[m] || { total: 0, completed: 0 };
      const r = routines.monthlyStats?.[m] || { possible: 0, checked: 0 };
      out.push({
        // 축 라벨은 숫자만 — 폰 폭에서 "10월11월12월"이 붙어 읽혔다. 제목이 '월별'이라 단위는 거기서 읽힌다. 툴팁·표는 name(N월)
        label: `${m}`, sub: '', name: `${m}월`,
        routine: { checked: r.checked || 0, possible: r.possible || 0, rate: rate(r.checked || 0, r.possible || 0) },
        todo: { completed: t.completed || 0, total: t.total || 0, rate: rate(t.completed || 0, t.total || 0) },
        reflections: reflections.monthlyStats?.[m] || 0,
      });
    }
    return out;
  }

  const days = Object.keys(todos.dailyStats || {}).sort();
  const written = new Set(reflections.writtenDates || []);
  const dayBucket = (date) => {
    const t = todos.dailyStats[date] || { total: 0, completed: 0 };
    const checked = routines.dailyChecks?.[date] || 0;
    const possible = routines.dailyPossible?.[date] ?? 0;
    return { checked, possible, completed: t.completed || 0, total: t.total || 0, written: written.has(date) ? 1 : 0 };
  };

  if (period === 'week') {
    return days.map((date) => {
      const d = dayBucket(date);
      const dt = new Date(date + 'T00:00:00');
      return {
        label: DAY_NAMES[dt.getDay()], sub: `${dt.getMonth() + 1}/${dt.getDate()}`,
        routine: { checked: d.checked, possible: d.possible, rate: rate(d.checked, d.possible) },
        todo: { completed: d.completed, total: d.total, rate: rate(d.completed, d.total) },
        reflections: d.written,
      };
    });
  }

  // month: 1일부터 7일씩 묶는다 (1~7, 8~14, 15~21, 22~28, 29~말일)
  const groups = [];
  days.forEach((date, i) => {
    const g = Math.floor(i / 7);
    if (!groups[g]) groups[g] = { first: date, last: date, checked: 0, possible: 0, completed: 0, total: 0, written: 0 };
    const d = dayBucket(date);
    const G = groups[g];
    G.last = date; G.checked += d.checked; G.possible += d.possible; G.completed += d.completed; G.total += d.total; G.written += d.written;
  });
  return groups.map((G, i) => ({
    label: `${i + 1}주`, sub: `${Number(G.first.slice(8))}~${Number(G.last.slice(8))}일`,
    routine: { checked: G.checked, possible: G.possible, rate: rate(G.checked, G.possible) },
    todo: { completed: G.completed, total: G.total, rate: rate(G.completed, G.total) },
    reflections: G.written,
  }));
}

const fmt = (s, num, den) => (s.rate === null ? '없음' : `${s.rate}% (${num}/${den})`);

const bucketName = (b) => b.name || (b.sub ? `${b.label} (${b.sub})` : b.label);

function tooltip(b) {
  const name = bucketName(b);
  const refl = b.reflections > 0 ? `성찰 ${b.reflections}일` : '성찰 없음';
  return `${name} · 루틴 ${fmt(b.routine, b.routine.checked, b.routine.possible)} · 할일 ${fmt(b.todo, b.todo.completed, b.todo.total)} · ${refl}`;
}

function bar(cls, s) {
  if (s.rate === null) return `<span class="pc-bar ${cls} pc-bar--none"></span>`;
  // 0%는 "없음"과 다르다 — 2px 밑동으로 "쟀는데 0"임을 보인다
  if (s.rate === 0) return `<span class="pc-bar ${cls} pc-bar--zero"></span>`;
  return `<span class="pc-bar ${cls}" style="height: ${s.rate}%;"></span>`;
}

/**
 * @param {Object} stats 기간 통계
 * @param {'week'|'month'|'year'} period
 * @returns {string} HTML (재료가 없으면 빈 문자열)
 */
export function renderPeriodChart(stats, period) {
  const buckets = buildBuckets(stats, period);
  if (!buckets.length) return '';
  const hasAny = buckets.some((b) => b.routine.rate !== null || b.todo.rate !== null);
  const id = `pc-${period}`;

  const cols = buckets.map((b) => `
        <div class="pc-col" tabindex="0" title="${tooltip(b)}" aria-label="${tooltip(b)}">
          <div class="pc-bars">${bar('pc-bar--routine', b.routine)}${bar('pc-bar--todo', b.todo)}</div>
          <div class="pc-x"><b>${b.label}</b>${b.sub ? `<small>${b.sub}</small>` : ''}<i class="pc-dot ${b.reflections > 0 ? 'is-on' : ''}" aria-hidden="true"></i></div>
        </div>`).join('');

  const rows = buckets.map((b) => `
          <tr><th scope="row">${bucketName(b)}</th><td>${fmt(b.routine, b.routine.checked, b.routine.possible)}</td><td>${fmt(b.todo, b.todo.completed, b.todo.total)}</td><td>${b.reflections > 0 ? `${b.reflections}일` : '-'}</td></tr>`).join('');

  return `
<!-- chart:start -->
    <section class="pc" aria-labelledby="${id}-title">
      <div class="pc-head">
        <h3 id="${id}-title" class="pc-title"><i data-lucide="activity"></i>${TITLE[period]}</h3>
        <ul class="pc-legend" aria-label="범례">
          <li><span class="pc-swatch pc-swatch--routine"></span>루틴 실천율</li>
          <li><span class="pc-swatch pc-swatch--todo"></span>할일 완료율</li>
          <li><span class="pc-dot is-on"></span>성찰 작성</li>
        </ul>
      </div>
      ${hasAny ? `
      <div class="pc-plot" style="--pc-n: ${buckets.length};">
        <div class="pc-y" aria-hidden="true"><span>100%</span><span>50%</span><span>0</span></div>
        <div class="pc-cols">${cols}
        </div>
      </div>` : `
      <div class="pc-empty">이 기간에는 아직 기록이 없습니다.</div>`}
      <details class="pc-table">
        <summary>표로 보기</summary>
        <table>
          <thead><tr><th scope="col">구간</th><th scope="col">루틴 실천율</th><th scope="col">할일 완료율</th><th scope="col">성찰</th></tr></thead>
          <tbody>${rows}
          </tbody>
        </table>
      </details>
    </section>
<!-- chart:end -->`;
}
