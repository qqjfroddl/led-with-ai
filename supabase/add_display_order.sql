-- todos 테이블에 display_order 컬럼 추가
-- 수동 순서 변경 기능용

ALTER TABLE public.todos 
ADD COLUMN IF NOT EXISTS display_order INTEGER;

-- 인덱스 추가 (정렬 성능 향상)
CREATE INDEX IF NOT EXISTS idx_todos_user_date_category_order 
ON public.todos(user_id, date, category, display_order NULLS LAST) 
WHERE deleted_at IS NULL;

-- 확인
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'todos' 
AND column_name = 'display_order';







