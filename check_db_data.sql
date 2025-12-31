-- 실제 DB 데이터 확인
SELECT
  user_id,
  scope,
  period_key,
  LENGTH(period_key) as key_length,
  count,
  created_at::date as created_date,
  updated_at
FROM ai_usage_counters
WHERE user_id = 'bc50489f-09cd-42bf-b290-7b91aa7ad691'
  AND scope IN ('yearly_goal_feedback', 'monthly_plan')
ORDER BY updated_at DESC
LIMIT 10;



