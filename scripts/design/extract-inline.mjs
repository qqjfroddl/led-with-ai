// 인라인 style="…" → 유틸리티 클래스 추출 (P2-2, 2026-09-12 장준식)
// 사용: node scripts/design/extract-inline.mjs [--dry]
// 규칙
//  - 정적 선언(prop: value)은 선언 하나 = 클래스 하나로 뺀다. 이름은 속성 약어 + 값 슬러그(예: d-flex, gap-0_5rem, c-accent)
//  - ${…}가 들어간 선언(상태값: width %, display 토글, 동적 색)은 인라인에 남긴다
//  - 정적 삼항 `${cond ? 'a: b; …' : '…'}` 는 클래스 삼항으로 바꾼다
//  - onmouseover/onmouseout 의 this.style.x='…' 는 :hover 유틸리티로 옮긴다 (onmouseout이 기본값 복원일 때만)
//  - 같은 style 안에서 longhand가 shorthand 앞에 있으면 longhand는 버린다(원래도 shorthand가 덮었다)
// 결과: src/styles/utilities.css (자동 생성, 손으로 고치지 않는다) + JS 템플릿의 class 속성
import { readFileSync, writeFileSync, globSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { findStyleAttrs, findAttrEnd, findTagStart, findTagEnd, splitDecls, skipExpr } from './lib.mjs';

const DRY = process.argv.includes('--dry');
const ROOT = new URL('../../', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const files = globSync('src/**/*.js', { cwd: ROOT }).filter((f) => !/vendor\.js|toast\.js/.test(f));

const ABBR = {
  display: 'd', 'align-items': 'ai', 'justify-content': 'jc', 'align-self': 'as', 'align-content': 'ac', 'justify-items': 'ji',
  'flex-direction': 'fd', flex: 'fx', 'flex-shrink': 'fs', 'flex-grow': 'fg', 'flex-wrap': 'fwrap', 'flex-basis': 'fb', order: 'ord',
  gap: 'gap', 'row-gap': 'rgap', 'column-gap': 'cgap',
  margin: 'm', 'margin-top': 'mt', 'margin-bottom': 'mb', 'margin-left': 'ml', 'margin-right': 'mr',
  padding: 'p', 'padding-top': 'pt', 'padding-bottom': 'pb', 'padding-left': 'pl', 'padding-right': 'pr',
  width: 'w', height: 'h', 'min-width': 'minw', 'max-width': 'maxw', 'min-height': 'minh', 'max-height': 'maxh',
  'font-size': 'fz', 'font-weight': 'fwt', 'font-family': 'ff', 'font-style': 'fst', 'line-height': 'lh', 'letter-spacing': 'ls',
  color: 'c', background: 'bg', 'background-color': 'bgc',
  border: 'bd', 'border-top': 'bdt', 'border-bottom': 'bdb', 'border-left': 'bdl', 'border-right': 'bdr', 'border-color': 'bdc', 'border-width': 'bdw', 'border-style': 'bds', 'border-radius': 'br',
  'box-shadow': 'sh', cursor: 'cur', 'text-align': 'ta', 'text-decoration': 'td', 'text-transform': 'tt', 'text-overflow': 'to', 'white-space': 'ws', 'word-break': 'wb', 'overflow-wrap': 'ow',
  opacity: 'op', overflow: 'ov', 'overflow-x': 'ovx', 'overflow-y': 'ovy', position: 'pos', top: 't', left: 'l', right: 'r', bottom: 'b', 'z-index': 'z',
  transition: 'tr', transform: 'tf', 'stroke-width': 'sw', 'grid-template-columns': 'gtc', 'grid-template-rows': 'gtr', 'grid-column': 'gc', 'grid-row': 'gr',
  resize: 'rs', outline: 'ol', 'list-style': 'lst', 'vertical-align': 'va', 'object-fit': 'of', 'user-select': 'us', 'pointer-events': 'pe', visibility: 'vis',
  'backdrop-filter': 'bf', filter: 'flt', 'accent-color': 'acc', 'scroll-behavior': 'sb', 'text-underline-offset': 'tuo', 'box-sizing': 'bs', float: 'fl', clear: 'cl',
  'line-clamp': 'lc', '-webkit-line-clamp': 'lc', '-webkit-box-orient': 'wbo', 'aspect-ratio': 'ar', 'place-items': 'pi', 'animation': 'an', 'content': 'ct', 'inset': 'ins',
  'border-collapse': 'bc', 'table-layout': 'tl', 'appearance': 'ap', '-webkit-appearance': 'ap', 'font-variant-numeric': 'fvn', 'text-indent': 'ti', 'tab-size': 'ts',
};
const SHORTHANDS = ['margin', 'padding', 'border', 'border-top', 'border-bottom', 'border-left', 'border-right', 'background', 'flex', 'font', 'grid', 'overflow', 'outline', 'transition', 'gap', 'inset', 'list-style', 'animation', 'place-items', 'text-decoration', 'border-radius'];

function slug(value) {
  let v = value.trim().toLowerCase();
  v = v.replace(/var\(--t-([a-z0-9-]+)\)/g, '$1'); // 토큰은 이름만
  v = v.replace(/\s*,\s*/g, '_').replace(/\s+/g, '-');
  v = v.replace(/[()]/g, '').replace(/%/g, 'pct').replace(/\./g, '_').replace(/#/g, '').replace(/\//g, '_').replace(/['"]/g, '').replace(/!/g, '');
  v = v.replace(/[^a-z0-9_-]/g, '');
  return v || 'x';
}

const utilities = new Map(); // className -> {prop, value, hover}
const nameOf = new Map();    // `${hover?'h:':''}${prop}:${value}` -> className
function classFor(prop, value, hover = false) {
  const key = `${hover ? 'h:' : ''}${prop}:${value}`;
  if (nameOf.has(key)) return nameOf.get(key);
  const abbr = ABBR[prop] || prop;
  let name = `${hover ? 'hov-' : ''}${abbr}-${slug(value)}`;
  if (name.length > 48) name = name.slice(0, 40) + '-' + createHash('md5').update(key).digest('hex').slice(0, 5);
  if (/^[0-9]/.test(name)) name = 'u-' + name;
  if (utilities.has(name)) name = name + '-' + createHash('md5').update(key).digest('hex').slice(0, 4);
  utilities.set(name, { prop, value, hover });
  nameOf.set(key, name);
  return name;
}

/** 정적 선언 목록 → 클래스 목록 (중복·longhand 정리 포함) */
function classesForDecls(decls) {
  const kept = [];
  decls.forEach((d, i) => {
    if (decls.slice(i + 1).some((e) => e.prop === d.prop)) return; // 같은 속성 중복: 뒤가 이긴다
    if (decls.slice(i + 1).some((e) => SHORTHANDS.includes(e.prop) && d.prop.startsWith(e.prop + '-'))) return; // longhand 뒤에 shorthand
    kept.push(d);
  });
  return kept.map((d) => classFor(d.prop, d.value.replace(/\s+/g, ' ')));
}

function parseStaticCss(str) {
  if (!str.trim()) return [];
  const decls = splitDecls(str);
  if (decls.some((d) => d.dynamic || !d.prop)) return null;
  return decls;
}

/** `${cond ? 'css' : 'css'}` 조각을 클래스 삼항으로. 못 바꾸면 null */
function ternaryToClasses(raw) {
  // 조건식에 ? } $ 따옴표가 있으면 중첩·연속 삼항이라 손대지 않는다 (2026-09-12 1차 실행에서 P3 태그·완료 취소선이 깨졌던 원인)
  const m = raw.match(/^\$\{([^?}'"`$]+?)\s*\?\s*(['"])((?:(?!\2)[^{}$])*)\2\s*:\s*(['"])((?:(?!\4)[^{}$])*)\4\s*\}$/);
  if (!m) return null;
  const a = parseStaticCss(m[3]); const b = parseStaticCss(m[5]);
  if (!a || !b) return null;
  const ca = classesForDecls(a).join(' '); const cb = classesForDecls(b).join(' ');
  return `\${${m[1]} ? '${ca}' : '${cb}'}`;
}

const report = { files: {}, unmergedTags: [], hoverLeft: [], dynamicLeft: 0, ternaries: 0, styleAttrs: 0, removedStyleAttrs: 0 };

function processFile(rel) {
  const p = `${ROOT}/${rel}`;
  let src = readFileSync(p, 'utf8');
  const attrs = findStyleAttrs(src);
  report.styleAttrs += attrs.length;
  // 뒤에서부터 바꿔야 인덱스가 안 밀린다
  for (const a of [...attrs].reverse()) {
    const decls = splitDecls(a.value);
    const staticDecls = decls.filter((d) => d.prop && !d.dynamic);
    const dynamicDecls = [];
    const classExprs = [];
    for (const d of decls) {
      if (d.prop && !d.dynamic) continue;
      if (!d.prop && d.raw.startsWith('${')) {
        const t = ternaryToClasses(d.raw);
        if (t) { classExprs.push(t); report.ternaries++; continue; }
      }
      dynamicDecls.push(d.raw);
    }
    const classes = classesForDecls(staticDecls);

    // hover 핸들러 (같은 태그 안)
    const tagStart = findTagStart(src, a.start);
    const tagEnd = tagStart >= 0 ? findTagEnd(src, tagStart) : -1;
    let tag = tagStart >= 0 && tagEnd >= 0 ? src.slice(tagStart, tagEnd + 1) : null;
    let hoverClasses = [];
    let newTag = null;
    if (tag) {
      const over = tag.match(/\s+onmouseover="([^"]*)"/);
      const out = tag.match(/\s+onmouseout="([^"]*)"/);
      if (over) {
        const pairs = [...over[1].matchAll(/this\.style\.([a-zA-Z]+)\s*=\s*'([^']*)'/g)].map((m) => [m[1].replace(/[A-Z]/g, (c) => '-' + c.toLowerCase()), m[2]]);
        const outPairs = out ? [...out[1].matchAll(/this\.style\.([a-zA-Z]+)\s*=\s*'([^']*)'/g)].map((m) => [m[1].replace(/[A-Z]/g, (c) => '-' + c.toLowerCase()), m[2]]) : [];
        const base = Object.fromEntries(staticDecls.map((d) => [d.prop, d.value.replace(/\s+/g, ' ')]));
        const norm = (v) => v.trim().replace(/\s+/g, ' ');
        const outOk = outPairs.every(([k, v]) => {
          const bv = base[k] ?? (k === 'border-color' ? (base.border || '').split(' ').slice(2).join(' ') : undefined);
          return v === '' || v === 'none' || (bv !== undefined && norm(bv) === norm(v)) || (k === 'background' && (v === 'transparent' || v === 'none') && !base.background) || (k === 'transform' && v === 'none');
        });
        const overHasOnlyStyle = /^(\s*this\.style\.[a-zA-Z]+\s*=\s*'[^']*';?\s*)+$/.test(over[1]);
        if (pairs.length && outOk && overHasOnlyStyle && (!out || /^(\s*this\.style\.[a-zA-Z]+\s*=\s*'[^']*';?\s*)+$/.test(out[1]))) {
          hoverClasses = pairs.map(([k, v]) => classFor(k, v, true));
          newTag = tag.replace(over[0], '');
          if (out) newTag = newTag.replace(out[0], '');
        } else {
          report.hoverLeft.push(`${rel}: ${over[1].slice(0, 60)}`);
        }
      }
    }

    const allClasses = [...classes, ...hoverClasses].join(' ') + (classExprs.length ? ' ' + classExprs.join(' ') : '');
    const restStyle = dynamicDecls.map((s) => s.trim()).filter(Boolean).join('; ');
    if (restStyle) report.dynamicLeft++; else report.removedStyleAttrs++;

    if (!tag) {
      report.unmergedTags.push(`${rel}: ${a.value.slice(0, 60)}`);
      continue;
    }
    // 태그 안에서 style 속성을 교체하고 class 속성에 합친다
    const t = newTag ?? tag;
    const localStyle = a.start - tagStart;
    const styleAttrText = src.slice(a.start, a.end);
    let styleIdx = t.indexOf(styleAttrText, Math.max(0, localStyle - (tag.length - t.length)));
    if (styleIdx < 0) styleIdx = t.indexOf(styleAttrText);
    let rebuilt = t.slice(0, styleIdx) + (restStyle ? `style="${restStyle}${a.value.trim().endsWith(';') ? ';' : ''}"` : '') + t.slice(styleIdx + styleAttrText.length);
    rebuilt = rebuilt.replace(/\s{2,}(?=[a-zA-Z-]+=|>|\/>)/g, ' ').replace(/\s+>/g, '>');
    const cm = rebuilt.match(/\bclass="/);
    if (allClasses.trim()) {
      if (cm) {
        const vs = cm.index + cm[0].length;
        const ve = findAttrEnd(rebuilt, vs);
        const cur = rebuilt.slice(vs, ve);
        const sep = cur.trim() ? (/\s$/.test(cur) ? '' : ' ') : '';
        rebuilt = rebuilt.slice(0, vs) + cur + sep + allClasses.trim() + rebuilt.slice(ve);
      } else {
        // 태그 이름 바로 뒤에 class 속성 삽입
        rebuilt = rebuilt.replace(/^(<[a-zA-Z][\w-]*)/, `$1 class="${allClasses.trim()}"`);
      }
    }
    src = src.slice(0, tagStart) + rebuilt + src.slice(tagEnd + 1);
  }
  report.files[rel] = attrs.length;
  if (!DRY) writeFileSync(p, src);
}

for (const rel of files) processFile(rel);

// utilities.css 생성: shorthand → longhand 순서 보장, 나머지는 이름순
const order = (prop) => { const i = SHORTHANDS.indexOf(prop); return i >= 0 ? i : 100; };
const rows = [...utilities.entries()].sort((x, y) => {
  const [ax, ay] = [x[1], y[1]];
  if (ax.hover !== ay.hover) return ax.hover ? 1 : -1;
  const ox = order(ax.prop), oy = order(ay.prop);
  if (ox !== oy) return ox - oy;
  if (ax.prop !== ay.prop) return ax.prop < ay.prop ? -1 : 1;
  return x[0] < y[0] ? -1 : 1;
});
const esc = (n) => n.replace(/([^a-zA-Z0-9_-])/g, '\\$1');
const css = `/* ============================================================
   유틸리티 클래스 — scripts/design/extract-inline.mjs 가 만든 파일. 손으로 고치지 않는다.
   JS 템플릿의 인라인 style 선언 하나가 클래스 하나다. 이름 = 속성 약어 + 값 슬러그.
   우선순위: @layer base(main.css) < inline(이 파일) < theme(paper.css). 인라인이 base를 이기던 관계를 레이어로 보존한다.
   ${rows.length}개 · 생성 ${new Date().toISOString().slice(0, 10)}
   ============================================================ */
@layer inline {
${rows.map(([n, u]) => `.${esc(n)}${u.hover ? ':hover' : ''} { ${u.prop}: ${u.value}; }`).join('\n')}
}
`;
if (!DRY) writeFileSync(`${ROOT}/src/styles/utilities.css`, css);

console.log(`style attrs: ${report.styleAttrs}, fully removed: ${report.removedStyleAttrs}, left with dynamic decls: ${report.dynamicLeft}, ternaries→class: ${report.ternaries}`);
console.log(`utilities: ${rows.length} (hover ${rows.filter((r) => r[1].hover).length})${DRY ? ' (dry)' : ''}`);
console.log(`unmerged tags: ${report.unmergedTags.length}`); report.unmergedTags.forEach((s) => console.log('  ' + s));
console.log(`hover handlers left: ${report.hoverLeft.length}`); report.hoverLeft.forEach((s) => console.log('  ' + s));
