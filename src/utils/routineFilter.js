// 루틴이 특정 날짜에 노출되어야 하는지 판단하는 공통 유틸
// today.js / weeklyStats / monthlyStats / yearlyStats 에서 공유

function parseSchedule(routine) {
  return typeof routine.schedule === 'string'
    ? (() => { try { return JSON.parse(routine.schedule); } catch { return routine.schedule; } })()
    : routine.schedule;
}

function isWeekendDate(dateStr) {
  const d = new Date(dateStr);
  const day = d.getDay(); // 0=Sun, 6=Sat
  return day === 0 || day === 6;
}

/**
 * 루틴이 selectedDate에 노출 대상인지 판단
 * @param {Object} routine - routines 테이블의 row
 * @param {string} selectedDate - 'YYYY-MM-DD'
 * @param {boolean} weekendEnabled - 사용자의 weekend_routines_enabled 토글 상태
 *   - false (기본): day_type 무시 + weekend 타입은 숨김 (weekday/all_days는 매일 노출)
 *   - true: 엄격 필터 (weekday는 월~금, weekend는 토~일, day_type 없으면 매일)
 */
export function isRoutineDue(routine, selectedDate, weekendEnabled = false) {
  const schedule = parseSchedule(routine);
  if (!schedule) return false;

  // 적용 시작일
  let activeFromDate;
  if (schedule.active_from_date) {
    activeFromDate = schedule.active_from_date;
  } else if (routine.created_at) {
    activeFromDate = routine.created_at.substring(0, 10);
  } else {
    return false;
  }

  // 비활성화일
  let deletedAtDate = null;
  if (routine.deleted_at) {
    deletedAtDate = routine.deleted_at.substring(0, 10);
  }

  if (activeFromDate > selectedDate) return false;
  if (deletedAtDate && deletedAtDate <= selectedDate) return false;

  // type별 1차 필터
  let typeMatches = false;
  if (schedule.type === 'daily') {
    typeMatches = true;
  } else if (schedule.type === 'weekly') {
    const d = new Date(selectedDate);
    const dayOfWeek = d.getDay();
    const adjustedDay = dayOfWeek === 0 ? 7 : dayOfWeek;
    typeMatches = !!schedule.days?.includes(adjustedDay);
  } else if (schedule.type === 'monthly') {
    const monthStart = schedule.month;
    const currentMonth = selectedDate.substring(0, 7) + '-01';
    typeMatches = monthStart === currentMonth;
  }
  if (!typeMatches) return false;

  // day_type 필터 (주말 루틴 분리)
  const dayType = schedule.day_type;
  if (weekendEnabled) {
    if (dayType === 'weekday' && isWeekendDate(selectedDate)) return false;
    if (dayType === 'weekend' && !isWeekendDate(selectedDate)) return false;
  } else {
    if (dayType === 'weekend') return false;
  }

  return true;
}
