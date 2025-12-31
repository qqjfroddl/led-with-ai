-- 중복 루틴 정리 스크립트
-- 동일한 user_id + title + category의 루틴 중 가장 최신 것만 남기고 나머지는 삭제

-- 1. 중복 루틴 확인 (실행 전 확인용)
SELECT 
  user_id,
  title,
  (schedule->>'category') as category,
  COUNT(*) as count,
  array_agg(id ORDER BY created_at DESC) as routine_ids,
  array_agg(created_at ORDER BY created_at DESC) as created_dates
FROM routines
WHERE 
  schedule->>'type' = 'monthly'
  AND deleted_at IS NULL
GROUP BY user_id, title, (schedule->>'category')
HAVING COUNT(*) > 1;

-- 2. 중복 루틴 soft delete (가장 최신 것만 남기고 나머지 삭제)
WITH duplicates AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (
      PARTITION BY user_id, title, (schedule->>'category')
      ORDER BY created_at DESC
    ) as rn
  FROM routines
  WHERE 
    schedule->>'type' = 'monthly'
    AND deleted_at IS NULL
)
UPDATE routines
SET 
  deleted_at = NOW(),
  is_active = false
WHERE id IN (
  SELECT id 
  FROM duplicates 
  WHERE rn > 1
);

-- 3. 정리 결과 확인
SELECT 
  user_id,
  title,
  (schedule->>'category') as category,
  COUNT(*) as remaining_count
FROM routines
WHERE 
  schedule->>'type' = 'monthly'
  AND deleted_at IS NULL
GROUP BY user_id, title, (schedule->>'category')
ORDER BY user_id, category, title;












