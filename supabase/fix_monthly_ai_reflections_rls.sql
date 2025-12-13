-- monthly_ai_reflections RLS 정책 수정 (직접 EXISTS 사용)
-- 테이블이 이미 생성된 경우 이 파일만 실행하면 됩니다
-- Supabase SQL Editor에서 실행하세요

-- ⚠️ 중요: 기존 정책에 오타가 있을 수 있으므로 모두 재생성합니다
-- 구버전 정책 삭제 (혹시 모를 중복 제거)
DROP POLICY IF EXISTS "monthly_ai_reflections_insert_approved" ON public.monthly_ai_reflections;
DROP POLICY IF EXISTS "monthly_ai_reflections_select_approved" ON public.monthly_ai_reflections;
DROP POLICY IF EXISTS "monthly_ai_reflections_update_approved" ON public.monthly_ai_reflections;
DROP POLICY IF EXISTS "monthly_ai_reflections_insert_own_approved" ON public.monthly_ai_reflections;
DROP POLICY IF EXISTS "monthly_ai_reflections_select_own_approved" ON public.monthly_ai_reflections;
DROP POLICY IF EXISTS "monthly_ai_reflections_update_own_approved" ON public.monthly_ai_reflections;

-- RLS 정책 재생성 (직접 EXISTS 사용하여 함수 호출 문제 방지)
-- ⚠️ 주의: auth.uid() (autn.uid() 아님!)

-- SELECT 정책
CREATE POLICY "monthly_ai_reflections_select_own_approved" ON public.monthly_ai_reflections
  FOR SELECT
  USING (
    user_id = auth.uid()
    AND EXISTS(
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.status = 'approved'
        AND (p.expires_at IS NULL OR p.expires_at >= CURRENT_DATE)
    )
  );

-- INSERT 정책
CREATE POLICY "monthly_ai_reflections_insert_own_approved" ON public.monthly_ai_reflections
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS(
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.status = 'approved'
        AND (p.expires_at IS NULL OR p.expires_at >= CURRENT_DATE)
    )
  );

-- UPDATE 정책
CREATE POLICY "monthly_ai_reflections_update_own_approved" ON public.monthly_ai_reflections
  FOR UPDATE
  USING (
    user_id = auth.uid()
    AND EXISTS(
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.status = 'approved'
        AND (p.expires_at IS NULL OR p.expires_at >= CURRENT_DATE)
    )
  )
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS(
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.status = 'approved'
        AND (p.expires_at IS NULL OR p.expires_at >= CURRENT_DATE)
    )
  );

-- 정책 확인
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd,
  qual as using_clause
FROM pg_policies 
WHERE tablename = 'monthly_ai_reflections'
ORDER BY policyname;

