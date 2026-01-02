-- 프로젝트 할일에 시작일/종료일 컬럼 추가
-- 실행 순서: 이 파일을 Supabase SQL Editor에서 실행

-- 1. project_tasks 테이블에 start_date, end_date 컬럼 추가
ALTER TABLE public.project_tasks 
ADD COLUMN IF NOT EXISTS start_date date,
ADD COLUMN IF NOT EXISTS end_date date;

-- 2. 인덱스 생성 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_project_tasks_dates 
ON public.project_tasks(start_date, end_date) 
WHERE deleted_at IS NULL AND start_date IS NOT NULL;

-- 3. 기존 due_date를 start_date로 마이그레이션 (선택)
-- 주석 해제하면 기존 데이터를 start_date로 복사
-- UPDATE public.project_tasks 
-- SET start_date = due_date 
-- WHERE due_date IS NOT NULL AND start_date IS NULL;

-- 4. 확인 쿼리
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'project_tasks' 
  AND column_name IN ('due_date', 'start_date', 'end_date')
ORDER BY column_name;

-- 5. 인덱스 확인
SELECT 
  indexname, 
  indexdef
FROM pg_indexes 
WHERE tablename = 'project_tasks' 
  AND indexname LIKE '%date%';

