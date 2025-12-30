-- 현재 사용자의 1월 루틴 상태 확인
SELECT 
  id,
  title,
  schedule->>'category' as category,
  schedule->>'month' as month,
  schedule->>'order' as order_num,
  schedule->>'active_from_date' as active_from_date,
  is_active,
  deleted_at::date as deleted_date,
  created_at::date as created_date
FROM routines
WHERE user_id = (
  SELECT id FROM profiles 
  WHERE email = '사용자이메일@example.com'  -- 실제 이메일로 변경
)
  AND schedule->>'type' = 'monthly'
  AND schedule->>'month' = '2025-01-01'  -- 현재 월
ORDER BY 
  schedule->>'category',
  (schedule->>'order')::int NULLS LAST,
  created_at;

