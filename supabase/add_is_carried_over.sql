-- todos 테이블에 is_carried_over 컬럼 추가
-- 이관(carry-over)으로 생성된 새 row를 표시해, 정렬 시 기존 항목 아래에 배치하기 위함

ALTER TABLE public.todos
ADD COLUMN IF NOT EXISTS is_carried_over BOOLEAN NOT NULL DEFAULT false;

-- 확인
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_name = 'todos'
AND column_name = 'is_carried_over';
