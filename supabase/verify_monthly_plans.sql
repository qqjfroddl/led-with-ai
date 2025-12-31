-- monthly_plans 테이블 구조 검증 및 보완
-- Supabase SQL Editor에서 실행하세요

-- 1. 현재 테이블 구조 확인
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'monthly_plans'
ORDER BY ordinal_position;

-- 2. UNIQUE 제약 조건 확인
SELECT
  constraint_name,
  constraint_type
FROM information_schema.table_constraints
WHERE table_schema = 'public'
  AND table_name = 'monthly_plans';

-- 3. 필요한 컬럼이 없는 경우 추가
-- 3-1. linked_year 컬럼 확인 및 추가
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'monthly_plans'
      AND column_name = 'linked_year'
  ) THEN
    ALTER TABLE public.monthly_plans 
    ADD COLUMN linked_year int;
    
    RAISE NOTICE '✅ linked_year 컬럼이 추가되었습니다.';
  ELSE
    RAISE NOTICE 'ℹ️ linked_year 컬럼이 이미 존재합니다.';
  END IF;
END $$;

-- 3-2. content_md 컬럼 확인 및 추가
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'monthly_plans'
      AND column_name = 'content_md'
  ) THEN
    ALTER TABLE public.monthly_plans 
    ADD COLUMN content_md text NOT NULL DEFAULT '';
    
    RAISE NOTICE '✅ content_md 컬럼이 추가되었습니다.';
  ELSE
    RAISE NOTICE 'ℹ️ content_md 컬럼이 이미 존재합니다.';
  END IF;
END $$;

-- 3-3. source 컬럼 확인 및 추가
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'monthly_plans'
      AND column_name = 'source'
  ) THEN
    ALTER TABLE public.monthly_plans 
    ADD COLUMN source text NOT NULL DEFAULT 'manual';
    
    -- 기존 데이터는 모두 'manual'로 설정
    UPDATE public.monthly_plans SET source = 'manual' WHERE source IS NULL;
    
    RAISE NOTICE '✅ source 컬럼이 추가되었습니다.';
  ELSE
    RAISE NOTICE 'ℹ️ source 컬럼이 이미 존재합니다.';
  END IF;
END $$;

-- 3-4. status 컬럼 확인 및 추가
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'monthly_plans'
      AND column_name = 'status'
  ) THEN
    ALTER TABLE public.monthly_plans 
    ADD COLUMN status text NOT NULL DEFAULT 'draft';
    
    -- 기존 데이터는 모두 'draft'로 설정
    UPDATE public.monthly_plans SET status = 'draft' WHERE status IS NULL;
    
    RAISE NOTICE '✅ status 컬럼이 추가되었습니다.';
  ELSE
    RAISE NOTICE 'ℹ️ status 컬럼이 이미 존재합니다.';
  END IF;
END $$;

-- 3-5. model 컬럼 확인 및 추가
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'monthly_plans'
      AND column_name = 'model'
  ) THEN
    ALTER TABLE public.monthly_plans 
    ADD COLUMN model text;
    
    RAISE NOTICE '✅ model 컬럼이 추가되었습니다.';
  ELSE
    RAISE NOTICE 'ℹ️ model 컬럼이 이미 존재합니다.';
  END IF;
END $$;

-- 3-6. prompt_version 컬럼 확인 및 추가
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'monthly_plans'
      AND column_name = 'prompt_version'
  ) THEN
    ALTER TABLE public.monthly_plans 
    ADD COLUMN prompt_version text;
    
    RAISE NOTICE '✅ prompt_version 컬럼이 추가되었습니다.';
  ELSE
    RAISE NOTICE 'ℹ️ prompt_version 컬럼이 이미 존재합니다.';
  END IF;
END $$;

-- 4. UNIQUE 제약 조건 확인 및 추가 (user_id, month_start, source)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema = 'public'
      AND table_name = 'monthly_plans'
      AND constraint_name = 'monthly_plans_user_id_month_start_source_key'
  ) THEN
    -- 기존 UNIQUE 제약이 다른 형식일 수 있으므로 확인 후 추가
    -- 만약 (user_id, month_start)만 있다면 제거 후 재생성 필요할 수 있음
    -- 여기서는 안전하게 새로운 제약만 추가 시도
    BEGIN
      ALTER TABLE public.monthly_plans 
      ADD CONSTRAINT monthly_plans_user_id_month_start_source_key 
      UNIQUE (user_id, month_start, source);
      
      RAISE NOTICE '✅ UNIQUE 제약 조건 (user_id, month_start, source)이 추가되었습니다.';
    EXCEPTION
      WHEN OTHERS THEN
        RAISE NOTICE '⚠️ UNIQUE 제약 조건 추가 실패 (이미 다른 형식의 제약이 있을 수 있음): %', SQLERRM;
    END;
  ELSE
    RAISE NOTICE 'ℹ️ UNIQUE 제약 조건 (user_id, month_start, source)이 이미 존재합니다.';
  END IF;
END $$;

-- 5. 인덱스 확인 및 추가
CREATE INDEX IF NOT EXISTS idx_monthly_plans_user_month 
  ON public.monthly_plans(user_id, month_start);

-- daily_routines에 GIN 인덱스 추가 (JSONB 검색용)
CREATE INDEX IF NOT EXISTS idx_monthly_plans_daily_routines 
  ON public.monthly_plans USING GIN (daily_routines);

-- 6. updated_at 트리거 확인 및 추가
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'set_updated_at_monthly_plans'
  ) THEN
    CREATE TRIGGER set_updated_at_monthly_plans
      BEFORE UPDATE ON public.monthly_plans
      FOR EACH ROW
      EXECUTE FUNCTION public.set_updated_at();
    
    RAISE NOTICE '✅ updated_at 트리거가 추가되었습니다.';
  ELSE
    RAISE NOTICE 'ℹ️ updated_at 트리거가 이미 존재합니다.';
  END IF;
END $$;

-- 7. RLS 활성화 확인
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename = 'monthly_plans'
      AND rowsecurity = true
  ) THEN
    ALTER TABLE public.monthly_plans ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE '✅ RLS가 활성화되었습니다.';
  ELSE
    RAISE NOTICE 'ℹ️ RLS가 이미 활성화되어 있습니다.';
  END IF;
END $$;

-- 8. RLS 정책 확인 및 생성 (직접 EXISTS 사용)
-- SELECT 정책
DROP POLICY IF EXISTS "monthly_plans_select_own_approved" ON public.monthly_plans;
CREATE POLICY "monthly_plans_select_own_approved" ON public.monthly_plans
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
DROP POLICY IF EXISTS "monthly_plans_insert_own_approved" ON public.monthly_plans;
CREATE POLICY "monthly_plans_insert_own_approved" ON public.monthly_plans
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
DROP POLICY IF EXISTS "monthly_plans_update_own_approved" ON public.monthly_plans;
CREATE POLICY "monthly_plans_update_own_approved" ON public.monthly_plans
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

-- 9. 최종 확인: 테이블 구조
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'monthly_plans'
ORDER BY ordinal_position;

-- 10. 최종 확인: RLS 정책
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd
FROM pg_policies 
WHERE tablename = 'monthly_plans'
ORDER BY policyname;


















