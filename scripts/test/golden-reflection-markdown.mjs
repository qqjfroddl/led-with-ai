// 골든 테스트: 공용 reflectionMarkdown.js가 옛 AI 성찰 컴포넌트 3벌(주간·월간·연간)의 내부 함수와 같은 결과를 내는가
// 사용: node scripts/test/golden-reflection-markdown.mjs [git-ref]
// 옛 함수는 export되지 않았으므로 git에서 꺼낸 파일의 함수 본문만 잘라 평가한다.
// 의도한 차이 1건: 브라우저 밖 escapeHtml의 작은따옴표 — 옛 코드는 '&var(--t-accent);'(9/12 토큰 치환 사고), 새 코드는 '&#039;'.
import { execSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { DateTime } from 'luxon';

const ROOT = new URL('../../', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const REF = process.argv[2] || process.env.GOLDEN_REF || 'fff65d8';
const FILES = { Weekly: ' * 주차 번호 계산', Monthly: ' * 레이트리밋 사용량 조회', Yearly: ' * 레이트리밋 사용량 조회' };

// 브라우저 escapeHtml 경로(div.textContent → innerHTML)를 흉내 내는 최소 document
const fakeDocument = {
  createElement: () => {
    let t = '';
    return {
      set textContent(v) { t = String(v); },
      get innerHTML() { return t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); },
    };
  },
};

function loadOld(name) {
  const src = execSync(`git show ${REF}:src/components/${name}AIReflection.js`, { cwd: ROOT, encoding: 'utf8' }).replace(/\r\n/g, '\n');
  const a = src.indexOf('/**\n * 마크다운을 간단한 HTML로');
  const b = src.indexOf(FILES[name]) - '/**\n'.length;
  if (a < 0 || b <= a) throw new Error(`${name}: 옛 함수 구간을 못 찾음`);
  return new Function(`${src.slice(a, b)}\nreturn { convertMarkdownToHtml, escapeHtml, formatDate };`)();
}

const neu = await import(pathToFileURL(`${ROOT}/src/utils/reflectionMarkdown.js`).href);

const MD = [
  '',
  null,
  '평범한 한 줄',
  '# 제목1\n## 제목2\n### 제목3\n#### 제목4\n본문',
  '- 항목 **굵게**\n- 항목 *기울임*\n\n1. 첫째\n2. 둘째\n- 다시 목록',
  '문단 하나\n이어지는 줄\n\n새 문단',
  '<script>alert(1)</script> & "따옴표" 그리고 \'작은따옴표\'',
  '**닫히지 않은 굵게\n*혼자 별* 과 ***세 개***',
  '1) 괄호 번호\n1. 점 번호\n   - 들여쓴 목록\n* 별 목록',
  '### 이번 주 요약\r\n- 루틴 실천율 71%\r\n- 할일 25/40\r\n\r\n## 다음 주 제안\r\n1. 아침 루틴을 **10분** 앞당기기',
  '---\n> 인용\n`코드`\n\n\n\n끝',
  '# ' + '긴 '.repeat(200) + '\n' + Array.from({ length: 60 }, (_, i) => `- 줄 ${i}`).join('\n'),
];
const DATES = ['2026-09-17T00:30:00Z', '2026-09-17T15:05:00+09:00', '2026-01-01T12:00:00', '2026-12-31', '', null];
const TZ = ['Asia/Seoul', 'America/New_York'];

let pass = 0, fail = 0;
const check = (label, got, want) => {
  if (got === want) { pass++; return; }
  fail++;
  console.error(`✗ ${label}\n  want: ${String(want).slice(0, 200)}\n  got:  ${String(got).slice(0, 200)}`);
};
const quiet = (fn) => { const l = console.log, e = console.error; console.log = console.error = () => {}; try { return fn(); } finally { console.log = l; console.error = e; } };

for (const name of Object.keys(FILES)) {
  const old = loadOld(name);
  for (const withDom of [true, false]) {
    globalThis.document = withDom ? fakeDocument : undefined;
    MD.forEach((md, i) => {
      const fix = (s) => (withDom ? s : s.replaceAll('&var(--t-accent);', '&#039;'));
      check(`${name} md#${i} dom=${withDom}`, quiet(() => neu.convertMarkdownToHtml(md)), fix(quiet(() => old.convertMarkdownToHtml(md))));
      if (md) check(`${name} esc#${i} dom=${withDom}`, neu.escapeHtml(md), fix(old.escapeHtml(md)));
    });
  }
  globalThis.document = undefined;
  for (const lux of [true, false]) {
    globalThis.window = lux ? { luxon: { DateTime } } : undefined;
    for (const d of DATES) for (const tz of TZ) check(`${name} date ${d} ${tz} luxon=${lux}`, neu.formatDate(d, tz), old.formatDate(d, tz));
  }
  globalThis.window = undefined;
}
// 고친 동작 자체도 못 박는다
check('escapeHtml(브라우저 밖) 작은따옴표', neu.escapeHtml("it's"), 'it&#039;s');

console.log(`golden-reflection: ${pass} pass, ${fail} fail (ref ${REF})`);
process.exit(fail ? 1 : 0);
