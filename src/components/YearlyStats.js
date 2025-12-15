// 연간 정량 지표 UI 컴포넌트

const CATEGORY_LABELS = {
  work: 'Work',
  job: 'Job',
  self_dev: 'Growth',
  personal: 'Personal'
};

const CATEGORY_COLORS = {
  work: { bg: '#fff7e6', border: '#f5d38f', gradient: 'linear-gradient(135deg, #fb923c 0%, #f59e0b 100%)' },
  job: { bg: '#e7f8ff', border: '#b5e6ff', gradient: 'linear-gradient(135deg, #22d3ee 0%, #06b6d4 100%)' },
  self_dev: { bg: '#f4e9ff', border: '#d8c7ff', gradient: 'linear-gradient(135deg, #a78bfa 0%, #8b5cf6 100%)' },
  personal: { bg: '#ffe9f0', border: '#f8c7d6', gradient: 'linear-gradient(135deg, #f472b6 0%, #ec4899 100%)' }
};

/**
 * 연간 정량 지표 UI 렌더링
 * @param {Object} stats - 연간 통계 객체
 * @returns {string} HTML 문자열
 */
export function renderYearlyStats(stats) {
  const { todos, routines, reflections, comparison, totalDays, year } = stats;
  
  const html = `
    <div class="card" style="background: linear-gradient(135deg, #eef2ff 0%, #f5f3ff 100%); border: 2px solid #6366f1; box-shadow: 0 8px 24px rgba(99, 102, 241, 0.15); margin-bottom: 1.5rem;">
      <div class="card-header" style="border-bottom: 2px solid rgba(99, 102, 241, 0.2); padding-bottom: 1rem; margin-bottom: 1.25rem;">
        <div style="display: flex; align-items: center; gap: 0.75rem;">
          <div style="width: 40px; height: 40px; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); border-radius: 12px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);">
            <i data-lucide="bar-chart-3" style="width: 24px; height: 24px; color: white; stroke-width: 2.5;"></i>
          </div>
          <div class="card-title" style="color: #4338ca; font-size: 1.5rem; margin: 0;">${year}년 연간 지표</div>
        </div>
      </div>
      
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.5rem;">
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
    <div style="background: white; border-radius: 12px; padding: 1.25rem; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem;">
        <div style="display: flex; align-items: center; gap: 0.5rem;">
          <i data-lucide="check-circle-2" style="width: 20px; height: 20px; color: #10b981; stroke-width: 2.5;"></i>
          <h3 style="font-size: 1rem; font-weight: 600; color: #111827; margin: 0;">할일 완료율</h3>
        </div>
        ${changeIndicator}
      </div>
      <div style="font-size: 2rem; font-weight: 700; color: #10b981; margin-bottom: 0.5rem;">
        ${Number(todos.completionRate || 0).toFixed(1)}%
      </div>
      <div style="font-size: 0.875rem; color: #6b7280; margin-bottom: 1rem;">
        ${todos.completed} / ${todos.total} 완료
      </div>
      ${renderProgressBar(todos.completionRate, '#10b981')}
      <div style="margin-top: 0.75rem; font-size: 0.75rem; color: #9ca3af;">
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
    <div style="background: white; border-radius: 12px; padding: 1.25rem; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem;">
        <div style="display: flex; align-items: center; gap: 0.5rem;">
          <i data-lucide="target" style="width: 20px; height: 20px; color: #14b8a6; stroke-width: 2.5;"></i>
          <h3 style="font-size: 1rem; font-weight: 600; color: #111827; margin: 0;">루틴 실천율</h3>
        </div>
        ${changeIndicator}
      </div>
      <div style="font-size: 2rem; font-weight: 700; color: #14b8a6; margin-bottom: 0.5rem;">
        ${Number(routines.practiceRate || 0).toFixed(1)}%
      </div>
      <div style="font-size: 0.875rem; color: #6b7280; margin-bottom: 1rem;">
        ${routines.totalChecks} / ${routines.totalPossibleChecks} 체크
      </div>
      ${renderProgressBar(routines.practiceRate, '#14b8a6')}
      <div style="margin-top: 0.75rem; display: flex; gap: 1rem; font-size: 0.75rem; color: #9ca3af;">
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
    <div style="background: white; border-radius: 12px; padding: 1.25rem; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem;">
        <div style="display: flex; align-items: center; gap: 0.5rem;">
          <i data-lucide="pen-square" style="width: 20px; height: 20px; color: #f87171; stroke-width: 2.5;"></i>
          <h3 style="font-size: 1rem; font-weight: 600; color: #111827; margin: 0;">성찰 작성일</h3>
        </div>
        ${changeIndicator}
      </div>
      <div style="font-size: 2rem; font-weight: 700; color: #f87171; margin-bottom: 0.5rem;">
        ${reflections.writtenDays}일
      </div>
      <div style="font-size: 0.875rem; color: #6b7280; margin-bottom: 1rem;">
        ${Number(reflections.writingRate || 0).toFixed(1)}% 작성률
      </div>
      ${renderProgressBar(reflections.writingRate, '#f87171')}
      <div style="margin-top: 0.75rem; font-size: 0.75rem; color: #9ca3af;">
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
    <div style="margin-top: 1.5rem; padding-top: 1.5rem; border-top: 2px solid rgba(99, 102, 241, 0.1);">
      <h3 style="font-size: 1rem; font-weight: 600; color: #111827; margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem;">
        <i data-lucide="layers" style="width: 18px; height: 18px; color: #6366f1; stroke-width: 2.5;"></i>
        카테고리별 완료율
      </h3>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
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
    <div style="background: ${colors.bg}; border: 2px solid ${colors.border}; border-radius: 12px; padding: 1rem;">
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.75rem;">
        <span style="font-weight: 600; color: #111827; font-size: 0.95rem;">${label}</span>
        <span style="font-weight: 700; color: #111827; font-size: 1.1rem;">${Number(stats.completionRate || 0).toFixed(1)}%</span>
      </div>
      ${renderProgressBar(stats.completionRate, colors.border, 4)}
      <div style="margin-top: 0.5rem; font-size: 0.75rem; color: #6b7280;">
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
    <div style="width: 100%; height: ${height}px; background: #e5e7eb; border-radius: 999px; overflow: hidden; position: relative;">
      <div style="width: ${clampedPercentage}%; height: 100%; background: ${color}; border-radius: 999px; transition: width 0.3s ease;"></div>
    </div>
  `;
}

/**
 * 변화 지표 렌더링
 */
function renderChangeIndicator(change, unit = '') {
  const isPositive = change > 0;
  const isNegative = change < 0;
  const color = isPositive ? '#10b981' : isNegative ? '#ef4444' : '#6b7280';
  const icon = isPositive ? 'trending-up' : isNegative ? 'trending-down' : 'minus';
  const sign = change > 0 ? '+' : '';
  
  return `
    <div style="display: flex; align-items: center; gap: 0.25rem; color: ${color}; font-size: 0.875rem; font-weight: 600;">
      <i data-lucide="${icon}" style="width: 16px; height: 16px; stroke-width: 2.5;"></i>
      <span>${sign}${change.toFixed(1)}${unit}</span>
    </div>
  `;
}

