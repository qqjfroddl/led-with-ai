-- monthly_ai_reflections 406 오류 디버깅 SQL
-- Supabase SQL Editor에서 실행하세요

-- 1. 현재 사용자 프로필 상세 확인
SELECT 
  id,
  email,
  status,
  expires_at,
  CURRENT_DATE as today,
  CASE 
    WHEN expires_at IS NULL THEN '무제한'
    WHEN expires_at >= CURRENT_DATE THEN '만료 안됨'
    ELSE '만료됨'
  END as expiry_status,
  CASE 
    WHEN status = 'approved' AND (expires_at IS NULL OR expires_at >= CURRENT_DATE) 
    THEN '✅ RLS 통과 가능'
    ELSE '❌ RLS 통과 불가'
  END as rls_check
FROM public.profiles
WHERE id = auth.uid();

-- 2. RLS 정책 상세 확인
SELECT 
  policyname,
  cmd,
  qual as using_clause,
  with_check,
  CASE 
    WHEN qual IS NOT NULL OR with_check IS NOT NULL 
    THEN '정책 활성'
    ELSE '정책 비활성'
  END as policy_status
FROM pg_policies 
WHERE tablename = 'monthly_ai_reflections'
ORDER BY policyname;

-- 3. 테이블의 RLS 상태 확인
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename = 'monthly_ai_reflections';

-- 4. RLS 정책이 실제로 작동하는지 테스트 (현재 사용자로)
-- 이 쿼리는 RLS 정책을 통과해야 합니다
SELECT 
  id,
  user_id,
  month_start,
  created_at
FROM public.monthly_ai_reflections
WHERE user_id = auth.uid()
LIMIT 1;

-- 5. 특정 사용자 ID로 테스트 (디버깅용)
-- ⚠️ 주의: 실제 사용자 ID로 변경하세요
-- SELECT 
--   id,
--   user_id,
--   month_start,
--   created_at
-- FROM public.monthly_ai_reflections
-- WHERE user_id = '707306f9-8f1a-40e6-ad25-1c619c00a9e9'
-- LIMIT 1;

-- 6. RLS 정책 조건 수동 테스트
SELECT 
  auth.uid() as current_user_id,
  EXISTS(
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.status = 'approved'
      AND (p.expires_at IS NULL OR p.expires_at >= CURRENT_DATE)
  ) as is_approved_check;



















