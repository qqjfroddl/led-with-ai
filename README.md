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

## Live Demo

🔗 [led-with-ai.vercel.app](https://led-with-ai.vercel.app)
