-- ============================================
-- RLS 정책 수정: ai_usage_counters INSERT/UPDATE 권한 추가
-- 날짜: 2025-12-30
-- 이슈: Edge Function에서 AI 사용 카운터 증가가 안 되는 문제
-- 원인: authenticated role에 SELECT만 허용, INSERT/UPDATE 권한 없음
-- 해결: INSERT/UPDATE 정책 추가 (본인 데이터만 수정 가능)
-- 영향: 프론트엔드는 SELECT만 사용하므로 기존 기능 영향 없음
-- ============================================

-- 1단계: 모든 기존 정책 강제 삭제
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'ai_usage_counters'
    ) LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON public.ai_usage_counters CASCADE';
        RAISE NOTICE 'Dropped policy: %', r.policyname;
    END LOOP;
END $$;

-- 2단계: RLS 재활성화 (깨끗한 상태로)
ALTER TABLE public.ai_usage_counters DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_usage_counters ENABLE ROW LEVEL SECURITY;

-- 3단계: 새 정책 생성 (SELECT + INSERT + UPDATE)
-- SELECT 정책 (프론트엔드 레이트리밋 조회용)
CREATE POLICY "ai_counters_select"
ON public.ai_usage_counters
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- INSERT 정책 (Edge Function 카운터 생성용)
CREATE POLICY "ai_counters_insert"
ON public.ai_usage_counters
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- UPDATE 정책 (Edge Function 카운터 증가용)
CREATE POLICY "ai_counters_update"
ON public.ai_usage_counters
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- service_role은 모든 권한 유지 (관리자용)
CREATE POLICY "ai_counters_service"
ON public.ai_usage_counters
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- 4단계: 정책 확인
SELECT 
  policyname,
  roles::text,
  cmd,
  SUBSTRING(qual::text, 1, 80) as using_clause,
  SUBSTRING(with_check::text, 1, 80) as with_check_clause
FROM pg_policies 
WHERE tablename = 'ai_usage_counters'
ORDER BY cmd, policyname;

-- 5단계: 현재 카운터 상태 확인
SELECT
  user_id,
  scope,
  period_key,
  count,
  created_at,
  updated_at
FROM ai_usage_counters
ORDER BY updated_at DESC
LIMIT 10;
