// CDN 방식: window.luxon 사용
// Vite 방식: import 사용
let DateTime;

// CDN 글로벌 우선 사용 (top-level await 제거)
if (typeof window !== 'undefined' && window.luxon) {
  DateTime = window.luxon.DateTime;
} else if (typeof globalThis !== 'undefined' && globalThis.luxon) {
  DateTime = globalThis.luxon.DateTime;
} else {
  throw new Error('Luxon not available. Please load CDN (window.luxon) or use Vite.');
}

/**
 * 사용자 타임존 기준 오늘 날짜 (YYYY-MM-DD)
 */
export function getToday(timezone = 'Asia/Seoul') {
  return DateTime.now().setZone(timezone).toISODate();
}

/**
 * 사용자 타임존 기준 어제 날짜 (YYYY-MM-DD)
 */
export function getYesterday(timezone = 'Asia/Seoul') {
  return DateTime.now().setZone(timezone).minus({ days: 1 }).toISODate();
}

/**
 * 주의 시작일 (월요일) 계산
 * @param {string} date - 기준 날짜 (YYYY-MM-DD)
 * @returns {string} 월요일 날짜 (YYYY-MM-DD)
 */
export function getWeekStart(date, timezone = 'Asia/Seoul') {
  const dt = DateTime.fromISO(date).setZone(timezone);
  const monday = dt.startOf('week');
  return monday.toISODate();
}

/**
 * 주의 종료일 (일요일) 계산
 * @param {string} date - 기준 날짜 (YYYY-MM-DD)
 * @returns {string} 일요일 날짜 (YYYY-MM-DD)
 */
export function getWeekEnd(date, timezone = 'Asia/Seoul') {
  const weekStart = getWeekStart(date, timezone);
  const dt = DateTime.fromISO(weekStart).setZone(timezone);
  return dt.plus({ days: 6 }).toISODate();
}

/**
 * 월의 시작일 (YYYY-MM-01) 계산
 * @param {string} date - 기준 날짜 (YYYY-MM-DD)
 * @returns {string} 월 시작일 (YYYY-MM-01)
 */
export function getMonthStart(date, timezone = 'Asia/Seoul') {
  const dt = DateTime.fromISO(date).setZone(timezone);
  return dt.startOf('month').toISODate();
}

/**
 * 주차 키 생성 (예: 2025-W49)
 */
export function getWeekKey(date, timezone = 'Asia/Seoul') {
  const dt = DateTime.fromISO(date).setZone(timezone);
  return dt.toFormat('yyyy-\'W\'WW');
}

/**
 * 월 키 생성 (예: 2025-12)
 */
export function getMonthKey(date, timezone = 'Asia/Seoul') {
  const dt = DateTime.fromISO(date).setZone(timezone);
  return dt.toFormat('yyyy-MM');
}

