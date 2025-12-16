-- RLS 정책에 만료일 체크 추가
-- Supabase SQL Editor에서 실행하세요

-- 1. 공통 승인 체크 함수 생성/수정 (만료일 포함)
CREATE OR REPLACE FUNCTION public.is_user_approved()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.status = 'approved'
      AND (p.expires_at IS NULL OR p.expires_at >= CURRENT_DATE)
  );
$$;

-- 2. 함수 확인
SELECT public.is_user_approved() as is_approved_result;

-- 3. 기존 RLS 정책 확인 (수정 전 확인용)
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd,
  qual as using_clause
FROM pg_policies 
WHERE tablename IN ('todos', 'routines', 'routine_logs', 'daily_reflections', 'yearly_goals', 'monthly_plans', 'weekly_ai_reflections', 'monthly_ai_reflections')
  AND cmd = 'SELECT'
ORDER BY tablename, policyname;

-- 4. 주의: 실제 RLS 정책이 함수를 사용하는지 직접 EXISTS를 사용하는지 확인 필요
-- 직접 EXISTS를 사용하는 경우, 아래와 같이 수정해야 함:
-- 
-- 예시: todos 테이블 정책 수정
-- DROP POLICY IF EXISTS "todos_select_own_approved" ON public.todos;
-- CREATE POLICY "todos_select_own_approved" ON public.todos
--   FOR SELECT
--   USING (
--     user_id = auth.uid()
--     AND public.is_user_approved()
--   );
--
-- 모든 사용자 데이터 테이블에 동일하게 적용 필요:
-- - todos
-- - routines
-- - routine_logs
-- - daily_reflections
-- - yearly_goals
-- - monthly_plans
-- - weekly_ai_reflections
-- - monthly_ai_reflections

-- 5. 관리자는 만료 체크에서 제외 (선택사항)
-- 관리자 함수 확인
SELECT 
  routine_name,
  routine_definition
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'is_admin';





