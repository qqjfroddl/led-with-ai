-- period_key 형식 확인
-- Supabase Dashboard > SQL Editor에서 실행하세요

-- 1. 실제 DB에 저장된 period_key 형식 확인
SELECT 
  period_key,
  LENGTH(period_key) as key_length,
  scope,
  count,
  created_at::date as created_date
FROM ai_usage_counters
WHERE scope IN ('yearly_goal_feedback', 'monthly_plan')
ORDER BY created_at DESC
LIMIT 20;

-- 2. 오늘 날짜로 저장된 데이터 확인
SELECT 
  user_id,
  scope,
  period_key,
  count,
  created_at,
  updated_at
FROM ai_usage_counters
WHERE period_key LIKE '2025-12-%'
  AND scope IN ('yearly_goal_feedback', 'monthly_plan')
ORDER BY updated_at DESC;

-- 3. 특정 사용자의 데이터 확인 (user_id를 실제 ID로 변경)
SELECT 
  user_id,
  scope,
  period_key,
  count,
  created_at,
  updated_at
FROM ai_usage_counters
WHERE user_id = 'bc50489f-09cd-42bf-b290-7b91aa7ad691'
  AND scope IN ('yearly_goal_feedback', 'monthly_plan')
ORDER BY updated_at DESC;

