-- RLS 정책 디버깅 SQL
-- Supabase Dashboard > SQL Editor에서 실행하세요

-- 1. ai_usage_counters 테이블의 RLS 상태 확인
SELECT 
  tablename,
  rowsecurity as "RLS Enabled"
FROM pg_tables
WHERE schemaname = 'public' 
  AND tablename = 'ai_usage_counters';

-- 2. ai_usage_counters 테이블의 모든 정책 확인
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
WHERE tablename = 'ai_usage_counters';

-- 3. 현재 사용자로 데이터 조회 테스트 (authenticated 역할)
-- 이 쿼리가 데이터를 반환하면 RLS 정책이 제대로 작동하는 것
SELECT 
  user_id,
  scope,
  period_key,
  count
FROM ai_usage_counters
WHERE user_id = auth.uid()
  AND period_key = '2025-12-30'
ORDER BY updated_at DESC;

-- 4. Service role로 모든 데이터 조회 (RLS 우회)
-- 이 쿼리는 항상 모든 데이터를 반환해야 함
-- SELECT 
--   user_id,
--   scope,
--   period_key,
--   count
-- FROM ai_usage_counters
-- WHERE period_key = '2025-12-30'
-- ORDER BY updated_at DESC;








