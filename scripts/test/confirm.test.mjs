// 확인창 문구 분리 단위 테스트 (2026-09-13)
// 사용: node scripts/test/confirm.test.mjs
// 확인: 기존 confirm 문구 27개의 형태(한 문장 · 문장 두 개 · 빈 줄 문단 · ⚠️ 접두)가 제목·본문으로 어떻게 나뉘는가
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';

const ROOT = new URL('../../', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const { splitMessage, confirmDialog } = await import(pathToFileURL(`${ROOT}/src/utils/confirm.js`).href);

let n = 0;
const t = (name, fn) => { fn(); n++; console.log('✓', name); };

t('한 문장이면 제목만', () => {
  assert.deepEqual(splitMessage('이 할일을 삭제하시겠습니까?'), { title: '이 할일을 삭제하시겠습니까?', body: '' });
});
t('문장 두 개면 첫 문장이 제목, 뒤가 본문', () => {
  assert.deepEqual(splitMessage('이 프로젝트를 삭제하시겠습니까? 연결된 할일도 함께 삭제됩니다.'),
    { title: '이 프로젝트를 삭제하시겠습니까?', body: '연결된 할일도 함께 삭제됩니다.' });
  assert.deepEqual(splitMessage('현재 입력된 계획이 있습니다. 덮어쓰시겠습니까?'),
    { title: '현재 입력된 계획이 있습니다.', body: '덮어쓰시겠습니까?' });
});
t('빈 줄 문단이면 첫 문단이 제목, 나머지가 본문(문단 사이 빈 줄 유지)', () => {
  assert.deepEqual(splitMessage('AI가 이번 주 활동을 분석하여 성찰을 생성합니다.\n\n계속하시겠습니까?'),
    { title: 'AI가 이번 주 활동을 분석하여 성찰을 생성합니다.', body: '계속하시겠습니까?' });
  const r = splitMessage('이미 이번 달 루틴이 5개 있습니다.\n\n기존 루틴을 삭제하고 8월 루틴 7개를 복사하시겠습니까?\n\n(오늘부터 적용됩니다)');
  assert.equal(r.title, '이미 이번 달 루틴이 5개 있습니다.');
  assert.equal(r.body, '기존 루틴을 삭제하고 8월 루틴 7개를 복사하시겠습니까?\n\n(오늘부터 적용됩니다)');
});
t('⚠️ 이모지는 뗀다(아이콘이 대신)', () => {
  assert.equal(splitMessage('⚠️ 2026년 목표가 이미 있습니다.\n\n⚠️ 기존 목표는 복구할 수 없습니다.').body, '기존 목표는 복구할 수 없습니다.');
});
t('title을 주면 문구 전체가 본문', () => {
  assert.deepEqual(splitMessage('연결된 할일도 함께 삭제됩니다.', '프로젝트 삭제'), { title: '프로젝트 삭제', body: '연결된 할일도 함께 삭제됩니다.' });
});
t('소수점·URL 같은 마침표는 문장 끝으로 안 본다(뒤에 공백이 있어야 자른다)', () => {
  assert.equal(splitMessage('버전 1.2를 적용하시겠습니까?').title, '버전 1.2를 적용하시겠습니까?');
});
t('document 없는 환경(node)에서는 false로 끝난다 — 서버 사이드에서 죽지 않게', async () => {
  const v = await confirmDialog('아무거나');
  assert.equal(v, false);
});

console.log(`confirm: ${n} tests passed`);
