import assert from 'node:assert/strict';
import test from 'node:test';

import {
  DEFAULT_CATEGORY_ORDER,
  CATEGORY_ORDER_STORAGE_KEY,
  normalizeCategoryOrder,
  moveCategory,
  loadCategoryOrder,
  saveCategoryOrder,
} from '../src/utils/categoryOrder.js';

function memoryStorage(initial = {}) {
  const data = { ...initial };
  return {
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => { data[k] = String(v); },
    data,
  };
}

test('저장값이 없으면 기본 순서 Work→Job→Growth→Personal', () => {
  assert.deepEqual(normalizeCategoryOrder(null), ['work', 'job', 'self_dev', 'personal']);
  assert.deepEqual(normalizeCategoryOrder(undefined), [...DEFAULT_CATEGORY_ORDER]);
});

test('깨진 JSON·배열 아닌 값은 기본 순서로', () => {
  assert.deepEqual(normalizeCategoryOrder('{oops'), [...DEFAULT_CATEGORY_ORDER]);
  assert.deepEqual(normalizeCategoryOrder('"work"'), [...DEFAULT_CATEGORY_ORDER]);
});

test('저장 순서를 지키고, 모르는 영역·중복은 버리고, 빠진 영역은 기본 순서로 뒤에 붙인다', () => {
  assert.deepEqual(
    normalizeCategoryOrder(JSON.stringify(['personal', 'job'])),
    ['personal', 'job', 'work', 'self_dev'],
  );
  assert.deepEqual(
    normalizeCategoryOrder(['job', 'growth', 'job', 'self_dev']),
    ['job', 'self_dev', 'work', 'personal'],
  );
});

test('moveCategory — 위·아래·양 끝 밖으로 옮기기', () => {
  const base = [...DEFAULT_CATEGORY_ORDER];
  assert.deepEqual(moveCategory(base, 'personal', 0), ['personal', 'work', 'job', 'self_dev']);
  assert.deepEqual(moveCategory(base, 'work', 3), ['job', 'self_dev', 'personal', 'work']);
  assert.deepEqual(moveCategory(base, 'job', -5), ['job', 'work', 'self_dev', 'personal']);
  assert.deepEqual(moveCategory(base, 'job', 99), ['work', 'self_dev', 'personal', 'job']);
  assert.deepEqual(moveCategory(base, 'nope', 0), base);
  assert.deepEqual(base, [...DEFAULT_CATEGORY_ORDER], '원본 배열은 바꾸지 않는다');
});

test('저장 → 불러오기 왕복', () => {
  const storage = memoryStorage();
  assert.equal(saveCategoryOrder(['self_dev', 'work', 'job', 'personal'], storage), true);
  assert.equal(storage.data[CATEGORY_ORDER_STORAGE_KEY], '["self_dev","work","job","personal"]');
  assert.deepEqual(loadCategoryOrder(storage), ['self_dev', 'work', 'job', 'personal']);
});

test('저장소 접근이 막혀도 기본 순서·false로 버틴다', () => {
  const broken = {
    getItem: () => { throw new Error('blocked'); },
    setItem: () => { throw new Error('blocked'); },
  };
  assert.deepEqual(loadCategoryOrder(broken), [...DEFAULT_CATEGORY_ORDER]);
  assert.equal(saveCategoryOrder(['job'], broken), false);
});
