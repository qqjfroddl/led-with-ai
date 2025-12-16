# Supabase SQL Editor에서 SQL 파일 실행 가이드

## 📋 목차
1. Supabase 대시보드 접속
2. SQL Editor 열기
3. SQL 파일 내용 복사
4. SQL 실행
5. 결과 확인
6. 문제 해결

---

## 1️⃣ Supabase 대시보드 접속

1. 웹 브라우저에서 [Supabase](https://supabase.com) 접속
2. **로그인** (Google 계정 또는 이메일)
3. 프로젝트 선택 (LEDsystem 관련 프로젝트)

---

## 2️⃣ SQL Editor 열기

### 방법 A: 사이드바에서 열기
1. 왼쪽 사이드바에서 **"SQL Editor"** 클릭
   - 아이콘: 📝 또는 "SQL Editor" 텍스트
   - 위치: 사이드바 상단 메뉴

### 방법 B: 직접 URL 접속
- URL 형식: `https://supabase.com/dashboard/project/[프로젝트ID]/sql/new`

---

## 3️⃣ SQL 파일 내용 복사

### 방법 A: 파일에서 직접 복사
1. 프로젝트 폴더에서 `supabase/force_add_expires_at.sql` 파일 열기
2. **전체 내용 선택** (Ctrl+A 또는 Cmd+A)
3. **복사** (Ctrl+C 또는 Cmd+C)

### 방법 B: 파일 내용 확인
파일 위치: `supabase/force_add_expires_at.sql`

파일 내용 요약:
- 1단계: 기존 컬럼 확인 (SELECT 쿼리)
- 2단계: 컬럼 추가 (DO 블록)
- 3단계: 인덱스 추가
- 4단계: 주석 추가
- 5단계: 최종 확인 (SELECT 쿼리)
- 6단계: 테스트 데이터 확인 (SELECT 쿼리)

---

## 4️⃣ SQL Editor에 붙여넣기

1. SQL Editor 화면 중앙의 **큰 텍스트 입력 영역** 클릭
2. **붙여넣기** (Ctrl+V 또는 Cmd+V)
3. SQL 코드가 입력 영역에 표시되는지 확인

**입력 영역 확인 사항:**
- SQL 코드가 보여야 함
- 구문 강조(syntax highlighting)가 적용되어야 함
- 스크롤 가능한 영역이어야 함

---

## 5️⃣ SQL 실행

### 방법 A: 버튼 클릭 (권장)
1. SQL Editor **우측 상단** 또는 **하단**에 있는 **"Run"** 버튼 클릭
   - 버튼 텍스트: "Run" 또는 "Run query" 또는 "▶ Run"
   - 색상: 보통 초록색 또는 파란색
2. 또는 **단축키 사용**: `Ctrl + Enter` (Windows/Linux) 또는 `Cmd + Enter` (Mac)

### 방법 B: 단축키만 사용
- **Windows/Linux**: `Ctrl + Enter`
- **Mac**: `Cmd + Enter`

**실행 전 확인:**
- ✅ SQL 코드가 모두 입력되어 있는지
- ✅ 주석(`--`)이 포함되어 있어도 문제없음
- ✅ 여러 개의 SQL 문이 있어도 순차적으로 실행됨

---

## 6️⃣ 결과 확인

### 6-1. 실행 상태 확인

**성공 시:**
- ✅ "Success" 또는 "Query executed successfully" 메시지
- ✅ 실행 시간 표시 (예: "Executed in 0.5s")
- ✅ Results 탭에 결과 표시

**실패 시:**
- ❌ 빨간색 에러 메시지 표시
- ❌ 에러 내용 확인 필요

### 6-2. Messages 탭 확인

1. SQL Editor 하단의 **"Messages"** 탭 클릭
2. 다음 메시지 중 하나가 표시되어야 함:
   - ✅ `✅ expires_at 컬럼이 성공적으로 추가되었습니다.`
   - ℹ️ `ℹ️ expires_at 컬럼이 이미 존재합니다.`
   - ❌ `❌ 에러 발생: [에러 내용]` (이 경우 에러 내용 확인 필요)

### 6-3. Results 탭 확인

1. SQL Editor 하단의 **"Results"** 탭 클릭
2. 여러 개의 결과 테이블이 표시됨:

   **1단계 결과 (기존 컬럼 확인):**
   - 빈 결과 또는 `expires_at` 컬럼 정보
   - 빈 결과 = 컬럼이 없음 (정상)

   **5단계 결과 (최종 확인):**
   - **반드시 결과가 나와야 함!**
   - 컬럼 정보:
     - `column_name`: `expires_at`
     - `data_type`: `date`
     - `is_nullable`: `YES`
     - `column_default`: `NULL`

   **6단계 결과 (테스트 데이터):**
   - 사용자 목록과 `expires_at` 값
   - 모든 사용자의 `expires_at`이 `NULL` (무제한)로 표시되어야 함

### 6-4. 실행 로그 확인

SQL Editor 하단의 **"Logs"** 또는 **"History"** 탭에서:
- 실행 시간
- 실행된 쿼리
- 결과 요약

---

## 7️⃣ 추가 확인 (Table Editor)

SQL 실행 후 Table Editor에서도 확인:

1. 왼쪽 사이드바에서 **"Table Editor"** 클릭
2. **"profiles"** 테이블 선택
3. 컬럼 목록에서 **"expires_at"** 확인
   - Type: `date`
   - Nullable: ✅ 체크됨
   - Default: 없음

---

## 8️⃣ 문제 해결

### 문제 1: "Run" 버튼이 비활성화됨
**원인:** SQL 코드가 입력되지 않음
**해결:** SQL 코드를 다시 붙여넣기

### 문제 2: "Permission denied" 에러
**원인:** 테이블 수정 권한 없음
**해결:** 
- 프로젝트 소유자인지 확인
- 또는 관리자에게 권한 요청

### 문제 3: "syntax error" 에러
**원인:** SQL 구문 오류
**해결:**
- 파일 내용을 다시 확인
- 복사 시 일부가 누락되지 않았는지 확인
- SQL Editor의 에러 메시지 확인

### 문제 4: 실행은 성공했지만 컬럼이 보이지 않음
**원인:** 스키마 캐시 문제
**해결:**
1. Supabase 프로젝트 재시작 (Settings → General → Restart Project)
2. 1-2분 대기
3. Table Editor에서 다시 확인

### 문제 5: "expires_at 컬럼이 이미 존재합니다" 메시지
**의미:** 컬럼이 이미 추가되어 있음
**다음 단계:**
- 5단계 결과에서 컬럼 정보 확인
- 프로젝트 재시작 후 테스트

---

## 9️⃣ 실행 후 필수 단계

SQL 실행이 성공했다면:

### 1. Supabase 프로젝트 재시작
1. Settings → General
2. "Restart Project" 클릭
3. 재시작 완료까지 1-2분 대기

### 2. 브라우저 새로고침
- 강력 새로고침: `Ctrl+Shift+R` (Windows/Linux) 또는 `Cmd+Shift+R` (Mac)

### 3. 관리자 페이지 테스트
1. `/admin.html` 접속
2. 사용 기한 설정 버튼 클릭
3. 정상 작동 확인

---

## 📸 참고: SQL Editor 화면 구성

```
┌─────────────────────────────────────────┐
│  SQL Editor                    [New] [+] │
├─────────────────────────────────────────┤
│                                         │
│  ┌─────────────────────────────────┐   │
│  │  [SQL 입력 영역]                  │   │
│  │  -- SQL 코드가 여기에 표시됨      │   │
│  │  SELECT ...                      │   │
│  │  ALTER TABLE ...                 │   │
│  └─────────────────────────────────┘   │
│                                         │
│  [Run] [Save] [Format] [History]       │
│                                         │
├─────────────────────────────────────────┤
│  [Results] [Messages] [Logs] [Chart]    │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │  결과 테이블이 여기에 표시됨      │   │
│  └─────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

---

## ✅ 체크리스트

SQL 실행 전:
- [ ] Supabase 대시보드에 로그인됨
- [ ] 올바른 프로젝트 선택됨
- [ ] SQL Editor 열림
- [ ] `force_add_expires_at.sql` 파일 내용 복사됨
- [ ] SQL 코드가 입력 영역에 붙여넣어짐

SQL 실행 후:
- [ ] "Success" 메시지 확인
- [ ] Messages 탭에서 "✅ 컬럼이 추가되었습니다" 확인
- [ ] Results 탭 5단계에서 `expires_at` 컬럼 정보 확인
- [ ] Table Editor에서 `expires_at` 컬럼 확인
- [ ] Supabase 프로젝트 재시작 완료
- [ ] 브라우저 새로고침 완료
- [ ] 관리자 페이지에서 테스트 성공

---

## 🔗 관련 파일

- `supabase/force_add_expires_at.sql` - 실행할 SQL 파일
- `SUPABASE_EXPIRES_AT_SETUP.md` - 전체 설정 가이드
- `supabase/verify_expires_at.sql` - 확인용 SQL (선택사항)

---

## 💡 팁

1. **SQL 저장**: 실행 전 "Save" 버튼으로 SQL을 저장하면 나중에 재사용 가능
2. **단축키**: `Ctrl+Enter` (또는 `Cmd+Enter`)로 빠르게 실행
3. **에러 확인**: 에러 발생 시 Messages 탭에서 상세 내용 확인
4. **부분 실행**: SQL의 일부만 선택하고 실행 가능 (디버깅용)

---

## ❓ 추가 도움이 필요한 경우

문제가 계속되면:
1. 에러 메시지 전체를 복사
2. SQL Editor의 스크린샷
3. Messages 탭의 내용
4. Results 탭의 결과

위 정보를 공유해주시면 더 정확한 도움을 드릴 수 있습니다.





