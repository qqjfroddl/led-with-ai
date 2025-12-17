-- 프로필 자동 생성 수정 스크립트
-- Supabase SQL Editor에서 실행하세요

-- 1. 기존 트리거 함수 수정 (INSERT 시 프로필이 없으면 생성)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- profiles에 해당 사용자가 없으면 생성 (INSERT 시)
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = NEW.id) THEN
    INSERT INTO public.profiles (id, email, name, avatar_url)
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
      NEW.raw_user_meta_data->>'avatar_url'
    );
  END IF;
  RETURN NEW;
END;
$$;

-- 2. 로그인 시 프로필 자동 생성 트리거 추가
CREATE OR REPLACE FUNCTION public.handle_user_login()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- last_sign_in_at이 변경되었고 (로그인 발생), profiles에 해당 사용자가 없으면 생성
  IF OLD.last_sign_in_at IS DISTINCT FROM NEW.last_sign_in_at 
     AND NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = NEW.id) THEN
    INSERT INTO public.profiles (id, email, name, avatar_url, status, role)
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
      NEW.raw_user_meta_data->>'avatar_url',
      'pending',
      'user'
    );
  END IF;
  RETURN NEW;
END;
$$;

-- 3. 로그인 트리거 생성 (기존 트리거가 있으면 삭제 후 재생성)
DROP TRIGGER IF EXISTS on_auth_user_login ON auth.users;

CREATE TRIGGER on_auth_user_login
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  WHEN (OLD.last_sign_in_at IS DISTINCT FROM NEW.last_sign_in_at)
  EXECUTE FUNCTION public.handle_user_login();

-- 4. RLS 정책 수정: 본인의 프로필이 없을 때만 INSERT 허용
DROP POLICY IF EXISTS "profiles_insert_trigger_only" ON public.profiles;

CREATE POLICY "profiles_insert_own_if_missing" ON public.profiles
  FOR INSERT
  WITH CHECK (
    auth.uid() = id 
    AND NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid())
  );

-- 5. 현재 matt@deeptactlearning.com 사용자의 프로필 생성 (즉시 해결)
INSERT INTO public.profiles (id, email, name, status, role)
SELECT 
  id,
  email,
  COALESCE(raw_user_meta_data->>'full_name', raw_user_meta_data->>'name', ''),
  'pending',
  'user'
FROM auth.users
WHERE email = 'matt@deeptactlearning.com'
  AND NOT EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.users.id)
ON CONFLICT (id) DO NOTHING;

-- 6. 확인: 생성된 프로필 확인
SELECT id, email, name, status, created_at
FROM public.profiles
WHERE email = 'matt@deeptactlearning.com';













