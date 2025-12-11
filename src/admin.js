import { supabase } from './config/supabase.js';
import { getCurrentProfile, isAdmin, signOut } from './utils/auth.js';
import { createIcons, icons } from 'https://unpkg.com/lucide@latest?module';

let currentProfile = null;
let pendingUsers = [];
let approvedUsers = [];
let allUsers = []; // 전체 사용자 목록 저장
let selectedPendingIds = new Set();

// 초기화
async function init() {
  const app = document.getElementById('admin-app');
  if (!app) return;

  try {
    // Supabase 환경 변수 확인 (CDN 또는 Vite 방식)
    const config = window.SUPABASE_CONFIG || {};
    const hasConfig = (config.url && config.anonKey) || 
                     (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL && import.meta.env?.VITE_SUPABASE_ANON_KEY);
    
    if (!hasConfig) {
      app.innerHTML = `
        <div class="error" style="margin: 2rem;">
          <h2>환경 변수 오류</h2>
          <p>config.js 파일에 Supabase URL과 Anon Key를 설정해주세요.</p>
          <pre style="background: #f5f5f5; padding: 1rem; margin-top: 1rem; border-radius: 0.5rem;">
window.SUPABASE_CONFIG = {
  url: 'your_supabase_url',
  anonKey: 'your_supabase_anon_key'
};</pre>
        </div>
      `;
      return;
    }

    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('Session error:', sessionError);
      app.innerHTML = `
        <div class="error" style="margin: 2rem;">
          <h2>세션 오류</h2>
          <p>${sessionError.message}</p>
          <button onclick="window.location.href='/index.html'" class="btn btn-primary" style="margin-top: 1rem;">
            메인으로 돌아가기
          </button>
        </div>
      `;
      return;
    }

    if (!session) {
      app.innerHTML = `
        <div style="text-align: center; padding: 3rem;">
          <h2>로그인이 필요합니다</h2>
          <p>관리자 페이지에 접근하려면 로그인해주세요.</p>
          <button onclick="window.location.href='/index.html'" class="btn btn-primary" style="margin-top: 1rem;">
            로그인하러 가기
          </button>
        </div>
      `;
      return;
    }

    currentProfile = await getCurrentProfile();
    
    if (!currentProfile) {
      app.innerHTML = `
        <div class="error" style="margin: 2rem;">
          <h2>프로필을 찾을 수 없습니다</h2>
          <p>사용자 프로필을 불러올 수 없습니다.</p>
        </div>
      `;
      return;
    }
    
    // 관리자 권한 확인
    const adminCheck = await isAdmin();
    console.log('[Admin] Admin check result:', adminCheck);
    console.log('[Admin] Current profile:', currentProfile);
    
    if (!adminCheck) {
      app.innerHTML = `
        <div style="text-align: center; padding: 3rem;">
          <h2>관리자 권한이 필요합니다</h2>
          <p>이 페이지는 관리자만 접근할 수 있습니다.</p>
          <p style="color: var(--text-secondary); margin-top: 0.5rem;">
            현재 상태: ${currentProfile.status} / 역할: ${currentProfile.role}
          </p>
          <button onclick="window.location.href='/index.html'" class="btn btn-primary" style="margin-top: 1rem;">
            메인으로 돌아가기
          </button>
        </div>
      `;
      return;
    }

    console.log('[Admin] Loading users as admin...');
    await loadUsers();
    render();
  } catch (error) {
    console.error('Init error:', error);
    app.innerHTML = `
      <div class="error" style="margin: 2rem;">
        <h2>오류가 발생했습니다</h2>
        <p>${error.message}</p>
        <details style="margin-top: 1rem;">
          <summary>상세 정보</summary>
          <pre style="background: #f5f5f5; padding: 1rem; margin-top: 0.5rem; border-radius: 0.5rem; overflow-x: auto;">${error.stack}</pre>
        </details>
        <button onclick="location.reload()" class="btn btn-primary" style="margin-top: 1rem;">
          새로고침
        </button>
      </div>
    `;
  }
}

// 사용자 목록 로드
async function loadUsers() {
  console.log('[Admin] Loading users...');
  console.log('[Admin] Current user ID:', (await supabase.auth.getUser()).data?.user?.id);
  const adminCheck = await isAdmin();
  console.log('[Admin] Is admin check:', adminCheck);
  if (!adminCheck) {
    throw new Error('관리자 권한이 없습니다. 다시 로그인 후 시도하세요.');
  }
  
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[Admin] Error loading users:', error);
    console.error('[Admin] Error details:', JSON.stringify(error, null, 2));
    console.error('[Admin] Error code:', error.code);
    console.error('[Admin] Error hint:', error.hint);
    throw new Error(`사용자 목록을 불러올 수 없습니다: ${error.message}`);
  }

  console.log('[Admin] Loaded users count:', data?.length || 0);
  console.log('[Admin] All users:', data);
  
  // 특정 이메일 검색 (디버깅용)
  if (data && data.length > 0) {
    const mattUser = data.find(u => u.email === 'matt@deeptactlearning.com');
    if (mattUser) {
      console.log('[Admin] Found matt@deeptactlearning.com:', mattUser);
    } else {
      console.warn('[Admin] matt@deeptactlearning.com NOT FOUND in loaded users');
      console.log('[Admin] All emails:', data.map(u => u.email));
    }
  }

  if (!data) {
    console.warn('[Admin] No data returned');
    allUsers = [];
    pendingUsers = [];
    approvedUsers = [];
    return;
  }

  // 전체 사용자 저장
  allUsers = data;

  // 모든 상태의 사용자 로그
  const statusCounts = {};
  data.forEach(u => {
    statusCounts[u.status] = (statusCounts[u.status] || 0) + 1;
  });
  console.log('[Admin] Users by status:', statusCounts);
  console.log('[Admin] Detailed status breakdown:', JSON.stringify(statusCounts, null, 2));
  
  // 각 상태별 사용자 이메일 로그
  const usersByStatus = {
    pending: data.filter(u => u.status === 'pending'),
    approved: data.filter(u => u.status === 'approved'),
    rejected: data.filter(u => u.status === 'rejected'),
    blocked: data.filter(u => u.status === 'blocked')
  };
  
  console.log('[Admin] Pending user emails:', usersByStatus.pending.map(u => u.email));
  console.log('[Admin] Rejected user emails:', usersByStatus.rejected.map(u => u.email));
  
  pendingUsers = usersByStatus.pending;
  approvedUsers = usersByStatus.approved;
  
  console.log('[Admin] Pending users:', pendingUsers.length);
  console.log('[Admin] Approved users:', approvedUsers.length);
  console.log('[Admin] Rejected users:', usersByStatus.rejected.length);
  console.log('[Admin] Blocked users:', usersByStatus.blocked.length);
  
  // 선택 목록에서 존재하지 않는 ID 제거
  selectedPendingIds = new Set(pendingUsers.filter(u => selectedPendingIds.has(u.id)).map(u => u.id));
}

// 렌더링
function render() {
  const app = document.getElementById('admin-app');
  if (!app) return;

  // 전체 사용자 수는 대기 중 + 승인된 사용자만 계산 (취소된 사용자는 삭제되므로 제외)
  const totalUsers = pendingUsers.length + approvedUsers.length;
  const lastUpdate = new Date().toLocaleTimeString('ko-KR');

  app.innerHTML = `
    <div class="admin-container">
      <div class="admin-header">
        <div>
          <h1>관리자 - 인생관리시스템</h1>
          <p>인생관리시스템 사용자 승인 관리</p>
        </div>
        <button onclick="window.location.href='/index.html'" class="btn btn-secondary">
          ← 메인으로 돌아가기
        </button>
      </div>

      <!-- 통계 카드 -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 2rem;">
        <div class="card">
          <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
            <i data-lucide="hourglass" style="width:20px; height:20px;"></i>
            <strong>대기 중</strong>
          </div>
          <div style="font-size: 2rem; font-weight: bold; color: var(--warning-color);">
            ${pendingUsers.length}
          </div>
        </div>
        <div class="card">
          <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
            <i data-lucide="check-circle-2" style="width:20px; height:20px;"></i>
            <strong>승인된 사용자</strong>
          </div>
          <div style="font-size: 2rem; font-weight: bold; color: var(--success-color);">
            ${approvedUsers.length}
          </div>
        </div>
        <div class="card">
          <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
            <i data-lucide="users" style="width:20px; height:20px;"></i>
            <strong>전체 사용자</strong>
          </div>
          <div style="font-size: 2rem; font-weight: bold;">
            ${totalUsers}
          </div>
        </div>
        ${allUsers.filter(u => u.status === 'rejected').length > 0 ? `
        <div class="card" style="border: 2px solid var(--warning-color);">
          <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
            <i data-lucide="alert-circle" style="width:20px; height:20px; color: var(--warning-color);"></i>
            <strong style="color: var(--warning-color);">재신청 대기</strong>
          </div>
          <div style="font-size: 2rem; font-weight: bold; color: var(--warning-color);">
            ${allUsers.filter(u => u.status === 'rejected').length}
          </div>
          <div style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 0.5rem;">
            취소 후 재신청한 사용자
          </div>
        </div>
        ` : ''}
      </div>

      <!-- 탭 -->
      <div class="tabs" id="admin-tabs">
        <button class="tab active" onclick="showTab('pending')">
          승인 대기 (${pendingUsers.length})
        </button>
        <button class="tab" onclick="showTab('approved')">
          승인된 사용자 (${approvedUsers.length})
        </button>
      </div>

      <!-- 승인 대기 목록 -->
      <div id="pending-section" class="tab-content">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
          <h2><i data-lucide="bell" style="width:20px; height:20px; margin-right:6px;"></i>승인 대기 중인 사용자</h2>
          <div style="display: flex; align-items: center; gap: 1rem;">
            <span style="color: var(--text-secondary); font-size: 0.9rem;">
              마지막 업데이트: ${lastUpdate}
            </span>
            <button onclick="refreshUsers()" class="btn btn-primary btn-sm">새로고침</button>
            <button id="bulk-approve" class="btn btn-primary btn-sm" disabled>선택 승인</button>
            <button id="bulk-reject" class="btn btn-danger btn-sm" disabled>선택 취소</button>
          </div>
        </div>
        ${renderUserTable(pendingUsers, 'pending')}
      </div>

      <!-- 승인된 사용자 목록 -->
      <div id="approved-section" class="tab-content" style="display: none;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
          <h2>✅ 승인된 사용자</h2>
          <button onclick="refreshUsers()" class="btn btn-primary btn-sm">새로고침</button>
        </div>
        ${renderUserTable(approvedUsers, 'approved')}
      </div>

      <!-- 재신청 대기 목록 (rejected 상태) -->
      ${allUsers.filter(u => u.status === 'rejected').length > 0 ? `
      <div id="reapplied-section" class="tab-content" style="display: block; margin-top: 2rem;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
          <h2><i data-lucide="refresh-cw" style="width:20px; height:20px; margin-right:6px;"></i>재신청 대기 (${allUsers.filter(u => u.status === 'rejected').length})</h2>
          <button onclick="refreshUsers()" class="btn btn-primary btn-sm">새로고침</button>
        </div>
        <div style="background: #fff3cd; border: 1px solid #ffc107; border-radius: 0.5rem; padding: 1rem; margin-bottom: 1rem;">
          <p style="color: #856404; margin: 0; font-size: 0.9rem;">
            <strong>안내:</strong> 취소된 사용자가 다시 신청한 경우입니다. 승인하거나 다시 취소할 수 있습니다.
          </p>
        </div>
        ${renderUserTable(allUsers.filter(u => u.status === 'rejected'), 'reapplied')}
      </div>
      ` : ''}
    </div>
  `;

  // Lucide 아이콘 렌더링
  createIcons({ icons });
}

// 사용자 테이블 렌더링
function renderUserTable(users, type) {
  if (users.length === 0) {
    return `
      <div class="card" style="text-align: center; padding: 3rem;">
        <p style="color: var(--text-secondary); font-size: 1.1rem;">
          ${type === 'pending' ? '승인 대기 중인 사용자가 없습니다. 🎉' : '승인된 사용자가 없습니다.'}
        </p>
      </div>
    `;
  }

  return `
    <div class="card" style="padding: 0; overflow-x: auto;">
      <table class="admin-table">
        <thead>
          <tr>
            ${type === 'pending' ? `<th style="width:40px; text-align:center;"><input type="checkbox" id="select-all-pending"></th>` : '<th style="width:40px;"></th>'}
            <th>프로필</th>
            <th>이름</th>
            <th>이메일</th>
            <th>요청일시</th>
            <th>작업</th>
          </tr>
        </thead>
        <tbody>
          ${users.map(user => `
            <tr>
              <td style="text-align:center;">
                ${type === 'pending'
                  ? `<input type="checkbox" class="pending-select" data-id="${user.id}" ${selectedPendingIds.has(user.id) ? 'checked' : ''}>`
                  : ''}
              </td>
              <td>
                ${user.avatar_url 
                  ? `<img src="${user.avatar_url}" style="width: 40px; height: 40px; border-radius: 50%;" />`
                  : `<div style="width: 40px; height: 40px; border-radius: 50%; background: var(--primary-color); display: flex; align-items: center; justify-content: center; color: white; font-weight: bold;">${user.name?.[0] || user.email?.[0] || '?'}</div>`
                }
              </td>
              <td>${user.name || '-'}</td>
              <td>${user.email || '-'}</td>
              <td>${new Date(user.created_at).toLocaleString('ko-KR')}</td>
              <td>
                <div class="action-buttons">
                  ${type === 'pending' 
                    ? `
                      <button onclick="updateUserStatus('${user.id}', 'approved')" class="btn btn-primary btn-sm">승인</button>
                      <button onclick="updateUserStatus('${user.id}', 'rejected')" class="btn btn-danger btn-sm">취소</button>
                    `
                    : type === 'approved'
                    ? `
                      <button onclick="updateUserStatus('${user.id}', 'rejected')" class="btn btn-danger btn-sm">삭제</button>
                    `
                    : type === 'reapplied'
                    ? `
                      <button onclick="updateUserStatus('${user.id}', 'pending')" class="btn btn-primary btn-sm">대기로 변경</button>
                      <button onclick="updateUserStatus('${user.id}', 'approved')" class="btn btn-success btn-sm">승인</button>
                      <button onclick="updateUserStatus('${user.id}', 'rejected')" class="btn btn-danger btn-sm">삭제</button>
                    `
                    : ''
                  }
                </div>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

// 탭 전환
window.showTab = function(tab) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  
  // 모든 섹션 숨기기
  document.getElementById('pending-section').style.display = 'none';
  document.getElementById('approved-section').style.display = 'none';
  
  // 선택된 탭의 섹션만 표시
  if (tab === 'pending') {
    document.getElementById('pending-section').style.display = 'block';
  } else if (tab === 'approved') {
    document.getElementById('approved-section').style.display = 'block';
  }
  
  // 활성 탭 표시
  const activeTab = Array.from(document.querySelectorAll('.tab')).find(t => {
    if (tab === 'pending') return t.textContent.includes('승인 대기');
    if (tab === 'approved') return t.textContent.includes('승인된 사용자');
    return false;
  });
  if (activeTab) activeTab.classList.add('active');
};

// 사용자 상태 업데이트
window.updateUserStatus = async function(userId, newStatus) {
  // '취소' 버튼 클릭 시 profiles에서 완전 삭제
  if (newStatus === 'rejected') {
    if (!confirm('정말로 이 사용자를 삭제하시겠습니까? 다시 신청하면 새로 생성됩니다.')) {
      return;
    }

    console.log('[Admin] Attempting to delete user:', userId);
    console.log('[Admin] Current user ID:', (await supabase.auth.getUser()).data?.user?.id);
    console.log('[Admin] Is admin check:', await isAdmin());
    
    try {
      // 삭제 전에 사용자 정보 확인 (디버깅용)
      const { data: userBeforeDelete, error: checkError } = await supabase
        .from('profiles')
        .select('id, email, status, role')
        .eq('id', userId)
        .single();
      
      if (checkError) {
        console.error('[Admin] Error checking user before delete:', checkError);
        alert(`사용자를 찾을 수 없습니다: ${checkError.message}`);
        return;
      }
      
      console.log('[Admin] User to delete:', userBeforeDelete);
      
      // DELETE 실행 (.select() 제거 - 삭제 후 조회는 RLS 문제 발생 가능)
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId);

      if (error) {
        console.error('[Admin] Delete error:', error);
        console.error('[Admin] Delete error details:', JSON.stringify(error, null, 2));
        console.error('[Admin] Error code:', error.code);
        console.error('[Admin] Error hint:', error.hint);
        console.error('[Admin] Error message:', error.message);
        
        // RLS 정책 확인 안내
        let errorMsg = `삭제 실패: ${error.message}`;
        if (error.code === '42501' || error.message.includes('policy')) {
          errorMsg += '\n\nRLS 정책 문제일 수 있습니다. Supabase SQL Editor에서 다음 정책을 확인해주세요:\n';
          errorMsg += 'CREATE POLICY "profiles_admin_delete_all" ON public.profiles\n';
          errorMsg += '  FOR DELETE USING (public.is_admin());';
        }
        alert(errorMsg);
        return;
      }

      console.log('[Admin] Delete success for user:', userId);
      
      // 삭제 확인을 위해 재조회 (선택적)
      const { data: verifyData, error: verifyError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', userId)
        .single();
      
      if (!verifyError && verifyData) {
        console.warn('[Admin] User still exists after delete:', verifyData);
        alert('삭제가 완료되지 않았을 수 있습니다. 새로고침 후 확인해주세요.');
      } else {
        console.log('[Admin] Delete verified: user no longer exists');
      }
      
      // 목록 즉시 새로고침
      await loadUsers();
      render();
      
      alert('사용자가 삭제되었습니다.');
    } catch (err) {
      console.error('[Admin] Delete exception:', err);
      alert('삭제 중 예외가 발생했습니다: ' + err.message);
    }
    return;
  }

  // 승인/차단은 기존 로직 유지
  const statusText = {
    'approved': '승인',
    'blocked': '차단'
  }[newStatus] || newStatus;

  if (!confirm(`정말로 이 사용자의 상태를 "${statusText}"으로 변경하시겠습니까?`)) {
    return;
  }

  const { error } = await supabase
    .from('profiles')
    .update({ status: newStatus })
    .eq('id', userId);

  if (error) {
    alert('오류가 발생했습니다: ' + error.message);
    console.error('Error updating user status:', error);
    return;
  }

  await loadUsers();
  render();
  alert('상태가 변경되었습니다.');
};

async function updateUserStatusBulk(ids, newStatus) {
  if (!ids || ids.length === 0) return;
  
  // '취소' 버튼 클릭 시 profiles에서 완전 삭제
  if (newStatus === 'rejected') {
    if (!confirm(`선택한 ${ids.length}명을 삭제하시겠습니까? 다시 신청하면 새로 생성됩니다.`)) {
      return;
    }

    console.log('[Admin] Attempting to bulk delete users:', ids);
    console.log('[Admin] Current user ID:', (await supabase.auth.getUser()).data?.user?.id);
    console.log('[Admin] Is admin check:', await isAdmin());
    
    try {
      // DELETE 실행 (.select() 제거)
      const { error } = await supabase
        .from('profiles')
        .delete()
        .in('id', ids);

      if (error) {
        console.error('[Admin] Bulk delete error:', error);
        console.error('[Admin] Bulk delete error details:', JSON.stringify(error, null, 2));
        console.error('[Admin] Error code:', error.code);
        console.error('[Admin] Error hint:', error.hint);
        console.error('[Admin] Error message:', error.message);
        
        // RLS 정책 확인 안내
        let errorMsg = `삭제 실패: ${error.message}`;
        if (error.code === '42501' || error.message.includes('policy')) {
          errorMsg += '\n\nRLS 정책 문제일 수 있습니다. Supabase SQL Editor에서 다음 정책을 확인해주세요:\n';
          errorMsg += 'CREATE POLICY "profiles_admin_delete_all" ON public.profiles\n';
          errorMsg += '  FOR DELETE USING (public.is_admin());';
        }
        alert(errorMsg);
        return;
      }

      console.log('[Admin] Bulk delete success for', ids.length, 'users');
      selectedPendingIds.clear();
      
      // 목록 즉시 새로고침
      await loadUsers();
      render();
      
      alert(`선택한 ${ids.length}명이 삭제되었습니다.`);
    } catch (err) {
      console.error('[Admin] Bulk delete exception:', err);
      alert('삭제 중 예외가 발생했습니다: ' + err.message);
    }
    return;
  }

  // 승인은 기존 로직 유지
  const statusText = {
    'approved': '승인',
    'blocked': '차단'
  }[newStatus] || newStatus;

  if (!confirm(`선택한 ${ids.length}명을 "${statusText}" 처리하시겠습니까?`)) return;

  const { error } = await supabase
    .from('profiles')
    .update({ status: newStatus })
    .in('id', ids);

  if (error) {
    alert('오류가 발생했습니다: ' + error.message);
    console.error('Bulk update error:', error);
    return;
  }

  selectedPendingIds.clear();
  await loadUsers();
  render();
  alert(`선택한 ${ids.length}명 상태가 변경되었습니다.`);
}

function bindSelectionEvents() {
  const selectAll = document.getElementById('select-all-pending');
  const rowChecks = document.querySelectorAll('.pending-select');
  const bulkApprove = document.getElementById('bulk-approve');
  const bulkReject = document.getElementById('bulk-reject');

  if (selectAll) {
    selectAll.checked = pendingUsers.length > 0 && pendingUsers.every(u => selectedPendingIds.has(u.id));
    selectAll.addEventListener('change', (e) => {
      if (e.target.checked) {
        pendingUsers.forEach(u => selectedPendingIds.add(u.id));
      } else {
        selectedPendingIds.clear();
      }
      render(); // 선택 상태 반영 위해 재렌더
    });
  }

  rowChecks.forEach(cb => {
    cb.addEventListener('change', (e) => {
      const id = e.target.dataset.id;
      if (e.target.checked) selectedPendingIds.add(id);
      else selectedPendingIds.delete(id);
      const allChecked = pendingUsers.length > 0 && pendingUsers.every(u => selectedPendingIds.has(u.id));
      if (selectAll) selectAll.checked = allChecked;
      if (bulkApprove) bulkApprove.disabled = selectedPendingIds.size === 0;
      if (bulkReject) bulkReject.disabled = selectedPendingIds.size === 0;
    });
  });

  if (bulkApprove) bulkApprove.disabled = selectedPendingIds.size === 0;
  if (bulkReject) bulkReject.disabled = selectedPendingIds.size === 0;
  if (bulkApprove) bulkApprove.onclick = () => updateUserStatusBulk(Array.from(selectedPendingIds), 'approved');
  if (bulkReject) bulkReject.onclick = () => updateUserStatusBulk(Array.from(selectedPendingIds), 'rejected');
}

// 새로고침
window.refreshUsers = async function(event) {
  console.log('[Admin] Manual refresh triggered');
  try {
    // 세션/권한 재검증
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      alert('로그인이 만료되었습니다. 다시 로그인해주세요.');
      window.location.href = '/index.html';
      return;
    }

    currentProfile = await getCurrentProfile();
    const adminCheck = await isAdmin();
    if (!adminCheck) {
      alert('관리자 권한이 없습니다. 메인으로 이동합니다.');
      window.location.href = '/index.html';
      return;
    }

    const button = event?.target || document.querySelector('button[onclick*="refreshUsers"]');
    if (button) {
      const originalText = button.textContent;
      button.disabled = true;
      button.textContent = '새로고침 중...';
      
      await loadUsers();
      render();
      
      button.disabled = false;
      button.textContent = originalText;
    } else {
      await loadUsers();
      render();
    }
    
    // 성공 메시지 (선택적)
    const toast = document.createElement('div');
    toast.textContent = '목록이 갱신되었습니다.';
    toast.style.cssText = 'position: fixed; top: 20px; right: 20px; background: var(--success-color); color: white; padding: 1rem; border-radius: 0.5rem; z-index: 1000; box-shadow: 0 4px 6px rgba(0,0,0,0.1);';
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2000);
  } catch (error) {
    console.error('[Admin] Refresh error:', error);
    alert('목록을 새로고침하는 중 오류가 발생했습니다: ' + error.message);
    const button = event?.target || document.querySelector('button[onclick*="refreshUsers"]');
    if (button) {
      button.disabled = false;
      button.textContent = '새로고침';
    }
  }
};

// 로그아웃
window.signOut = signOut;

// 초기화 실행
init();

// 렌더 후 이벤트 바인딩을 위해 MutationObserver 대체로 렌더 내부에서 호출
const observer = new MutationObserver(() => {
  // pending 섹션 체크박스 재바인딩
  bindSelectionEvents();
});

observer.observe(document.body, { childList: true, subtree: true });

