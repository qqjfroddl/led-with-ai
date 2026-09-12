// 템플릿 리터럴 안의 style="…" 속성을 안전하게 찾고 선언 단위로 쪼개는 도구 (P2, 2026-09-12)
// JS 소스는 HTML을 백틱 문자열로 품고 있어 style 값 안에 ${…}가 섞인다. ${…} 안의 따옴표·중괄호·세미콜론은 CSS가 아니다.

/** JS 문자열 리터럴(', ", `)을 건너뛰고 닫힌 다음 인덱스를 돌려준다 */
export function skipJsString(src, i) {
  const q = src[i];
  i++;
  while (i < src.length) {
    const c = src[i];
    if (c === '\\') { i += 2; continue; }
    if (q === '`' && c === '$' && src[i + 1] === '{') { i = skipExpr(src, i + 2); continue; }
    if (c === q) return i + 1;
    i++;
  }
  return i;
}

/** `${` 다음 위치에서 시작해 짝이 맞는 `}` 다음 인덱스를 돌려준다 */
export function skipExpr(src, i) {
  let depth = 1;
  while (i < src.length && depth > 0) {
    const c = src[i];
    if (c === "'" || c === '"' || c === '`') { i = skipJsString(src, i); continue; }
    if (c === '{') depth++;
    else if (c === '}') depth--;
    i++;
  }
  return i;
}

/** 속성값(여는 " 다음)에서 닫는 " 의 인덱스 */
export function findAttrEnd(src, start) {
  let i = start;
  while (i < src.length) {
    const c = src[i];
    if (c === '"') return i;
    if (c === '$' && src[i + 1] === '{') { i = skipExpr(src, i + 2); continue; }
    i++;
  }
  return -1;
}

/** 소스 안의 모든 style="…" 을 [{start, end, value}] 로. start는 s of style, end는 닫는 " 다음 */
export function findStyleAttrs(src) {
  const out = [];
  const re = /\bstyle="/g;
  let m;
  while ((m = re.exec(src))) {
    const vs = m.index + m[0].length;
    const ve = findAttrEnd(src, vs);
    if (ve < 0) break;
    out.push({ start: m.index, valueStart: vs, valueEnd: ve, end: ve + 1, value: src.slice(vs, ve) });
    re.lastIndex = ve + 1;
  }
  return out;
}

/** style 값을 ; 기준으로 쪼갠다. ${…} 안의 ; 는 무시. 각 조각은 {raw, prop, value, dynamic} */
export function splitDecls(value) {
  const parts = [];
  let i = 0, cur = '';
  while (i < value.length) {
    const c = value[i];
    if (c === '$' && value[i + 1] === '{') { const j = skipExpr(value, i + 2); cur += value.slice(i, j); i = j; continue; }
    if (c === ';') { parts.push(cur); cur = ''; i++; continue; }
    cur += c; i++;
  }
  if (cur.trim()) parts.push(cur);
  return parts.map((raw) => {
    const t = raw.trim();
    if (!t) return null;
    const dynamic = t.includes('${');
    const m = t.match(/^([a-zA-Z-]+)\s*:\s*([\s\S]*)$/);
    if (!m) return { raw: t, prop: null, value: null, dynamic };
    return { raw: t, prop: m[1].toLowerCase(), value: m[2].trim(), dynamic };
  }).filter(Boolean);
}

/** 속성 위치에서 같은 태그의 시작(<)을 찾는다. 못 찾으면 -1 */
export function findTagStart(src, attrStart) {
  // 뒤로 가면서 첫 '<' 를 찾되, 그 사이에 '>' 가 나오면 태그 밖이라고 본다
  let i = attrStart - 1;
  while (i >= 0) {
    const c = src[i];
    if (c === '<') return i;
    if (c === '>' ) {
      // `=>` 화살표는 태그 닫힘이 아니다
      if (src[i - 1] === '=') { i -= 2; continue; }
      return -1;
    }
    i--;
  }
  return -1;
}

/** 태그 시작 인덱스에서 태그 끝(>)의 인덱스. ${…}와 속성값 안의 > 는 건너뛴다 */
export function findTagEnd(src, tagStart) {
  let i = tagStart + 1;
  while (i < src.length) {
    const c = src[i];
    if (c === '"') { const e = findAttrEnd(src, i + 1); if (e < 0) return -1; i = e + 1; continue; }
    if (c === '$' && src[i + 1] === '{') { i = skipExpr(src, i + 2); continue; }
    if (c === '>') return i;
    i++;
  }
  return -1;
}
