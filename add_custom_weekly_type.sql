-- 반복업무 - 특정 요일 선택 기능 추가 (custom_weekly)
-- 2026-01-27

-- CHECK 제약조건 수정: custom_weekly 타입 추가
ALTER TABLE recurring_tasks 
DROP CONSTRAINT IF EXISTS recurring_tasks_repeat_type_check;

ALTER TABLE recurring_tasks 
ADD CONSTRAINT recurring_tasks_repeat_type_check 
CHECK (repeat_type IN ('daily', 'weekdays', 'weekends', 'weekly', 'monthly', 'custom_weekly'));

-- 확인 쿼리
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'recurring_tasks'::regclass 
AND conname = 'recurring_tasks_repeat_type_check';
