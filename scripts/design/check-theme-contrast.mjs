// 테마별 글자 대비 검사 (2026-09-13) — paper.css의 토큰 블록을 읽어 WCAG 대비를 계산한다.
// 사용: node scripts/design/check-theme-contrast.mjs   (종료코드 1 = 기준 미달 있음)
// 기준: 본문 글자(text·text2) 4.5 이상, 보조 글자(muted) 4.5, 3차 글자(muted2) 3, 포인트색 위 글자(on-accent) 4.5,
//       잉크 면 위 글자(on-ink) 4.5, 상태색을 글자로 쓰는 곳(success·danger·warn·insight·accent 위 surface) 3 이상
import { readFileSync } from 'node:fs';

const ROOT = new URL('../../', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const css = readFileSync(`${ROOT}/src/styles/paper.css`, 'utf8');

function blockTokens(selectorRe) {
  const m = css.match(new RegExp(selectorRe.source + '\\s*\\{([\\s\\S]*?)\\}'));
  if (!m) throw new Error('블록을 못 찾음: ' + selectorRe);
  const out = {};
  for (const d of m[1].matchAll(/--t-([a-z0-9-]+):\s*([^;]+);/g)) out[d[1]] = d[2].trim();
  return out;
}
const base = blockTokens(/:root/);
const themes = {
  paper: base,
  warm: { ...base, ...blockTokens(/html\[data-theme="warm"\]/) },
  white: { ...base, ...blockTokens(/html\[data-theme="white"\]/) },
  night: { ...base, ...blockTokens(/html\[data-theme="night"\],\s*html\[data-theme="auto"\]\.is-dark/) },
};

const lum = (hex) => {
  const h = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a, b) => { const [x, y] = [lum(a), lum(b)]; return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
const resolve = (t, name) => { let v = t[name]; const m = v?.match(/^var\(--t-([a-z0-9-]+)\)$/); return m ? resolve(t, m[1]) : v; };

const CHECKS = [
  ['text', 'surface', 4.5], ['text', 'bg', 4.5], ['text2', 'surface', 4.5], ['muted', 'surface', 4.5], ['muted2', 'surface', 3],
  ['on-accent', 'accent', 4.5], ['on-ink', 'text', 4.5], ['accent', 'surface', 3], ['accent2', 'surface', 3],
  ['success', 'surface', 3], ['danger', 'surface', 3], ['warn', 'surface', 3], ['insight', 'surface', 3],
  ['chart-routine', 'surface', 3], ['chart-todo', 'surface', 3],
  ['accent', 'accent-soft', 3], ['danger', 'danger-soft', 3], ['success', 'success-soft', 3], ['warn', 'warn-soft', 3], ['insight', 'insight-soft', 3],
];
let fail = 0;
for (const [name, t] of Object.entries(themes)) {
  const rows = CHECKS.map(([fg, bg, min]) => {
    const c = contrast(resolve(t, fg), resolve(t, bg));
    const ok = c >= min;
    if (!ok) fail++;
    return `${ok ? '  ' : '✗ '}${fg} / ${bg}: ${c.toFixed(2)} (≥${min})`;
  });
  console.log(`\n[${name}]`);
  console.log(rows.filter((r) => r.startsWith('✗')).join('\n') || '  전 항목 통과');
}
console.log(`\ncontrast: ${fail ? fail + '건 미달' : '전 테마 통과'}`);
process.exit(fail ? 1 : 0);
