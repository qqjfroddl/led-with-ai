import { supabase, getSupabase } from './config/supabase.js';
import { getCurrentProfile, isAdmin, signOut } from './utils/auth.js';
import { createIcons, icons } from 'https://unpkg.com/lucide@latest?module';
import { getTodosStats, getRoutinesStats, getReflectionsStats } from './utils/weeklyStats.js';
import { getWeekStart, getWeekEnd, getToday } from './utils/date.js';

let currentProfile = null;
let pendingUsers = [];
let approvedUsers = [];
let challengeParticipants = []; // 챌린지 참�???목록
let allUsers = []; // ?�체 ?�용??목록 ?�??
let selectedPendingIds = new Set();
let selectedApprovedIds = new Set();
let selectedChallengeIds = new Set(); // 챌린지 참�????�택 관�?
let userStatsCache = new Map(); // ?�용?�별 ?�계 캐시 (userId -> stats)

// 초기??
async function init() {
  const app = document.getElementById('admin-app');
  if (!app) return;

  try {
    // Supabase ?�라?�언??초기??보장
    const supabaseClient = await getSupabase();
    if (!supabaseClient) {
      app.innerHTML = `
        <div class="error" style="margin: 2rem;">
          <h2>Supabase 초기???�류</h2>
          <p>Supabase ?�라?�언?��? 초기?�할 ???�습?�다.</p>
          <button onclick="location.reload()" class="btn btn-primary" style="margin-top: 1rem;">
            ?�로고침
          </button>
        </div>
      `;
      return;
    }

    // Supabase ?�경 변???�인 (CDN ?�는 Vite 방식)
    const config = window.SUPABASE_CONFIG || {};
    const hasConfig = (config.url && config.anonKey) || 
                     (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL && import.meta.env?.VITE_SUPABASE_ANON_KEY);
    
    if (!hasConfig) {
      app.innerHTML = `
        <div class="error" style="margin: 2rem;">
          <h2>?�경 변???�류</h2>
          <p>config.js ?�일??Supabase URL�?Anon Key�??�정?�주?�요.</p>
          <pre style="background: #f5f5f5; padding: 1rem; margin-top: 1rem; border-radius: 0.5rem;">
window.SUPABASE_CONFIG = {
  url: 'your_supabase_url',
  anonKey: 'your_supabase_anon_key'
};</pre>
        </div>
      `;
      return;
    }

    // 초기?�된 ?�라?�언???�용
    const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession();
    
    if (sessionError) {
      console.error('Session error:', sessionError);
      app.innerHTML = `
        <div class="error" style="margin: 2rem;">
          <h2>?�션 ?�류</h2>
          <p>${sessionError.message}</p>
          <button onclick="window.location.href='/index.html'" class="btn btn-primary" style="margin-top: 1rem;">
            메인?�로 ?�아가�?
          </button>
        </div>
      `;
      return;
    }

    if (!session) {
      app.innerHTML = `
        <div style="text-align: center; padding: 3rem;">
          <h2>로그?�이 ?�요?�니??/h2>
          <p>관리자 ?�이지???�근?�려�?로그?�해주세??</p>
          <button onclick="window.location.href='/index.html'" class="btn btn-primary" style="margin-top: 1rem;">
            로그?�하??가�?
          </button>
        </div>
      `;
      return;
    }

    currentProfile = await getCurrentProfile();
    
    if (!currentProfile) {
      app.innerHTML = `
        <div class="error" style="margin: 2rem;">
          <h2>?�로?�을 찾을 ???�습?�다</h2>
          <p>?�용???�로?�을 불러?????�습?�다.</p>
        </div>
      `;
      return;
    }
    
    // 관리자 권한 ?�인
    const adminCheck = await isAdmin();
    console.log('[Admin] Admin check result:', adminCheck);
    console.log('[Admin] Current profile:', currentProfile);
    
    if (!adminCheck) {
      app.innerHTML = `
        <div style="text-align: center; padding: 3rem;">
          <h2>관리자 권한???�요?�니??/h2>
          <p>???�이지??관리자�??�근?????�습?�다.</p>
          <p style="color: var(--text-secondary); margin-top: 0.5rem;">
            ?�재 ?�태: ${currentProfile.status} / ??��: ${currentProfile.role}
          </p>
          <button onclick="window.location.href='/index.html'" class="btn btn-primary" style="margin-top: 1rem;">
            메인?�로 ?�아가�?
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
        <h2>?�류가 발생?�습?�다</h2>
        <p>${error.message}</p>
        <details style="margin-top: 1rem;">
          <summary>?�세 ?�보</summary>
          <pre style="background: #f5f5f5; padding: 1rem; margin-top: 0.5rem; border-radius: 0.5rem; overflow-x: auto;">${error.stack}</pre>
        </details>
        <button onclick="location.reload()" class="btn btn-primary" style="margin-top: 1rem;">
          ?�로고침
        </button>
      </div>
    `;
  }
}

// ?�용??목록 로드
async function loadUsers() {
  console.log('[Admin] Loading users...');
  console.log('[Admin] Current user ID:', (await supabase.auth.getUser()).data?.user?.id);
  const adminCheck = await isAdmin();
  console.log('[Admin] Is admin check:', adminCheck);
  if (!adminCheck) {
    throw new Error('관리자 권한???�습?�다. ?�시 로그?????�도?�세??');
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
    throw new Error(`?�용??목록??불러?????�습?�다: ${error.message}`);
  }

  console.log('[Admin] Loaded users count:', data?.length || 0);
  console.log('[Admin] All users:', data);
  
  // ?�정 ?�메??검??(?�버깅용)
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

  // ?�체 ?�용???�??
  allUsers = data;

  // 모든 ?�태???�용??로그
  const statusCounts = {};
  data.forEach(u => {
    statusCounts[u.status] = (statusCounts[u.status] || 0) + 1;
  });
  console.log('[Admin] Users by status:', statusCounts);
  console.log('[Admin] Detailed status breakdown:', JSON.stringify(statusCounts, null, 2));
  
  // �??�태�??�용???�메??로그
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
  challengeParticipants = data.filter(u => u.status === 'approved' && u.is_challenge_participant === true);
  
  console.log('[Admin] Pending users:', pendingUsers.length);
  console.log('[Admin] Approved users:', approvedUsers.length);
  console.log('[Admin] Rejected users:', usersByStatus.rejected.length);
  console.log('[Admin] Blocked users:', usersByStatus.blocked.length);
  
  // ?�택 목록?�서 존재?��? ?�는 ID ?�거
  selectedPendingIds = new Set(pendingUsers.filter(u => selectedPendingIds.has(u.id)).map(u => u.id));
  selectedApprovedIds = new Set(approvedUsers.filter(u => selectedApprovedIds.has(u.id)).map(u => u.id));
}

// ?�더�?
function render() {
  const app = document.getElementById('admin-app');
  if (!app) return;

  // ?�체 ?�용???�는 ?��?�?+ ?�인???�용?�만 계산 (취소???�용?�는 ??��?��?�??�외)
  const totalUsers = pendingUsers.length + approvedUsers.length;
  const lastUpdate = new Date().toLocaleTimeString('ko-KR');

  app.innerHTML = `
    <div class="admin-container">
      <div class="admin-header">
        <div>
          <h1>관리자 - ?�생관리시?�템</h1>
          <p>?�생관리시?�템 ?�용???�인 관�?/p>
        </div>
        <button onclick="window.location.href='/index.html'" class="btn btn-secondary">
          ??메인?�로 ?�아가�?
        </button>
      </div>

      <!-- ?�계 카드 -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 2rem;">
        <div class="card">
          <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
            <i data-lucide="hourglass" style="width:20px; height:20px;"></i>
            <strong>?��?�?/strong>
          </div>
          <div style="font-size: 2rem; font-weight: bold; color: var(--warning-color);">
            ${pendingUsers.length}
          </div>
        </div>
        <div class="card">
          <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
            <i data-lucide="check-circle-2" style="width:20px; height:20px;"></i>
            <strong>?�인???�용??/strong>
          </div>
          <div style="font-size: 2rem; font-weight: bold; color: var(--success-color);">
            ${approvedUsers.length}
          </div>
        </div>
        <div class="card">
          <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
            <i data-lucide="users" style="width:20px; height:20px;"></i>
            <strong>?�체 ?�용??/strong>
          </div>
          <div style="font-size: 2rem; font-weight: bold;">
            ${totalUsers}
          </div>
        </div>
        ${allUsers.filter(u => u.status === 'rejected').length > 0 ? `
        <div class="card" style="border: 2px solid var(--warning-color);">
          <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
            <i data-lucide="alert-circle" style="width:20px; height:20px; color: var(--warning-color);"></i>
            <strong style="color: var(--warning-color);">?�신�??��?/strong>
          </div>
          <div style="font-size: 2rem; font-weight: bold; color: var(--warning-color);">
            ${allUsers.filter(u => u.status === 'rejected').length}
          </div>
          <div style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 0.5rem;">
            취소 ???�신�?�� ?�용??
          </div>
        </div>
        ` : ''}
      </div>

      <!-- ??-->
      <div class="tabs" id="admin-tabs">
        <button class="tab active" onclick="showTab('pending')">
          ?�인 ?��?(${pendingUsers.length})
        </button>
        <button class="tab" onclick="showTab('approved')">
          ?�인???�용??(${approvedUsers.length})
        </button>
        <button class="tab" onclick="showTab('challenge')">
          챌린지 참�???(${challengeParticipants.length})
        </button>
      </div>

      <!-- ?�인 ?��?목록 -->
      <div id="pending-section" class="tab-content">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
          <h2><i data-lucide="bell" style="width:20px; height:20px; margin-right:6px;"></i>?�인 ?��?중인 ?�용??/h2>
          <div style="display: flex; align-items: center; gap: 1rem;">
            <span style="color: var(--text-secondary); font-size: 0.9rem;">
              마�?�??�데?�트: ${lastUpdate}
            </span>
            <button onclick="refreshUsers()" class="btn btn-primary btn-sm">?�로고침</button>
            <button id="bulk-approve" class="btn btn-primary btn-sm" disabled>?�택 ?�인</button>
            <button id="bulk-reject" class="btn btn-danger btn-sm" disabled>?�택 취소</button>
          </div>
        </div>
        ${renderUserTable(pendingUsers, 'pending')}
      </div>

      <!-- ?�인???�용??목록 -->
      <div id="approved-section" class="tab-content" style="display: none;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
          <h2>???�인???�용??/h2>
          <div style="display: flex; align-items: center; gap: 1rem;">
            <button onclick="refreshUsers()" class="btn btn-primary btn-sm">?�로고침</button>
            <button id="bulk-expiry" class="btn btn-primary btn-sm" disabled>?�괄 기한 ?�정</button>
            <button id="bulk-add-challenge" class="btn btn-primary btn-sm" disabled>챌린지 참�???추�?</button>
          </div>
        </div>
        ${renderUserTable(approvedUsers, 'approved')}
      </div>

      <!-- 챌린지 참�???목록 -->
      <div id="challenge-section" class="tab-content" style="display: none;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
          <h2>?�� 챌린지 참�???/h2>
          <div style="display: flex; align-items: center; gap: 1rem;">
            <button onclick="refreshUsers()" class="btn btn-primary btn-sm">?�로고침</button>
            <button id="bulk-remove-challenge" class="btn btn-primary btn-sm" disabled>?�괄 ?�외</button>
          </div>
        </div>
        ${renderUserTable(challengeParticipants, 'challenge')}
      </div>

      <!-- ?�신�??��?목록 (rejected ?�태) -->
      ${allUsers.filter(u => u.status === 'rejected').length > 0 ? `
      <div id="reapplied-section" class="tab-content" style="display: block; margin-top: 2rem;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
          <h2><i data-lucide="refresh-cw" style="width:20px; height:20px; margin-right:6px;"></i>?�신�??��?(${allUsers.filter(u => u.status === 'rejected').length})</h2>
          <button onclick="refreshUsers()" class="btn btn-primary btn-sm">?�로고침</button>
        </div>
        <div style="background: #fff3cd; border: 1px solid #ffc107; border-radius: 0.5rem; padding: 1rem; margin-bottom: 1rem;">
          <p style="color: #856404; margin: 0; font-size: 0.9rem;">
            <strong>?�내:</strong> 취소???�용?��? ?�시 ?�청??경우?�니?? ?�인?�거???�시 취소?????�습?�다.
          </p>
        </div>
        ${renderUserTable(allUsers.filter(u => u.status === 'rejected'), 'reapplied')}
      </div>
      ` : ''}
    </div>
  `;

  // Lucide ?�이�??�더�?
  createIcons({ icons });
  
  // ?�인???�용???�계 로드
  if (approvedUsers.length > 0) {
    loadUserStats(approvedUsers);
  }
  
  // 챌린지 참�????�계 로드 (챌린지 ??�� ?�성?�된 경우)
  const challengeSection = document.getElementById('challenge-section');
  if (challengeSection && challengeSection.style.display !== 'none' && challengeParticipants.length > 0) {
    loadUserStats(challengeParticipants);
  }
}

// ?�용???�이�??�더�?
function renderUserTable(users, type) {
  if (users.length === 0) {
    return `
      <div class="card" style="text-align: center; padding: 3rem;">
        <p style="color: var(--text-secondary); font-size: 1.1rem;">
            ${type === 'pending' ? '?�인 ?��?중인 ?�용?��? ?�습?�다. ?��' 
              : type === 'challenge' ? '챌린지 참�??��? ?�습?�다.' 
              : '?�인???�용?��? ?�습?�다.'}
        </p>
      </div>
    `;
  }

  return `
    <div class="card" style="padding: 0; overflow-x: auto;">
      <table class="admin-table">
        <thead>
          <tr>
            ${type === 'pending' || type === 'approved' || type === 'challenge'
              ? `<th style="width:40px; text-align:center;"><input type="checkbox" id="select-all-${type}"></th>` 
              : '<th style="width:40px;"></th>'}
            <th>?�로??/th>
            <th>?�름</th>
            <th>?�메??/th>
            ${type === 'approved' || type === 'challenge' ? '<th>?�번�??�용?�황</th>' : ''}
            <th>?�청?�시</th>
            <th>?�용 기한</th>
            <th>?�업</th>
          </tr>
        </thead>
        <tbody>
          ${users.map(user => `
            <tr>
              <td style="text-align:center;">
                ${type === 'pending'
                  ? `<input type="checkbox" class="pending-select" data-id="${user.id}" ${selectedPendingIds.has(user.id) ? 'checked' : ''}>`
                  : type === 'approved'
                  ? `<input type="checkbox" class="approved-select" data-id="${user.id}" ${selectedApprovedIds.has(user.id) ? 'checked' : ''}>`
                  : type === 'challenge'
                  ? `<input type="checkbox" class="challenge-select" data-id="${user.id}" ${selectedChallengeIds.has(user.id) ? 'checked' : ''}>`
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
              ${type === 'approved' || type === 'challenge' ? `
              <td>
                <div class="user-stats" data-user-id="${user.id}" style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.875rem;">
                  <span class="stats-loading" style="color: #6b7280;">로딩 �?..</span>
                </div>
              </td>
              ` : ''}
              <td>${new Date(user.created_at).toLocaleString('ko-KR')}</td>
              <td>
                <div style="display: flex; align-items: center; gap: 0.5rem;">
                  ${user.expires_at 
                    ? `<span style="color: ${new Date(user.expires_at) < new Date() ? '#ef4444' : '#10b981'};">
                        ${new Date(user.expires_at).toLocaleDateString('ko-KR')}
                        ${new Date(user.expires_at) < new Date() ? ' (만료??' : ''}
                       </span>`
                    : '<span style="color: #6b7280;">무제??/span>'
                  }
                  <button onclick="openExpiryModal('${user.id}', '${user.expires_at || ''}')" 
                          class="btn btn-sm" style="padding: 0.25rem 0.5rem; font-size: 0.875rem;">
                    ?�정
                  </button>
                </div>
              </td>
              <td>
                <div class="action-buttons">
                  ${type === 'pending' 
                    ? `
                      <button onclick="updateUserStatus('${user.id}', 'approved')" class="btn btn-primary btn-sm">?�인</button>
                      <button onclick="updateUserStatus('${user.id}', 'rejected')" class="btn btn-danger btn-sm">취소</button>
                    `
                    : type === 'approved'
                    ? `
                      <button onclick="updateUserStatus('${user.id}', 'rejected')" class="btn btn-danger btn-sm">??��</button>
                    `
                    : type === 'challenge'
                    ? `
                      <button onclick="removeFromChallenge('${user.id}')" class="btn btn-warning btn-sm">챌린지?�서 ?�외</button>
                    `
                    : type === 'reapplied'
                    ? `
                      <button onclick="updateUserStatus('${user.id}', 'pending')" class="btn btn-primary btn-sm">?�기로 변�?/button>
                      <button onclick="updateUserStatus('${user.id}', 'approved')" class="btn btn-success btn-sm">?�인</button>
                      <button onclick="updateUserStatus('${user.id}', 'rejected')" class="btn btn-danger btn-sm">??��</button>
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

// ???�환
window.showTab = function(tab) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  
  // 모든 ?�션 ?�기�?
  document.getElementById('pending-section').style.display = 'none';
  document.getElementById('approved-section').style.display = 'none';
  const challengeSection = document.getElementById('challenge-section');
  if (challengeSection) challengeSection.style.display = 'none';
  
  // ?�택????�� ?�션�??�시
  if (tab === 'pending') {
    document.getElementById('pending-section').style.display = 'block';
  } else if (tab === 'approved') {
    document.getElementById('approved-section').style.display = 'block';
  } else if (tab === 'challenge' && challengeSection) {
    challengeSection.style.display = 'block';
  }
  
  // ?�성 ???�시
  const activeTab = Array.from(document.querySelectorAll('.tab')).find(t => {
    if (tab === 'pending') return t.textContent.includes('?�인 ?��?);
    if (tab === 'approved') return t.textContent.includes('?�인???�용??);
    if (tab === 'challenge') return t.textContent.includes('챌린지 참�???);
    return false;
  });
  if (activeTab) activeTab.classList.add('active');
  
  // 챌린지 참�?????�� ???�계 로드
  if (tab === 'challenge' && challengeParticipants.length > 0) {
    loadUserStats(challengeParticipants);
  }
};

// ?�용???�태 ?�데?�트
window.updateUserStatus = async function(userId, newStatus) {
  // '취소' 버튼 ?�릭 ??profiles?�서 ?�전 ??��
  if (newStatus === 'rejected') {
    if (!confirm('?�말�????�용?��? ??��?�시겠습?�까? ?�시 ?�청?�면 ?�로 ?�성?�니??')) {
      return;
    }

    console.log('[Admin] Attempting to delete user:', userId);
    console.log('[Admin] Current user ID:', (await supabase.auth.getUser()).data?.user?.id);
    console.log('[Admin] Is admin check:', await isAdmin());
    
    try {
      // ??�� ?�에 ?�용???�보 ?�인 (?�버깅용)
      const { data: userBeforeDelete, error: checkError } = await supabase
        .from('profiles')
        .select('id, email, status, role')
        .eq('id', userId)
        .single();
      
      if (checkError) {
        console.error('[Admin] Error checking user before delete:', checkError);
        alert(`?�용?��? 찾을 ???�습?�다: ${checkError.message}`);
        return;
      }
      
      console.log('[Admin] User to delete:', userBeforeDelete);
      
      // DELETE ?�행 (.select() ?�거 - ??�� ??조회??RLS 문제 발생 가??
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
        
        // RLS ?�책 ?�인 ?�내
        let errorMsg = `??�� ?�패: ${error.message}`;
        if (error.code === '42501' || error.message.includes('policy')) {
          errorMsg += '\n\nRLS ?�책 문제?????�습?�다. Supabase SQL Editor?�서 ?�음 ?�책???�인?�주?�요:\n';
          errorMsg += 'CREATE POLICY "profiles_admin_delete_all" ON public.profiles\n';
          errorMsg += '  FOR DELETE USING (public.is_admin());';
        }
        alert(errorMsg);
        return;
      }

      console.log('[Admin] Delete success for user:', userId);
      
      // ??�� ?�인???�해 ?�조??(?�택??
      const { data: verifyData, error: verifyError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', userId)
        .single();
      
      if (!verifyError && verifyData) {
        console.warn('[Admin] User still exists after delete:', verifyData);
        alert('??��가 ?�료?��? ?�았?????�습?�다. ?�로고침 ???�인?�주?�요.');
      } else {
        console.log('[Admin] Delete verified: user no longer exists');
      }
      
      // 목록 즉시 ?�로고침
      await loadUsers();
      render();
      
      alert('?�용?��? ??��?�었?�니??');
    } catch (err) {
      console.error('[Admin] Delete exception:', err);
      alert('??�� �??�외가 발생?�습?�다: ' + err.message);
    }
    return;
  }

  // ?�인/차단?� 기존 로직 ?��?
  const statusText = {
    'approved': '?�인',
    'blocked': '차단'
  }[newStatus] || newStatus;

  if (!confirm(`?�말�????�용?�의 ?�태�?"${statusText}"?�로 변경하?�겠?�니�?`)) {
    return;
  }

  const { error } = await supabase
    .from('profiles')
    .update({ status: newStatus })
    .eq('id', userId);

  if (error) {
    alert('?�류가 발생?�습?�다: ' + error.message);
    console.error('Error updating user status:', error);
    return;
  }

  await loadUsers();
  render();
  alert('?�태가 변경되?�습?�다.');
};

async function updateUserStatusBulk(ids, newStatus) {
  if (!ids || ids.length === 0) return;
  
  // '취소' 버튼 ?�릭 ??profiles?�서 ?�전 ??��
  if (newStatus === 'rejected') {
    if (!confirm(`?�택??${ids.length}명을 ??��?�시겠습?�까? ?�시 ?�청?�면 ?�로 ?�성?�니??`)) {
      return;
    }

    console.log('[Admin] Attempting to bulk delete users:', ids);
    console.log('[Admin] Current user ID:', (await supabase.auth.getUser()).data?.user?.id);
    console.log('[Admin] Is admin check:', await isAdmin());
    
    try {
      // DELETE ?�행 (.select() ?�거)
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
        
        // RLS ?�책 ?�인 ?�내
        let errorMsg = `??�� ?�패: ${error.message}`;
        if (error.code === '42501' || error.message.includes('policy')) {
          errorMsg += '\n\nRLS ?�책 문제?????�습?�다. Supabase SQL Editor?�서 ?�음 ?�책???�인?�주?�요:\n';
          errorMsg += 'CREATE POLICY "profiles_admin_delete_all" ON public.profiles\n';
          errorMsg += '  FOR DELETE USING (public.is_admin());';
        }
        alert(errorMsg);
        return;
      }

      console.log('[Admin] Bulk delete success for', ids.length, 'users');
      selectedPendingIds.clear();
      
      // 목록 즉시 ?�로고침
      await loadUsers();
      render();
      
      alert(`?�택??${ids.length}명이 ??��?�었?�니??`);
    } catch (err) {
      console.error('[Admin] Bulk delete exception:', err);
      alert('??�� �??�외가 발생?�습?�다: ' + err.message);
    }
    return;
  }

  // ?�인?� 기존 로직 ?��?
  const statusText = {
    'approved': '?�인',
    'blocked': '차단'
  }[newStatus] || newStatus;

  if (!confirm(`?�택??${ids.length}명을 "${statusText}" 처리?�시겠습?�까?`)) return;

  const { error } = await supabase
    .from('profiles')
    .update({ status: newStatus })
    .in('id', ids);

  if (error) {
    alert('?�류가 발생?�습?�다: ' + error.message);
    console.error('Bulk update error:', error);
    return;
  }

  selectedPendingIds.clear();
  await loadUsers();
  render();
  alert(`?�택??${ids.length}�??�태가 변경되?�습?�다.`);
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
      render(); // ?�택 ?�태 반영 ?�해 ?�렌??
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

  // ?�인???�용??체크박스
  const selectAllApproved = document.getElementById('select-all-approved');
  const rowChecksApproved = document.querySelectorAll('.approved-select');
  const bulkExpiry = document.getElementById('bulk-expiry');

  if (selectAllApproved) {
    selectAllApproved.checked = approvedUsers.length > 0 && approvedUsers.every(u => selectedApprovedIds.has(u.id));
    selectAllApproved.addEventListener('change', (e) => {
      if (e.target.checked) {
        approvedUsers.forEach(u => selectedApprovedIds.add(u.id));
      } else {
        selectedApprovedIds.clear();
      }
      render(); // ?�택 ?�태 반영 ?�해 ?�렌??
    });
  }

  rowChecksApproved.forEach(cb => {
    cb.addEventListener('change', (e) => {
      const id = e.target.dataset.id;
      if (e.target.checked) selectedApprovedIds.add(id);
      else selectedApprovedIds.delete(id);
      const allChecked = approvedUsers.length > 0 && approvedUsers.every(u => selectedApprovedIds.has(u.id));
      if (selectAllApproved) selectAllApproved.checked = allChecked;
      if (bulkExpiry) bulkExpiry.disabled = selectedApprovedIds.size === 0;
      const bulkAddChallenge = document.getElementById('bulk-add-challenge');
      if (bulkAddChallenge) bulkAddChallenge.disabled = selectedApprovedIds.size === 0;
    });
  });

  if (bulkExpiry) {
    bulkExpiry.disabled = selectedApprovedIds.size === 0;
    bulkExpiry.onclick = () => openBulkExpiryModal();
  }
  
  // 챌린지 참�???추�? 버튼
  const bulkAddChallenge = document.getElementById('bulk-add-challenge');
  if (bulkAddChallenge) {
    bulkAddChallenge.disabled = selectedApprovedIds.size === 0;
    bulkAddChallenge.onclick = () => addToChallenge(Array.from(selectedApprovedIds));
  }
  
  // 챌린지 참�???체크박스
  const selectAllChallenge = document.getElementById('select-all-challenge');
  const rowChecksChallenge = document.querySelectorAll('.challenge-select');
  const bulkRemoveChallenge = document.getElementById('bulk-remove-challenge');
  
  if (selectAllChallenge) {
    selectAllChallenge.checked = challengeParticipants.length > 0 && challengeParticipants.every(u => selectedChallengeIds.has(u.id));
    selectAllChallenge.addEventListener('change', (e) => {
      if (e.target.checked) {
        challengeParticipants.forEach(u => selectedChallengeIds.add(u.id));
      } else {
        selectedChallengeIds.clear();
      }
      render(); // ?�택 ?�태 반영 ?�해 ?�렌??
    });
  }
  
  rowChecksChallenge.forEach(cb => {
    cb.addEventListener('change', (e) => {
      const id = e.target.dataset.id;
      if (e.target.checked) selectedChallengeIds.add(id);
      else selectedChallengeIds.delete(id);
      const allChecked = challengeParticipants.length > 0 && challengeParticipants.every(u => selectedChallengeIds.has(u.id));
      if (selectAllChallenge) selectAllChallenge.checked = allChecked;
      if (bulkRemoveChallenge) bulkRemoveChallenge.disabled = selectedChallengeIds.size === 0;
    });
  });
  
  if (bulkRemoveChallenge) {
    bulkRemoveChallenge.disabled = selectedChallengeIds.size === 0;
    bulkRemoveChallenge.onclick = () => removeFromChallengeBulk(Array.from(selectedChallengeIds));
  }
}

// ?�로고침
window.refreshUsers = async function(event) {
  console.log('[Admin] Manual refresh triggered');
  try {
    // ?�션/권한 ?��?�?
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      alert('로그?�이 만료?�었?�니?? ?�시 로그?�해주세??');
      window.location.href = '/index.html';
      return;
    }

    currentProfile = await getCurrentProfile();
    const adminCheck = await isAdmin();
    if (!adminCheck) {
      alert('관리자 권한???�습?�다. 메인?�로 ?�동?�니??');
      window.location.href = '/index.html';
      return;
    }

    const button = event?.target || document.querySelector('button[onclick*="refreshUsers"]');
    if (button) {
      const originalText = button.textContent;
      button.disabled = true;
      button.textContent = '?�로고침 �?..';
      
      await loadUsers();
      render();
      
      button.disabled = false;
      button.textContent = originalText;
    } else {
      await loadUsers();
      render();
    }
    
    // ?�공 메시지 (?�택??
    const toast = document.createElement('div');
    toast.textContent = '목록??갱신?�었?�니??';
    toast.style.cssText = 'position: fixed; top: 20px; right: 20px; background: var(--success-color); color: white; padding: 1rem; border-radius: 0.5rem; z-index: 1000; box-shadow: 0 4px 6px rgba(0,0,0,0.1);';
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2000);
  } catch (error) {
    console.error('[Admin] Refresh error:', error);
    alert('목록???�로고침?�는 �??�류가 발생?�습?�다: ' + error.message);
    const button = event?.target || document.querySelector('button[onclick*="refreshUsers"]');
    if (button) {
      button.disabled = false;
      button.textContent = '?�로고침';
    }
  }
};

// 로그?�웃
window.signOut = signOut;

// 만료???�정 모달 ?�기
window.openExpiryModal = function(userId, currentExpiry) {
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000;';
  modal.innerHTML = `
    <div class="modal-content" style="background: white; padding: 2rem; border-radius: 8px; max-width: 400px; width: 90%;">
      <h3 style="margin-top: 0;">?�용 기한 ?�정</h3>
      <div style="margin: 1rem 0;">
        <label style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem; cursor: pointer;">
          <input type="radio" name="expiry-type-${userId}" value="unlimited" 
                 ${!currentExpiry ? 'checked' : ''} 
                 onchange="toggleExpiryDate('${userId}')">
          무제??
        </label>
        <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
          <input type="radio" name="expiry-type-${userId}" value="limited" 
                 ${currentExpiry ? 'checked' : ''} 
                 onchange="toggleExpiryDate('${userId}')">
          ?�정 ?�짜까�?
        </label>
      </div>
      <div id="expiry-date-container-${userId}" style="margin: 1rem 0; ${!currentExpiry ? 'display: none;' : ''}">
        <input type="date" id="expiry-date-${userId}" 
               value="${currentExpiry || ''}" 
               style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;">
      </div>
      <div style="display: flex; gap: 0.5rem; justify-content: flex-end; margin-top: 1rem;">
        <button onclick="this.closest('.modal').remove()" class="btn btn-secondary">취소</button>
        <button onclick="saveExpiryDate('${userId}')" class="btn btn-primary">?�??/button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
};

// 만료???�???��?
window.toggleExpiryDate = function(userId) {
  const type = document.querySelector(`input[name="expiry-type-${userId}"]:checked`).value;
  const container = document.getElementById(`expiry-date-container-${userId}`);
  if (container) {
    container.style.display = type === 'limited' ? 'block' : 'none';
  }
};

// 만료???�??
window.saveExpiryDate = async function(userId) {
  const type = document.querySelector(`input[name="expiry-type-${userId}"]:checked`).value;
  const expiryDate = type === 'limited' 
    ? document.getElementById(`expiry-date-${userId}`).value 
    : null;
  
  const { error } = await supabase
    .from('profiles')
    .update({ expires_at: expiryDate })
    .eq('id', userId);
  
  if (error) {
    let errorMessage = '?�류가 발생?�습?�다: ' + error.message;
    
    // ?�키�?캐시 ?�러??경우 ?�세 ?�내
    if (error.code === 'PGRST204' || error.message.includes('schema cache') || error.message.includes('expires_at')) {
      errorMessage += '\n\n?�️ expires_at 컬럼??찾을 ???�습?�다.\n\n';
      errorMessage += '?�� ?�결 방법:\n\n';
      errorMessage += '1️⃣ SQL ?�행 ?�인:\n';
      errorMessage += '   - Supabase SQL Editor?�서\n';
      errorMessage += '   - supabase/force_add_expires_at.sql ?�일 ?�행\n';
      errorMessage += '   - ?�는 SUPABASE_EXPIRES_AT_SETUP.md 참고\n\n';
      errorMessage += '2️⃣ 컬럼 ?�인:\n';
      errorMessage += '   - Table Editor ??profiles ?�이�?n';
      errorMessage += '   - expires_at 컬럼 존재 ?��? ?�인\n\n';
      errorMessage += '3️⃣ ?�로?�트 ?�시??\n';
      errorMessage += '   - Settings ??General ??"Restart Project"\n';
      errorMessage += '   - ?�시???�료 ??1-2�??��?n\n';
      errorMessage += '4️⃣ 브라?��? ?�로고침:\n';
      errorMessage += '   - Ctrl+Shift+R (강력 ?�로고침)';
    }
    
    alert(errorMessage);
    console.error('Error updating expiry date:', error);
    console.error('Full error object:', JSON.stringify(error, null, 2));
    return;
  }
  
  document.querySelector('.modal').remove();
  await loadUsers();
  render();
  alert('?�용 기한???�정?�었?�니??');
};

// ?�괄 기한 ?�정 모달 ?�기
window.openBulkExpiryModal = function() {
  const selectedIds = Array.from(selectedApprovedIds);
  if (selectedIds.length === 0) {
    alert('?�용?��? ?�택?�주?�요.');
    return;
  }

  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000;';
  modal.innerHTML = `
    <div class="modal-content" style="background: white; padding: 2rem; border-radius: 8px; max-width: 400px; width: 90%;">
      <h3 style="margin-top: 0;">?�괄 ?�용 기한 ?�정</h3>
      <p style="color: var(--text-secondary); margin-bottom: 1rem;">
        ?�택???�용?? <strong>${selectedIds.length}�?/strong>
      </p>
      <div style="margin: 1rem 0;">
        <label style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem; cursor: pointer;">
          <input type="radio" name="bulk-expiry-type" value="unlimited" checked onchange="toggleBulkExpiryDate()">
          무제??
        </label>
        <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
          <input type="radio" name="bulk-expiry-type" value="limited" onchange="toggleBulkExpiryDate()">
          ?�정 ?�짜까�?
        </label>
      </div>
      <div id="bulk-expiry-date-container" style="margin: 1rem 0; display: none;">
        <input type="date" id="bulk-expiry-date" style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;">
      </div>
      <div style="display: flex; gap: 0.5rem; justify-content: flex-end; margin-top: 1rem;">
        <button onclick="this.closest('.modal').remove()" class="btn btn-secondary">취소</button>
        <button onclick="saveBulkExpiryDate()" class="btn btn-primary">?�??/button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
};

// ?�괄 기한 ?�???��?
window.toggleBulkExpiryDate = function() {
  const type = document.querySelector('input[name="bulk-expiry-type"]:checked').value;
  const container = document.getElementById('bulk-expiry-date-container');
  if (container) {
    container.style.display = type === 'limited' ? 'block' : 'none';
  }
};

// ?�괄 기한 ?�??
window.saveBulkExpiryDate = async function() {
  const selectedIds = Array.from(selectedApprovedIds);
  if (selectedIds.length === 0) {
    alert('?�용?��? ?�택?�주?�요.');
    return;
  }

  const type = document.querySelector('input[name="bulk-expiry-type"]:checked').value;
  const expiryDate = type === 'limited' 
    ? document.getElementById('bulk-expiry-date').value 
    : null;

  if (type === 'limited' && !expiryDate) {
    alert('?�짜�??�택?�주?�요.');
    return;
  }

  const dateText = expiryDate ? new Date(expiryDate).toLocaleDateString('ko-KR') : '무제??;
  if (!confirm(`?�택??${selectedIds.length}명의 ?�용 기한??${dateText}?�로 ?�정?�시겠습?�까?`)) {
    return;
  }

  const { error } = await supabase
    .from('profiles')
    .update({ expires_at: expiryDate })
    .in('id', selectedIds);

  if (error) {
    let errorMessage = '?�류가 발생?�습?�다: ' + error.message;
    
    // ?�키�?캐시 ?�러??경우 ?�세 ?�내
    if (error.code === 'PGRST204' || error.message.includes('schema cache') || error.message.includes('expires_at')) {
      errorMessage += '\n\n?�️ expires_at 컬럼??찾을 ???�습?�다.\n\n';
      errorMessage += '?�� ?�결 방법:\n\n';
      errorMessage += '1️⃣ SQL ?�행 ?�인:\n';
      errorMessage += '   - Supabase SQL Editor?�서\n';
      errorMessage += '   - supabase/force_add_expires_at.sql ?�일 ?�행\n';
      errorMessage += '   - ?�는 SUPABASE_EXPIRES_AT_SETUP.md 참고\n\n';
      errorMessage += '2️⃣ 컬럼 ?�인:\n';
      errorMessage += '   - Table Editor ??profiles ?�이�?n';
      errorMessage += '   - expires_at 컬럼 존재 ?��? ?�인\n\n';
      errorMessage += '3️⃣ ?�로?�트 ?�시??\n';
      errorMessage += '   - Settings ??General ??"Restart Project"\n';
      errorMessage += '   - ?�시???�료 ??1-2�??��?n\n';
      errorMessage += '4️⃣ 브라?��? ?�로고침:\n';
      errorMessage += '   - Ctrl+Shift+R (강력 ?�로고침)';
    }
    
    alert(errorMessage);
    console.error('Error updating bulk expiry date:', error);
    console.error('Full error object:', JSON.stringify(error, null, 2));
    return;
  }

  document.querySelector('.modal').remove();
  selectedApprovedIds.clear();
  await loadUsers();
  render();
  alert(`?�택??${selectedIds.length}명의 ?�용 기한???�정?�었?�니??`);
};

// ?�용?�별 주간 ?�계 조회 ?�수
async function getUserWeeklyStats(userId, timezone = 'Asia/Seoul') {
  try {
    // Supabase 클라이언트 가져오기 (한 번만)
    const supabaseClient = await getSupabase();
    if (!supabaseClient) {
      console.error('[Admin] Supabase client not available');
      return null;
    }
    
    const today = getToday(timezone);
    const weekStart = getWeekStart(today, timezone);
    const weekEnd = getWeekEnd(today, timezone);
    
    // 병렬�??�계 조회
    const [todosStats, routinesStats, reflectionsStats] = await Promise.all([
      getTodosStats(userId, weekStart, weekEnd, supabaseClient),
      getRoutinesStats(userId, weekStart, weekEnd, supabaseClient),
      getReflectionsStats(userId, weekStart, weekEnd, supabaseClient)
    ]);
    
    return {
      routines: {
        practiceRate: routinesStats.practiceRate || 0
      },
      todos: {
        completionRate: todosStats.completionRate || 0
      },
      reflections: {
        writtenDays: reflectionsStats.writtenDays || 0
      }
    };
  } catch (error) {
    console.error(`[Admin] Error loading stats for user ${userId}:`, error);
    console.error(`[Admin] Error details:`, {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
      stack: error.stack
    });
    return null;
  }
}

// ?�러 ?�용?�의 ?�계�?병렬�?로드
async function loadUserStats(users) {

  
  // ?�계 조회 (병렬 처리)
  const statsPromises = users.map(async (user) => {
    // 캐시 ?�인
    if (userStatsCache.has(user.id)) {
      return { userId: user.id, stats: userStatsCache.get(user.id) };
    }
    
    // 媛??ъ슜?먯쓽 ??꾩〈 ?ъ슜 (?놁쑝硫?湲곕낯媛?Asia/Seoul)
    const userTimezone = user.timezone || 'Asia/Seoul';
    const stats = await getUserWeeklyStats(user.id, userTimezone);
    if (stats) {
      userStatsCache.set(user.id, stats);
    }
    return { userId: user.id, stats };
  });
  
  const results = await Promise.all(statsPromises);
  
  // �??�용?�의 ?�계�?DOM???�데?�트
  results.forEach(({ userId, stats }) => {
    const statsElement = document.querySelector(`.user-stats[data-user-id="${userId}"]`);
    if (!statsElement) return;
    
    if (!stats) {
      statsElement.innerHTML = '<span style="color: #6b7280;">-</span>';
      return;
    }
    
    const routineRate = stats.routines?.practiceRate || 0;
    const todoRate = stats.todos?.completionRate || 0;
    const reflectionDays = stats.reflections?.writtenDays || 0;
    
    statsElement.innerHTML = `
      <span style="color: #10b981; font-weight: 600;">?�� ${routineRate.toFixed(1)}%</span>
      <span style="color: #6366f1; font-weight: 600;">??${todoRate.toFixed(1)}%</span>
      <span style="color: #a78bfa; font-weight: 600;">?�� ${reflectionDays}??/span>
    `;
  });
}

// 챌린지 참�???추�?
async function addToChallenge(userIds) {
  if (!userIds || userIds.length === 0) return;
  
  if (!confirm(`?�택??${userIds.length}명을 챌린지 참�??�로 추�??�시겠습?�까?`)) {
    return;
  }
  
  try {
    const { error } = await supabase
      .from('profiles')
      .update({ is_challenge_participant: true })
      .in('id', userIds)
      .eq('status', 'approved'); // ?�인???�용?�만 추�? 가??
    
    if (error) {
      console.error('[Admin] Error adding to challenge:', error);
      alert('챌린지 참�???추�? ?�패: ' + error.message);
      return;
    }
    
    console.log('[Admin] Added to challenge:', userIds.length, 'users');
    selectedApprovedIds.clear();
    
    // 목록 즉시 ?�로고침
    await loadUsers();
    render();
    
    alert(`?�택??${userIds.length}명이 챌린지 참�??�로 추�??�었?�니??`);
  } catch (err) {
    console.error('[Admin] Add to challenge exception:', err);
    alert('챌린지 참�???추�? �??�외가 발생?�습?�다: ' + err.message);
  }
}

// 챌린지?�서 ?�외 (개별)
window.removeFromChallenge = async function(userId) {
  if (!confirm('???�용?��? 챌린지?�서 ?�외?�시겠습?�까?')) {
    return;
  }
  
  try {
    const { error } = await supabase
      .from('profiles')
      .update({ is_challenge_participant: false })
      .eq('id', userId);
    
    if (error) {
      console.error('[Admin] Error removing from challenge:', error);
      alert('챌린지?�서 ?�외 ?�패: ' + error.message);
      return;
    }
    
    console.log('[Admin] Removed from challenge:', userId);
    
    // 목록 즉시 ?�로고침
    await loadUsers();
    render();
    
    alert('챌린지?�서 ?�외?�었?�니??');
  } catch (err) {
    console.error('[Admin] Remove from challenge exception:', err);
    alert('챌린지?�서 ?�외 �??�외가 발생?�습?�다: ' + err.message);
  }
};

// 챌린지?�서 ?�괄 ?�외
async function removeFromChallengeBulk(userIds) {
  if (!userIds || userIds.length === 0) return;
  
  if (!confirm(`?�택??${userIds.length}명을 챌린지?�서 ?�외?�시겠습?�까?`)) {
    return;
  }
  
  try {
    const { error } = await supabase
      .from('profiles')
      .update({ is_challenge_participant: false })
      .in('id', userIds);
    
    if (error) {
      console.error('[Admin] Error bulk removing from challenge:', error);
      alert('챌린지?�서 ?�외 ?�패: ' + error.message);
      return;
    }
    
    console.log('[Admin] Bulk removed from challenge:', userIds.length, 'users');
    selectedChallengeIds.clear();
    
    // 목록 즉시 ?�로고침
    await loadUsers();
    render();
    
    alert(`?�택??${userIds.length}명이 챌린지?�서 ?�외?�었?�니??`);
  } catch (err) {
    console.error('[Admin] Bulk remove from challenge exception:', err);
    alert('챌린지?�서 ?�외 �??�외가 발생?�습?�다: ' + err.message);
  }
}

// 초기???�행
init();

// ?�더 ???�벤??바인?�을 ?�해 MutationObserver ?�체로 ?�더 ?��??�서 ?�출
const observer = new MutationObserver(() => {
  // pending ?�션 체크박스 ?�바?�딩
  bindSelectionEvents();
});

observer.observe(document.body, { childList: true, subtree: true });

