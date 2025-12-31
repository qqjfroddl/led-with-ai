-- expires_at 컬럼 강제 추가 스크립트
-- Supabase SQL Editor에서 실행하세요
-- 이 스크립트는 컬럼이 없을 경우에만 추가합니다.

-- 1단계: 기존 컬럼 확인
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'profiles'
  AND column_name = 'expires_at';

-- 2단계: 컬럼이 없다면 강제 추가 (DO 블록으로 안전하게 처리)
DO $$
BEGIN
  -- 컬럼 존재 여부 확인
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'expires_at'
  ) THEN
    -- 컬럼 추가
    ALTER TABLE public.profiles 
    ADD COLUMN expires_at date;
    
    RAISE NOTICE '✅ expires_at 컬럼이 성공적으로 추가되었습니다.';
  ELSE
    RAISE NOTICE 'ℹ️ expires_at 컬럼이 이미 존재합니다.';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '❌ 에러 발생: %', SQLERRM;
    RAISE;
END $$;

-- 3단계: 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_profiles_expires_at 
ON public.profiles(expires_at) 
WHERE expires_at IS NOT NULL;

-- 4단계: 주석 추가
COMMENT ON COLUMN public.profiles.expires_at IS 
'사용 기한 만료일 (NULL이면 무제한 사용 가능)';

-- 5단계: 최종 확인 (반드시 결과가 나와야 함)
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'profiles'
  AND column_name = 'expires_at';

-- 6단계: 테스트 데이터 확인
SELECT 
  id,
  email,
  status,
  expires_at,
  CASE 
    WHEN expires_at IS NULL THEN '무제한'
    WHEN expires_at < CURRENT_DATE THEN '만료됨'
    ELSE '활성'
  END as expiry_status
FROM public.profiles
ORDER BY created_at DESC
LIMIT 10;



















