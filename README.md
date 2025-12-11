# LED System v1.1

할일/루틴/성찰 관리 시스템

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

- ✅ Google OAuth 인증
- ✅ 사용자 승인 시스템 (관리자)
- ✅ 할일 관리 (카테고리별)
- ✅ 루틴 체크
- ✅ 하루 성찰 (4항목)
- ✅ 주간/월간 리포트
- ✅ AI 성찰 및 계획 제안
