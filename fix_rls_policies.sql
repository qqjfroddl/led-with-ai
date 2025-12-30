-- ai_usage_counters 테이블 RLS 정책 수정
-- Supabase Dashboard > SQL Editor에서 실행하세요

-- 1. 기존 정책 모두 삭제 (있다면)
DROP POLICY IF EXISTS "Users can view own counters" ON public.ai_usage_counters;
DROP POLICY IF EXISTS "Service role full access" ON public.ai_usage_counters;
DROP POLICY IF EXISTS "Users can view their own usage counters" ON public.ai_usage_counters;
DROP POLICY IF EXISTS "Service role can insert usage counters" ON public.ai_usage_counters;
DROP POLICY IF EXISTS "Service role can update usage counters" ON public.ai_usage_counters;

-- 2. RLS 활성화 (이미 활성화되어 있어도 문제없음)
ALTER TABLE public.ai_usage_counters ENABLE ROW LEVEL SECURITY;

-- 3. 새 정책 생성
-- 사용자는 본인 데이터만 조회 가능
CREATE POLICY "users_select_own_counters"
ON public.ai_usage_counters
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Service role은 모든 작업 가능 (Edge Function용)
CREATE POLICY "service_role_all_counters"
ON public.ai_usage_counters
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- 4. 정책 확인
SELECT 
  policyname,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'ai_usage_counters';

