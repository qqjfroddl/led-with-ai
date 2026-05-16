-- 주말 루틴 분리 기능 토글 컬럼 추가
-- 2026-05-16
-- profiles 테이블에 weekend_routines_enabled 컬럼을 추가합니다.
-- - false (default): 기존 동작 그대로 (루틴 매일 노출)
-- - true: 주중/주말 루틴 분리 (schedule.day_type 필터링 적용)

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS weekend_routines_enabled boolean NOT NULL DEFAULT false;

-- 확인 쿼리
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_name = 'profiles'
  AND column_name = 'weekend_routines_enabled';

-- 롤백 (필요 시):
-- ALTER TABLE profiles DROP COLUMN IF EXISTS weekend_routines_enabled;
