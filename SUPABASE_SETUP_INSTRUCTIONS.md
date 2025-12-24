# Supabase 설정 안내

## ⚠️ 중요: 사용 기한 기능을 사용하기 전에 반드시 실행해야 합니다!

### 1단계: expires_at 컬럼 추가

Supabase 대시보드 → SQL Editor에서 다음 SQL을 실행하세요:

```sql
-- profiles 테이블에 사용 기한(expires_at) 컬럼 추가

-- 1. expires_at 컬럼 추가 (NULL 허용 = 무제한)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS expires_at date;

-- 2. 인덱스 추가 (만료일 체크 성능 향상)
CREATE INDEX IF NOT EXISTS idx_profiles_expires_at 
ON public.profiles(expires_at) 
WHERE expires_at IS NOT NULL;

-- 3. 주석 추가
COMMENT ON COLUMN public.profiles.expires_at IS 
'사용 기한 만료일 (NULL이면 무제한 사용 가능)';

-- 4. 확인
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'profiles'
  AND column_name = 'expires_at';
```

**실행 후 확인:**
- 결과에 `expires_at` 컬럼이 표시되어야 합니다.
- `data_type`이 `date`이고 `is_nullable`이 `YES`여야 합니다.

### 2단계: RLS 정책에 만료일 체크 추가 (선택사항)

만료일 체크를 RLS 정책에 포함하려면 다음 SQL도 실행하세요:

```sql
-- 공통 승인 체크 함수 생성/수정 (만료일 포함)
CREATE OR REPLACE FUNCTION public.is_user_approved()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.status = 'approved'
      AND (p.expires_at IS NULL OR p.expires_at >= CURRENT_DATE)
  );
$$;
```

### 3단계: 확인

1. Supabase 대시보드 → Table Editor → `profiles` 테이블 열기
2. 컬럼 목록에 `expires_at` (date, nullable)이 있는지 확인
3. 브라우저 새로고침 후 관리자 페이지에서 사용 기한 설정 테스트

### 문제 해결

**에러: "Could not find the 'expires_at' column"**
- 1단계 SQL을 실행했는지 확인
- Supabase 대시보드에서 테이블 스키마 확인
- 브라우저 캐시 클리어 후 재시도

**스키마 캐시 갱신이 안 될 때:**
- Supabase 프로젝트 재시작 (Settings → General → Restart Project)
- 또는 몇 분 대기 후 재시도









