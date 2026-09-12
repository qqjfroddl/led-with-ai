// hex·rgba·gradient → 종이 토큰 치환 (P2-1, 2026-09-12 장준식)
// 사용: node scripts/design/apply-tokens.mjs [--dry]
// ① style="…" 안은 선언(property) 문맥을 보고 치환한다 (border → -line, background → -soft, box-shadow → 잉크 그림자)
// ② 그 밖의 JS 문자열(색 상수·cssText·onmouseover)은 문맥이 없으므로 hex 표 + 같은 줄의 단서(shadow/border)로 치환한다
// 남는 색은 마지막에 목록으로 출력한다 — 표에 없는 색은 손으로 판단한다.
import { readFileSync, writeFileSync } from 'node:fs';
import { globSync } from 'node:fs';
import { findStyleAttrs, splitDecls } from './lib.mjs';
import { mapValue, mapHex, mapGradient, mapRgba, expandHex } from './tokens.mjs';

const DRY = process.argv.includes('--dry');
const ROOT = new URL('../../', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const files = globSync('src/**/*.js', { cwd: ROOT }).filter((f) => !/vendor\.js|toast\.js/.test(f));

let total = 0;
const leftovers = [];

function mapStyleValue(value) {
  // 선언 단위 치환 후 원래 구분자로 다시 잇는다 (동적 조각은 그대로)
  const decls = splitDecls(value);
  return decls.map((d) => {
    if (d.dynamic || !d.prop) return mapJsText(d.raw); // ${…} 조각 안의 JS 문자열도 문맥 없는 치환
    return `${d.prop}: ${mapValue(d.value, d.prop)}`;
  }).join('; ') + (value.trim().endsWith(';') ? ';' : '');
}

function mapJsText(text) {
  // 문맥 없는 구간: 줄 단위로 단서를 본다
  return text.split('\n').map((line) => {
    if (!/#[0-9a-fA-F]{3,6}\b|rgba?\(|linear-gradient\(/.test(line)) return line;
    const prop = /shadow/i.test(line) ? 'box-shadow' : /border/i.test(line) ? 'border' : /background|bg\b|bg:/i.test(line) ? 'background' : '';
    let l = line.replace(/linear-gradient\([^()]*(?:\([^()]*\)[^()]*)*\)/g, (g) => mapGradient(g) ?? g);
    l = l.replace(/rgba?\([^)]*\)/g, (r) => mapRgba(r, prop));
    l = l.replace(/(?<![\w-])#[0-9a-fA-F]{3,6}(?![\w-])/g, (h) => mapHex(h) ?? h);
    return l;
  }).join('\n');
}

for (const rel of files) {
  const p = `${ROOT}/${rel}`;
  const src = readFileSync(p, 'utf8');
  const attrs = findStyleAttrs(src);
  let out = '';
  let cursor = 0;
  for (const a of attrs) {
    out += mapJsText(src.slice(cursor, a.valueStart));
    out += mapStyleValue(a.value);
    cursor = a.valueEnd;
  }
  out += mapJsText(src.slice(cursor));
  if (out !== src) {
    const before = (src.match(/#[0-9a-fA-F]{6}\b/g) || []).length;
    const after = (out.match(/#[0-9a-fA-F]{6}\b/g) || []).length;
    total += before - after;
    console.log(`${rel}: hex ${before} → ${after}`);
    if (!DRY) writeFileSync(p, out);
  }
  const rest = out.split('\n').flatMap((line, i) => (line.match(/(?<![\w-])#[0-9a-fA-F]{3,6}(?![\w-])/g) || []).map((h) => `${rel}:${i + 1} ${expandHex(h)}`));
  leftovers.push(...rest);
}
console.log(`\nreplaced ${total} hex${DRY ? ' (dry)' : ''}`);
console.log(`leftover hex: ${leftovers.length}`);
for (const l of leftovers) console.log('  ' + l);
