-- 루틴 중복 문제 진단 쿼리
-- 사용자 이메일을 실제 이메일로 변경하세요

-- 1. 전체 루틴 상태 확인 (활성/비활성 모두)
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
  WHERE email = '사용자이메일@example.com'  -- ⚠️ 실제 이메일로 변경
)
  AND schedule->>'type' = 'monthly'
  AND schedule->>'month' = '2025-01-01'  -- 현재 월
ORDER BY 
  schedule->>'category',
  title,
  created_at;

-- 2. 같은 제목의 루틴이 여러 개 있는지 확인
SELECT 
  title,
  schedule->>'category' as category,
  COUNT(*) as total_count,
  COUNT(*) FILTER (WHERE is_active = true) as active_count,
  COUNT(*) FILTER (WHERE is_active = false) as inactive_count,
  STRING_AGG(
    CONCAT(
      'id:', id, 
      ' active:', is_active, 
      ' from:', schedule->>'active_from_date',
      ' deleted:', deleted_at::date
    ), 
    ' | ' 
    ORDER BY created_at
  ) as details
FROM routines
WHERE user_id = (
  SELECT id FROM profiles 
  WHERE email = '사용자이메일@example.com'  -- ⚠️ 실제 이메일로 변경
)
  AND schedule->>'type' = 'monthly'
  AND schedule->>'month' = '2025-01-01'
GROUP BY title, schedule->>'category'
HAVING COUNT(*) > 1
ORDER BY schedule->>'category', title;

-- 3. 어제 날짜(2025-01-29)에 표시될 루틴 시뮬레이션
-- isRoutineDue 로직: active_from_date <= 선택날짜 < deleted_at
SELECT 
  title,
  schedule->>'category' as category,
  schedule->>'active_from_date' as active_from_date,
  deleted_at::date as deleted_date,
  is_active,
  CASE 
    WHEN schedule->>'active_from_date' > '2025-01-29' THEN '❌ 아직 시작 전'
    WHEN deleted_at IS NOT NULL AND deleted_at::date < '2025-01-29' THEN '❌ 이미 삭제됨'
    ELSE '✅ 표시됨'
  END as show_on_yesterday
FROM routines
WHERE user_id = (
  SELECT id FROM profiles 
  WHERE email = '사용자이메일@example.com'  -- ⚠️ 실제 이메일로 변경
)
  AND schedule->>'type' = 'monthly'
  AND schedule->>'month' = '2025-01-01'
ORDER BY 
  schedule->>'category',
  title,
  created_at;






