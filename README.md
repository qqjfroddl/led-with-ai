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
- 연간 목표 (3영역: 자기계발/관계/업무재정)
- 월간 실천계획 + 월말 결과
- 프로젝트 관리 (진행중/완료)

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

## 변경 이력

### v1.2.4 (2025-01-31)
- **월간 실천계획 textarea 자동 높이 조절**: AI 제안 후 내용에 맞춰 입력란 자동 확장
  - AI 제안받기 시 스크롤 없이 바로 내용 확인 가능
  - 사용자 입력 시에도 실시간 높이 자동 조절
  - 월실천계획 및 월말 결과 모든 입력란 적용
  - 최소 80px, 최대 500px 높이 제한으로 안정성 보장

### v1.2.3 (2025-01-31)
- **월말 결과 기본 템플릿 추가**: 월간 실천계획의 월말 결과 입력란에 기본 템플릿 제공
  - 성취한 것 / 아쉬운 점 구조화된 템플릿
  - 사용자가 쉽게 작성할 수 있도록 가이드 제공
  - 3개 영역(자기계발/가족/관계/업무/재정) 모두 적용

### v1.2.2 (2025-01-31)
- **할일 삭제 확인 팝업 추가**: 오늘 할일 삭제 시 확인 팝업 표시하여 실수 방지
  - 프로젝트/반복업무와 동일한 UX 패턴 적용
  - 삭제 전 "이 할일을 삭제하시겠습니까?" 확인 메시지
  - 사용자 안전성 및 일관성 개선

### v1.2.1 (2025-01-30)
- **로그인 성능 개선**: `getCurrentProfile` 타임아웃 3초 → 2초로 단축하여 로그인 속도 약 1초 개선
- **모바일 브라우저 호환성 개선**: 삼성 인터넷 및 앱 내장 브라우저에서 OAuth 로그인 문제 해결
  - OAuth `skipBrowserRedirect` 옵션 명시적 설정
  - URL 기반 세션 복구 로직 추가 (access_token 감지 시 자동 복구)
  - 삼성 인터넷, 네이버/카카오 앱 내장 브라우저 호환성 향상

## Live Demo

🔗 [led-with-ai.vercel.app](https://led-with-ai.vercel.app)
