// 월간 정량 지표 UI 컴포넌트

const CATEGORY_LABELS = {
  work: 'Work',
  job: 'Job',
  self_dev: 'Growth',
  personal: 'Personal'
};

const CATEGORY_COLORS = {
  work: { bg: 'var(--t-cat-work-soft)', border: 'var(--t-cat-work-line)', gradient: 'var(--t-cat-work)' },
  job: { bg: 'var(--t-cat-job-soft)', border: 'var(--t-cat-job-line)', gradient: 'var(--t-cat-job)' },
  self_dev: { bg: 'var(--t-accent2-soft)', border: 'var(--t-accent2-line)', gradient: 'var(--t-accent2)' },
  personal: { bg: 'var(--t-cat-personal-soft)', border: 'var(--t-cat-personal-line)', gradient: 'var(--t-cat-personal)' }
};

/**
 * 월간 정량 지표 UI 렌더링
 * @param {Object} stats - 월간 통계 객체
 * @returns {string} HTML 문자열
 */
export function renderMonthlyStats(stats) {
  const { todos, routines, reflections, comparison, totalDays } = stats;
  
  const html = `
    <div class="card bg-accent-soft bd-2px-solid-accent sh-0-8px-24px-rgba42_38_34_0_07 mb-1_5rem">
      <div class="card-header bdb-2px-solid-accent-line pb-1rem mb-1_25rem">
        <div class="d-flex ai-center gap-0_75rem">
          <div class="w-40px h-40px bg-accent br-12px d-flex ai-center jc-center sh-0-4px-12px-rgba42_38_34_0_15">
            <i class="w-24px h-24px c-white sw-2_5" data-lucide="bar-chart-3"></i>
          </div>
          <div class="card-title c-accent fz-1_5rem m-0">월간 지표</div>
        </div>
      </div>
      
      <div class="d-grid gtc-repeatauto-fit_minmax280px_1fr gap-1_5rem">
        <!-- 루틴 실천율 -->
        ${renderRoutinePracticeCard(routines, comparison)}
        
        <!-- 할일 완료율 -->
        ${renderTodoCompletionCard(todos, comparison)}
        
        <!-- 성찰 작성일 -->
        ${renderReflectionCard(reflections, comparison, totalDays)}
      </div>
      
      <!-- 카테고리별 완료율 -->
      ${renderCategoryBreakdown(todos)}
    </div>
  `;
  
  return html;
}

/**
 * 할일 완료율 카드
 */
function renderTodoCompletionCard(todos, comparison) {
  const changeIndicator = comparison?.todos?.completionRate 
    ? renderChangeIndicator(comparison.todos.completionRate, '%p')
    : '';
  
  return `
    <div class="bg-surface br-12px p-1_25rem sh-0-2px-8px-rgba42_38_34_0_08">
      <div class="d-flex ai-center jc-space-between mb-1rem">
        <div class="d-flex ai-center gap-0_5rem">
          <i class="w-20px h-20px c-success sw-2_5" data-lucide="check-circle-2"></i>
          <h3 class="fz-1rem fwt-600 c-text m-0">할일 완료율</h3>
        </div>
        ${changeIndicator}
      </div>
      <div class="fz-2rem fwt-700 c-success mb-0_5rem">
        ${Number(todos.completionRate || 0).toFixed(1)}%
      </div>
      <div class="fz-0_875rem c-muted mb-1rem">
        ${todos.completed} / ${todos.total} 완료
      </div>
      ${renderProgressBar(todos.completionRate, 'var(--t-success)')}
      <div class="mt-0_75rem fz-0_75rem c-muted2">
        평균 일일 할일: ${todos.avgDailyTodos}개
      </div>
    </div>
  `;
}

/**
 * 루틴 실천율 카드
 */
function renderRoutinePracticeCard(routines, comparison) {
  const changeIndicator = comparison?.routines?.practiceRate 
    ? renderChangeIndicator(comparison.routines.practiceRate, '%p')
    : '';
  
  return `
    <div class="bg-surface br-12px p-1_25rem sh-0-2px-8px-rgba42_38_34_0_08">
      <div class="d-flex ai-center jc-space-between mb-1rem">
        <div class="d-flex ai-center gap-0_5rem">
          <i class="w-20px h-20px c-accent sw-2_5" data-lucide="target"></i>
          <h3 class="fz-1rem fwt-600 c-text m-0">루틴 실천율</h3>
        </div>
        ${changeIndicator}
      </div>
      <div class="fz-2rem fwt-700 c-accent mb-0_5rem">
        ${Number(routines.practiceRate || 0).toFixed(1)}%
      </div>
      <div class="fz-0_875rem c-muted mb-1rem">
        ${routines.totalChecks} / ${routines.totalPossibleChecks} 체크
      </div>
      ${renderProgressBar(routines.practiceRate, 'var(--t-accent)')}
      <div class="mt-0_75rem d-flex gap-1rem fz-0_75rem c-muted2">
        <span>☀ 모닝: ${Number(routines.morningRate || 0).toFixed(1)}%</span>
        <span>🌙 나이트: ${Number(routines.nightRate || 0).toFixed(1)}%</span>
      </div>
    </div>
  `;
}

/**
 * 성찰 작성일 카드
 */
function renderReflectionCard(reflections, comparison, totalDays) {
  const changeIndicator = comparison?.reflections?.writingRate 
    ? renderChangeIndicator(comparison.reflections.writingRate, '%p')
    : '';
  
  return `
    <div class="bg-surface br-12px p-1_25rem sh-0-2px-8px-rgba42_38_34_0_08">
      <div class="d-flex ai-center jc-space-between mb-1rem">
        <div class="d-flex ai-center gap-0_5rem">
          <i class="w-20px h-20px c-insight sw-2_5" data-lucide="pen-square"></i>
          <h3 class="fz-1rem fwt-600 c-text m-0">성찰 작성일</h3>
        </div>
        ${changeIndicator}
      </div>
      <div class="fz-2rem fwt-700 c-insight mb-0_5rem">
        ${reflections.writtenDays}일
      </div>
      <div class="fz-0_875rem c-muted mb-1rem">
        ${Number(reflections.writingRate || 0).toFixed(1)}% 작성률
      </div>
      ${renderProgressBar(reflections.writingRate, 'var(--t-insight)')}
      <div class="mt-0_75rem fz-0_75rem c-muted2">
        ${totalDays}일 중 ${reflections.writtenDays}일 기록
      </div>
    </div>
  `;
}

/**
 * 카테고리별 완료율 상세
 */
function renderCategoryBreakdown(todos) {
  const categories = Object.entries(todos.byCategory);
  
  return `
    <div class="mt-1_5rem pt-1_5rem bdt-2px-solid-accent-line">
      <h3 class="fz-1rem fwt-600 c-text mb-1rem d-flex ai-center gap-0_5rem">
        <i class="w-18px h-18px c-accent sw-2_5" data-lucide="layers"></i>
        카테고리별 완료율
      </h3>
      <div class="d-grid gtc-repeatauto-fit_minmax200px_1fr gap-1rem">
        ${categories.map(([category, stats]) => renderCategoryCard(category, stats)).join('')}
      </div>
    </div>
  `;
}

/**
 * 카테고리 카드
 */
function renderCategoryCard(category, stats) {
  const colors = CATEGORY_COLORS[category] || CATEGORY_COLORS.work;
  const label = CATEGORY_LABELS[category] || category;
  
  return `
    <div class="br-12px p-1rem" style="background: ${colors.bg}; border: 2px solid ${colors.border};">
      <div class="d-flex ai-center jc-space-between mb-0_75rem">
        <span class="fwt-600 c-text fz-0_95rem">${label}</span>
        <span class="fwt-700 c-text fz-1_1rem">${Number(stats.completionRate || 0).toFixed(1)}%</span>
      </div>
      ${renderProgressBar(stats.completionRate, colors.border, 4)}
      <div class="mt-0_5rem fz-0_75rem c-muted">
        ${stats.completed} / ${stats.total} 완료
      </div>
    </div>
  `;
}

/**
 * 진행바 렌더링
 */
function renderProgressBar(percentage, color, height = 8) {
  const clampedPercentage = Math.min(100, Math.max(0, percentage));
  
  return `
    <div class="w-100pct bg-line br-999px ov-hidden pos-relative" style="height: ${height}px;">
      <div class="h-100pct br-999px tr-width-0_3s-ease" style="width: ${clampedPercentage}%; background: ${color};"></div>
    </div>
  `;
}

/**
 * 변화 지표 렌더링
 */
function renderChangeIndicator(change, unit = '') {
  const isPositive = change > 0;
  const isNegative = change < 0;
  const color = isPositive ? 'var(--t-success)' : isNegative ? 'var(--t-danger)' : 'var(--t-muted)';
  const icon = isPositive ? 'trending-up' : isNegative ? 'trending-down' : 'minus';
  const sign = change > 0 ? '+' : '';
  
  return `
    <div class="d-flex ai-center gap-0_25rem fz-0_875rem fwt-600" style="color: ${color};">
      <i class="w-16px h-16px sw-2_5" data-lucide="${icon}"></i>
      <span>${sign}${change.toFixed(1)}${unit}</span>
    </div>
  `;
}



























