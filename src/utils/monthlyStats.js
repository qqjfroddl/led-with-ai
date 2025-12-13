// 월간 통계 계산 유틸리티
import { supabase } from '../config/supabase.js';
import { getMonthStart, getMonthEnd } from './date.js';

// Luxon DateTime 가져오기
function getDateTimeLib() {
  if (typeof window !== 'undefined' && window.luxon) return window.luxon.DateTime;
  if (typeof globalThis !== 'undefined' && globalThis.luxon) return globalThis.luxon.DateTime;
  throw new Error('Luxon not available');
}

/**
 * 월간 통계 조회
 * @param {string} monthStart - 월 시작일 (YYYY-MM-01)
 * @param {string} timezone - 타임존 (기본: Asia/Seoul)
 * @returns {Promise<Object>} 월간 통계 객체
 */
export async function getMonthlyStats(monthStart, timezone = 'Asia/Seoul') {
  const monthEnd = getMonthEnd(monthStart, timezone);
  const userId = (await supabase.auth.getUser()).data?.user?.id;
  
  if (!userId) {
    throw new Error('사용자가 로그인하지 않았습니다.');
  }
  
  // 월의 일수 계산
  const DateTime = getDateTimeLib();
  const monthStartDt = DateTime.fromISO(monthStart).setZone(timezone);
  const monthEndDt = DateTime.fromISO(monthEnd).setZone(timezone);
  const totalDays = monthEndDt.day; // 28, 29, 30, 31
  
  // 병렬로 모든 데이터 조회
  const [todosStats, routinesStats, reflectionsStats, prevMonthStats] = await Promise.all([
    getTodosStats(userId, monthStart, monthEnd, totalDays),
    getRoutinesStats(userId, monthStart, monthEnd, totalDays),
    getReflectionsStats(userId, monthStart, monthEnd, totalDays),
    getPrevMonthStats(userId, monthStart, timezone) // 전월 통계 (비교용)
  ]);
  
  // 종합 통계 계산
  const stats = {
    monthStart,
    monthEnd,
    totalDays,
    todos: todosStats,
    routines: routinesStats,
    reflections: reflectionsStats,
    comparison: calculateComparison(todosStats, routinesStats, reflectionsStats, prevMonthStats),
    insights: generateInsights(todosStats, routinesStats, reflectionsStats, prevMonthStats, totalDays)
  };
  
  return stats;
}

/**
 * 할일 통계
 * @param {string} userId - 사용자 ID
 * @param {string} monthStart - 월 시작일 (YYYY-MM-01)
 * @param {string} monthEnd - 월 종료일 (YYYY-MM-DD)
 * @param {number} totalDays - 월의 총 일수
 * @returns {Promise<Object>} 할일 통계 객체
 */
export async function getTodosStats(userId, monthStart, monthEnd, totalDays) {
  const { data: todos, error } = await supabase
    .from('todos')
    .select('*')
    .eq('user_id', userId)
    .gte('date', monthStart)
    .lte('date', monthEnd)
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
  
  // 일별 통계
  const dailyStats = {};
  const DateTime = getDateTimeLib();
  const startDate = DateTime.fromISO(monthStart);
  const endDate = DateTime.fromISO(monthEnd);
  
  for (let dt = startDate; dt <= endDate; dt = dt.plus({ days: 1 })) {
    const dateStr = dt.toISODate();
    const dayTodos = todos.filter(t => t.date === dateStr);
    dailyStats[dateStr] = {
      total: dayTodos.length,
      completed: dayTodos.filter(t => t.is_done).length
    };
  }
  
  // 평균 일일 할일 수
  const avgDailyTodos = total / totalDays;
  
  return {
    total,
    completed,
    completionRate: Math.round(completionRate * 10) / 10,
    byCategory,
    carriedOver,
    skipped,
    dailyStats,
    avgDailyTodos: Math.round(avgDailyTodos * 10) / 10
  };
}

/**
 * 날짜 기준 루틴 필터링 함수 (PRD FR-C5 준수)
 * @param {Object} routine - 루틴 객체
 * @param {string} selectedDate - 선택 날짜 (YYYY-MM-DD)
 * @returns {boolean} 해당 날짜에 루틴이 활성 상태인지 여부
 */
function isRoutineDue(routine, selectedDate) {
  const schedule = typeof routine.schedule === 'string' 
    ? (() => { try { return JSON.parse(routine.schedule); } catch { return routine.schedule; } })()
    : routine.schedule;
  
  if (!schedule) return false;

  // 적용 시작일 확인
  let activeFromDate;
  if (schedule.active_from_date) {
    activeFromDate = schedule.active_from_date;
  } else if (routine.created_at) {
    // active_from_date가 없으면 created_at의 날짜 부분 사용
    activeFromDate = routine.created_at.substring(0, 10);
  } else {
    return false; // 시작일을 알 수 없으면 제외
  }

  // 비활성화일 확인
  let deletedAtDate = null;
  if (routine.deleted_at) {
    deletedAtDate = routine.deleted_at.substring(0, 10);
  }

  // 날짜 범위 체크: 적용 시작일 <= 선택 날짜 < 비활성화일
  if (selectedDate < activeFromDate) {
    return false; // 아직 적용 시작 전
  }
  if (deletedAtDate && selectedDate >= deletedAtDate) {
    return false; // 이미 비활성화됨
  }

  // 타입별 필터링
  if (schedule.type === 'daily') return true;
  
  if (schedule.type === 'weekly') {
    const today = new Date(selectedDate);
    const dayOfWeek = today.getDay(); // 0=일요일, 1=월요일...
    const adjustedDay = dayOfWeek === 0 ? 7 : dayOfWeek; // 일요일을 7로 변환
    return schedule.days?.includes(adjustedDay);
  }
  
  if (schedule.type === 'monthly') {
    const monthStart = schedule.month;
    const currentMonth = selectedDate.substring(0, 7) + '-01';
    return monthStart === currentMonth;
  }
  
  return false;
}

/**
 * 루틴 통계
 * @param {string} userId - 사용자 ID
 * @param {string} monthStart - 월 시작일 (YYYY-MM-01)
 * @param {string} monthEnd - 월 종료일 (YYYY-MM-DD)
 * @param {number} totalDays - 월의 총 일수
 * @returns {Promise<Object>} 루틴 통계 객체
 */
export async function getRoutinesStats(userId, monthStart, monthEnd, totalDays) {
  // ✅ PRD 요구사항: is_active 조건 없이 모든 루틴 조회 (비활성화된 루틴 포함)
  const { data: routines, error: routinesError } = await supabase
    .from('routines')
    .select('*')
    .eq('user_id', userId);
    // is_active 조건 제거
    // deleted_at 조건 제거 (날짜 기준으로 필터링)
  
  if (routinesError) {
    console.error('Error fetching routines:', routinesError);
    return getEmptyRoutinesStats(totalDays);
  }
  
  // 월간 루틴 로그 조회
  const { data: logs, error: logsError } = await supabase
    .from('routine_logs')
    .select('*')
    .eq('user_id', userId)
    .gte('date', monthStart)
    .lte('date', monthEnd)
    .eq('checked', true);
  
  if (logsError) {
    console.error('Error fetching routine logs:', logsError);
    return getEmptyRoutinesStats(totalDays);
  }
  
  // 루틴별 체크 수 계산
  const routineCheckCounts = {};
  logs.forEach(log => {
    routineCheckCounts[log.routine_id] = (routineCheckCounts[log.routine_id] || 0) + 1;
  });
  
  // ✅ 날짜별로 활성 루틴 수 계산 (루틴 변경 반영)
  let totalPossibleChecks = 0;
  let morningPossible = 0;
  let nightPossible = 0;
  const dailyActiveRoutines = {}; // 날짜별 활성 루틴 수
  const dailyMorningRoutines = {}; // 날짜별 모닝 루틴 수
  const dailyNightRoutines = {}; // 날짜별 나이트 루틴 수
  const routineActiveDays = {}; // 루틴별 활성 일수
  
  const DateTime = getDateTimeLib();
  const startDate = DateTime.fromISO(monthStart);
  const endDate = DateTime.fromISO(monthEnd);
  
  for (let dt = startDate; dt <= endDate; dt = dt.plus({ days: 1 })) {
    const dateStr = dt.toISODate();
    
    // 해당 날짜에 활성인 루틴 필터링
    const activeRoutines = routines.filter(r => isRoutineDue(r, dateStr));
    dailyActiveRoutines[dateStr] = activeRoutines.length;
    totalPossibleChecks += activeRoutines.length;
    
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
    
    dailyMorningRoutines[dateStr] = morningCount;
    dailyNightRoutines[dateStr] = nightCount;
    morningPossible += morningCount;
    nightPossible += nightCount;
    
    // 루틴별 활성 일수 계산
    activeRoutines.forEach(r => {
      if (!routineActiveDays[r.id]) {
        routineActiveDays[r.id] = 0;
      }
      routineActiveDays[r.id]++;
    });
  }
  
  const totalChecks = logs.length;
  const practiceRate = totalPossibleChecks > 0 
    ? (totalChecks / totalPossibleChecks) * 100 
    : 0;
  
  // 모닝/나이트 개별 실천율 (날짜별 계산된 값 사용)
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
  
  // 일별 체크 수
  const dailyChecks = {};
  for (let dt = startDate; dt <= endDate; dt = dt.plus({ days: 1 })) {
    const dateStr = dt.toISODate();
    dailyChecks[dateStr] = logs.filter(l => l.date === dateStr).length;
  }
  
  // 루틴별 실천율 (활성 일수 기준으로 계산)
  const routineRates = routines.map(routine => {
    const activeDays = routineActiveDays[routine.id] || 0;
    const checks = routineCheckCounts[routine.id] || 0;
    const rate = activeDays > 0 ? Math.round((checks / activeDays) * 100) : 0;
    return {
      id: routine.id,
      title: routine.title,
      totalChecks: checks,
      rate: rate
    };
  });
  
  // 전체 루틴 수는 월간 평균으로 계산 (표시용)
  const avgRoutinesPerDay = totalPossibleChecks / totalDays;
  const avgMorningRoutines = morningPossible / totalDays;
  const avgNightRoutines = nightPossible / totalDays;
  
  return {
    totalRoutines: Math.round(avgRoutinesPerDay * 10) / 10, // 평균 루틴 수 (소수점 첫째 자리)
    morningRoutines: Math.round(avgMorningRoutines * 10) / 10,
    nightRoutines: Math.round(avgNightRoutines * 10) / 10,
    totalChecks,
    totalPossibleChecks,
    practiceRate: Math.round(practiceRate * 10) / 10,
    morningRate: Math.round(morningRate * 10) / 10,
    nightRate: Math.round(nightRate * 10) / 10,
    dailyChecks,
    routineRates
  };
}

/**
 * 성찰 통계
 * @param {string} userId - 사용자 ID
 * @param {string} monthStart - 월 시작일 (YYYY-MM-01)
 * @param {string} monthEnd - 월 종료일 (YYYY-MM-DD)
 * @param {number} totalDays - 월의 총 일수
 * @returns {Promise<Object>} 성찰 통계 객체
 */
export async function getReflectionsStats(userId, monthStart, monthEnd, totalDays) {
  const { data: reflections, error } = await supabase
    .from('daily_reflections')
    .select('date')
    .eq('user_id', userId)
    .gte('date', monthStart)
    .lte('date', monthEnd);
  
  if (error) {
    console.error('Error fetching reflections:', error);
    return getEmptyReflectionsStats(totalDays);
  }
  
  const writtenDays = reflections.length;
  const writingRate = (writtenDays / totalDays) * 100;
  
  return {
    writtenDays,
    totalDays,
    writingRate: Math.round(writingRate * 10) / 10
  };
}

/**
 * 전월 통계 (비교용)
 */
async function getPrevMonthStats(userId, monthStart, timezone) {
  const DateTime = getDateTimeLib();
  // 전월 시작일 계산 (Luxon이 연도 경계 자동 처리)
  const prevMonthStartDt = DateTime.fromISO(monthStart).setZone(timezone).minus({ months: 1 });
  const prevMonthStart = prevMonthStartDt.startOf('month').toISODate();
  const prevMonthEnd = prevMonthStartDt.endOf('month').toISODate();
  const prevTotalDays = prevMonthStartDt.endOf('month').day;
  
  const [todosStats, routinesStats, reflectionsStats] = await Promise.all([
    getTodosStats(userId, prevMonthStart, prevMonthEnd, prevTotalDays),
    getRoutinesStats(userId, prevMonthStart, prevMonthEnd, prevTotalDays),
    getReflectionsStats(userId, prevMonthStart, prevMonthEnd, prevTotalDays)
  ]);
  
  return {
    todos: todosStats,
    routines: routinesStats,
    reflections: reflectionsStats
  };
}

/**
 * 전월 대비 변화율 계산
 */
function calculateComparison(currentTodos, currentRoutines, currentReflections, prevMonthStats) {
  if (!prevMonthStats) {
    return null;
  }
  
  const prevTodos = prevMonthStats.todos;
  const prevRoutines = prevMonthStats.routines;
  const prevReflections = prevMonthStats.reflections;
  
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
function generateInsights(todos, routines, reflections, prevMonthStats, totalDays) {
  const insights = [];
  
  // 루틴 실천율 인사이트 (먼저)
  if (routines.practiceRate >= 70) {
    insights.push({
      type: 'positive',
      category: 'routines',
      message: `루틴 실천율이 ${routines.practiceRate}%로 훌륭합니다! 꾸준함이 인생을 바꿉니다. 💪`
    });
  } else if (routines.practiceRate >= 50) {
    insights.push({
      type: 'neutral',
      category: 'routines',
      message: `루틴 실천율이 ${routines.practiceRate}%입니다. 다음 달에는 5%p 더 올려보세요!`
    });
  } else {
    insights.push({
      type: 'suggestion',
      category: 'routines',
      message: `루틴 실천율이 ${routines.practiceRate}%입니다. 루틴을 조금씩 줄이거나 더 쉬운 것부터 시작해보세요.`
    });
  }
  
  // 할일 완료율 인사이트
  if (todos.completionRate >= 80) {
    insights.push({
      type: 'positive',
      category: 'todos',
      message: `이번 달 할일 완료율이 ${todos.completionRate}%로 매우 우수합니다! 🎉`
    });
  } else if (todos.completionRate >= 60) {
    insights.push({
      type: 'neutral',
      category: 'todos',
      message: `이번 달 할일 완료율이 ${todos.completionRate}%로 양호합니다. 다음 달은 80%를 목표로 해보세요!`
    });
  } else {
    insights.push({
      type: 'suggestion',
      category: 'todos',
      message: `이번 달 할일 완료율이 ${todos.completionRate}%입니다. 할일을 더 작은 단위로 나누거나 우선순위를 정해보세요.`
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
  
  // 전월 대비 변화 (순서: 루틴 → 할일)
  if (prevMonthStats) {
    const comparison = calculateComparison(todos, routines, reflections, prevMonthStats);
    if (comparison) {
      // 루틴 변화 먼저
      if (Math.abs(comparison.routines.practiceRate) > 5) {
        insights.push({
          type: 'improvement',
          category: 'routines',
          message: `전월 대비 루틴 실천율이 ${comparison.routines.practiceRate > 0 ? '+' : ''}${comparison.routines.practiceRate.toFixed(1)}%p ${comparison.routines.practiceRate > 0 ? '향상' : '하락'}되었습니다! ${comparison.routines.practiceRate > 0 ? '🚀' : '📉'}`
        });
      }
      
      // 할일 변화
      if (Math.abs(comparison.todos.completionRate) > 5) {
        insights.push({
          type: 'improvement',
          category: 'todos',
          message: `전월 대비 할일 완료율이 ${comparison.todos.completionRate > 0 ? '+' : ''}${comparison.todos.completionRate.toFixed(1)}%p ${comparison.todos.completionRate > 0 ? '향상' : '하락'}되었습니다! ${comparison.todos.completionRate > 0 ? '📈' : '📉'}`
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
    dailyStats: {},
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
    dailyChecks: {},
    routineRates: []
  };
}

function getEmptyReflectionsStats(totalDays) {
  return {
    writtenDays: 0,
    totalDays: totalDays,
    writingRate: 0
  };
}
