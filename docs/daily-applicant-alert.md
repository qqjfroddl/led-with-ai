# 승인 대기 신청자 일일 메일 알림

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
