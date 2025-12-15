-- ai_usage_counters 테이블의 scope CHECK 제약조건 수정
-- yearly_reflection 추가

-- 기존 제약조건 삭제
ALTER TABLE public.ai_usage_counters
DROP CONSTRAINT IF EXISTS ai_usage_counters_scope_check;

-- 새로운 제약조건 추가 (yearly_reflection 포함)
ALTER TABLE public.ai_usage_counters
ADD CONSTRAINT ai_usage_counters_scope_check
CHECK (scope IN (
  'weekly_reflection',
  'monthly_reflection',
  'yearly_reflection',
  'monthly_plan',
  'yearly_goal_feedback'
));

