// 색 → 종이저널 토큰 매핑표 (P2, 2026-09-12 장준식)
// 옛 팔레트(Tailwind 계열 indigo/teal/purple/gray…)를 paper.css의 --t-* 토큰으로 치환할 때 쓴다.
// 원칙: 색의 "역할"로 옮긴다. 인디고·틸(할일·루틴·버튼) → accent(남색), 퍼플(성찰·성장) → accent2(자두색),
//        에메랄드 → success, 레드 → danger, 앰버 → warn, 카테고리 4색은 종이 톤의 cat-* 로.
//        회색 7단계 → text/text2/muted/muted2/line/line2/bg2.

const T = (name) => `var(--t-${name})`;

// 6자리 hex(소문자) → 토큰. 3자리는 확장해서 찾는다.
export const HEX = {
  // 잉크(글자)
  '#111827': 'text', '#1f2937': 'text', '#000000': 'text',
  '#374151': 'text2', '#4b5563': 'text2',
  '#6b7280': 'muted',
  '#9ca3af': 'muted2',
  // 괘선·바탕
  '#d1d5db': 'line2', '#dddddd': 'line2', '#cbd5e1': 'line2',
  '#e5e7eb': 'line', '#e2e8f0': 'line',
  '#f3f4f6': 'bg2', '#f5f5f5': 'bg2',
  '#f9fafb': 'bg', '#f8fafc': 'bg',
  '#ffffff': 'surface',
  // accent(남색): 인디고·블루·틸
  '#6366f1': 'accent', '#4f46e5': 'accent', '#4338ca': 'accent', '#5b5fc7': 'accent',
  '#3b82f6': 'accent', '#2563eb': 'accent', '#1e40af': 'accent', '#003399': 'accent',
  '#14b8a6': 'accent', '#0f766e': 'accent',
  '#e0e7ff': 'accent-soft', '#eef2ff': 'accent-soft', '#dbeafe': 'accent-soft', '#e0f2fe': 'accent-soft', '#e8ebfa': 'accent-soft',
  '#c7d2fe': 'accent-line', '#a5b4fc': 'accent-line',
  // accent2(자두색): 퍼플 — 성찰·성장
  '#a78bfa': 'accent2', '#8b5cf6': 'accent2', '#7c3aed': 'accent2', '#c084fc': 'accent2',
  '#9b8cd9': 'accent2', '#8678c7': 'accent2', '#6b21a8': 'accent2', '#9284be': 'accent2',
  '#f5f3ff': 'accent2-soft', '#f3e8ff': 'accent2-soft', '#f0e7ff': 'accent2-soft', '#f4e9ff': 'accent2-soft', '#ede9fe': 'accent2-soft',
  '#d8c7ff': 'accent2-line', '#c4b5fd': 'accent2-line', '#d8b4fe': 'accent2-line',
  // success(에메랄드)
  '#10b981': 'success', '#059669': 'success', '#16a34a': 'success', '#166534': 'success', '#22c55e': 'success',
  '#d1fae5': 'success-soft', '#f0fdf4': 'success-soft', '#e0f7f4': 'success-soft',
  '#86efac': 'success-line',
  // danger(레드)
  '#ef4444': 'danger', '#dc2626': 'danger', '#991b1b': 'danger', '#b91c1c': 'danger',
  '#fee2e2': 'danger-soft', '#fef2f2': 'danger-soft',
  '#fecaca': 'danger-line',
  // insight(테라코타): 리뷰 페이지 '분석' 섹션의 정체성 색 — 옛 산호색 #f87171은 오류가 아니라 이 역할이었다
  '#f87171': 'insight',
  // warn(앰버)
  '#f59e0b': 'warn', '#ffc107': 'warn', '#92400e': 'warn', '#856404': 'warn', '#d97706': 'warn',
  '#fef3c7': 'warn-soft', '#fff3cd': 'warn-soft',
  '#fde68a': 'warn-line',
  // 카테고리 4색
  '#fb923c': 'cat-work', '#f59e42': 'cat-work', '#e8922e': 'cat-work',
  '#fff7e6': 'cat-work-soft', '#f5d38f': 'cat-work-line',
  '#22d3ee': 'cat-job', '#06b6d4': 'cat-job', '#22c7dd': 'cat-job', '#1aacbe': 'cat-job', '#80e2e2': 'cat-job-line',
  '#e7f8ff': 'cat-job-soft', '#b5e6ff': 'cat-job-line',
  '#ec4899': 'cat-personal', '#f472b6': 'cat-personal', '#e66ba4': 'cat-personal', '#d65590': 'cat-personal',
  '#fce7f3': 'cat-personal-soft', '#ffe9f0': 'cat-personal-soft', '#f8c7d6': 'cat-personal-line',
};

// 치환하지 않는 hex (브랜드 로고 등)
export const KEEP_HEX = new Set(['#4285f4', '#34a853', '#fbbc05', '#ea4335']);

// rgba(r, g, b, a)의 RGB → 색 계열
const RGB_FAMILY = {
  '99,102,241': 'accent', '91,95,199': 'accent', '59,130,246': 'accent', '20,184,166': 'accent',
  '167,139,250': 'accent2', '155,140,217': 'accent2',
  '248,113,113': 'insight', '239,68,68': 'danger',
  '34,211,238': 'cat-job', '34,199,221': 'cat-job',
  '251,146,60': 'cat-work', '245,158,66': 'cat-work',
  '244,114,182': 'cat-personal', '230,107,164': 'cat-personal',
  '16,185,129': 'success',
};
const INK = '42,38,34'; // 종이 위 그림자·반투명은 검정이 아니라 잉크색으로

export function expandHex(h) {
  h = h.toLowerCase();
  if (h.length === 4) return '#' + h[1] + h[1] + h[2] + h[2] + h[3] + h[3];
  return h;
}

/** hex 하나를 토큰 var()로. 모르는 색이면 null */
export function mapHex(h) {
  const x = expandHex(h);
  if (KEEP_HEX.has(x)) return h;
  const t = HEX[x];
  return t ? T(t) : null;
}

/** rgba(...)를 문맥(property)에 맞게. 검정·슬레이트 반투명은 잉크색 반투명으로, 유채색 반투명은 계열의 soft/line 토큰으로 */
export function mapRgba(rgba, prop = '') {
  const m = rgba.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+))?\s*\)/);
  if (!m) return rgba;
  const key = `${m[1]},${m[2]},${m[3]}`;
  const a = m[4] ?? '1';
  if (key === '0,0,0' || key === '15,23,42' || key === '31,41,55') return `rgba(${INK}, ${a})`;
  if (key === '255,255,255') return rgba;
  const fam = RGB_FAMILY[key];
  if (!fam) return rgba;
  const p = prop.toLowerCase();
  if (p.startsWith('border') || p === 'outline') return T(`${fam}-line`);
  if (p.includes('shadow')) return `rgba(${INK}, ${Math.min(0.18, Number(a) * 0.5).toFixed(2).replace(/0+$/, '')})`;
  return T(`${fam}-soft`); // background 등
}

/** linear-gradient(...)는 종이 디자인에서 단색으로. 첫 유채색 정지점의 계열을 따른다 */
export function mapGradient(g) {
  if (/transparent/.test(g)) return T('line'); // 구분선용 페이드
  const hexes = g.match(/#[0-9a-fA-F]{3,6}\b/g) || [];
  for (const h of hexes) {
    const t = mapHex(h);
    if (t) return t;
  }
  return null;
}

/** 값 문자열 안의 색을 전부 치환 (선언 단위) */
export function mapValue(value, prop = '') {
  let v = value;
  v = v.replace(/linear-gradient\([^()]*(?:\([^()]*\)[^()]*)*\)/g, (g) => mapGradient(g) ?? g);
  v = v.replace(/rgba?\([^)]*\)/g, (r) => mapRgba(r, prop));
  v = v.replace(/(?<![\w-])#[0-9a-fA-F]{3,6}(?![\w-])/g, (h) => mapHex(h) ?? h);
  if (/^(background|background-color)$/.test(prop) && /^\s*white\s*$/.test(v)) v = T('surface');
  // 유채색 그림자 잔재: box-shadow 값에 토큰이 남았으면 종이 그림자로
  if (prop === 'box-shadow' && /var\(--t-(accent|accent2|success|danger|warn|cat)/.test(v)) v = T('shadow');
  return v;
}

/** 토큰 이름 목록 (paper.css에 정의돼 있어야 하는 것) */
export const TOKEN_NAMES = [...new Set(Object.values(HEX))].sort();
