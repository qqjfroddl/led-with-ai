import { toast } from '../utils/toast.js';
import { signOut } from '../utils/auth.js';

export async function renderExpired(profile) {
  // 로그아웃 핸들러를 전역으로 등록
  window.handleExpiredLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Logout error:', error);
      toast('로그아웃 중 오류가 발생했습니다.');
    }
  };
  
  return `
    <div class="auth-container">
      <h1>사용 기한 만료</h1>
      <p>계정 사용 기한이 만료되었습니다.</p>
      <p class="c-var--text-secondary mt-1rem">
        만료일: ${new Date(profile.expires_at).toLocaleDateString('ko-KR')}
      </p>
      <p class="mt-1rem">
        계속 사용하려면 관리자(<span class="c-accent fwt-bold">ledhelper@daum.net</span>)에게 문의해주세요.
      </p>
      <button onclick="handleExpiredLogout()" class="btn btn-primary mt-2rem">
        로그아웃
      </button>
    </div>
  `;
}



























