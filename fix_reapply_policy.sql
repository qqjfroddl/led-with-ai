-- rejected 상태 사용자가 다시 승인 요청할 수 있도록 RLS 정책 수정
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
WHERE tablename = 'profiles' AND policyname LIKE '%update%';

-- 2. rejected -> pending 변경을 허용하는 명시적 정책 추가
-- (rejected 상태의 사용자가 자신의 status를 pending으로 변경 가능)
CREATE POLICY IF NOT EXISTS "profiles_update_reapply" ON public.profiles
  FOR UPDATE
  USING (
    auth.uid() = id 
    AND status = 'rejected'  -- 현재 상태가 rejected인 경우만
  )
  WITH CHECK (
    auth.uid() = id 
    AND status = 'pending'  -- pending으로만 변경 가능
  );

-- 3. 정책 확인
SELECT 
  policyname,
  cmd,
  qual as using_clause,
  with_check
FROM pg_policies 
WHERE tablename = 'profiles' AND policyname LIKE '%reapply%';








