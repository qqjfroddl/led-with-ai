import { toast } from '../utils/toast.js';
import { signOut } from '../utils/auth.js';

export async function renderPending(profile) {
  // 로그아웃 핸들러를 전역으로 등록
  window.handlePendingLogout = async () => {
    try {
      await signOut();
      // 로그아웃 후 라우터가 자동으로 로그인 화면으로 이동함
    } catch (error) {
      console.error('Logout error:', error);
      toast('로그아웃 중 오류가 발생했습니다.');
    }
  };

  return `
    <div class="auth-container">
      <h1>승인 대기 중</h1>
      <p>관리자 승인을 기다리고 있습니다.</p>
      <p class="c-var--text-secondary fz-0_9rem mt-1rem">
        승인되면 이메일로 알려드리겠습니다.
      </p>
      <hr class="bd-none bdt-1px-solid-var--border-color m-2rem-0 w-100pct maxw-400px">
      <p class="c-var--text-secondary fz-0_9rem">
        혹시 문의 사항이 있으면 <a class="c-var--primary-color td-none" href="mailto:ledhelper@daum.net">ledhelper@daum.net</a>으로 연락해주세요
      </p>
      <button onclick="window.handlePendingLogout()" class="btn btn-secondary mt-2rem">
        로그아웃
      </button>
    </div>
  `;
}

