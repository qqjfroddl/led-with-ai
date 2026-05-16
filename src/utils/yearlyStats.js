// 연간 통계 계산 유틸리티
import { supabase } from '../config/supabase.js';
import { getToday } from './date.js';
import { isRoutineDue } from './routineFilter.js';

// Luxon DateTime 가져오기
function getDateTimeLib() {
  if (typeof window !== 'undefined' && window.luxon) return window.luxon.DateTime;
  if (typeof globalThis !== 'undefined' && globalThis.luxon) return globalThis.luxon.DateTime;
  throw new Error('Luxon not available');
}

/**
 * 연간 통계 조회
 * @param {number} year - 연도 (예: 2025)
 * @param {string} timezone - 타임존 (기본: Asia/Seoul)
 * @returns {Promise<Object>} 연간 통계 객체
 */
export async function getYearlyStats(year, timezone = 'Asia/Seoul') {
  const userId = (await supabase.auth.getUser()).data?.user?.id;
  
  if (!userId) {
    throw new Error('사용자가 로그인하지 않았습니다.');
  }
  
  const yearStart = `${year}-01-01`;
  const yearEnd = `${year}-12-31`;
  const today = getToday(timezone);
  const currentYear = parseInt(today.substring(0, 4));
  
  // 현재 연도인지 확인 (year === currentYear && yearStart <= today <= yearEnd)
  const isCurrentYear = year === currentYear && yearStart <= today && today <= yearEnd;
  
  // 현재 연도인 경우: 1월 1일 ~ 오늘까지를 기준으로 계산
  // 과거 연도인 경우: 전체 연도(1월 1일~12월 31일)를 기준으로 계산
  const effectiveEndDate = isCurrentYear ? today : yearEnd;
  
  // 연도의 총 일수 (전체 연도 기준)
  const totalDays = 365; // 윤년 고려하지 않음 (간단화)
  
  // 실제 계산에 사용된 일수 계산 (effectiveEndDate 기준)
  const DateTime = getDateTimeLib();
  const yearStartDt = DateTime.fromISO(yearStart).setZone(timezone);
  const effectiveEndDateDt = DateTime.fromISO(effectiveEndDate).setZone(timezone);
  const effectiveDays = effectiveEndDateDt.diff(yearStartDt, 'days').days + 1;
  
  // 병렬로 모든 데이터 조회
  const [todosStats, routinesStats, reflectionsStats, prevYearStats] = await Promise.all([
    getTodosStats(userId, yearStart, effectiveEndDate, effectiveDays),
    getRoutinesStats(userId, yearStart, effectiveEndDate, effectiveDays),
    getReflectionsStats(userId, yearStart, effectiveEndDate, effectiveDays),
    getPrevYearStats(userId, year, timezone) // 전년 통계 (비교용)
  ]);
  
  // 종합 통계 계산
  const stats = {
    year,
    yearStart,
    yearEnd,
    totalDays,
    effectiveEndDate, // 실제 계산에 사용된 종료일 (디버깅용)
    effectiveDays, // 실제 계산에 사용된 일수
    todos: todosStats,
    routines: routinesStats,
    reflections: reflectionsStats,
    comparison: calculateComparison(todosStats, routinesStats, reflectionsStats, prevYearStats),
    insights: generateInsights(todosStats, routinesStats, reflectionsStats, prevYearStats, effectiveDays)
  };
  
  return stats;
}

/**
 * 할일 통계
 * @param {string} userId - 사용자 ID
 * @param {string} yearStart - 연도 시작일 (YYYY-MM-DD)
 * @param {string} yearEnd - 연도 종료일 (YYYY-MM-DD) 또는 실제 종료일 (effectiveEndDate)
 * @param {number} totalDays - 실제 계산에 사용된 일수 (effectiveDays)
 * @returns {Promise<Object>} 할일 통계 객체
 */
export async function getTodosStats(userId, yearStart, yearEnd, totalDays) {
  const { data: todos, error } = await supabase
    .from('todos')
    .select('*')
    .eq('user_id', userId)
    .gte('date', yearStart)
    .lte('date', yearEnd)
    .is('deleted_at', null);
  
  if (error) {
    console.error('Error fetching todos:', error);
    return getEmptyTodosStats(totalDays);
  }
  
  const total = todos.length;
  const completed = todos.filter(t => t.is_done).length;
  const completionRate = total > 0 ? (completed / total) * 100 : 0;
  
  // 카테고리별 통계
  const byCategory = {
    work: { total: 0, completed: 0 },
    job: { total: 0, completed: 0 },
    self_dev: { total: 0, completed: 0 },
    personal: { total: 0, completed: 0 }
  };
  
  todos.forEach(todo => {
    if (byCategory[todo.category]) {
      byCategory[todo.category].total++;
      if (todo.is_done) {
        byCategory[todo.category].completed++;
      }
    }
  });
  
  // 카테고리별 완료율 계산
  Object.keys(byCategory).forEach(cat => {
    const catStats = byCategory[cat];
    catStats.completionRate = catStats.total > 0 
      ? (catStats.completed / catStats.total) * 100 
      : 0;
  });
  
  // 이월/포기 통계
  const carriedOver = todos.filter(t => t.carried_over_at).length;
  const skipped = todos.filter(t => t.skipped_at).length;
  
  // 월별 통계
  const monthlyStats = {};
  const DateTime = getDateTimeLib();
  
  for (let month = 1; month <= 12; month++) {
    const monthStart = `${yearStart.substring(0, 4)}-${String(month).padStart(2, '0')}-01`;
    const monthEndDate = DateTime.fromISO(monthStart).endOf('month');
    const monthEnd = monthEndDate.toISODate();
    
    const monthTodos = todos.filter(t => t.date >= monthStart && t.date <= monthEnd);
    monthlyStats[month] = {
      total: monthTodos.length,
      completed: monthTodos.filter(t => t.is_done).length
    };
  }
  
  // 평균 일일 할일 수 (실제 기간 기준)
  const avgDailyTodos = totalDays > 0 ? total / totalDays : 0;
  
  return {
    total,
    completed,
    completionRate: Math.round(completionRate * 10) / 10,
    byCategory,
    carriedOver,
    skipped,
    monthlyStats,
    avgDailyTodos: Math.round(avgDailyTodos * 10) / 10
  };
}

/**
 * 루틴 통계
 * @param {string} userId - 사용자 ID
 * @param {string} yearStart - 연도 시작일 (YYYY-MM-DD)
 * @param {string} yearEnd - 연도 종료일 (YYYY-MM-DD) 또는 실제 종료일 (effectiveEndDate)
 * @param {number} totalDays - 실제 계산에 사용된 일수 (effectiveDays)
 * @returns {Promise<Object>} 루틴 통계 객체
 */
export async function getRoutinesStats(userId, yearStart, yearEnd, totalDays) {
  // 주말 루틴 분리 토글 상태 조회
  const { data: profileRow } = await supabase
    .from('profiles')
    .select('weekend_routines_enabled')
    .eq('id', userId)
    .maybeSingle();
  const weekendEnabled = profileRow?.weekend_routines_enabled === true;

  // ✅ PRD 요구사항: is_active 조건 없이 모든 루틴 조회 (비활성화된 루틴 포함)
  const { data: routines, error: routinesError } = await supabase
    .from('routines')
    .select('*')
    .eq('user_id', userId);
  
  if (routinesError) {
    console.error('Error fetching routines:', routinesError);
    return getEmptyRoutinesStats(totalDays);
  }
  
  // 연간 루틴 로그 조회
  const { data: logs, error: logsError } = await supabase
    .from('routine_logs')
    .select('*')
    .eq('user_id', userId)
    .gte('date', yearStart)
    .lte('date', yearEnd)
    .eq('checked', true);
  
  if (logsError) {
    console.error('Error fetching routine logs:', logsError);
    return getEmptyRoutinesStats(totalDays);
  }
  
  // ✅ 날짜별로 활성 루틴 수 계산 (루틴 변경 반영)
  let totalPossibleChecks = 0;
  let morningPossible = 0;
  let nightPossible = 0;
  const monthlyStats = {}; // 월별 통계
  
  const DateTime = getDateTimeLib();
  const startDate = DateTime.fromISO(yearStart);
  const endDate = DateTime.fromISO(yearEnd);
  
  for (let dt = startDate; dt <= endDate; dt = dt.plus({ days: 1 })) {
    const dateStr = dt.toISODate();
    const month = dt.month;
    
    // 해당 날짜에 활성인 루틴 필터링
    const activeRoutines = routines.filter(r => isRoutineDue(r, dateStr, weekendEnabled));
    totalPossibleChecks += activeRoutines.length;
    
    // 월별 통계 초기화
    if (!monthlyStats[month]) {
      monthlyStats[month] = { possible: 0, checked: 0 };
    }
    monthlyStats[month].possible += activeRoutines.length;
    
    // 모닝/나이트 구분
    const morningCount = activeRoutines.filter(r => {
      const schedule = typeof r.schedule === 'string' 
        ? (() => { try { return JSON.parse(r.schedule); } catch { return r.schedule; } })()
        : r.schedule;
      return schedule?.category === 'morning';
    }).length;
    
    const nightCount = activeRoutines.filter(r => {
      const schedule = typeof r.schedule === 'string' 
        ? (() => { try { return JSON.parse(r.schedule); } catch { return r.schedule; } })()
        : r.schedule;
      return schedule?.category === 'night';
    }).length;
    
    morningPossible += morningCount;
    nightPossible += nightCount;
  }
  
  // 월별 체크 수 계산
  logs.forEach(log => {
    const logDate = DateTime.fromISO(log.date);
    const month = logDate.month;
    if (monthlyStats[month]) {
      monthlyStats[month].checked++;
    }
  });
  
  const totalChecks = logs.length;
  const practiceRate = totalPossibleChecks > 0 
    ? (totalChecks / totalPossibleChecks) * 100 
    : 0;
  
  // 모닝/나이트 개별 실천율
  const morningChecks = logs.filter(log => {
    const routine = routines.find(r => r.id === log.routine_id);
    if (!routine) return false;
    const schedule = typeof routine.schedule === 'string' 
      ? (() => { try { return JSON.parse(routine.schedule); } catch { return routine.schedule; } })()
      : routine.schedule;
    return schedule?.category === 'morning';
  }).length;
  const morningRate = morningPossible > 0 ? (morningChecks / morningPossible) * 100 : 0;
  
  const nightChecks = logs.filter(log => {
    const routine = routines.find(r => r.id === log.routine_id);
    if (!routine) return false;
    const schedule = typeof routine.schedule === 'string' 
      ? (() => { try { return JSON.parse(routine.schedule); } catch { return routine.schedule; } })()
      : routine.schedule;
    return schedule?.category === 'night';
  }).length;
  const nightRate = nightPossible > 0 ? (nightChecks / nightPossible) * 100 : 0;
  
  // 전체 루틴 수는 실제 기간 기준으로 계산 (표시용)
  const avgRoutinesPerDay = totalDays > 0 ? totalPossibleChecks / totalDays : 0;
  const avgMorningRoutines = totalDays > 0 ? morningPossible / totalDays : 0;
  const avgNightRoutines = totalDays > 0 ? nightPossible / totalDays : 0;
  
  return {
    totalRoutines: Math.round(avgRoutinesPerDay * 10) / 10,
    morningRoutines: Math.round(avgMorningRoutines * 10) / 10,
    nightRoutines: Math.round(avgNightRoutines * 10) / 10,
    totalChecks,
    totalPossibleChecks,
    practiceRate: Math.round(practiceRate * 10) / 10,
    morningRate: Math.round(morningRate * 10) / 10,
    nightRate: Math.round(nightRate * 10) / 10,
    monthlyStats
  };
}

/**
 * 성찰 통계
 * @param {string} userId - 사용자 ID
 * @param {string} yearStart - 연도 시작일 (YYYY-MM-DD)
 * @param {string} yearEnd - 연도 종료일 (YYYY-MM-DD) 또는 실제 종료일 (effectiveEndDate)
 * @param {number} totalDays - 실제 계산에 사용된 일수 (effectiveDays)
 * @returns {Promise<Object>} 성찰 통계 객체
 */
export async function getReflectionsStats(userId, yearStart, yearEnd, totalDays) {
  const { data: reflections, error } = await supabase
    .from('daily_reflections')
    .select('date')
    .eq('user_id', userId)
    .gte('date', yearStart)
    .lte('date', yearEnd);
  
  if (error) {
    console.error('Error fetching reflections:', error);
    return getEmptyReflectionsStats(totalDays);
  }
  
  const writtenDays = reflections.length;
  // 실제 기간 기준으로 계산 (yearStart ~ yearEnd)
  const writingRate = totalDays > 0 ? (writtenDays / totalDays) * 100 : 0;
  
  // 월별 통계
  const monthlyStats = {};
  const DateTime = getDateTimeLib();
  
  for (let month = 1; month <= 12; month++) {
    monthlyStats[month] = 0;
  }
  
  reflections.forEach(reflection => {
    const date = DateTime.fromISO(reflection.date);
    const month = date.month;
    if (monthlyStats[month] !== undefined) {
      monthlyStats[month]++;
    }
  });
  
  return {
    writtenDays,
    totalDays,
    writingRate: Math.round(writingRate * 10) / 10,
    monthlyStats
  };
}

/**
 * 전년 통계 (비교용)
 */
async function getPrevYearStats(userId, year, timezone) {
  const prevYear = year - 1;
  const prevYearStart = `${prevYear}-01-01`;
  const prevYearEnd = `${prevYear}-12-31`;
  const prevTotalDays = 365;
  
  const [todosStats, routinesStats, reflectionsStats] = await Promise.all([
    getTodosStats(userId, prevYearStart, prevYearEnd, prevTotalDays),
    getRoutinesStats(userId, prevYearStart, prevYearEnd, prevTotalDays),
    getReflectionsStats(userId, prevYearStart, prevYearEnd, prevTotalDays)
  ]);
  
  return {
    todos: todosStats,
    routines: routinesStats,
    reflections: reflectionsStats
  };
}

/**
 * 전년 대비 변화율 계산
 */
function calculateComparison(currentTodos, currentRoutines, currentReflections, prevYearStats) {
  if (!prevYearStats) {
    return null;
  }
  
  const prevTodos = prevYearStats.todos;
  const prevRoutines = prevYearStats.routines;
  const prevReflections = prevYearStats.reflections;
  
  return {
    todos: {
      completionRate: currentTodos.completionRate - prevTodos.completionRate,
      total: currentTodos.total - prevTodos.total
    },
    routines: {
      practiceRate: currentRoutines.practiceRate - prevRoutines.practiceRate,
      totalChecks: currentRoutines.totalChecks - prevRoutines.totalChecks
    },
    reflections: {
      writingRate: currentReflections.writingRate - prevReflections.writingRate,
      writtenDays: currentReflections.writtenDays - prevReflections.writtenDays
    }
  };
}

/**
 * 규칙 기반 인사이트 생성
 */
function generateInsights(todos, routines, reflections, prevYearStats, totalDays) {
  const insights = [];
  
  // 루틴 실천율 인사이트
  if (routines.practiceRate >= 70) {
    insights.push({
      type: 'positive',
      category: 'routines',
      message: `연간 루틴 실천율이 ${routines.practiceRate}%로 훌륭합니다! 꾸준함이 인생을 바꿉니다. 💪`
    });
  } else if (routines.practiceRate >= 50) {
    insights.push({
      type: 'neutral',
      category: 'routines',
      message: `연간 루틴 실천율이 ${routines.practiceRate}%입니다. 내년에는 5%p 더 올려보세요!`
    });
  } else {
    insights.push({
      type: 'suggestion',
      category: 'routines',
      message: `연간 루틴 실천율이 ${routines.practiceRate}%입니다. 루틴을 조금씩 줄이거나 더 쉬운 것부터 시작해보세요.`
    });
  }
  
  // 할일 완료율 인사이트
  if (todos.completionRate >= 80) {
    insights.push({
      type: 'positive',
      category: 'todos',
      message: `연간 할일 완료율이 ${todos.completionRate}%로 매우 우수합니다! 🎉`
    });
  } else if (todos.completionRate >= 60) {
    insights.push({
      type: 'neutral',
      category: 'todos',
      message: `연간 할일 완료율이 ${todos.completionRate}%로 양호합니다. 내년에는 80%를 목표로 해보세요!`
    });
  } else {
    insights.push({
      type: 'suggestion',
      category: 'todos',
      message: `연간 할일 완료율이 ${todos.completionRate}%입니다. 할일을 더 작은 단위로 나누거나 우선순위를 정해보세요.`
    });
  }
  
  // 성찰 작성 인사이트
  if (reflections.writingRate >= 85) {
    insights.push({
      type: 'positive',
      category: 'reflections',
      message: `성찰을 ${reflections.writtenDays}일 작성하셨네요! 자기 성찰이 성장의 기반입니다. ✨`
    });
  } else if (reflections.writingRate >= 50) {
    insights.push({
      type: 'neutral',
      category: 'reflections',
      message: `성찰을 ${reflections.writtenDays}일 작성하셨습니다. 매일 조금씩 기록하는 습관을 만들어보세요.`
    });
  } else {
    insights.push({
      type: 'suggestion',
      category: 'reflections',
      message: `성찰을 ${reflections.writtenDays}일 작성하셨습니다. 하루 5분만 투자해도 큰 변화가 있습니다.`
    });
  }
  
  // 전년 대비 변화
  if (prevYearStats) {
    const comparison = calculateComparison(todos, routines, reflections, prevYearStats);
    if (comparison) {
      if (Math.abs(comparison.routines.practiceRate) > 5) {
        insights.push({
          type: 'improvement',
          category: 'routines',
          message: `전년 대비 루틴 실천율이 ${comparison.routines.practiceRate > 0 ? '+' : ''}${comparison.routines.practiceRate.toFixed(1)}%p ${comparison.routines.practiceRate > 0 ? '향상' : '하락'}되었습니다! ${comparison.routines.practiceRate > 0 ? '🚀' : '📉'}`
        });
      }
      
      if (Math.abs(comparison.todos.completionRate) > 5) {
        insights.push({
          type: 'improvement',
          category: 'todos',
          message: `전년 대비 할일 완료율이 ${comparison.todos.completionRate > 0 ? '+' : ''}${comparison.todos.completionRate.toFixed(1)}%p ${comparison.todos.completionRate > 0 ? '향상' : '하락'}되었습니다! ${comparison.todos.completionRate > 0 ? '📈' : '📉'}`
        });
      }
    }
  }
  
  return insights;
}

// 빈 통계 객체 반환 함수들
function getEmptyTodosStats(totalDays) {
  return {
    total: 0,
    completed: 0,
    completionRate: 0,
    byCategory: {
      work: { total: 0, completed: 0, completionRate: 0 },
      job: { total: 0, completed: 0, completionRate: 0 },
      self_dev: { total: 0, completed: 0, completionRate: 0 },
      personal: { total: 0, completed: 0, completionRate: 0 }
    },
    carriedOver: 0,
    skipped: 0,
    monthlyStats: {},
    avgDailyTodos: 0
  };
}

function getEmptyRoutinesStats(totalDays) {
  return {
    totalRoutines: 0,
    morningRoutines: 0,
    nightRoutines: 0,
    totalChecks: 0,
    totalPossibleChecks: 0,
    practiceRate: 0,
    morningRate: 0,
    nightRate: 0,
    monthlyStats: {}
  };
}

function getEmptyReflectionsStats(totalDays) {
  return {
    writtenDays: 0,
    totalDays: totalDays,
    writingRate: 0,
    monthlyStats: {}
  };
}
















