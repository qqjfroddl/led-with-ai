-- ============================================
-- AI Usage Counters RLS 정책 완전 재설정
-- ============================================

-- 1. 모든 기존 정책 삭제
DROP POLICY IF EXISTS "users_select_own" ON public.ai_usage_counters;
DROP POLICY IF EXISTS "service_all" ON public.ai_usage_counters;
DROP POLICY IF EXISTS "Users can view own counters" ON public.ai_usage_counters;
DROP POLICY IF EXISTS "Service role full access" ON public.ai_usage_counters;
DROP POLICY IF EXISTS "Users can view their own usage counters" ON public.ai_usage_counters;
DROP POLICY IF EXISTS "Service role can insert usage counters" ON public.ai_usage_counters;
DROP POLICY IF EXISTS "Service role can update usage counters" ON public.ai_usage_counters;

-- 2. RLS 활성화 확인
ALTER TABLE public.ai_usage_counters ENABLE ROW LEVEL SECURITY;

-- 3. 새 정책 생성 (매우 단순하게)
-- 사용자는 본인 데이터만 조회 가능 (승인 체크 없음!)
CREATE POLICY "ai_counters_select"
ON public.ai_usage_counters
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Service role은 모든 작업 가능 (Edge Function용)
CREATE POLICY "ai_counters_service"
ON public.ai_usage_counters
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- 4. 정책 확인
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
WHERE tablename = 'ai_usage_counters'
ORDER BY policyname;



