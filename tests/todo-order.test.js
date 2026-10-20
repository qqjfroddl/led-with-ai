import assert from 'node:assert/strict';
import test from 'node:test';

import { topDisplayOrder } from '../src/utils/todoOrder.js';

test('새 할일은 가장 작은 순서값보다 10 앞에 선다', () => {
  assert.equal(topDisplayOrder([30, 10, 20]), 0);
  assert.equal(topDisplayOrder([0]), -10);
  assert.equal(topDisplayOrder([-10, 40]), -20);
});

test('순서값이 없거나 전부 NULL이면 0 — NULL보다 앞선다', () => {
  assert.equal(topDisplayOrder([]), 0);
  assert.equal(topDisplayOrder([null, undefined]), 0);
  assert.equal(topDisplayOrder(), 0);
});

test('NULL이 섞여 있어도 정수만 본다', () => {
  assert.equal(topDisplayOrder([null, 50, null]), 40);
});
