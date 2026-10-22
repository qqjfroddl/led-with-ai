-- 신청자 안내 메일 발송 기록 (2026-10-22)
-- 신청자에게 바로가기·사용법 메일을 보낸 시각. 비어 있으면 아직 안 보낸 것이다.
-- 용도: ① 같은 신청서로 두 번 보내지 않기(비어 있을 때만 채우는 조건부 UPDATE)
--       ② 같은 주소로 24시간 안에 다시 보내지 않기 ③ 기존 신청자 소급 발송 대상 찾기
-- 열 하나를 더할 뿐 기존 행·정책은 바꾸지 않는다. 서버(서버 키)만 읽고 쓴다.

ALTER TABLE public.access_requests
  ADD COLUMN IF NOT EXISTS guide_sent_at timestamptz;

CREATE INDEX IF NOT EXISTS access_requests_email_guide_idx
  ON public.access_requests (google_email, guide_sent_at);
