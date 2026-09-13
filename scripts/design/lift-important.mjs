// main.css의 !important 선언을 overrides 레이어로 올린다 (P2-3, 2026-09-13 장준식)
// 사용: node scripts/design/lift-important.mjs
// 배경: !important는 옛 인라인 style을 이기려고 붙었다. 인라인이 @layer inline 으로 내려온 지금은
//       레이어 순서(base < inline < overrides < theme)만으로 같은 효과가 나고, 테마가 그 위에 설 수 있다.
// 규칙: !important 선언만 잘라서 같은 셀렉터·같은 @media 로 overrides 레이어에 옮기고 !important 는 뗀다.
//       나머지 선언과 주석은 base 에 그대로 둔다. 멱등(두 번 돌려도 같다).
import { readFileSync, writeFileSync } from 'node:fs';
import postcss from 'postcss';

const ROOT = new URL('../../', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const FILE = `${ROOT}/src/styles/main.css`;
const src = readFileSync(FILE, 'utf8');
const root = postcss.parse(src);

const baseLayer = root.nodes.find((n) => n.type === 'atrule' && n.name === 'layer' && n.params === 'base');
if (!baseLayer) throw new Error('@layer base 블록이 없다');
let overrides = root.nodes.find((n) => n.type === 'atrule' && n.name === 'layer' && n.params === 'overrides');
if (!overrides) {
  overrides = postcss.atRule({ name: 'layer', params: 'overrides' });
  overrides.raws.before = '\n\n';
  root.insertAfter(baseLayer, overrides);
}

let moved = 0;
const mediaBuckets = new Map(); // media params -> atRule in overrides
function bucketFor(rule) {
  const media = rule.parent?.type === 'atrule' && rule.parent.name === 'media' ? rule.parent.params : null;
  if (!media) return overrides;
  if (!mediaBuckets.has(media)) {
    const m = postcss.atRule({ name: 'media', params: media });
    m.raws.before = '\n\n';
    overrides.append(m);
    mediaBuckets.set(media, m);
  }
  return mediaBuckets.get(media);
}

baseLayer.walkRules((rule) => {
  const imp = rule.nodes.filter((d) => d.type === 'decl' && d.important);
  if (!imp.length) return;
  const target = bucketFor(rule);
  const clone = postcss.rule({ selector: rule.selector });
  clone.raws.before = '\n';
  for (const d of imp) {
    const nd = d.clone({ important: false });
    nd.raws.before = '\n  ';
    clone.append(nd);
    d.remove();
    moved++;
  }
  target.append(clone);
  if (!rule.nodes.some((n) => n.type === 'decl')) rule.remove(); // 선언이 다 옮겨졌으면 빈 규칙은 지운다
});

// 레이어 순서 선언 갱신
root.walkAtRules('layer', (a) => {
  if (!a.nodes && /^base,/.test(a.params)) a.params = 'base, inline, overrides, theme';
});
overrides.raws.before = `\n\n/* ============================================================
   overrides 레이어 — 옛 !important 선언 ${moved}개를 옮긴 곳 (scripts/design/lift-important.mjs).
   대부분 모바일에서 옛 인라인 레이아웃을 덮던 규칙. inline 위·theme 아래라 !important 없이 같은 효과.
   ============================================================ */\n`;

let out = root.toString();
out = out.replace(/\n{3,}/g, '\n\n');
writeFileSync(FILE, out);
console.log(`moved ${moved} declarations; !important left: ${(out.match(/!important/g) || []).length}`);
