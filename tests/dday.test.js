import assert from 'node:assert/strict';
import test from 'node:test';

import { DateTime } from 'luxon';

/*
 * utils/date.js 는 window.luxon 또는 globalThis.luxon 을 먼저 찾는다(CDN 우선).
 * 노드에는 window 가 없으므로 import 전에 globalThis 에 심어 준다.
 * ⚠️ import 는 호이스팅되므로 정적 import 로 가져오면 이 줄보다 먼저 실행돼 throw 한다.
 *    그래서 아래에서 동적 import 한다.
 */
globalThis.luxon = { DateTime };

const { getDDay } = await import('../src/utils/date.js');

const TZ = 'Asia/Seoul';
const today = () => DateTime.now().setZone(TZ).startOf('day');
const offset = (days) => today().plus({ days }).toISODate();

test('마감일이 미래면 남은 일수를 D-N 으로 센다', () => {
  assert.deepEqual(getDDay(offset(5), TZ), { days: 5, label: 'D-5', overdue: false });
  assert.equal(getDDay(offset(1), TZ).label, 'D-1');
});

test('오늘 마감이면 D-DAY 이고 지난 것으로 보지 않는다', () => {
  const r = getDDay(offset(0), TZ);
  assert.equal(r.days, 0);
  assert.equal(r.label, 'D-DAY');
  assert.equal(r.overdue, false);
});

test('마감일이 지났으면 D+N 이고 overdue 로 표시한다', () => {
  assert.deepEqual(getDDay(offset(-3), TZ), { days: -3, label: 'D+3', overdue: true });
});

test('값이 없거나 형식이 틀리면 null 을 준다 (호출부가 표시를 건너뛴다)', () => {
  assert.equal(getDDay(null, TZ), null);
  assert.equal(getDDay('', TZ), null);
  assert.equal(getDDay(undefined, TZ), null);
  assert.equal(getDDay('날짜아님', TZ), null);
});

test('날짜만 비교한다 — 지금 시각이 몇 시든 오늘은 D-DAY 다', () => {
  // 시각이 섞이면 "오늘 마감"이 D-DAY 와 D+1 사이를 오간다. 그 회귀를 막는 테스트다.
  const withTime = `${today().toISODate()}T00:00:00`;
  assert.equal(getDDay(withTime, TZ).label, 'D-DAY');
});
