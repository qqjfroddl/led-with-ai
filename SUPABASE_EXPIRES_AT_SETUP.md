# expires_at 컬럼 추가 가이드

## ⚠️ 문제 상황

SQL을 실행했는데도 `expires_at` 컬럼이 보이지 않는 경우, 다음 단계를 따라주세요.

## 🔍 1단계: 현재 상태 확인

Supabase SQL Editor에서 다음을 실행하여 현재 상태를 확인하세요:

```sql
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'profiles'
ORDER BY ordinal_position;
```

**예상 결과:**
- `expires_at` 컬럼이 **없다면** → 2단계로 진행
- `expires_at` 컬럼이 **있다면** → 3단계로 진행

## ✅ 2단계: 컬럼 강제 추가

`supabase/force_add_expires_at.sql` 파일의 내용을 Supabase SQL Editor에서 실행하세요.

또는 다음 SQL을 직접 실행:

```sql
-- 컬럼 강제 추가
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'expires_at'
  ) THEN
    ALTER TABLE public.profiles 
    ADD COLUMN expires_at date;
    
    RAISE NOTICE '✅ expires_at 컬럼이 성공적으로 추가되었습니다.';
  ELSE
    RAISE NOTICE 'ℹ️ expires_at 컬럼이 이미 존재합니다.';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '❌ 에러 발생: %', SQLERRM;
    RAISE;
END $$;

-- 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_profiles_expires_at 
ON public.profiles(expires_at) 
WHERE expires_at IS NOT NULL;

-- 주석 추가
COMMENT ON COLUMN public.profiles.expires_at IS 
'사용 기한 만료일 (NULL이면 무제한 사용 가능)';

-- 최종 확인
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'profiles'
  AND column_name = 'expires_at';
```

**실행 후 확인:**
- Messages 탭에서 "✅ expires_at 컬럼이 성공적으로 추가되었습니다." 메시지 확인
- Results 탭에서 `expires_at` 컬럼 정보 확인 (data_type: date, is_nullable: YES)

## 🔄 3단계: Supabase 프로젝트 재시작 (필수!)

컬럼이 추가되었어도 PostgREST 스키마 캐시를 갱신해야 합니다.

1. **Supabase 대시보드** 접속
2. **Settings** → **General** (또는 **Database** → **Settings**)
3. **"Restart Project"** 또는 **"Restart PostgREST"** 버튼 클릭
4. 재시작 완료까지 **1-2분 대기**

## 🌐 4단계: 브라우저 캐시 클리어

1. **강력 새로고침** 실행:
   - Windows/Linux: `Ctrl + Shift + R`
   - Mac: `Cmd + Shift + R`
2. 또는 개발자 도구 열기 (F12) → Network 탭 → "Disable cache" 체크 → 새로고침

## 🧪 5단계: 테스트

1. **관리자 페이지** 접속 (`/admin.html`)
2. **승인된 사용자** 섹션에서 **"설정"** 버튼 클릭
3. **사용 기한 설정** 모달에서 날짜 선택 후 **"저장"** 클릭
4. 에러 없이 저장되는지 확인

## ❌ 여전히 에러가 발생하는 경우

### 방법 A: Table Editor에서 수동 추가

1. Supabase 대시보드 → **Table Editor** → `profiles` 테이블
2. **"Add column"** 버튼 클릭
3. 설정:
   - **Column name**: `expires_at`
   - **Type**: `date`
   - **Nullable**: ✅ 체크
4. **Save** 클릭

### 방법 B: 권한 확인

Supabase SQL Editor에서 다음 실행:

```sql
-- 현재 사용자 및 권한 확인
SELECT 
  current_user,
  current_database(),
  has_table_privilege('public.profiles', 'ALTER') as can_alter;

-- profiles 테이블 소유자 확인
SELECT 
  schemaname,
  tablename,
  tableowner
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename = 'profiles';
```

### 방법 C: 직접 ALTER TABLE (에러 메시지 확인용)

```sql
-- IF NOT EXISTS 없이 직접 실행 (에러 메시지 확인)
ALTER TABLE public.profiles 
ADD COLUMN expires_at date;
```

에러가 발생하면 에러 메시지를 복사하여 확인하세요.

## 📋 체크리스트

- [ ] SQL 실행 후 `expires_at` 컬럼이 `information_schema.columns`에 표시됨
- [ ] Supabase Table Editor에서 `expires_at` 컬럼 확인됨
- [ ] Supabase 프로젝트 재시작 완료
- [ ] 브라우저 강력 새로고침 완료
- [ ] 관리자 페이지에서 사용 기한 설정 테스트 성공

## 🔗 관련 파일

- `supabase/force_add_expires_at.sql` - 강제 추가 스크립트
- `supabase/verify_expires_at.sql` - 확인 및 문제 해결 스크립트
- `supabase/add_expires_at.sql` - 기본 추가 스크립트
















