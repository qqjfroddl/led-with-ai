import { signOut } from '../utils/auth.js';
import { supabase } from '../config/supabase.js';

export async function renderRejected(profile) {
  const statusText = profile.status === 'rejected' ? '거절됨' : '차단됨';
  
  // 로그아웃 핸들러를 전역으로 등록
  window.handleRejectedLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Logout error:', error);
      alert('로그아웃 중 오류가 발생했습니다.');
    }
  };
  
  // 다시 승인 요청 (reapply) 핸들러 - 거절(rejected)일 때만 노출
  window.handleReapply = async () => {
    if (profile.status !== 'rejected') return;
    try {
      console.log('[Reapply] Attempting to update status from rejected to pending for user:', profile.id);
      const { data, error } = await supabase
        .from('profiles')
        .update({ status: 'pending' })
        .eq('id', profile.id)
        .select();
      
      if (error) {
        console.error('[Reapply] Error updating status:', error);
        console.error('[Reapply] Error details:', JSON.stringify(error, null, 2));
        alert(`다시 승인 요청 중 오류가 발생했습니다: ${error.message}`);
        return;
      }
      
      console.log('[Reapply] Successfully updated status:', data);
      alert('승인 요청을 다시 보냈습니다. 관리자 확인 후 이용 가능합니다.');
      // 상태를 pending으로 바꿨으므로 새로고침하여 pending 화면으로 이동
      window.location.reload();
    } catch (error) {
      console.error('[Reapply] Exception:', error);
      alert('다시 승인 요청 중 오류가 발생했습니다: ' + error.message);
    }
  };
  
  return `
    <div class="auth-container">
      <h1>이용 불가</h1>
      <p>계정 상태: <strong>${statusText}</strong></p>
      <p style="color: var(--text-secondary); font-size: 0.9rem; margin-top: 1rem;">
        서비스 이용이 제한되었습니다.<br>
        문의사항이 있으시면 관리자에게 연락해주세요.
      </p>
      ${profile.status === 'rejected' ? `
        <button onclick="window.handleReapply()" class="btn btn-primary" style="margin-top: 1.5rem;">
          다시 승인 요청
        </button>
      ` : ''}
      <button onclick="window.handleRejectedLogout()" class="btn btn-secondary" style="margin-top: 2rem;">
        로그아웃
      </button>
    </div>
  `;
}

