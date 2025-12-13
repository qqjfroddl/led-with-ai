# Supabase 스키마 캐시 갱신 방법

## 문제
SQL로 `expires_at` 컬럼을 추가했지만 여전히 "Could not find the 'expires_at' column" 에러가 발생하는 경우

## 원인
Supabase의 PostgREST가 스키마 캐시를 아직 갱신하지 않았기 때문입니다.

## 해결 방법 (순서대로 시도)

### 방법 1: Supabase 프로젝트 재시작 (가장 확실함)
1. Supabase 대시보드 접속
2. Settings → General (또는 Database → Settings)
3. "Restart Project" 또는 "Restart PostgREST" 버튼 클릭
4. 재시작 완료까지 1-2분 대기
5. 브라우저 새로고침 후 테스트

### 방법 2: 스키마 확인 후 대기
1. Supabase 대시보드 → Table Editor → `profiles` 테이블 열기
2. 컬럼 목록에 `expires_at`이 있는지 확인
3. 있다면: 2-3분 대기 후 브라우저 새로고침
4. 없다면: SQL을 다시 실행

### 방법 3: SQL로 직접 확인 및 재생성
Supabase SQL Editor에서 다음을 실행:

```sql
-- 1. 컬럼이 실제로 추가되었는지 확인
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'profiles'
  AND column_name = 'expires_at';

-- 2. 컬럼이 없다면 다시 추가
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS expires_at date;

-- 3. PostgREST 스키마 캐시 강제 갱신 (권한이 있다면)
NOTIFY pgrst, 'reload schema';
```

### 방법 4: API 직접 확인
브라우저 콘솔에서 다음 실행:

```javascript
// Supabase 클라이언트로 직접 확인
const { data, error } = await supabase
  .from('profiles')
  .select('id, email, expires_at')
  .limit(1);

console.log('Data:', data);
console.log('Error:', error);
```

만약 `data`에 `expires_at`이 포함되어 있다면 컬럼은 정상적으로 추가된 것입니다.

## 확인 체크리스트

- [ ] Supabase Table Editor에서 `expires_at` 컬럼 확인
- [ ] Supabase 프로젝트 재시작
- [ ] 브라우저 캐시 클리어 (Ctrl+Shift+R)
- [ ] 2-3분 대기 후 재시도
- [ ] API로 직접 조회 테스트

## 추가 디버깅

만약 위 방법들이 모두 실패한다면:

1. **Supabase 대시보드 → Database → Extensions** 확인
2. **Supabase 대시보드 → Settings → API** 확인
3. Supabase 지원팀에 문의 (스키마 캐시 갱신 문제)

