-- 반복업무 테이블 생성 및 RLS 정책 설정
-- 실행 순서: 이 파일을 Supabase SQL Editor에서 실행

-- 1. recurring_tasks 테이블 생성
CREATE TABLE IF NOT EXISTS public.recurring_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  category text NOT NULL CHECK (category IN ('work', 'job', 'self_dev', 'personal')),
  title text NOT NULL,
  repeat_type text NOT NULL CHECK (repeat_type IN ('weekdays', 'weekly', 'monthly')),
  repeat_config jsonb NOT NULL,
  -- weekdays: {}
  -- weekly: { "day_of_week": 1 } (0=일요일, 1=월요일, ..., 6=토요일)
  -- monthly: { "day_of_month": 20 } (1~31)
  start_date date NOT NULL,
  end_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

-- 2. todos 테이블에 recurring_task_id 컬럼 추가
ALTER TABLE public.todos 
ADD COLUMN IF NOT EXISTS recurring_task_id uuid REFERENCES public.recurring_tasks(id) ON DELETE SET NULL;

-- 3. 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_recurring_tasks_user_id ON public.recurring_tasks(user_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_todos_recurring_task_id ON public.todos(recurring_task_id) WHERE recurring_task_id IS NOT NULL;

-- 4. updated_at 트리거 추가
CREATE TRIGGER set_recurring_tasks_updated_at
  BEFORE UPDATE ON public.recurring_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- 5. RLS 활성화
ALTER TABLE public.recurring_tasks ENABLE ROW LEVEL SECURITY;

-- 6. RLS 정책 생성 (승인 사용자만 접근)
-- recurring_tasks SELECT
DROP POLICY IF EXISTS "recurring_tasks_select_own_approved" ON public.recurring_tasks;
CREATE POLICY "recurring_tasks_select_own_approved" ON public.recurring_tasks
  FOR SELECT
  USING (
    user_id = auth.uid() 
    AND EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.id = auth.uid() 
      AND p.status = 'approved' 
      AND (p.expires_at IS NULL OR p.expires_at >= CURRENT_DATE)
    )
  );

-- recurring_tasks INSERT
DROP POLICY IF EXISTS "recurring_tasks_insert_own_approved" ON public.recurring_tasks;
CREATE POLICY "recurring_tasks_insert_own_approved" ON public.recurring_tasks
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid() 
    AND EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.id = auth.uid() 
      AND p.status = 'approved' 
      AND (p.expires_at IS NULL OR p.expires_at >= CURRENT_DATE)
    )
  );

-- recurring_tasks UPDATE
DROP POLICY IF EXISTS "recurring_tasks_update_own_approved" ON public.recurring_tasks;
CREATE POLICY "recurring_tasks_update_own_approved" ON public.recurring_tasks
  FOR UPDATE
  USING (
    user_id = auth.uid() 
    AND EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.id = auth.uid() 
      AND p.status = 'approved' 
      AND (p.expires_at IS NULL OR p.expires_at >= CURRENT_DATE)
    )
  );

-- recurring_tasks DELETE (soft delete)
DROP POLICY IF EXISTS "recurring_tasks_delete_own_approved" ON public.recurring_tasks;
CREATE POLICY "recurring_tasks_delete_own_approved" ON public.recurring_tasks
  FOR UPDATE
  USING (
    user_id = auth.uid() 
    AND EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.id = auth.uid() 
      AND p.status = 'approved' 
      AND (p.expires_at IS NULL OR p.expires_at >= CURRENT_DATE)
    )
  );

-- 확인 쿼리
SELECT 
  'recurring_tasks' as table_name,
  COUNT(*) as policy_count
FROM pg_policies 
WHERE tablename = 'recurring_tasks';

