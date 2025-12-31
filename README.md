# LED with AI

AI-powered daily planning app for seamless planning across devices.

> **Plan - Do - See**: 연간 목표부터 일일 할일까지, AI와 함께하는 체계적인 계획 관리

## 설정 방법

### 방법 1: CDN 방식 (Live Server 등 정적 서버 사용 시)

1. `config.js` 파일을 열고 Supabase 정보 입력:
```javascript
window.SUPABASE_CONFIG = {
  url: 'your_supabase_url',
  anonKey: 'your_supabase_anon_key'
};
```

2. Live Server나 다른 정적 서버로 실행
   - VS Code: Live Server 확장 프로그램 사용
   - 또는 Python: `python -m http.server 5500`
   - 또는 Node.js: `npx serve`

3. 브라우저에서 `http://localhost:5500/index.html` 접속

### 방법 2: Vite 개발 서버 사용 (권장)

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
- **AI 주간/월간/연간 성찰**: Google Gemini로 자동 생성
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

- **현재 버전**: v1.3 (개발 예정)
- **안정 버전**: v1.2 (2025-01-31 릴리즈)
- **저장소**: https://github.com/qqjfroddl/led-with-ai

## 변경 이력

자세한 변경 이력은 [CHANGELOG.md](./CHANGELOG.md)를 참고하세요.

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
