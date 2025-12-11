import { signOut } from '../utils/auth.js';

export async function renderPending(profile) {
  // 로그아웃 핸들러를 전역으로 등록
  window.handlePendingLogout = async () => {
    try {
      await signOut();
      // 로그아웃 후 라우터가 자동으로 로그인 화면으로 이동함
    } catch (error) {
      console.error('Logout error:', error);
      alert('로그아웃 중 오류가 발생했습니다.');
    }
  };

  return `
    <div class="auth-container">
      <h1>승인 대기 중</h1>
      <p>관리자 승인을 기다리고 있습니다.</p>
      <p style="color: var(--text-secondary); font-size: 0.9rem; margin-top: 1rem;">
        승인되면 이메일로 알려드리겠습니다.
      </p>
      <hr style="border: none; border-top: 1px solid var(--border-color); margin: 2rem 0; width: 100%; max-width: 400px;">
      <p style="color: var(--text-secondary); font-size: 0.9rem;">
        혹시 문의 사항이 있으면 <a href="mailto:ledhelper@daum.net" style="color: var(--primary-color); text-decoration: none;">ledhelper@daum.net</a>으로 연락해주세요
      </p>
      <button onclick="window.handlePendingLogout()" class="btn btn-secondary" style="margin-top: 2rem;">
        로그아웃
      </button>
    </div>
  `;
}

