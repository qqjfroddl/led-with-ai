-- 관리자 RLS 정책 확인 및 재생성 스크립트
-- Supabase SQL Editor에서 실행하세요

-- 1. 기존 정책 확인
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'profiles' AND policyname LIKE '%admin%';

-- 2. 기존 정책 삭제 (필요시)
-- DROP POLICY IF EXISTS "profiles_admin_select_all" ON public.profiles;
-- DROP POLICY IF EXISTS "profiles_admin_update_all" ON public.profiles;

-- 3. 관리자용 정책 재생성
CREATE POLICY IF NOT EXISTS "profiles_admin_select_all" ON public.profiles
  FOR SELECT
  USING (public.is_admin());

CREATE POLICY IF NOT EXISTS "profiles_admin_update_all" ON public.profiles
  FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 4. is_admin() 함수 확인
SELECT public.is_admin() as is_admin_result;

-- 5. 현재 로그인한 사용자의 프로필 확인
SELECT id, email, role, status 
FROM public.profiles 
WHERE id = auth.uid();

-- 6. 모든 pending 사용자 확인 (관리자만 조회 가능해야 함)
SELECT id, email, name, status, created_at 
FROM public.profiles 
WHERE status = 'pending'
ORDER BY created_at DESC;







