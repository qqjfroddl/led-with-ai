// CSS 파일(main.css·admin.css)의 색을 종이 토큰으로 (P2-1 보조, 2026-09-12)
// 사용: node scripts/design/apply-tokens-css.mjs <파일…>
// 선언 단위로 mapValue를 적용한다. 토큰 정의(--t-*) 줄은 건드리지 않는다.
import { readFileSync, writeFileSync } from 'node:fs';
import { mapValue } from './tokens.mjs';

for (const p of process.argv.slice(2)) {
  const src = readFileSync(p, 'utf8');
  let n = 0;
  const out = src.replace(/(^|[{;\n])(\s*)([a-zA-Z-]+)\s*:\s*([^;{}]+?)(\s*)(?=;|\n|})/g, (m, pre, ws, prop, value, tail) => {
    if (prop.startsWith('--t-')) return m; // 토큰 정의
    if (/^(src|content|font-family|grid-template-areas)$/.test(prop)) return m;
    const v = mapValue(value, prop.startsWith('--') ? 'background' : prop);
    if (v !== value) n++;
    return `${pre}${ws}${prop}: ${v}${tail}`;
  });
  writeFileSync(p, out);
  const left = (out.match(/#[0-9a-fA-F]{6}\b/g) || []).filter((h) => !/^#(4285f4|34a853|fbbc05|ea4335)$/i.test(h));
  console.log(`${p}: ${n} declarations mapped, hex left ${left.length}${left.length ? ' → ' + [...new Set(left)].join(' ') : ''}`);
}
