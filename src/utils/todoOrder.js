// 할일 순서값(display_order) 계산
// 화면은 display_order 오름차순이고 NULL은 맨 뒤다(today.js loadTodos).
// 새로 추가한 할일은 맨 위에 보여야 하므로(2026-10-21 소장님 지시),
// 같은 날짜·영역에서 가장 작은 순서값보다 10 작은 값을 준다.
// 드래그 정렬이 다시 10, 20, 30…으로 매기므로 0·음수가 잠시 생겨도 문제없다.

export const ORDER_STEP = 10;

export function topDisplayOrder(existingOrders = []) {
  const orders = existingOrders.filter((value) => Number.isInteger(value));
  // 순서값이 하나도 없으면(전부 NULL) 아무 정수나 NULL보다 앞선다
  if (orders.length === 0) return 0;
  return Math.min(...orders) - ORDER_STEP;
}
