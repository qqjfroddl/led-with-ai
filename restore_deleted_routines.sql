-- 삭제된 비활성 루틴 복구
-- 12월 8일~12월 12일 기간의 루틴 (모닝 8개 + 나이트 8개)

-- 모닝루틴 8개 (12월 8일 생성, 12월 13일 비활성화)
INSERT INTO routines (user_id, title, schedule, is_active, deleted_at, created_at, updated_at)
VALUES 
  ('707306f9-8f1a-40e6-ad25-1c619c00a9e9', '5분 QT, Refresh', 
   '{"type":"monthly","month":"2025-12-01","source":"monthly_goal","category":"morning","order":0,"active_from_date":"2025-12-08"}',
   false, '2025-12-13 01:44:51.591891+00', '2025-12-08 22:49:02.979961+00', '2025-12-13 01:44:51.591891+00'),
   
  ('707306f9-8f1a-40e6-ad25-1c619c00a9e9', 'Vital Prayer & 성경기도',
   '{"type":"monthly","month":"2025-12-01","source":"monthly_goal","category":"morning","order":1,"active_from_date":"2025-12-08"}',
   false, '2025-12-13 01:44:51.591891+00', '2025-12-08 22:49:02.979961+00', '2025-12-13 01:44:51.591891+00'),
   
  ('707306f9-8f1a-40e6-ad25-1c619c00a9e9', '그녀기도',
   '{"type":"monthly","month":"2025-12-01","source":"monthly_goal","category":"morning","order":2,"active_from_date":"2025-12-08"}',
   false, '2025-12-13 01:44:51.591891+00', '2025-12-08 22:49:02.979961+00', '2025-12-13 01:44:51.591891+00'),
   
  ('707306f9-8f1a-40e6-ad25-1c619c00a9e9', '크리스천 & 독특이',
   '{"type":"monthly","month":"2025-12-01","source":"monthly_goal","category":"morning","order":3,"active_from_date":"2025-12-08"}',
   false, '2025-12-13 01:44:51.591891+00', '2025-12-08 22:49:02.979961+00', '2025-12-13 01:44:51.591891+00'),
   
  ('707306f9-8f1a-40e6-ad25-1c619c00a9e9', '톨로 글 → FB, RI',
   '{"type":"monthly","month":"2025-12-01","source":"monthly_goal","category":"morning","order":4,"active_from_date":"2025-12-08"}',
   false, '2025-12-13 01:44:51.591891+00', '2025-12-08 22:49:02.979961+00', '2025-12-13 01:44:51.591891+00'),
   
  ('707306f9-8f1a-40e6-ad25-1c619c00a9e9', '오슬 & 과도들말기',
   '{"type":"monthly","month":"2025-12-01","source":"monthly_goal","category":"morning","order":5,"active_from_date":"2025-12-08"}',
   false, '2025-12-13 01:44:51.591891+00', '2025-12-08 22:49:02.979961+00', '2025-12-13 01:44:51.591891+00'),
   
  ('707306f9-8f1a-40e6-ad25-1c619c00a9e9', '출근계획 체크',
   '{"type":"monthly","month":"2025-12-01","source":"monthly_goal","category":"morning","order":6,"active_from_date":"2025-12-08"}',
   false, '2025-12-13 01:44:51.591891+00', '2025-12-08 22:49:02.979961+00', '2025-12-13 01:44:51.591891+00');

-- 나이트루틴 8개 (12월 8일 생성, 12월 13일 비활성화)
INSERT INTO routines (user_id, title, schedule, is_active, deleted_at, created_at, updated_at)
VALUES 
  ('707306f9-8f1a-40e6-ad25-1c619c00a9e9', '시트숙 (5\'이모드!)',
   '{"type":"monthly","month":"2025-12-01","source":"monthly_goal","category":"night","order":0,"active_from_date":"2025-12-08"}',
   false, '2025-12-13 01:44:51.591891+00', '2025-12-08 22:49:02.979961+00', '2025-12-13 01:44:51.591891+00'),
   
  ('707306f9-8f1a-40e6-ad25-1c619c00a9e9', '내일 기본 달기기 (카토드, 콘텐츠, 크로스쿠니)',
   '{"type":"monthly","month":"2025-12-01","source":"monthly_goal","category":"night","order":1,"active_from_date":"2025-12-08"}',
   false, '2025-12-13 01:44:51.591891+00', '2025-12-08 22:49:02.979961+00', '2025-12-13 01:44:51.591891+00'),
   
  ('707306f9-8f1a-40e6-ad25-1c619c00a9e9', '내토토칸',
   '{"type":"monthly","month":"2025-12-01","source":"monthly_goal","category":"night","order":2,"active_from_date":"2025-12-08"}',
   false, '2025-12-13 01:44:51.591891+00', '2025-12-08 23:34:27.637823+00', '2025-12-13 01:44:51.591891+00'),
   
  ('707306f9-8f1a-40e6-ad25-1c619c00a9e9', '라이브르크 (15\' 알개복)',
   '{"type":"monthly","month":"2025-12-01","source":"monthly_goal","category":"night","order":3,"active_from_date":"2025-12-08"}',
   false, '2025-12-13 01:44:51.591891+00', '2025-12-08 22:49:02.979961+00', '2025-12-13 01:44:51.591891+00'),
   
  ('707306f9-8f1a-40e6-ad25-1c619c00a9e9', '톨로크 글 → 업복트와일 출리이저 돈톤',
   '{"type":"monthly","month":"2025-12-01","source":"monthly_goal","category":"night","order":4,"active_from_date":"2025-12-08"}',
   false, '2025-12-13 01:44:51.591891+00', '2025-12-08 23:34:27.637823+00', '2025-12-13 01:44:51.591891+00'),
   
  ('707306f9-8f1a-40e6-ad25-1c619c00a9e9', '성돌노트',
   '{"type":"monthly","month":"2025-12-01","source":"monthly_goal","category":"night","order":5,"active_from_date":"2025-12-07"}',
   false, '2025-12-13 01:44:51.591891+00', '2025-12-07 23:04:57.906622+00', '2025-12-13 01:44:51.591891+00'),
   
  ('707306f9-8f1a-40e6-ad25-1c619c00a9e9', '스커릭, 또 크로스톤',
   '{"type":"monthly","month":"2025-12-01","source":"monthly_goal","category":"night","order":6,"active_from_date":"2025-12-08"}',
   false, '2025-12-13 01:44:51.591891+00', '2025-12-08 22:49:02.979961+00', '2025-12-13 01:44:51.591891+00'),
   
  ('707306f9-8f1a-40e6-ad25-1c619c00a9e9', '지린이 달글린',
   '{"type":"monthly","month":"2025-12-01","source":"monthly_goal","category":"night","order":7,"active_from_date":"2025-12-08"}',
   false, '2025-12-13 01:44:51.591891+00', '2025-12-08 22:49:02.979961+00', '2025-12-13 01:44:51.591891+00');

