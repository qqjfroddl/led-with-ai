-- 현재 루틴 상태 확인
SELECT 
  id,
  title,
  schedule->>'category' as category,
  schedule->>'month' as month,
  schedule->>'active_from_date' as active_from_date,
  is_active,
  deleted_at,
  created_at
FROM routines
WHERE user_id = '707306f9-8f1a-40e6-ad25-1c619c00a9e9'
  AND schedule->>'type' = 'monthly'
  AND schedule->>'month' = '2025-12-01'
ORDER BY schedule->>'category', title;



