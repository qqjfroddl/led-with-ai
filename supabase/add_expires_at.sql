-- profiles 테이블에 사용 기한(expires_at) 컬럼 추가
-- Supabase SQL Editor에서 실행하세요

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

























