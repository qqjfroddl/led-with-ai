/*
 * 오늘 할일 「영역 보기 순서」 — Work·Job·Growth·Personal 섹션을 어떤 순서로 보여줄지.
 *
 * 2026-11-16 소장님 지시: 고정 순서(Work→Job→Growth→Personal)를 드래그로 바꿀 수 있게.
 * 저장은 이 기기 브라우저(localStorage)에 한다 — 기기 간 동기화는 DB 컬럼 추가가 필요해 별도 결정 사항.
 * 화면과 분리한 순수 함수라 node --test로 검증한다.
 */

export const DEFAULT_CATEGORY_ORDER = Object.freeze(['work', 'job', 'self_dev', 'personal']);
export const CATEGORY_ORDER_STORAGE_KEY = 'led.todoCategoryOrder';

/**
 * 저장값이 무엇이든(깨진 JSON·옛 영역·중복·누락) 항상 4개 영역의 올바른 순열을 돌려준다.
 * 저장값에 있는 유효 영역을 그 순서대로 먼저 두고, 빠진 영역은 기본 순서대로 뒤에 붙인다.
 */
export function normalizeCategoryOrder(saved, defaults = DEFAULT_CATEGORY_ORDER) {
  let list = saved;
  if (typeof list === 'string') {
    try {
      list = JSON.parse(list);
    } catch {
      list = null;
    }
  }
  if (!Array.isArray(list)) list = [];

  const result = [];
  for (const category of list) {
    if (defaults.includes(category) && !result.includes(category)) result.push(category);
  }
  for (const category of defaults) {
    if (!result.includes(category)) result.push(category);
  }
  return result;
}

/** category를 toIndex 자리로 옮긴 새 배열. 범위를 벗어나면 양 끝으로 붙인다. */
export function moveCategory(order, category, toIndex) {
  const from = order.indexOf(category);
  if (from === -1) return [...order];
  const next = order.filter((c) => c !== category);
  const index = Math.max(0, Math.min(toIndex, next.length));
  next.splice(index, 0, category);
  return next;
}

export function loadCategoryOrder(storage = globalThis.localStorage) {
  try {
    return normalizeCategoryOrder(storage?.getItem(CATEGORY_ORDER_STORAGE_KEY));
  } catch {
    // 사생활 보호 모드 등에서 저장소 접근이 막혀도 기본 순서로 화면은 뜬다
    return [...DEFAULT_CATEGORY_ORDER];
  }
}

export function saveCategoryOrder(order, storage = globalThis.localStorage) {
  const normalized = normalizeCategoryOrder(order);
  try {
    storage?.setItem(CATEGORY_ORDER_STORAGE_KEY, JSON.stringify(normalized));
    return true;
  } catch {
    return false;
  }
}
