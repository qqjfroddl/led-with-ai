-- expires_at 컬럼 확인 및 문제 해결 스크립트
-- Supabase SQL Editor에서 실행하세요

-- 1. 컬럼 존재 여부 확인
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'profiles'
  AND column_name = 'expires_at';

-- 2. 컬럼이 없다면 추가 (에러 처리 포함)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'expires_at'
  ) THEN
    ALTER TABLE public.profiles 
    ADD COLUMN expires_at date;
    
    RAISE NOTICE '✅ expires_at 컬럼이 추가되었습니다.';
  ELSE
    RAISE NOTICE 'ℹ️ expires_at 컬럼이 이미 존재합니다.';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '❌ 에러 발생: %', SQLERRM;
    RAISE;
END $$;

-- 3. 인덱스 확인 및 추가
CREATE INDEX IF NOT EXISTS idx_profiles_expires_at 
ON public.profiles(expires_at) 
WHERE expires_at IS NOT NULL;

-- 4. 최종 확인
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'profiles'
  AND column_name = 'expires_at';

-- 5. 테스트 데이터 확인 (기존 사용자들의 expires_at 값)
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

