// 사용 신청서(/apply) 입력 정리·검사
// 브라우저 검사는 편의일 뿐이고, 최종 방어선은 DB CHECK 제약(supabase/create_access_requests.sql)이다.
// 두 곳의 길이 기준은 같아야 한다.

export const LIMITS = { name: 50, email: 254, motivation: 1000 };

const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export const NOTION_GUIDE_URL =
  'https://app.notion.com/p/deeptactlearning1/AI-_-2e39a2ce37cc8055a1f0dffb003e7364';

export function normalizeRequest(input = {}) {
  return {
    name: String(input.name ?? '').trim().replace(/\s+/g, ' '),
    google_email: String(input.google_email ?? '').trim().toLowerCase(),
    motivation: String(input.motivation ?? '').trim()
  };
}

// 필드별 한국어 오류 문구를 돌려준다. 빈 객체면 통과
export function validateRequest(request) {
  const errors = {};
  if (!request.name) errors.name = '이름을 적어 주세요.';
  else if (request.name.length > LIMITS.name) errors.name = `이름은 ${LIMITS.name}자 안으로 적어 주세요.`;

  if (!request.google_email) errors.google_email = '구글 이메일을 적어 주세요.';
  else if (request.google_email.length > LIMITS.email || !EMAIL_PATTERN.test(request.google_email)) {
    errors.google_email = '이메일 형식이 아닙니다. 예: hong@gmail.com';
  }

  if (!request.motivation) errors.motivation = '신청 동기를 한 줄이라도 적어 주세요.';
  else if (request.motivation.length > LIMITS.motivation) {
    errors.motivation = `신청 동기는 ${LIMITS.motivation}자 안으로 적어 주세요.`;
  }
  return errors;
}

// 구글 계정은 회사 메일(구글 워크스페이스)일 수도 있어 막지는 않고 확인만 권한다
export function isLikelyGoogleEmail(email) {
  return /@(gmail\.com|googlemail\.com)$/.test(email);
}

// 신청 이메일이 실제 가입(구글 로그인)으로 이어졌는지 — 관리자 목록의 '가입 상태' 칸
export function signupStatusOf(email, profiles = []) {
  const profile = profiles.find((p) => (p.email || '').toLowerCase() === email);
  if (!profile) return { key: 'none', label: '가입 전' };
  if (profile.status === 'approved') return { key: 'approved', label: '승인됨' };
  if (profile.status === 'pending') return { key: 'pending', label: '가입·승인 대기' };
  return { key: 'other', label: profile.status === 'rejected' ? '재신청 대기' : profile.status };
}
