-- RLS 정책 수정 - 즉시 실행 필요
-- Supabase SQL Editor에서 실행하세요

-- 1. 기존 INSERT 정책 확인
SELECT 
  policyname,
  cmd,
  qual as using_clause,
  with_check
FROM pg_policies 
WHERE tablename = 'profiles' 
  AND cmd = 'INSERT';

-- 2. 기존 INSERT 정책 삭제
DROP POLICY IF EXISTS "profiles_insert_trigger_only" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own_if_missing" ON public.profiles;

-- 3. 새로운 INSERT 정책 생성: 본인의 프로필이 없을 때만 INSERT 허용
CREATE POLICY "profiles_insert_own_if_missing" ON public.profiles
  FOR INSERT
  WITH CHECK (
    auth.uid() = id 
    AND NOT EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid()
    )
  );

-- 4. 정책 확인
SELECT 
  policyname,
  cmd,
  qual as using_clause,
  with_check
FROM pg_policies 
WHERE tablename = 'profiles' 
  AND cmd = 'INSERT';

-- 5. 로그인 트리거 확인 및 생성
-- 트리거 함수 생성/수정
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

-- 트리거 생성 (기존 트리거가 있으면 삭제 후 재생성)
DROP TRIGGER IF EXISTS on_auth_user_login ON auth.users;

CREATE TRIGGER on_auth_user_login
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  WHEN (OLD.last_sign_in_at IS DISTINCT FROM NEW.last_sign_in_at)
  EXECUTE FUNCTION public.handle_user_login();

-- 6. 현재 로그인한 사용자의 프로필 즉시 생성 (bc50489f-09cd-42bf-b290-7b91aa7ad691)
INSERT INTO public.profiles (id, email, name, status, role)
SELECT 
  id,
  email,
  COALESCE(raw_user_meta_data->>'full_name', raw_user_meta_data->>'name', email),
  'pending',
  'user'
FROM auth.users
WHERE id = 'bc50489f-09cd-42bf-b290-7b91aa7ad691'
  AND NOT EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.users.id)
ON CONFLICT (id) DO NOTHING;

-- 7. 생성 확인
SELECT id, email, name, status, created_at
FROM public.profiles
WHERE id = 'bc50489f-09cd-42bf-b290-7b91aa7ad691';

























