-- 인생관리AI앱 사용 신청서 (/apply)
-- 가입(구글 로그인) 전에 받는 간단한 신청서다. 승인 자체는 기존대로 profiles.status로 한다.
-- 익명 방문자는 넣기만 하고 읽지 못한다. 읽기·삭제는 관리자만.
-- 기존 테이블은 건드리지 않는다. Supabase SQL Editor에서 한 번 실행한다.

CREATE TABLE IF NOT EXISTS public.access_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL
    CHECK (char_length(btrim(name)) BETWEEN 1 AND 50),
  google_email text NOT NULL
    CHECK (char_length(google_email) <= 254
       AND google_email = lower(btrim(google_email))
       AND google_email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  motivation text NOT NULL
    CHECK (char_length(btrim(motivation)) BETWEEN 1 AND 1000),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS access_requests_created_at_idx
  ON public.access_requests (created_at DESC);

ALTER TABLE public.access_requests ENABLE ROW LEVEL SECURITY;

-- 누구나 신청은 할 수 있다 (로그인 전 화면이므로 anon 포함)
DROP POLICY IF EXISTS "access_requests_insert_anyone" ON public.access_requests;
CREATE POLICY "access_requests_insert_anyone" ON public.access_requests
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- 목록 조회는 관리자만
DROP POLICY IF EXISTS "access_requests_admin_select" ON public.access_requests;
CREATE POLICY "access_requests_admin_select" ON public.access_requests
  FOR SELECT TO authenticated
  USING (public.is_admin());

-- 테스트·중복 신청 정리용 삭제도 관리자만
DROP POLICY IF EXISTS "access_requests_admin_delete" ON public.access_requests;
CREATE POLICY "access_requests_admin_delete" ON public.access_requests
  FOR DELETE TO authenticated
  USING (public.is_admin());
