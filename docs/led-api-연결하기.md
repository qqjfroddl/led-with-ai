# 인생관리AI앱 API 켜기 (소장님 직접 작업)

클로드 코드에서 앱 기록을 조작하는 API가 배포돼 있지만, 지금은 **잠겨 있습니다.**
Vercel에 환경변수 2개를 넣고 재배포하면 열립니다.

- 제가 대신 못 하는 이유: 이 앱은 소장님 개인 Vercel 계정(qqjfroddl) 소속인데, 제 Vercel CLI는 다른 계정으로 로그인돼 있습니다.
- 걸리는 시간: 5분
- 넣는 값은 둘 다 **비밀번호가 아닙니다.** 토큰 해시(원문을 알아낼 수 없는 값)와 로그인 이메일입니다. 토큰 원문은 이 PC의 파일에만 있습니다.

---

## 1단계 — Vercel 프로젝트 설정 열기

1. 아래 주소를 브라우저에 붙여넣어 엽니다.

```
https://vercel.com/qqjfroddls-projects/led-with-ai/settings/environment-variables
```

2. 화면 **오른쪽 위 계정이 qqjfroddl**인지 확인합니다. deeptactlearning이면 계정을 바꾼 뒤 위 주소를 다시 엽니다.
3. **Environment Variables** 화면이 보이면 정상입니다. 목록에 `SUPABASE_SECRET_KEY`, `RESEND_API_KEY` 같은 기존 값이 이미 있습니다. 그대로 둡니다.

## 2단계 — 첫 번째 값: 토큰 해시

1. **Add Environment Variable**(또는 **Add New**)을 누릅니다.
2. **Key** 칸에 아래 이름을 붙여넣습니다.

```
LED_API_TOKEN_SHA256
```

3. **Value** 칸에 아래 값을 붙여넣습니다. 64자리입니다.

```
5071d2314cd67a37e89e858319258d5b7c762788d962e57ca0d1dfe4bb87174d
```

4. **Environments**에서 **Production**, **Preview**, **Development**를 모두 체크합니다.
5. **Sensitive** 스위치가 있으면 켜도 되고 꺼도 됩니다. 어느 쪽이든 동작합니다.
6. **Save**를 누릅니다.

## 3단계 — 두 번째 값: 로그인 이메일

1. 다시 **Add Environment Variable**을 누릅니다.
2. **Key** 칸:

```
LED_API_USER_EMAIL
```

3. **Value** 칸. 소장님이 인생관리AI앱에 로그인할 때 쓰시는 이메일입니다.

```
matt@deeptactlearning.com
```

   ※ 다른 이메일로 로그인하신다면 그 이메일을 넣습니다.

4. **Production**, **Preview**, **Development**를 모두 체크합니다.
5. **Save**를 누릅니다.

## 4단계 — 재배포 (빼먹으면 적용되지 않습니다)

⚠️ Vercel 환경변수는 **저장만으로는 반영되지 않습니다.** 재배포해야 들어갑니다.

1. 아래 주소를 엽니다.

```
https://vercel.com/qqjfroddls-projects/led-with-ai/deployments
```

2. 맨 위 배포(가장 최근, **Production** 표시가 있는 것) 오른쪽의 **⋯** 를 누릅니다.
3. **Redeploy**를 누릅니다.
4. 창이 뜨면 다시 **Redeploy**를 누릅니다.
5. 1~2분 뒤 상태가 **Ready**가 되면 끝입니다.

## 5단계 — 확인

아래 주소를 엽니다.

```
https://led-with-ai.vercel.app/api/health
```

- **정상**: 첫머리가 `{"status":"ok"` 로 시작합니다.
- **아직 안 됨**: `"status":"degraded"` 이고 `"missing"` 안에 이름이 보입니다. 그 이름의 단계를 다시 확인합니다.

정상이면 저에게 **"API 켰어"**라고만 말씀해 주세요. 제가 실제 데이터로 시험하고, 맥미니(디스코드 봇) 연결까지 마치겠습니다.

---

## 잘 안 될 때

| 증상 | 원인 | 해결 |
|---|---|---|
| health의 `missing`에 이름이 계속 보임 | 재배포를 안 했거나, 이름에 오타·공백이 있음 | 4단계 재배포. 이름은 코드블록에서 다시 복사 |
| `problems`에 "64자리 SHA-256 해시를 넣어야" | Value에 다른 값이 들어감 | 2단계 값을 코드블록에서 다시 복사 |
| health는 ok인데 클로드에서 "프로필이 0개" | 3단계 이메일이 앱 로그인 이메일과 다름 | 앱에 로그인하는 이메일로 고치고 재배포 |
| 설정 화면 주소가 404 | 다른 계정으로 로그인돼 있음 | 오른쪽 위 계정을 qqjfroddl로 |

**되돌리는 법**: API를 다시 잠그려면 `LED_API_TOKEN_SHA256`을 지우고(**⋯ → Remove**) 재배포하면 됩니다. 앱 화면에는 아무 영향이 없습니다.

막히면 몇 단계에서 화면에 무엇이 떴는지만 알려 주세요.
