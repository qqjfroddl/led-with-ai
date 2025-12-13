// 월간 정성 분석 UI 컴포넌트

/**
 * 월간 정성 분석 UI 렌더링
 * @param {Object} stats - 월간 통계 객체
 * @returns {string} HTML 문자열
 */
export function renderMonthlyInsights(stats) {
  const { insights, todos, routines, reflections, comparison } = stats;
  
  // 인사이트를 카테고리별로 분류
  const routineInsights = insights.filter(i => i.category === 'routines' && i.type !== 'improvement');
  const todoInsights = insights.filter(i => i.category === 'todos' && i.type !== 'improvement');
  const reflectionInsights = insights.filter(i => i.category === 'reflections' && i.type !== 'improvement');
  const improvementInsights = insights.filter(i => i.type === 'improvement');
  
  const html = `
    <div class="card" style="background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%); border: 2px solid #f87171; box-shadow: 0 8px 24px rgba(248, 113, 113, 0.15); margin-bottom: 1.5rem;">
      <div class="card-header" style="border-bottom: 2px solid rgba(248, 113, 113, 0.2); padding-bottom: 1rem; margin-bottom: 1.25rem;">
        <div style="display: flex; align-items: center; gap: 0.75rem;">
          <div style="width: 40px; height: 40px; background: linear-gradient(135deg, #f87171 0%, #ef4444 100%); border-radius: 12px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(248, 113, 113, 0.3);">
            <i data-lucide="lightbulb" style="width: 24px; height: 24px; color: white; stroke-width: 2.5;"></i>
          </div>
          <div class="card-title" style="color: #dc2626; font-size: 1.5rem; margin: 0;">월간 분석</div>
        </div>
      </div>
      
      <!-- 1. 실천율 -->
      ${renderPracticeRateSection(routineInsights, todoInsights, reflectionInsights, todos, routines, reflections)}
      
      <!-- 2. 전월 대비 변화 -->
      ${renderComparisonSection(comparison, improvementInsights)}
      
      <!-- 3. 월간 패턴 분석 -->
      ${renderPatternAnalysis(todos, routines)}
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
      <h3 style="font-size: 1.1rem; font-weight: 600; color: #111827; margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem;">
        <i data-lucide="target" style="width: 20px; height: 20px; color: #f87171; stroke-width: 2.5;"></i>
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
 * 전월 대비 변화 섹션 렌더링
 */
function renderComparisonSection(comparison, improvementInsights) {
  if (!comparison) {
    return `
      <div style="margin-bottom: 2rem; padding-top: 1.5rem; border-top: 2px solid rgba(248, 113, 113, 0.1);">
        <h3 style="font-size: 1.1rem; font-weight: 600; color: #111827; margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem;">
          <i data-lucide="trending-up" style="width: 20px; height: 20px; color: #f87171; stroke-width: 2.5;"></i>
          전월 대비 변화
        </h3>
        <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 12px; padding: 1rem; text-align: center; color: #6b7280; font-size: 0.95rem;">
          전월 데이터가 없어 비교할 수 없습니다.
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
      <div style="margin-bottom: 2rem; padding-top: 1.5rem; border-top: 2px solid rgba(248, 113, 113, 0.1);">
        <h3 style="font-size: 1.1rem; font-weight: 600; color: #111827; margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem;">
          <i data-lucide="trending-up" style="width: 20px; height: 20px; color: #f87171; stroke-width: 2.5;"></i>
          전월 대비 변화
        </h3>
        <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 12px; padding: 1rem; text-align: center; color: #6b7280; font-size: 0.95rem;">
          전월 대비 큰 변화가 없습니다.
        </div>
      </div>
    `;
  }
  
  return `
    <div style="margin-bottom: 2rem; padding-top: 1.5rem; border-top: 2px solid rgba(248, 113, 113, 0.1);">
      <h3 style="font-size: 1.1rem; font-weight: 600; color: #111827; margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem;">
        <i data-lucide="trending-up" style="width: 20px; height: 20px; color: #f87171; stroke-width: 2.5;"></i>
        전월 대비 변화
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
  const color = isPositive ? '#10b981' : '#ef4444';
  const bg = isPositive ? '#d1fae5' : '#fee2e2';
  const border = isPositive ? '#86efac' : '#fecaca';
  const icon = isPositive ? 'trending-up' : 'trending-down';
  const sign = change.value > 0 ? '+' : '';
  
  return `
    <div style="background: ${bg}; border: 2px solid ${border}; border-radius: 12px; padding: 1rem;">
      <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
        <i data-lucide="${change.icon}" style="width: 18px; height: 18px; color: ${color}; stroke-width: 2.5;"></i>
        <span style="font-size: 0.875rem; font-weight: 600; color: #111827;">${change.label}</span>
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
      color: '#10b981',
      bg: '#d1fae5',
      border: '#86efac'
    },
    neutral: {
      icon: 'info',
      color: '#6366f1',
      bg: '#eef2ff',
      border: '#c7d2fe'
    },
    suggestion: {
      icon: 'alert-circle',
      color: '#f59e0b',
      bg: '#fef3c7',
      border: '#fde68a'
    },
    improvement: {
      icon: 'trending-up',
      color: '#8b5cf6',
      bg: '#ede9fe',
      border: '#c4b5fd'
    }
  };
  
  const config = typeConfig[insight.type] || typeConfig.neutral;
  
  return `
    <div style="background: ${config.bg}; border: 2px solid ${config.border}; border-radius: 12px; padding: 1rem; display: flex; align-items: start; gap: 0.75rem;">
      <div style="flex-shrink: 0; width: 32px; height: 32px; background: ${config.color}; border-radius: 8px; display: flex; align-items: center; justify-content: center;">
        <i data-lucide="${config.icon}" style="width: 18px; height: 18px; color: white; stroke-width: 2.5;"></i>
      </div>
      <div style="flex: 1; color: #111827; font-size: 0.95rem; line-height: 1.6;">
        ${insight.message}
      </div>
    </div>
  `;
}

/**
 * 월간 패턴 분석 렌더링
 */
function renderPatternAnalysis(todos, routines) {
  // 가장 활발한 요일 찾기
  const mostActiveDay = findMostActiveDay(todos.dailyStats, routines.dailyChecks);
  
  // 가장 완료율 높은 카테고리 찾기
  const bestCategory = findBestCategory(todos.byCategory);
  
  // 가장 실천율 높은 루틴 찾기
  const bestRoutine = routines.routineRates.length > 0
    ? routines.routineRates.reduce((best, current) => 
        current.rate > best.rate ? current : best
      )
    : null;
  
  return `
    <div style="margin-top: 1.5rem; padding-top: 1.5rem; border-top: 2px solid rgba(248, 113, 113, 0.1);">
      <h3 style="font-size: 1rem; font-weight: 600; color: #111827; margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem;">
        <i data-lucide="activity" style="width: 18px; height: 18px; color: #f87171; stroke-width: 2.5;"></i>
        월간 패턴
      </h3>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
        ${mostActiveDay ? renderPatternCard('calendar', '가장 활발한 요일', mostActiveDay.day, mostActiveDay.description) : ''}
        ${bestCategory ? renderPatternCard('layers', '가장 완료율 높은 카테고리', bestCategory.name, `${Number(bestCategory.rate || 0).toFixed(1)}% 완료`) : ''}
        ${bestRoutine ? renderPatternCard('target', '가장 실천율 높은 루틴', bestRoutine.title, `${Number(bestRoutine.rate || 0).toFixed(1)}% 실천`) : ''}
      </div>
    </div>
  `;
}

/**
 * 패턴 카드 렌더링
 */
function renderPatternCard(icon, label, title, description) {
  return `
    <div style="background: white; border-radius: 12px; padding: 1rem; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
      <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
        <i data-lucide="${icon}" style="width: 16px; height: 16px; color: #f87171; stroke-width: 2.5;"></i>
        <span style="font-size: 0.75rem; color: #6b7280; font-weight: 500;">${label}</span>
      </div>
      <div style="font-weight: 600; color: #111827; margin-bottom: 0.25rem; font-size: 0.95rem;">
        ${title}
      </div>
      <div style="font-size: 0.875rem; color: #6b7280;">
        ${description}
      </div>
    </div>
  `;
}

/**
 * 가장 활발한 요일 찾기
 */
function findMostActiveDay(todosDaily, routinesDaily) {
  const dayNames = ['월', '화', '수', '목', '금', '토', '일'];
  const dayScores = {};
  
  // 할일 점수 계산
  Object.entries(todosDaily).forEach(([date, stats]) => {
    const dayOfWeek = new Date(date).getDay();
    const dayName = dayNames[dayOfWeek === 0 ? 6 : dayOfWeek - 1]; // 월요일=0으로 변환
    dayScores[dayName] = (dayScores[dayName] || 0) + (stats.completed || 0);
  });
  
  // 루틴 점수 추가
  Object.entries(routinesDaily).forEach(([date, count]) => {
    const dayOfWeek = new Date(date).getDay();
    const dayName = dayNames[dayOfWeek === 0 ? 6 : dayOfWeek - 1];
    dayScores[dayName] = (dayScores[dayName] || 0) + (count || 0);
  });
  
  if (Object.keys(dayScores).length === 0) return null;
  
  const mostActive = Object.entries(dayScores).reduce((best, [day, score]) => 
    score > best.score ? { day, score } : best
  , { day: '', score: -1 });
  
  return {
    day: mostActive.day,
    description: `할일 ${todosDaily ? Object.values(todosDaily).reduce((sum, s) => sum + (s.completed || 0), 0) : 0}개, 루틴 ${routinesDaily ? Object.values(routinesDaily).reduce((sum, c) => sum + (c || 0), 0) : 0}개 완료`
  };
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

