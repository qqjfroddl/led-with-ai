// 연간 정성 분석 UI 컴포넌트

/**
 * 연간 정성 분석 UI 렌더링
 * @param {Object} stats - 연간 통계 객체
 * @returns {string} HTML 문자열
 */
export function renderYearlyInsights(stats) {
  const { insights, todos, routines, reflections, comparison, year } = stats;
  
  // 인사이트를 카테고리별로 분류
  const routineInsights = insights.filter(i => i.category === 'routines' && i.type !== 'improvement');
  const todoInsights = insights.filter(i => i.category === 'todos' && i.type !== 'improvement');
  const reflectionInsights = insights.filter(i => i.category === 'reflections' && i.type !== 'improvement');
  const improvementInsights = insights.filter(i => i.type === 'improvement');
  
  const html = `
    <div class="card" style="background: var(--t-insight-soft); border: 2px solid var(--t-insight); box-shadow: 0 8px 24px rgba(42,38,34, 0.07); margin-bottom: 1.5rem;">
      <div class="card-header" style="border-bottom: 2px solid var(--t-insight-line); padding-bottom: 1rem; margin-bottom: 1.25rem;">
        <div style="display: flex; align-items: center; gap: 0.75rem;">
          <div style="width: 40px; height: 40px; background: var(--t-insight); border-radius: 12px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(42,38,34, 0.15);">
            <i data-lucide="lightbulb" style="width: 24px; height: 24px; color: white; stroke-width: 2.5;"></i>
          </div>
          <div class="card-title" style="color: var(--t-insight); font-size: 1.5rem; margin: 0;">${year}년 연간 분석</div>
        </div>
      </div>
      
      <!-- 1. 실천율 -->
      ${renderPracticeRateSection(routineInsights, todoInsights, reflectionInsights, todos, routines, reflections)}
      
      <!-- 2. 전년 대비 변화 -->
      ${renderComparisonSection(comparison, improvementInsights)}
      
      <!-- 3. 연간 패턴 분석 -->
      ${renderYearlyPatternAnalysis(todos, routines)}
    </div>
  `;
  
  return html;
}

/**
 * 실천율 섹션 렌더링
 */
function renderPracticeRateSection(routineInsights, todoInsights, reflectionInsights, todos, routines, reflections) {
  return `
    <div style="margin-bottom: 2rem;">
      <h3 style="font-size: 1.1rem; font-weight: 600; color: var(--t-text); margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem;">
        <i data-lucide="target" style="width: 20px; height: 20px; color: var(--t-insight); stroke-width: 2.5;"></i>
        실천율
      </h3>
      <div style="display: flex; flex-direction: column; gap: 1rem;">
        ${routineInsights.length > 0 ? renderInsightItem(routineInsights[0]) : ''}
        ${todoInsights.length > 0 ? renderInsightItem(todoInsights[0]) : ''}
        ${reflectionInsights.length > 0 ? renderInsightItem(reflectionInsights[0]) : ''}
      </div>
    </div>
  `;
}

/**
 * 전년 대비 변화 섹션 렌더링
 */
function renderComparisonSection(comparison, improvementInsights) {
  if (!comparison) {
    return `
      <div style="margin-bottom: 2rem; padding-top: 1.5rem; border-top: 2px solid var(--t-insight-line);">
        <h3 style="font-size: 1.1rem; font-weight: 600; color: var(--t-text); margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem;">
          <i data-lucide="trending-up" style="width: 20px; height: 20px; color: var(--t-insight); stroke-width: 2.5;"></i>
          전년 대비 변화
        </h3>
        <div style="background: var(--t-bg); border: 1px solid var(--t-line); border-radius: 12px; padding: 1rem; text-align: center; color: var(--t-muted); font-size: 0.95rem;">
          전년 데이터가 없어 비교할 수 없습니다.
        </div>
      </div>
    `;
  }
  
  const changes = [];
  
  // 루틴 실천율 변화
  if (comparison.routines && comparison.routines.practiceRate !== undefined) {
    const change = comparison.routines.practiceRate;
    if (Math.abs(change) > 0.1) { // 0.1%p 이상 변화만 표시
      changes.push({
        label: '루틴 실천율',
        value: change,
        icon: 'target'
      });
    }
  }
  
  // 할일 완료율 변화
  if (comparison.todos && comparison.todos.completionRate !== undefined) {
    const change = comparison.todos.completionRate;
    if (Math.abs(change) > 0.1) {
      changes.push({
        label: '할일 완료율',
        value: change,
        icon: 'check-circle-2'
      });
    }
  }
  
  // 성찰 작성률 변화
  if (comparison.reflections && comparison.reflections.writingRate !== undefined) {
    const change = comparison.reflections.writingRate;
    if (Math.abs(change) > 0.1) {
      changes.push({
        label: '성찰 작성률',
        value: change,
        icon: 'pen-square'
      });
    }
  }
  
  if (changes.length === 0) {
    return `
      <div style="margin-bottom: 2rem; padding-top: 1.5rem; border-top: 2px solid var(--t-insight-line);">
        <h3 style="font-size: 1.1rem; font-weight: 600; color: var(--t-text); margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem;">
          <i data-lucide="trending-up" style="width: 20px; height: 20px; color: var(--t-insight); stroke-width: 2.5;"></i>
          전년 대비 변화
        </h3>
        <div style="background: var(--t-bg); border: 1px solid var(--t-line); border-radius: 12px; padding: 1rem; text-align: center; color: var(--t-muted); font-size: 0.95rem;">
          전년 대비 큰 변화가 없습니다.
        </div>
      </div>
    `;
  }
  
  return `
    <div style="margin-bottom: 2rem; padding-top: 1.5rem; border-top: 2px solid var(--t-insight-line);">
      <h3 style="font-size: 1.1rem; font-weight: 600; color: var(--t-text); margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem;">
        <i data-lucide="trending-up" style="width: 20px; height: 20px; color: var(--t-insight); stroke-width: 2.5;"></i>
        전년 대비 변화
      </h3>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
        ${changes.map(change => renderComparisonCard(change)).join('')}
      </div>
    </div>
  `;
}

/**
 * 비교 카드 렌더링
 */
function renderComparisonCard(change) {
  const isPositive = change.value > 0;
  const color = isPositive ? 'var(--t-success)' : 'var(--t-danger)';
  const bg = isPositive ? 'var(--t-success-soft)' : 'var(--t-danger-soft)';
  const border = isPositive ? 'var(--t-success-line)' : 'var(--t-danger-line)';
  const icon = isPositive ? 'trending-up' : 'trending-down';
  const sign = change.value > 0 ? '+' : '';
  
  return `
    <div style="background: ${bg}; border: 2px solid ${border}; border-radius: 12px; padding: 1rem;">
      <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
        <i data-lucide="${change.icon}" style="width: 18px; height: 18px; color: ${color}; stroke-width: 2.5;"></i>
        <span style="font-size: 0.875rem; font-weight: 600; color: var(--t-text);">${change.label}</span>
      </div>
      <div style="display: flex; align-items: center; gap: 0.5rem;">
        <i data-lucide="${icon}" style="width: 20px; height: 20px; color: ${color}; stroke-width: 2.5;"></i>
        <span style="font-size: 1.25rem; font-weight: 700; color: ${color};">
          ${sign}${Math.abs(change.value).toFixed(1)}%p
        </span>
      </div>
    </div>
  `;
}

/**
 * 인사이트 아이템 렌더링
 */
function renderInsightItem(insight) {
  const typeConfig = {
    positive: {
      icon: 'check-circle-2',
      color: 'var(--t-success)',
      bg: 'var(--t-success-soft)',
      border: 'var(--t-success-line)'
    },
    neutral: {
      icon: 'info',
      color: 'var(--t-accent)',
      bg: 'var(--t-accent-soft)',
      border: 'var(--t-accent-line)'
    },
    suggestion: {
      icon: 'alert-circle',
      color: 'var(--t-warn)',
      bg: 'var(--t-warn-soft)',
      border: 'var(--t-warn-line)'
    },
    improvement: {
      icon: 'trending-up',
      color: 'var(--t-accent2)',
      bg: 'var(--t-accent2-soft)',
      border: 'var(--t-accent2-line)'
    }
  };
  
  const config = typeConfig[insight.type] || typeConfig.neutral;
  
  return `
    <div style="background: ${config.bg}; border: 2px solid ${config.border}; border-radius: 12px; padding: 1rem; display: flex; align-items: start; gap: 0.75rem;">
      <div style="flex-shrink: 0; width: 32px; height: 32px; background: ${config.color}; border-radius: 8px; display: flex; align-items: center; justify-content: center;">
        <i data-lucide="${config.icon}" style="width: 18px; height: 18px; color: white; stroke-width: 2.5;"></i>
      </div>
      <div style="flex: 1; color: var(--t-text); font-size: 0.95rem; line-height: 1.6;">
        ${insight.message}
      </div>
    </div>
  `;
}

/**
 * 연간 패턴 분석 렌더링
 */
function renderYearlyPatternAnalysis(todos, routines) {
  // 가장 완료율 높은 카테고리 찾기
  const bestCategory = findBestCategory(todos.byCategory);
  
  // 월별 통계 요약
  const monthlySummary = summarizeMonthlyStats(todos.monthlyStats, routines.monthlyStats);
  
  return `
    <div style="margin-top: 1.5rem; padding-top: 1.5rem; border-top: 2px solid var(--t-insight-line);">
      <h3 style="font-size: 1rem; font-weight: 600; color: var(--t-text); margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem;">
        <i data-lucide="activity" style="width: 18px; height: 18px; color: var(--t-insight); stroke-width: 2.5;"></i>
        연간 패턴
      </h3>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
        ${bestCategory ? renderPatternCard('layers', '가장 완료율 높은 카테고리', bestCategory.name, `${Number(bestCategory.rate || 0).toFixed(1)}% 완료`) : ''}
        ${monthlySummary.bestMonth ? renderPatternCard('calendar', '가장 활발한 월', `${monthlySummary.bestMonth}월`, monthlySummary.bestMonthDesc) : ''}
        ${monthlySummary.worstMonth ? renderPatternCard('alert-circle', '개선이 필요한 월', `${monthlySummary.worstMonth}월`, monthlySummary.worstMonthDesc, 'var(--t-danger)') : ''}
      </div>
    </div>
  `;
}

/**
 * 월별 통계 요약
 */
function summarizeMonthlyStats(todosMonthly, routinesMonthly) {
  if (!todosMonthly || !routinesMonthly) {
    return { bestMonth: null, worstMonth: null };
  }
  
  const monthScores = {};
  
  // 월별 점수 계산 (할일 완료율 + 루틴 실천율)
  for (let month = 1; month <= 12; month++) {
    const todosStats = todosMonthly[month] || { total: 0, completed: 0 };
    const routinesStats = routinesMonthly[month] || { possible: 0, checked: 0 };
    
    const todosRate = todosStats.total > 0 ? (todosStats.completed / todosStats.total) * 100 : 0;
    const routinesRate = routinesStats.possible > 0 ? (routinesStats.checked / routinesStats.possible) * 100 : 0;
    
    // 종합 점수 (할일 50% + 루틴 50%)
    monthScores[month] = (todosRate * 0.5) + (routinesRate * 0.5);
  }
  
  // 가장 활발한 월
  const bestMonth = Object.entries(monthScores).reduce((best, [month, score]) => 
    score > best.score ? { month: parseInt(month), score } : best
  , { month: null, score: -1 });
  
  // 가장 부실한 월
  const worstMonth = Object.entries(monthScores).reduce((worst, [month, score]) => 
    score < worst.score ? { month: parseInt(month), score } : worst
  , { month: null, score: 999 });
  
  const bestMonthStats = todosMonthly[bestMonth.month] || { total: 0, completed: 0 };
  const worstMonthStats = todosMonthly[worstMonth.month] || { total: 0, completed: 0 };
  
  return {
    bestMonth: bestMonth.month,
    bestMonthDesc: `할일 ${bestMonthStats.completed}/${bestMonthStats.total} 완료`,
    worstMonth: worstMonth.month,
    worstMonthDesc: `할일 ${worstMonthStats.completed}/${worstMonthStats.total} 완료`
  };
}

/**
 * 패턴 카드 렌더링
 */
function renderPatternCard(icon, label, title, description, color = 'var(--t-insight)') {
  return `
    <div style="background: var(--t-surface); border-radius: 12px; padding: 1rem; box-shadow: 0 2px 8px rgba(42,38,34, 0.08);">
      <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
        <i data-lucide="${icon}" style="width: 16px; height: 16px; color: ${color}; stroke-width: 2.5;"></i>
        <span style="font-size: 0.75rem; color: var(--t-muted); font-weight: 500;">${label}</span>
      </div>
      <div style="font-weight: 600; color: var(--t-text); margin-bottom: 0.25rem; font-size: 0.95rem;">
        ${title}
      </div>
      <div style="font-size: 0.875rem; color: var(--t-muted);">
        ${description}
      </div>
    </div>
  `;
}

/**
 * 가장 완료율 높은 카테고리 찾기
 */
function findBestCategory(byCategory) {
  const categories = Object.entries(byCategory)
    .filter(([_, stats]) => stats.total > 0)
    .map(([category, stats]) => ({
      name: getCategoryLabel(category),
      rate: stats.completionRate
    }));
  
  if (categories.length === 0) return null;
  
  return categories.reduce((best, current) => 
    current.rate > best.rate ? current : best
  );
}

/**
 * 카테고리 라벨 반환
 */
function getCategoryLabel(category) {
  const labels = {
    work: 'Work',
    job: 'Job',
    self_dev: 'Growth',
    personal: 'Personal'
  };
  return labels[category] || category;
}

























