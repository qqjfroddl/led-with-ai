-- 중복된 루틴 정리 스크립트
-- 주의: 실행 전 반드시 백업하세요!

-- 1단계: 현재 상태 확인
SELECT 
  schedule->>'category' as category,
  COUNT(*) as total_count,
  COUNT(*) FILTER (WHERE is_active = true) as active_count,
  COUNT(*) FILTER (WHERE is_active = false) as inactive_count
FROM routines
WHERE user_id = (SELECT id FROM profiles WHERE email = '사용자이메일@example.com')  -- 실제 이메일로 변경
  AND schedule->>'type' = 'monthly'
  AND schedule->>'month' = '2025-01-01'  -- 현재 월
GROUP BY schedule->>'category';

-- 2단계: 중복 루틴 찾기 (같은 제목 + 같은 카테고리 + 모두 활성)
WITH duplicate_routines AS (
  SELECT 
    title,
    schedule->>'category' as category,
    COUNT(*) as count,
    ARRAY_AGG(id ORDER BY created_at DESC) as ids,  -- 최신 것이 첫 번째
    ARRAY_AGG(created_at ORDER BY created_at DESC) as created_dates
  FROM routines
  WHERE user_id = (SELECT id FROM profiles WHERE email = '사용자이메일@example.com')  -- 실제 이메일로 변경
    AND schedule->>'type' = 'monthly'
    AND schedule->>'month' = '2025-01-01'  -- 현재 월
    AND is_active = true
    AND deleted_at IS NULL
  GROUP BY title, schedule->>'category'
  HAVING COUNT(*) > 1
)
SELECT 
  title,
  category,
  count as duplicate_count,
  ids,
  created_dates
FROM duplicate_routines
ORDER BY category, title;

-- 3단계: 중복 제거 (가장 오래된 것만 남기고 나머지 비활성화)
-- 주의: 이 쿼리는 실제 데이터를 변경합니다!
-- 먼저 위의 SELECT로 확인 후 실행하세요!

/*
WITH duplicate_routines AS (
  SELECT 
    title,
    schedule->>'category' as category,
    ARRAY_AGG(id ORDER BY created_at ASC) as ids  -- 오래된 것부터
  FROM routines
  WHERE user_id = (SELECT id FROM profiles WHERE email = '사용자이메일@example.com')  -- 실제 이메일로 변경
    AND schedule->>'type' = 'monthly'
    AND schedule->>'month' = '2025-01-01'  -- 현재 월
    AND is_active = true
    AND deleted_at IS NULL
  GROUP BY title, schedule->>'category'
  HAVING COUNT(*) > 1
),
ids_to_deactivate AS (
  SELECT UNNEST(ids[2:]) as id  -- 첫 번째(가장 오래된 것) 제외하고 나머지
  FROM duplicate_routines
)
UPDATE routines
SET 
  is_active = false,
  deleted_at = NOW()
FROM ids_to_deactivate
WHERE routines.id = ids_to_deactivate.id
RETURNING routines.id, routines.title, routines.schedule->>'category' as category;
*/

