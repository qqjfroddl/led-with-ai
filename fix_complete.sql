-- ============================================
-- 완전 해결: RLS 정책 + 테스트
-- ============================================

-- 1단계: 모든 기존 정책 완전 삭제
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'ai_usage_counters') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON public.ai_usage_counters';
    END LOOP;
END $$;

-- 2단계: RLS 비활성화 후 재활성화
ALTER TABLE public.ai_usage_counters DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_usage_counters ENABLE ROW LEVEL SECURITY;

-- 3단계: 새 정책 생성 (매우 단순)
CREATE POLICY "ai_counters_select"
ON public.ai_usage_counters
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "ai_counters_service"
ON public.ai_usage_counters
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- 4단계: 정책 확인
SELECT 
  policyname,
  roles,
  cmd,
  SUBSTRING(qual::text, 1, 100) as using_clause
FROM pg_policies 
WHERE tablename = 'ai_usage_counters';

-- 5단계: 테스트 (본인 데이터 조회 가능한지 확인)
SELECT
  user_id,
  scope,
  period_key,
  count
FROM ai_usage_counters
WHERE user_id = auth.uid()
ORDER BY updated_at DESC
LIMIT 5;

