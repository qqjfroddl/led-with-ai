-- DELETE 정책 확인 및 재생성 스크립트
-- Supabase SQL Editor에서 실행하세요

-- 1. 기존 DELETE 정책 확인
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
WHERE tablename = 'profiles' AND cmd = 'DELETE';

-- 2. 기존 DELETE 정책 삭제 (있다면)
DROP POLICY IF EXISTS "profiles_admin_delete_all" ON public.profiles;

-- 3. DELETE 정책 재생성
CREATE POLICY "profiles_admin_delete_all" ON public.profiles
  FOR DELETE
  USING (public.is_admin());

-- 4. 정책 확인
SELECT 
  policyname,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'profiles' AND cmd = 'DELETE';

-- 5. is_admin() 함수 테스트 (현재 사용자가 admin인지 확인)
SELECT public.is_admin() AS is_current_user_admin;







