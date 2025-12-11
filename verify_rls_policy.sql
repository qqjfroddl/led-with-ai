-- RLS 정책 확인 및 수정 스크립트
-- Supabase SQL Editor에서 실행하세요

-- 1. 현재 profiles 테이블의 모든 RLS 정책 확인
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual as using_clause,
  with_check
FROM pg_policies 
WHERE tablename = 'profiles'
ORDER BY policyname;

-- 2. 관리자 정책이 제대로 적용되었는지 확인
-- profiles_admin_select_all 정책이 있는지 확인
SELECT 
  policyname,
  cmd,
  qual as using_clause
FROM pg_policies 
WHERE tablename = 'profiles' 
  AND policyname = 'profiles_admin_select_all';

-- 3. 관리자 정책이 없으면 생성
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'profiles' 
    AND policyname = 'profiles_admin_select_all'
  ) THEN
    CREATE POLICY "profiles_admin_select_all" ON public.profiles
      FOR SELECT
      USING (public.is_admin());
    
    RAISE NOTICE '정책 profiles_admin_select_all가 생성되었습니다.';
  ELSE
    RAISE NOTICE '정책 profiles_admin_select_all가 이미 존재합니다.';
  END IF;
END $$;

-- 4. 현재 로그인한 사용자가 관리자인지 확인
SELECT 
  auth.uid() as current_user_id,
  public.is_admin() as is_admin_result;

-- 5. 관리자로 로그인한 상태에서 모든 사용자 조회 테스트
-- (이 쿼리는 관리자만 실행 가능해야 함)
SELECT 
  id,
  email,
  name,
  status,
  role,
  created_at
FROM public.profiles
ORDER BY created_at DESC;

-- 6. 상태별 사용자 수 확인
SELECT 
  status,
  COUNT(*) as count
FROM public.profiles
GROUP BY status
ORDER BY status;



