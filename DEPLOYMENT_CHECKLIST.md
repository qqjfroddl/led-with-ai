# 월간 탭 배포 체크리스트

## ✅ 완료된 작업

1. **코드 구현**
   - ✅ `src/utils/monthlyStats.js` - 월간 통계 계산
   - ✅ `src/components/MonthSelector.js` - 월 선택 UI
   - ✅ `src/components/MonthlyStats.js` - 월간 정량 지표
   - ✅ `src/components/MonthlyInsights.js` - 월간 정성 분석
   - ✅ `src/components/MonthlyAIReflection.js` - AI 월간 성찰 UI
   - ✅ `src/pages/monthly.js` - 월간 리포트 페이지
   - ✅ `src/router.js` - 라우터 업데이트
   - ✅ `supabase/functions/ai-monthly-reflection/index.ts` - Edge Function

2. **코드 개선**
   - ✅ `.single()` → `.maybeSingle()` 변경 (406 오류 방지)
   - ✅ 디버깅 로그 강화
   - ✅ 에러 처리 개선

## 🔧 사용자가 해야 할 작업

### 1단계: SQL 실행 (406 오류 해결)

**Supabase SQL Editor에서 다음 파일들을 순서대로 실행:**

1. **`supabase/create_monthly_ai_reflections.sql`**
   - 테이블 생성 및 RLS 정책 설정
   - `is_user_approved()` 함수 생성 포함

2. **`supabase/fix_monthly_ai_reflections_rls.sql`**
   - RLS 정책 재생성 (직접 EXISTS 사용)

3. **`supabase/debug_monthly_ai_reflections.sql`** (선택사항)
   - 디버깅용: 프로필 상태 및 정책 확인

**실행 후 확인:**
- 정책이 3개만 있는지 확인 (INSERT, SELECT, UPDATE)
- `using_clause`와 `with_check`에 `expires_at >= CURRENT_DATE` 포함 확인

### 2단계: Edge Function 배포 (CORS 오류 해결)

**방법 A: Supabase CLI 사용 (권장)**

```bash
# 프로젝트 디렉토리에서 실행
cd c:\projects\LEDsystem_ver1.1_chatGPT

# Supabase CLI 로그인 (처음 한 번만)
supabase login

# 프로젝트 연결 (프로젝트 REF 확인 필요)
supabase link --project-ref YOUR_PROJECT_REF

# Edge Function 배포
supabase functions deploy ai-monthly-reflection
```

**방법 B: Supabase Dashboard 사용**

1. Supabase Dashboard → **Edge Functions** 메뉴
2. **"Create a new function"** 클릭
3. Function name: `ai-monthly-reflection`
4. `supabase/functions/ai-monthly-reflection/index.ts` 파일 내용 복사/붙여넣기
5. **환경 변수 설정:**
   - `GEMINI_API_KEY`: Gemini API 키 (기존 주간 성찰과 동일)
   - `GEMINI_MODEL`: `gemini-2.5-flash` (기본값, 선택사항)
6. **Deploy** 클릭

**환경 변수 확인:**
- Dashboard → Edge Functions → `ai-monthly-reflection` → Settings
- 환경 변수가 설정되어 있는지 확인

### 3단계: 테스트

1. **브라우저 새로고침** (Ctrl+F5 또는 Cmd+Shift+R)
2. **월간 탭으로 이동**
3. **콘솔 확인:**
   - 406 오류가 사라졌는지 확인
   - 디버깅 로그 확인
4. **"AI 성찰 생성하기" 버튼 클릭:**
   - CORS 오류만 남아 있으면 → Edge Function 배포 필요
   - 정상 작동하면 → 완료!

## 🐛 문제 해결

### 406 오류가 계속 발생하는 경우

1. **프로필 상태 확인:**
   ```sql
   SELECT 
     id,
     email,
     status,
     expires_at,
     CASE 
       WHEN status = 'approved' AND (expires_at IS NULL OR expires_at >= CURRENT_DATE) 
       THEN '✅ RLS 통과 가능'
       ELSE '❌ RLS 통과 불가'
     END as rls_check
   FROM public.profiles
   WHERE id = auth.uid();
   ```

2. **RLS 정책 재생성:**
   - `supabase/fix_monthly_ai_reflections_rls.sql` 다시 실행

3. **RLS 임시 비활성화 테스트:**
   ```sql
   -- ⚠️ 테스트용 (실제 운영에서는 사용 금지)
   ALTER TABLE public.monthly_ai_reflections DISABLE ROW LEVEL SECURITY;
   ```
   - 이렇게 해도 406 오류가 나면 다른 원인일 수 있음

### CORS 오류가 발생하는 경우

- Edge Function이 배포되지 않았거나
- 환경 변수가 설정되지 않았을 수 있음
- Dashboard에서 Edge Function 상태 확인

## 📝 참고

- **프로젝트 REF 확인 방법:**
  - Supabase Dashboard → Settings → General → Reference ID
- **Gemini API 키:**
  - 기존 주간 성찰 Edge Function과 동일한 키 사용
  - Dashboard → Edge Functions → `ai-weekly-reflection` → Settings에서 확인 가능























