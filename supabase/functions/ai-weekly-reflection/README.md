# AI 주간 성찰 Edge Function

주간 활동 통계를 분석하여 AI로 맞춤형 성찰을 생성하는 Supabase Edge Function입니다.

## 환경 변수 설정

Supabase Dashboard > Project Settings > Edge Functions > Secrets에서 다음 환경 변수를 설정하세요:

- `GEMINI_API_KEY`: Google Gemini API 키 (필수)
- `GEMINI_MODEL`: 사용할 모델 (기본값: `gemini-2.5-flash`)
- `SUPABASE_URL`: Supabase 프로젝트 URL (자동 설정됨)
- `SUPABASE_ANON_KEY`: Supabase Anon Key (자동 설정됨)

### Gemini API 키 발급 방법

1. https://aistudio.google.com/app/apikey 접속
2. "Create API Key" 클릭
3. API 키 복사하여 환경 변수에 설정

## 배포 방법

```bash
# Supabase CLI 설치 필요
supabase functions deploy ai-weekly-reflection
```

## API 사용법

```javascript
const { data, error } = await supabase.functions.invoke('ai-weekly-reflection', {
  body: {
    week_start: '2025-12-01' // YYYY-MM-DD 형식
  }
});
```

## 레이트리밋

- 주당 최대 3회 생성 가능
- `ai_usage_counters` 테이블로 관리

## 응답 형식

```json
{
  "success": true,
  "week_start": "2025-12-01",
  "week_end": "2025-12-07",
  "content_md": "마크다운 형식의 성찰 내용",
  "model": "gemini-2.5-flash",
  "prompt_version": "weekly_reflection_v1"
}
```

