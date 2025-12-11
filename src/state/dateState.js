// 날짜 상태 관리 (선택 날짜) - 기본 timezone: Asia/Seoul
import { getToday } from '../utils/date.js';

const STORAGE_KEY = 'app_selected_date';

function getDateTimeLib() {
  if (typeof window !== 'undefined' && window.luxon) return window.luxon.DateTime;
  if (typeof globalThis !== 'undefined' && globalThis.luxon) return globalThis.luxon.DateTime;
  throw new Error('Luxon not available');
}

export function getSelectedDate(timezone = 'Asia/Seoul') {
  const saved = (typeof localStorage !== 'undefined') ? localStorage.getItem(STORAGE_KEY) : null;
  if (saved) return saved;
  const today = getToday(timezone);
  if (typeof localStorage !== 'undefined') localStorage.setItem(STORAGE_KEY, today);
  return today;
}

export function setSelectedDate(dateStr) {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, dateStr);
  }
}

export function resetSelectedDate(timezone = 'Asia/Seoul') {
  const today = getToday(timezone);
  setSelectedDate(today);
  return today;
}

export function shiftSelectedDate(days, timezone = 'Asia/Seoul') {
  const DateTime = getDateTimeLib();
  const current = DateTime.fromISO(getSelectedDate(timezone)).setZone(timezone);
  const next = current.plus({ days });
  const iso = next.toISODate();
  setSelectedDate(iso);
  return iso;
}

export function formatSelectedDate(timezone = 'Asia/Seoul') {
  const DateTime = getDateTimeLib();
  const dt = DateTime.fromISO(getSelectedDate(timezone)).setZone(timezone);
  // ccc (Mon) → 한글 요일 매핑
  const weekdayKo = ['일', '월', '화', '수', '목', '금', '토'][dt.weekday % 7];
  return dt.toFormat("yyyy년 L월 d일") + ` (${weekdayKo})`;
}

