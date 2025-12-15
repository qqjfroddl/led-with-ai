-- todos 테이블에 skipped_at 컬럼 추가
-- "포기한 할일" 기록용

ALTER TABLE public.todos 
ADD COLUMN IF NOT EXISTS skipped_at TIMESTAMPTZ;

-- 인덱스 추가 (조회 성능 향상)
CREATE INDEX IF NOT EXISTS idx_todos_user_skipped 
ON public.todos(user_id, skipped_at) 
WHERE skipped_at IS NULL;

-- 확인
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'todos' 
AND column_name IN ('carried_over_at', 'deleted_at', 'skipped_at')
ORDER BY column_name;








