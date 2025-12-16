-- yearly_ai_reflections 테이블 생성 및 RLS 정책 설정
-- Supabase SQL Editor에서 실행하세요

-- 0. 공통 승인 체크 함수 생성 (없는 경우)
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

-- 1. 테이블 생성
CREATE TABLE IF NOT EXISTS public.yearly_ai_reflections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  year int NOT NULL,
  content_md text NOT NULL,
  model text NOT NULL,
  prompt_version text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, year)
);

-- 2. 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_yearly_ai_reflections_user_year 
  ON public.yearly_ai_reflections(user_id, year);

-- 3. updated_at 트리거 설정 (기존 함수 사용)
CREATE TRIGGER set_updated_at_yearly_ai_reflections
  BEFORE UPDATE ON public.yearly_ai_reflections
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- 4. RLS 활성화
ALTER TABLE public.yearly_ai_reflections ENABLE ROW LEVEL SECURITY;

-- 5. RLS 정책 생성 (승인 사용자만 접근)
-- 직접 EXISTS를 사용하여 함수 호출 문제 방지
-- SELECT 정책
DROP POLICY IF EXISTS "yearly_ai_reflections_select_own_approved" ON public.yearly_ai_reflections;
CREATE POLICY "yearly_ai_reflections_select_own_approved" ON public.yearly_ai_reflections
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
DROP POLICY IF EXISTS "yearly_ai_reflections_insert_own_approved" ON public.yearly_ai_reflections;
CREATE POLICY "yearly_ai_reflections_insert_own_approved" ON public.yearly_ai_reflections
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
DROP POLICY IF EXISTS "yearly_ai_reflections_update_own_approved" ON public.yearly_ai_reflections;
CREATE POLICY "yearly_ai_reflections_update_own_approved" ON public.yearly_ai_reflections
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

-- DELETE 정책 (선택사항, 필요시 활성화)
-- DROP POLICY IF EXISTS "yearly_ai_reflections_delete_own_approved" ON public.yearly_ai_reflections;
-- CREATE POLICY "yearly_ai_reflections_delete_own_approved" ON public.yearly_ai_reflections
--   FOR DELETE
--   USING (
--     user_id = auth.uid()
--     AND public.is_user_approved()
--   );

-- 6. 정책 확인
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd,
  qual as using_clause
FROM pg_policies 
WHERE tablename = 'yearly_ai_reflections'
ORDER BY policyname;

-- 7. 테이블 구조 확인
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'yearly_ai_reflections'
ORDER BY ordinal_position;



