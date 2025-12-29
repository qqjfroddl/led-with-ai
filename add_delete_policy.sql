-- 관리자가 profiles를 삭제할 수 있도록 RLS 정책 추가
-- Supabase SQL Editor에서 실행하세요

-- 관리자용 DELETE 정책 추가
CREATE POLICY IF NOT EXISTS "profiles_admin_delete_all" ON public.profiles
  FOR DELETE
  USING (public.is_admin());

-- 정책 확인
SELECT 
  policyname,
  cmd,
  qual as using_clause
FROM pg_policies 
WHERE tablename = 'profiles' 
  AND policyname = 'profiles_admin_delete_all';























