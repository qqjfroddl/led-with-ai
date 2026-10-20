import assert from 'node:assert/strict';
import test from 'node:test';

import {
  LIMITS,
  isLikelyGoogleEmail,
  normalizeRequest,
  signupStatusOf,
  validateRequest
} from '../src/utils/accessRequest.js';

test('입력 정리: 앞뒤 공백·이메일 대문자·이름 연속 공백', () => {
  const r = normalizeRequest({ name: '  홍   길동 ', google_email: ' Hong@Gmail.COM ', motivation: '\n교육 때 듣고 \n' });
  assert.deepEqual(r, { name: '홍 길동', google_email: 'hong@gmail.com', motivation: '교육 때 듣고' });
});

test('정상 입력은 통과', () => {
  const r = normalizeRequest({ name: '홍길동', google_email: 'hong@gmail.com', motivation: '교육참석 때 듣고 사용하고 싶어서' });
  assert.deepEqual(validateRequest(r), {});
});

test('빈칸·공백만 있는 입력은 세 칸 모두 막는다', () => {
  const errors = validateRequest(normalizeRequest({ name: '   ', google_email: ' ', motivation: '\n\n' }));
  assert.deepEqual(Object.keys(errors).sort(), ['google_email', 'motivation', 'name']);
});

test('틀릴 수 있는 이메일 형태를 막는다', () => {
  for (const email of ['hong', 'hong@', '@gmail.com', 'hong@gmail', 'hong @gmail.com', 'hong@@gmail.com', 'a@b@c.com']) {
    const errors = validateRequest(normalizeRequest({ name: 'a', google_email: email, motivation: 'b' }));
    assert.ok(errors.google_email, `${email}은 막혀야 한다`);
  }
});

test('길이 상한은 DB 제약과 같다', () => {
  const ok = validateRequest({ name: 'a'.repeat(LIMITS.name), google_email: 'a@b.co', motivation: 'm'.repeat(LIMITS.motivation) });
  assert.deepEqual(ok, {});
  const over = validateRequest({ name: 'a'.repeat(LIMITS.name + 1), google_email: 'a@b.co', motivation: 'm'.repeat(LIMITS.motivation + 1) });
  assert.ok(over.name && over.motivation);
});

test('워크스페이스 메일은 막지 않고 지메일만 확인 표시', () => {
  assert.equal(isLikelyGoogleEmail('hong@gmail.com'), true);
  assert.equal(isLikelyGoogleEmail('hong@company.co.kr'), false);
  const errors = validateRequest(normalizeRequest({ name: 'a', google_email: 'hong@company.co.kr', motivation: 'b' }));
  assert.deepEqual(errors, {});
});

test('가입 상태: 프로필 이메일 대소문자와 무관하게 맞춘다', () => {
  const profiles = [
    { email: 'Hong@Gmail.com', status: 'approved' },
    { email: 'kim@gmail.com', status: 'pending' },
    { email: 'lee@gmail.com', status: 'rejected' }
  ];
  assert.equal(signupStatusOf('hong@gmail.com', profiles).key, 'approved');
  assert.equal(signupStatusOf('kim@gmail.com', profiles).key, 'pending');
  assert.equal(signupStatusOf('lee@gmail.com', profiles).label, '재신청 대기');
  assert.equal(signupStatusOf('park@gmail.com', profiles).key, 'none');
  assert.equal(signupStatusOf('park@gmail.com', [{ email: null, status: 'approved' }]).key, 'none');
});
