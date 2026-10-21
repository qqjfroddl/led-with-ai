# 신청자 메일 알림 (즉시 + 일일)

알림은 두 가지입니다. 둘 다 `matt@deeptactlearning.com`으로만 갑니다.

| 언제 | 대상 | 경로 |
|---|---|---|
| 사용 신청서(/apply) 제출 즉시 | `access_requests` 새 행 1건 | `POST /api/access-request-alert` |
| 매일 오전 9시(KST) | `profiles.status = 'pending'` 전체 | `GET /api/daily-applicant-alert` (Cron) |

## 즉시 알림 (/apply)

신청서 화면이 id를 미리 만들어 저장한 뒤, 그 id만 알림 경로에 넘깁니다.
익명 사용자는 RLS 때문에 저장한 행을 다시 읽을 수 없어서 id를 화면에서 만듭니다.

- 메일 내용은 서버 키로 DB에서 다시 읽은 값만 씁니다. 화면이 보낸 이름·내용은 쓰지 않습니다.
- 생성 10분이 지난 신청서로는 보내지 않습니다(`sent: false, reason: stale`).
- 같은 신청서는 Resend 멱등키 `life-ai-access-request-<id>`로 한 번만 보냅니다.
- 알림이 실패해도 신청은 이미 저장된 상태라 신청자 화면에는 영향이 없습니다.
- 필요한 환경변수는 아래 일일 알림과 같고, `CRON_SECRET`은 쓰지 않습니다.

## 일일 알림 (승인 대기)

매일 오전 9시(KST)에 `profiles.status = 'pending'`인 신청자를 확인합니다.
대기자가 있을 때만 `matt@deeptactlearning.com`으로 한 통의 요약 메일을 보냅니다.

Vercel Hobby 플랜에서는 실행 시각이 최대 59분 늦어질 수 있습니다.
같은 날짜에 함수가 재시도되더라도 Resend 멱등키로 중복 발송을 막습니다.

## Vercel 환경변수

- `SUPABASE_URL`: 선택. 없으면 기존 `VITE_SUPABASE_URL` 사용
- `SUPABASE_SECRET_KEY`: 서버 전용 secret key. 레거시 프로젝트는 `SUPABASE_SERVICE_ROLE_KEY`도 지원
- `RESEND_API_KEY`: Resend 서버 API 키
- `APPLICANT_ALERT_FROM`: 선택. 없으면 `인생관리AI앱 <onboarding@resend.dev>` 사용
- `CRON_SECRET`: 16자 이상의 무작위 값. Vercel이 Cron 요청의 Authorization 헤더에 자동으로 넣음

비밀값은 Vercel 프로젝트 Settings > Environment Variables에서 직접 입력합니다.
채팅, 코드, Git에는 입력하지 않습니다.

## 동작 확인

환경변수 설정과 프로덕션 재배포 후 Vercel 프로젝트의 Settings > Cron Jobs에서
`/api/daily-applicant-alert`를 확인합니다.

- 대기자 없음: `{ "ok": true, "sent": false, "pendingCount": 0 }`
- 대기자 있음: `{ "ok": true, "sent": true, "pendingCount": N, ... }`
- 설정 누락: HTTP 500
- 인증 실패: HTTP 401

실제 신청자의 개인정보는 함수 응답이나 성공 로그에 남기지 않습니다.
