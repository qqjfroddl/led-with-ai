-- 관리자 RLS 정책 추가 (todos, routines, routine_logs, daily_reflections)
-- 관리자가 다른 사용자의 데이터를 조회할 수 있도록 정책 추가
-- Supabase SQL Editor에서 실행하세요

-- 1. is_admin() 함수 확인
SELECT 
  routine_name,
  routine_definition
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'is_admin';

-- 2. 기존 정책 확인
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd,
  qual as using_clause
FROM pg_policies 
WHERE tablename IN ('todos', 'routines', 'routine_logs', 'daily_reflections')
  AND cmd = 'SELECT'
ORDER BY tablename, policyname;

-- 3. todos 테이블에 관리자 SELECT 정책 추가
DROP POLICY IF EXISTS "todos_admin_select_all" ON public.todos;
CREATE POLICY "todos_admin_select_all" ON public.todos
  FOR SELECT
  USING (public.is_admin());

-- 4. routines 테이블에 관리자 SELECT 정책 추가
DROP POLICY IF EXISTS "routines_admin_select_all" ON public.routines;
CREATE POLICY "routines_admin_select_all" ON public.routines
  FOR SELECT
  USING (public.is_admin());

-- 5. routine_logs 테이블에 관리자 SELECT 정책 추가
DROP POLICY IF EXISTS "routine_logs_admin_select_all" ON public.routine_logs;
CREATE POLICY "routine_logs_admin_select_all" ON public.routine_logs
  FOR SELECT
  USING (public.is_admin());

-- 6. daily_reflections 테이블에 관리자 SELECT 정책 추가
DROP POLICY IF EXISTS "daily_reflections_admin_select_all" ON public.daily_reflections;
CREATE POLICY "daily_reflections_admin_select_all" ON public.daily_reflections
  FOR SELECT
  USING (public.is_admin());

-- 7. 정책 확인
SELECT 
  tablename,
  policyname,
  cmd,
  qual as using_clause
FROM pg_policies 
WHERE tablename IN ('todos', 'routines', 'routine_logs', 'daily_reflections')
  AND policyname LIKE '%admin%'
ORDER BY tablename, policyname;

-- 8. 테스트: 관리자로 로그인한 상태에서 다른 사용자의 데이터 조회 테스트
-- (관리자만 실행 가능해야 함)
-- 예시: todos 조회
-- SELECT * FROM public.todos LIMIT 5;


















