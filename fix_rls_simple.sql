-- ai_usage_counters RLS 정책 간소화
-- 문제: is_approved_user() 함수 때문에 조회 실패
-- 해결: 단순한 정책으로 교체

-- 1. 기존 정책 모두 삭제
DROP POLICY IF EXISTS "Users can view own counters" ON public.ai_usage_counters;
DROP POLICY IF EXISTS "Service role full access" ON public.ai_usage_counters;
DROP POLICY IF EXISTS "ai_usage_counters_insert_approved" ON public.ai_usage_counters;
DROP POLICY IF EXISTS "ai_usage_counters_select_approved" ON public.ai_usage_counters;
DROP POLICY IF EXISTS "ai_usage_counters_update_approved" ON public.ai_usage_counters;

-- 2. 간단한 정책 생성 (is_approved_user() 제거)
-- 사용자는 본인 데이터만 SELECT 가능
CREATE POLICY "users_select_own"
ON public.ai_usage_counters
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Service role은 모든 작업 가능
CREATE POLICY "service_all"
ON public.ai_usage_counters
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- 3. 확인
SELECT 
  policyname,
  roles,
  cmd,
  qual::text
FROM pg_policies
WHERE tablename = 'ai_usage_counters';






