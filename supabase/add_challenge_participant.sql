-- profiles 테이블에 챌린지 참가자 컬럼 추가
-- Supabase SQL Editor에서 실행하세요

-- 1. is_challenge_participant 컬럼 추가 (boolean, 기본값 false)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_challenge_participant boolean NOT NULL DEFAULT false;

-- 2. 인덱스 추가 (조회 성능 향상)
CREATE INDEX IF NOT EXISTS idx_profiles_challenge_participant 
ON public.profiles(is_challenge_participant) 
WHERE is_challenge_participant = true;

-- 3. 주석 추가
COMMENT ON COLUMN public.profiles.is_challenge_participant IS 
'챌린지 참가 여부 (true: 챌린지 참가자, false: 일반 사용자)';

-- 4. 확인
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'profiles'
  AND column_name = 'is_challenge_participant';

-- 5. 테스트 데이터 확인
SELECT 
  id,
  email,
  status,
  is_challenge_participant,
  CASE 
    WHEN is_challenge_participant = true THEN '챌린지 참가자'
    ELSE '일반 사용자'
  END as participant_status
FROM public.profiles
WHERE status = 'approved'
ORDER BY created_at DESC
LIMIT 10;
















