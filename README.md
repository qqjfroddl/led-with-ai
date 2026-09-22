# LED with AI

AI-powered daily planning app for seamless planning across devices.

> **Plan - Do - See**: 연간 목표부터 일일 할일까지, AI와 함께하는 체계적인 계획 관리

## 설정 방법

> ⚠️ 정적 서버(Live Server 등)로는 더 이상 실행되지 않는다. 외부 라이브러리(luxon·flatpickr·lucide)를
> 2026-09-07부터 CDN이 아니라 번들에 포함하므로(`src/vendor.js`) 반드시 Vite로 실행·빌드한다.

### Vite 개발 서버 사용

1. 의존성 설치
```bash
npm install
```

2. 환경 변수 설정
`.env.local` 파일 생성:
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

3. Supabase 데이터베이스 스키마 적용
`supabase/schema.sql` 파일의 SQL을 Supabase SQL Editor에서 실행

4. 개발 서버 실행
```bash
npm run dev
```

5. 브라우저에서 `http://localhost:3000/index.html` 접속

## 빌드

```bash
npm run build
```

## 주요 기능

### 📱 PC/모바일 완벽 동기화
- Supabase 기반 실시간 데이터 동기화
- 어디서든 동일한 경험

### 🤖 AI 기능
- **AI 주간/월간/연간 성찰**: Google Gemini로 자동 생성 (v4 - 헤딩 레벨로 명확한 위계 구조)
- **AI 월간 실천계획 제안**: 연간 목표 기반 구체적인 실행 계획
- **AI 연간 목표 피드백**: SMART 기준 개선 제안

### ✅ 계획 (Plan)
- 연간 목표 (3영역: 자기계발/관계/업무재정) + **작년 목표 복사**
- 월간 실천계획 + 월말 결과
- 월간 데일리 루틴 + **전월 루틴 복사**
- 프로젝트 관리 (진행중/완료)
- 반복업무 관리

### 🎯 실행 (Do)
- 오늘 할일 (4개 카테고리, 수동 순서 변경)
- 오늘 루틴 (모닝/나이트 구분)
- 하루 성찰 (4항목: 감사/잘한 일/아쉬운 일/다짐)

### 📊 리뷰 (See)
- 주간/월간/연간 리포트 (통계 + AI 성찰)
- 루틴 실천율, 할일 완료율, 성찰 작성률

### 🔐 보안
- Google OAuth 인증
- 사용자 승인 시스템
- Row Level Security (RLS)

## 스타일 구조 (2026-09-12 P2, 종이저널 디자인)

- **토큰**: 색은 전부 `src/styles/paper.css`의 `--t-*` 변수다 (accent 남색 · accent2 자두색 · success/danger/warn/insight · cat-work/job/growth/personal · text/muted/line/bg/surface). **JS나 CSS에 hex를 새로 쓰지 않는다.** 테마 교체 = paper.css 교체.
- **테마 4벌 + 기기 설정 따르기** (`src/theme.js`, 2026-09-13 소장님 결정): 종이저널(기본)·따뜻한 종이·흰 종이·밤의 종이. `<html data-theme="…">` 속성 하나로 paper.css의 토큰 블록이 바뀐다. 헤더 팔레트 버튼으로 고르고 `localStorage 'led-theme'`에 기기별 저장, `index.html` 머리의 인라인 스크립트가 CSS보다 먼저 속성을 걸어 첫 화면 깜빡임을 막는다. `auto`는 기기가 밤 모드일 때 `is-dark` 클래스로 밤의 종이를 켠다. 포인트색·잉크색 면 위 글자는 `--t-on-accent`/`--t-on-ink`를 쓴다(밤에는 어두운 글자). 검사: `node scripts/design/check-theme-contrast.mjs`(테마별 글자 대비), 차트색은 dataviz 검증기. 용량: gzip 기준 CSS +0.9KB, JS +1.3KB.
- **형태 토큰** (2026-09-13 소장님 결정 ㄴ): 테마는 색만이 아니라 형태도 바꾼다 — `--t-radius-lg/nav/btn/input/check`, `--t-input-border/bg`, `--t-tab-*`. 종이저널=둥근 사각 체크·10px 버튼·밑줄 탭, 따뜻한 종이=원형 체크·알약 버튼·알약 탭(활성은 잉크 채움), 흰 종이=원형 체크·12px 버튼·납작한 입력칸. 구조(마크업·규칙)는 한 벌이고 값만 바뀐다. 체크박스는 네이티브 대신 `appearance: none`으로 직접 그린다(accent-color로는 모양을 못 바꾼다). 4안 하단 탭·5안 링 같은 구조 차이는 넣지 않는다.
- **알림·확인창**: `alert()`는 `src/utils/toast.js`(토스트, 137곳 대체), `confirm()`은 `src/utils/confirm.js`(2026-09-13, 27곳 대체)로 쓴다. 브라우저 기본 창은 테마를 못 따르고 폰에서 시스템 창으로 떠서 쓰지 않는다. 확인창은 `<dialog>.showModal()` 기반(포커스 가둠·Esc·배경 클릭=취소), `await confirmDialog(문구, { confirmText, danger })`가 boolean을 돌려준다. 문구는 빈 줄 문단 또는 첫 문장이 제목, 나머지가 본문. 되돌릴 수 없는 일(삭제·제외·덮어쓰기)은 `danger: true` — 확인 버튼이 붉어지고 초기 포커스가 취소에 간다. 관리자 화면(admin.html)도 paper.css를 읽으므로 테마·토큰이 같이 적용된다.
- **레이어**: `@layer base, inline, theme` — base(main.css·admin.css) < inline(utilities.css) < theme(paper.css). 옛 인라인 style이 base를 이기던 관계를 레이어로 보존했고, 테마는 `!important` 없이 그 위에 선다.
- **utilities.css는 생성 파일이다.** `scripts/design/extract-inline.mjs`가 JS 템플릿의 `style="…"`을 선언 하나 = 클래스 하나(`d-flex`, `gap-0_5rem`, `c-accent`)로 뽑아 만든다. 손으로 고치지 않는다. 새 화면을 만들 때는 유틸리티 클래스나 main.css의 컴포넌트 클래스를 쓰고, 상태값(진행률 width, 토글 display)만 인라인에 남긴다.
- **스크립트** (`scripts/design/`): `tokens.mjs` 매핑표 · `apply-tokens.mjs` JS 색 치환 · `apply-tokens-css.mjs` CSS 색 치환 · `extract-inline.mjs` 인라인 추출. 셋 다 재실행 가능(멱등).
- **레이어 overrides**: 옛 `!important`(모바일 레이아웃이 인라인을 덮던 것)는 `@layer overrides`(inline 위·theme 아래)로 옮겨 없앴다(`scripts/design/lift-important.mjs`). **`!important`를 새로 쓰지 않는다.** 표시/숨김 같은 상태는 인라인 `display`가 아니라 클래스(`is-hidden`)로 토글한다 — 인라인은 모든 레이어를 이겨 반응형 규칙과 싸운다.
- **리뷰 컴포넌트**: 주간·월간·연간 지표는 `components/PeriodStats.js`(`renderPeriodStats(stats, 'week'|'month'|'year')`), 주간·월간 분석은 `components/PeriodInsights.js`(`'week'|'month'`) 하나씩이다. 연간 분석(`YearlyInsights.js`)은 월별 요약 구조가 달라 따로 둔다. 바꿀 때는 `node scripts/test/golden-period-components.mjs`로 옛 산출물과 같은 HTML인지 확인한다(로그인 없이 리뷰 컴포넌트를 검증하는 방법).
- **기간 리듬 차트** (`components/PeriodChart.js`, 2026-09-13): 리뷰 지표 카드 안에 주간 요일별·월간 주차별·연간 월별 달성률 막대(루틴 실천율·할일 완료율, 성찰 작성 점). 재료는 통계 유틸이 이미 계산하는 `dailyStats`·`dailyChecks`·`dailyPossible`·`writtenDates`·`monthlyStats`라 조회가 늘지 않는다. 막대색 `--t-chart-routine`/`--t-chart-todo`는 dataviz 검증기(색각 이상 분리·명도·채도)를 통과한 값 — 잉크 토큰을 막대에 쓰지 않는다. 테스트 `node scripts/test/period-chart.test.mjs`.
- **프로필 세션 캐시** (`utils/auth.js`, 2026-09-13 P0-3): `getCurrentProfile()`은 60초 안에 다시 부르면 서버에 묻지 않는다. 로그인·로그아웃 이벤트와 `signOut()`에서 `invalidateProfileCache()`로 비운다. 강제 재조회는 `getCurrentProfile({ fresh: true })`. 오늘 화면 초기 로드(루틴·할일·성찰)는 `Promise.all`로 동시에 부른다.
- **마우스 올림(hover)** (2026-09-17): `onmouseover`/`onmouseout`은 0곳이다 — 인라인으로 색을 되돌리면 테마를 못 따른다(밤의 종이에서 흰 판이 떴다). paper.css의 클래스를 쓴다: 기간 선택 목록 `period-option` + 선택 `is-selected`, 배경 `hover-bg`, 떠오름 `hover-lift`/`hover-lift-sm`/`hover-nudge`(움직임 줄이기 설정이면 멈춤), 요일 칸 `day-checkbox-label`. JS에서 글자색을 넣을 때도 `'white'`가 아니라 `var(--t-on-accent)`.
- **기간 선택기** (`WeekSelector`·`MonthSelector`·`YearSelector`): 날짜 계산(주차 번호·이전/다음 값)은 파일마다 다르므로 각자 두고, 버튼·모달·옵션 연결은 `components/periodSelectorBinding.js` 하나다. 검증 `node scripts/test/golden-selector-binding.mjs`(헤드리스 Edge로 옛 코드와 같은 클릭 시나리오 비교).
- **AI 성찰 공용** (`utils/reflectionMarkdown.js`): 주간·월간·연간 AI 성찰의 마크다운→HTML·이스케이프·생성일 포맷. 검증 `node scripts/test/golden-reflection-markdown.mjs`. 조회·생성 버튼 연결은 기간마다 테이블·문구가 달라 각 컴포넌트에 남겼다.
- **테스트는 하나씩, 종료코드로 판단한다** — `| tail`로 묶으면 실패가 묻힌다: `confirm.test` · `period-chart.test` · `golden-period-components` · `golden-reflection-markdown` · `golden-selector-binding`.
- **남은 것**: 상태값 인라인 63곳.

## 외부 API와 MCP (2026-09-23)

소장님 **본인 계정** 기록을 클로드 코드·디스코드 봇에서 조회·추가·수정하는 통로다.
앱 화면과 같은 규칙(루틴 요일 판정·프로젝트 할일 동기화·이월)을 서버에서 재현한다.

```
클로드 코드 / 디스코드 봇
   └─ mcp/server.js (stdio, 도구 12개)
        └─ HTTPS + Bearer 토큰 → /api/v1/* (Vercel 함수)
             └─ PostgREST (서버 비밀키, user_id 필터 강제) → Supabase
```

| 경로 | 하는 일 |
|---|---|
| `GET /api/v1/day?date=` | 하루의 할일(영역별)·해당 루틴·일일 성찰 |
| `GET /api/v1/todos?from=&to=&status=open|done|all&q=` | 할일 찾기 (최대 200건) |
| `POST /api/v1/todos` | 할일 추가 `{title, category, date?, memo?, due_date?}` |
| `PATCH /api/v1/todos/:id` | 제목·메모·영역·마감일·고정·완료 |
| `POST /api/v1/todos/:id/carry-over` | 이월 `{to_date?}` |
| `POST /api/v1/todos/:id/skip` | 포기 |
| `GET /api/v1/routines?date=` | 루틴 목록 |
| `POST /api/v1/routines/:id/check` | 루틴 체크 `{date?, checked}` |
| `PUT /api/v1/reflections/:date` | 성찰 저장 (보낸 칸만) |
| `GET /api/v1/projects` | 프로젝트와 하위 할일 |
| `GET /api/v1/week?start=` | 7일 요약 (기본 이번 주 월요일) |
| `GET /api/health` | 설정 점검 (인증 없음, 값은 싣지 않음) |

**환경변수 (Vercel, 서버 전용)**

| 이름 | 값 |
|---|---|
| `SUPABASE_URL` · `SUPABASE_SECRET_KEY` | 신청자 알림과 공용 (이미 있음) |
| `LED_API_TOKEN_SHA256` | `scripts/led-api/new-token.mjs`가 보여주는 64자리 해시 — **토큰 원문 아님** |
| `LED_API_USER_EMAIL` | 조작할 앱 계정의 로그인 이메일 |

바꾼 뒤에는 **재배포해야 반영된다.** 토큰 원문은 각 기기 `~/.secrets/led-api-token`에만 둔다.

**기술 결정과 이유**

- **토큰 테이블 대신 환경변수 해시** — 사용자가 소장님 한 분이라 DB 스키마를 바꿀 이유가 없다.
  여러 사용자에게 열 때는 토큰 테이블로 옮긴다.
- **서버 비밀키 + user_id 강제 필터** — RLS를 우회하는 키이므로, PostgREST 호출을
  `api/_lib/led-store.js` 한 곳에 모으고 모든 요청에 `user_id=eq.<소유자>`를 붙인다.
  `tests/led-api.test.js`의 `assertAllScoped`가 필터 누락을 잡는다. **이 파일 밖에서 DB를 부르지 않는다.**
- **삭제 API 없음** — 되돌릴 수 없는 조작은 앱 화면에서만.
- **토큰은 헤더로만** — 쿼리스트링 토큰은 로그·히스토리에 남는다.
- **업무 규칙 이중화 주의** — `api/_lib/led-rules.js`와 `src/pages/today.js`는 같은 규칙을 따로 갖고 있다.
  루틴 판정·이월 규칙을 바꾸면 **둘 다** 고친다.

소장님 직접 작업(환경변수 입력·재배포)은 [`docs/led-api-연결하기.md`](docs/led-api-연결하기.md).

**MCP 설치 (기기마다)**

```bash
cd mcp && npm install
node ../scripts/led-api/new-token.mjs      # 첫 기기에서만. 다른 기기는 토큰 파일을 복사
claude mcp add led --scope user -- node <이 저장소 경로>/mcp/server.js
```

테스트: 루트에서 `npm test` (API 단위 + MCP 끝단). `mcp/e2e.test.js`는 `mcp/node_modules`가 있어야 돈다.

## 기술 스택

- **프론트엔드**: HTML, CSS, JavaScript (Vite)
- **백엔드**: Supabase
  - PostgreSQL (데이터베이스)
  - Auth (Google OAuth)
  - Edge Functions (AI 통합)
  - Row Level Security (RLS)
- **AI**: Google Gemini API
- **배포**: Vercel

## 배포하기

### Vercel 배포

1. **GitHub 저장소 연결**
   - Vercel 대시보드에서 "Import Project"
   - `led-with-ai` 저장소 선택

2. **환경 변수 설정**
   ```
   VITE_SUPABASE_URL=https://xxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJ...
   ```

3. **빌드 설정** (자동 감지됨)
   - Framework: Vite
   - Build Command: `npm run build`
   - Output Directory: `dist`

4. **Deploy 클릭!**

### Supabase Edge Functions 배포

```bash
# Supabase CLI 로그인
supabase login

# Edge Functions 배포
supabase functions deploy ai-weekly-reflection
supabase functions deploy ai-monthly-reflection
supabase functions deploy ai-yearly-reflection
supabase functions deploy ai-monthly-plan
supabase functions deploy ai-yearly-goal-feedback

# 환경 변수 설정 (Gemini API Key)
supabase secrets set GEMINI_API_KEY=your_gemini_api_key
```

## 버전 정보

- **현재 버전**: v1.2.1 (개발 중)
- **안정 버전**: v1.2 (2025-01-31 릴리즈)
- **저장소**: https://github.com/qqjfroddl/led-with-ai

## 변경 이력

자세한 변경 이력은 [CHANGELOG.md](./CHANGELOG.md)를 참고하세요.

### v1.2.1 (2025-02-01) 🎯
**프로젝트 할일 UX 개선 및 버그 수정**

#### UX 개선
- ✅ **프로젝트 이름 표시**: 오늘 탭의 프로젝트 할일 배지에 프로젝트 이름 표시
  - 배지 형식: "프로젝트: 프로젝트명"
  - 이월 모달에도 동일하게 적용
  - 프로젝트 삭제 시 "프로젝트"만 표시 (안전한 폴백)
- ✅ **데이터 조회 최적화**: todos 조회 시 project_tasks/projects JOIN으로 성능 개선

#### 버그 수정
- ✅ **전월 루틴 복사 - 데이타임 루틴 누락 수정** (2025-02-01)
  - 문제: 전월 루틴 복사 시 모닝/나이트만 복사되고 데이타임 루틴 누락
  - 해결: `fetchPreviousMonthRoutines`, `copyPreviousMonthRoutines` 함수에 daytime 처리 추가
  - 영향: 전월 루틴 복사 시 모든 루틴(모닝/데이타임/나이트) 정상 복사

### v1.2 (2025-01-31) ✅
**안정 버전 릴리즈 - 사용자 편의성 및 AI 기능 개선**

#### 주요 기능
- ✅ **관리자 페이지 - 기한 만료 탭 추가**: 기한 만료 사용자 별도 관리, 일괄 기한 연장
- ✅ **전월 루틴 자동 복사**: 매월 루틴 재입력 불필요, 전월 루틴 자동 복사
- ✅ **AI 레이트리밋 제한 제거**: 모든 AI 기능 언제든지 사용 가능
- ✅ **AI 월실천계획 가독성 개선**: 목표 사이 빈 줄 추가로 가독성 향상
- ✅ **날짜 선택 버그 수정**: 날짜 변경 시 정확한 데이터 표시
- ✅ **실행률 기준 개선**: 현재 주/달/연도는 오늘까지 기준으로 계산

#### 마이너 업데이트
- v1.2.5: 월간 데일리 루틴 편집 모드 UX 개선 (빈 입력 필드 자동 생성 제거)
- v1.2.4: 월간 실천계획 textarea 자동 높이 조절
- v1.2.3: 월말 결과 기본 템플릿 추가
- v1.2.2: 할일 삭제 확인 팝업 추가
- v1.2.1: 로그인 성능 개선, 모바일 브라우저 호환성 개선

### v1.1 (2025-01-28) ✅
**안정 버전 릴리즈 - 핵심 기능 구현 완료**

- ✅ 인증 및 세션 관리 (로그인 성능 최적화)
- ✅ 오늘 관리 (할일/루틴/성찰)
- ✅ 계획 관리 (목표/프로젝트/반복업무)
- ✅ 리뷰 (주간/월간/연간 리포트 + AI 성찰)
- ✅ 관리자 기능 (승인/기한 설정/챌린지 참가자)
- ✅ 디자인 시스템 (Plan-Do-See 구조, 프리미엄 색상)
- ✅ 배포 (GitHub + Vercel 자동 배포)

## Live Demo

🔗 [led-with-ai.vercel.app](https://led-with-ai.vercel.app)

## 외부 라이브러리와 아이콘 (2026-09-07)

- luxon·flatpickr(한국어 로케일·CSS 포함)·lucide는 `src/vendor.js`에서 번들에 넣고 `window.luxon` / `window.flatpickr` / `window.lucide` 전역으로 건다. 화면 코드는 전역을 그대로 쓴다.
- CDN(unpkg `lucide@latest`, jsdelivr)을 쓰지 않는 이유: `@latest`는 매번 리다이렉트를 타고 캐시가 짧아 외부 도메인 5개 왕복이 첫 화면을 붙잡았다. 번들은 파일명에 해시가 붙어 1년 캐시(`vercel.json` headers).
- lucide는 **쓰는 아이콘만** 이름으로 가져온다(`icons` 전체를 가져오면 3,600개가 다 들어가 850KB). 화면에 새 `data-lucide="이름"`을 넣으면 `src/vendor.js`의 import와 `icons` 객체에 같이 추가한다. 빠지면 콘솔에 `icon name was not found` 경고가 뜨고 그 자리가 빈다.
- 로고: `public/logo.webp`(1200px, 30KB)를 로그인 화면에, `public/og.jpg`(60KB)를 공유 카드에 쓴다. 원본 4.2MB PNG(`logo.png`)는 배포하지 않는다.
