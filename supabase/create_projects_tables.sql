-- 프로젝트 및 프로젝트 할일 테이블 생성 및 RLS 정책 설정
-- 실행 순서: 이 파일을 Supabase SQL Editor에서 실행

-- 1. projects 테이블 생성
CREATE TABLE IF NOT EXISTS public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  category text NOT NULL CHECK (category IN ('self_dev', 'relationship', 'work_finance')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

-- 2. project_tasks 테이블 생성
CREATE TABLE IF NOT EXISTS public.project_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  due_date date,
  is_done boolean NOT NULL DEFAULT false,
  done_at timestamptz,
  display_order integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

-- 3. todos 테이블에 project_task_id 컬럼 추가
ALTER TABLE public.todos 
ADD COLUMN IF NOT EXISTS project_task_id uuid REFERENCES public.project_tasks(id) ON DELETE SET NULL;

-- 4. 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON public.projects(user_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_project_tasks_project_id ON public.project_tasks(project_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_project_tasks_user_id ON public.project_tasks(user_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_project_tasks_display_order ON public.project_tasks(project_id, display_order NULLS LAST) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_todos_project_task_id ON public.todos(project_task_id) WHERE project_task_id IS NOT NULL;

-- 5. updated_at 트리거 추가
CREATE TRIGGER set_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_project_tasks_updated_at
  BEFORE UPDATE ON public.project_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- 6. RLS 활성화
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_tasks ENABLE ROW LEVEL SECURITY;

-- 7. RLS 정책 생성 (승인 사용자만 접근)
-- projects SELECT
DROP POLICY IF EXISTS "projects_select_own_approved" ON public.projects;
CREATE POLICY "projects_select_own_approved" ON public.projects
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

-- projects INSERT
DROP POLICY IF EXISTS "projects_insert_own_approved" ON public.projects;
CREATE POLICY "projects_insert_own_approved" ON public.projects
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

-- projects UPDATE
DROP POLICY IF EXISTS "projects_update_own_approved" ON public.projects;
CREATE POLICY "projects_update_own_approved" ON public.projects
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

-- projects DELETE (soft delete)
DROP POLICY IF EXISTS "projects_delete_own_approved" ON public.projects;
CREATE POLICY "projects_delete_own_approved" ON public.projects
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

-- project_tasks SELECT
DROP POLICY IF EXISTS "project_tasks_select_own_approved" ON public.project_tasks;
CREATE POLICY "project_tasks_select_own_approved" ON public.project_tasks
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

-- project_tasks INSERT
DROP POLICY IF EXISTS "project_tasks_insert_own_approved" ON public.project_tasks;
CREATE POLICY "project_tasks_insert_own_approved" ON public.project_tasks
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

-- project_tasks UPDATE
DROP POLICY IF EXISTS "project_tasks_update_own_approved" ON public.project_tasks;
CREATE POLICY "project_tasks_update_own_approved" ON public.project_tasks
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

-- project_tasks DELETE (soft delete)
DROP POLICY IF EXISTS "project_tasks_delete_own_approved" ON public.project_tasks;
CREATE POLICY "project_tasks_delete_own_approved" ON public.project_tasks
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
  'projects' as table_name,
  COUNT(*) as policy_count
FROM pg_policies 
WHERE tablename = 'projects'
UNION ALL
SELECT 
  'project_tasks' as table_name,
  COUNT(*) as policy_count
FROM pg_policies 
WHERE tablename = 'project_tasks';






