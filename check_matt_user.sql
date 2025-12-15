-- matt@deeptactlearning.com 사용자 확인 스크립트
-- Supabase SQL Editor에서 실행하세요

-- 1. auth.users에서 해당 이메일 확인
SELECT 
  id,
  email,
  created_at,
  raw_user_meta_data
FROM auth.users
WHERE email = 'matt@deeptactlearning.com';

-- 2. profiles에서 해당 사용자 확인
SELECT 
  id,
  email,
  name,
  status,
  role,
  created_at
FROM public.profiles
WHERE email = 'matt@deeptactlearning.com';

-- 3. 모든 pending 사용자 확인
SELECT 
  id,
  email,
  name,
  status,
  created_at
FROM public.profiles
WHERE status = 'pending'
ORDER BY created_at DESC;

-- 4. 관리자 정책 확인
SELECT 
  policyname,
  cmd,
  qual as using_clause,
  with_check
FROM pg_policies 
WHERE tablename = 'profiles' 
  AND policyname LIKE '%admin%'
ORDER BY policyname;

-- 5. is_admin() 함수 테스트
SELECT 
  auth.uid() as current_user_id,
  public.is_admin() as is_admin_result;

-- 6. 관리자로 로그인한 상태에서 모든 사용자 조회 테스트
SELECT 
  id,
  email,
  name,
  status,
  role,
  created_at
FROM public.profiles
ORDER BY created_at DESC;








