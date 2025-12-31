-- profiles 자동 생성 함수 (클라이언트에서 호출 가능)
-- Supabase SQL Editor에서 실행하세요

-- 1. 프로필 생성 함수 생성 (SECURITY DEFINER로 RLS 우회)
CREATE OR REPLACE FUNCTION public.create_profile_if_missing()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- profiles에 해당 사용자가 없으면 생성
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = NEW.id) THEN
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

-- 2. auth.users 업데이트 시에도 프로필 생성 트리거 추가 (로그인 시 실행)
CREATE TRIGGER IF NOT EXISTS on_auth_user_login
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  WHEN (OLD.last_sign_in_at IS DISTINCT FROM NEW.last_sign_in_at)
  EXECUTE FUNCTION public.create_profile_if_missing();

-- 3. 또는 직접 호출 가능한 함수 생성
CREATE OR REPLACE FUNCTION public.ensure_profile_exists()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_user_id UUID;
BEGIN
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;
  
  -- profiles에 해당 사용자가 없으면 생성
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = current_user_id) THEN
    INSERT INTO public.profiles (id, email, name, avatar_url, status, role)
    SELECT 
      u.id,
      u.email,
      COALESCE(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', ''),
      u.raw_user_meta_data->>'avatar_url',
      'pending',
      'user'
    FROM auth.users u
    WHERE u.id = current_user_id;
  END IF;
END;
$$;

-- 4. RLS 정책 수정: 본인의 프로필이 없을 때만 INSERT 허용
DROP POLICY IF EXISTS "profiles_insert_trigger_only" ON public.profiles;

CREATE POLICY "profiles_insert_own_if_missing" ON public.profiles
  FOR INSERT
  WITH CHECK (
    auth.uid() = id 
    AND NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid())
  );

-- 5. 테스트: 현재 사용자의 프로필 확인 및 생성
SELECT public.ensure_profile_exists();

-- 6. matt@deeptactlearning.com 사용자의 프로필 수동 생성 (필요시)
-- 먼저 auth.users에서 ID 확인
SELECT id, email FROM auth.users WHERE email = 'matt@deeptactlearning.com';

-- 위에서 확인한 ID로 프로필 생성 (예시)
-- INSERT INTO public.profiles (id, email, name, status, role)
-- SELECT 
--   id,
--   email,
--   COALESCE(raw_user_meta_data->>'full_name', raw_user_meta_data->>'name', ''),
--   'pending',
--   'user'
-- FROM auth.users
-- WHERE email = 'matt@deeptactlearning.com'
-- ON CONFLICT (id) DO NOTHING;

























