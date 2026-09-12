// 주간 정성 분석 UI 컴포넌트

/**
 * 주간 정성 분석 UI 렌더링
 * @param {Object} stats - 주간 통계 객체
 * @returns {string} HTML 문자열
 */
export function renderWeeklyInsights(stats) {
  const { insights, todos, routines, reflections, comparison } = stats;
  
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
          <div class="card-title" style="color: var(--t-insight); font-size: 1.5rem; margin: 0;">주간 분석</div>
        </div>
      </div>
      
      <!-- 1. 실천율 -->
      ${renderPracticeRateSection(routineInsights, todoInsights, reflectionInsights, todos, routines, reflections)}
      
      <!-- 2. 전주 대비 변화 -->
      ${renderComparisonSection(comparison, improvementInsights)}
      
      <!-- 3. 주간 패턴 분석 -->
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
 * 전주 대비 변화 섹션 렌더링
 */
function renderComparisonSection(comparison, improvementInsights) {
  if (!comparison) {
    return `
      <div style="margin-bottom: 2rem; padding-top: 1.5rem; border-top: 2px solid var(--t-insight-line);">
        <h3 style="font-size: 1.1rem; font-weight: 600; color: var(--t-text); margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem;">
          <i data-lucide="trending-up" style="width: 20px; height: 20px; color: var(--t-insight); stroke-width: 2.5;"></i>
          전주 대비 변화
        </h3>
        <div style="background: var(--t-bg); border: 1px solid var(--t-line); border-radius: 12px; padding: 1rem; text-align: center; color: var(--t-muted); font-size: 0.95rem;">
          전주 데이터가 없어 비교할 수 없습니다.
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
          전주 대비 변화
        </h3>
        <div style="background: var(--t-bg); border: 1px solid var(--t-line); border-radius: 12px; padding: 1rem; text-align: center; color: var(--t-muted); font-size: 0.95rem;">
          전주 대비 큰 변화가 없습니다.
        </div>
      </div>
    `;
  }
  
  return `
    <div style="margin-bottom: 2rem; padding-top: 1.5rem; border-top: 2px solid var(--t-insight-line);">
      <h3 style="font-size: 1.1rem; font-weight: 600; color: var(--t-text); margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem;">
        <i data-lucide="trending-up" style="width: 20px; height: 20px; color: var(--t-insight); stroke-width: 2.5;"></i>
        전주 대비 변화
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
 * 주간 패턴 분석 렌더링
 */
function renderPatternAnalysis(todos, routines) {
  // 가장 활발한 요일 찾기
  const mostActiveDay = findMostActiveDay(todos.dailyStats, routines.dailyChecks);
  
  // 가장 완료율 높은 카테고리 찾기
  const bestCategory = findBestCategory(todos.byCategory);
  
  // 활성 일수가 있는 루틴만 필터링 (rate가 계산 가능했던 루틴)
  const activeRoutines = (routines.routineRates || []).filter(r => {
    // rate가 0이어도 totalChecks가 0보다 크면 활성 일수가 있었던 것
    return r.rate !== undefined && (r.totalChecks > 0 || r.rate > 0);
  });
  
  // 가장 실천율 높은 루틴 찾기 (최소 1회 이상 체크한 루틴 중)
  const bestRoutine = activeRoutines.length > 0
    ? activeRoutines
        .filter(r => r.totalChecks > 0) // 최소 1회 이상 체크
        .reduce((best, current) => 
          current.rate > best.rate ? current : best,
          activeRoutines.find(r => r.totalChecks > 0) || null
        )
    : null;
  
  // 가장 부실한 루틴 찾기 (활성 일수가 있었지만 체크 수가 적은 루틴)
  const worstRoutine = activeRoutines.length > 0
    ? activeRoutines.reduce((worst, current) => {
        // 체크 수가 0인 루틴 우선
        if (current.totalChecks === 0 && worst.totalChecks > 0) return current;
        if (worst.totalChecks === 0 && current.totalChecks > 0) return worst;
        // 둘 다 체크했으면 rate가 낮은 것
        if (current.totalChecks > 0 && worst.totalChecks > 0) {
          return current.rate < worst.rate ? current : worst;
        }
        // 둘 다 체크 안 했으면 그냥 유지
        return worst;
      }, activeRoutines[0] || null)
    : null;
  
  // bestRoutine과 worstRoutine이 같은 경우 worstRoutine 제외
  const displayWorstRoutine = worstRoutine && 
    bestRoutine && 
    worstRoutine.id !== bestRoutine.id ? worstRoutine : null;
  
  return `
    <div style="margin-top: 1.5rem; padding-top: 1.5rem; border-top: 2px solid var(--t-insight-line);">
      <h3 style="font-size: 1rem; font-weight: 600; color: var(--t-text); margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem;">
        <i data-lucide="activity" style="width: 18px; height: 18px; color: var(--t-insight); stroke-width: 2.5;"></i>
        주간 패턴
      </h3>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
        ${mostActiveDay ? renderPatternCard('calendar', '가장 활발한 요일', mostActiveDay.day, mostActiveDay.description) : ''}
        ${bestCategory ? renderPatternCard('layers', '가장 완료율 높은 카테고리', bestCategory.name, `${Number(bestCategory.rate || 0).toFixed(1)}% 완료`) : ''}
        ${bestRoutine ? renderPatternCard('target', '가장 꾸준히 잘 한 루틴', bestRoutine.title, `${Number(bestRoutine.rate || 0).toFixed(1)}% 실천 (${bestRoutine.totalChecks}회)`, 'var(--t-success)') : ''}
        ${displayWorstRoutine ? renderPatternCard('alert-circle', '개선이 필요한 루틴', displayWorstRoutine.title, displayWorstRoutine.totalChecks === 0 ? '0회 실천' : `${Number(displayWorstRoutine.rate || 0).toFixed(1)}% 실천 (${displayWorstRoutine.totalChecks}회)`, 'var(--t-danger)') : ''}
      </div>
    </div>
  `;
}

/**
 * 패턴 카드 렌더링 (색상 옵션 추가)
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
 * 가장 활발한 요일 찾기
 */
function findMostActiveDay(todosDaily, routinesDaily) {
  const dayNames = ['월', '화', '수', '목', '금', '토', '일'];
  const dayScores = {};
  const dayTodos = {}; // 요일별 할일 완료 수
  const dayRoutines = {}; // 요일별 루틴 완료 수
  
  // 할일 점수 계산
  Object.entries(todosDaily || {}).forEach(([date, stats]) => {
    const dayOfWeek = new Date(date).getDay();
    const dayName = dayNames[dayOfWeek === 0 ? 6 : dayOfWeek - 1]; // 월요일=0으로 변환
    const completed = stats.completed || 0;
    dayScores[dayName] = (dayScores[dayName] || 0) + completed;
    dayTodos[dayName] = (dayTodos[dayName] || 0) + completed;
  });
  
  // 루틴 점수 추가
  Object.entries(routinesDaily || {}).forEach(([date, count]) => {
    const dayOfWeek = new Date(date).getDay();
    const dayName = dayNames[dayOfWeek === 0 ? 6 : dayOfWeek - 1];
    const routineCount = count || 0;
    dayScores[dayName] = (dayScores[dayName] || 0) + routineCount;
    dayRoutines[dayName] = (dayRoutines[dayName] || 0) + routineCount;
  });
  
  if (Object.keys(dayScores).length === 0) return null;
  
  const mostActive = Object.entries(dayScores).reduce((best, [day, score]) => 
    score > best.score ? { day, score } : best
  , { day: '', score: -1 });
  
  // 가장 활발한 요일의 실제 할일/루틴 완료 수 사용
  const todoCount = dayTodos[mostActive.day] || 0;
  const routineCount = dayRoutines[mostActive.day] || 0;
  
  return {
    day: mostActive.day,
    description: `할일 ${todoCount}개, 루틴 ${routineCount}개 완료`
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

