import { signOut, isAdmin } from '../utils/auth.js';
import { formatSelectedDate } from '../state/dateState.js';

/**
 * 네비게이션 바 렌더링 (헤더 포함)
 * @param {string} currentRoute - 현재 라우트 (예: '/today', '/weekly', '/monthly', '/goals')
 * @param {object} profile - 사용자 프로필
 * @returns {Promise<string>} 네비게이션 HTML
 */
export async function renderNavigation(currentRoute, profile) {
  const routes = [
    { path: '/today', label: '오늘', icon: 'sun' },
    { path: '/weekly', label: '주간', icon: 'calendar-days' },
    { path: '/monthly', label: '월간', icon: 'calendar' },
    { path: '/goals', label: '목표', icon: 'target' }
  ];

  // 관리자인 경우 관리자 탭 추가
  const isUserAdmin = await isAdmin();
  if (isUserAdmin) {
    routes.push({ 
      path: '/admin', 
      label: '관리자', 
      icon: 'shield-check',
      external: true,  // 외부 링크 플래그
      url: '/admin.html'  // 실제 URL
    });
  }

  const navItems = routes.map(route => {
    const isActive = currentRoute === route.path || 
                     (route.path === '/weekly' && currentRoute === '/reports') ||
                     (route.path === '/monthly' && currentRoute === '/reports');
    const activeClass = isActive ? 'active' : '';
    
    // 관리자 탭은 새 탭에서 열기
    if (route.external) {
      return `
        <a href="${route.url}" target="_blank" rel="noopener noreferrer" class="nav-item ${activeClass}" data-route="${route.path}">
          <i data-lucide="${route.icon}"></i>
          <span>${route.label}</span>
        </a>
      `;
    }
    
    // 일반 탭은 해시 라우팅
    return `
      <a href="#${route.path}" class="nav-item ${activeClass}" data-route="${route.path}">
        <i data-lucide="${route.icon}"></i>
        <span>${route.label}</span>
      </a>
    `;
  }).join('');

  // 사용자 정보
  const userName = profile?.name || profile?.email?.split('@')[0] || '사용자';
  const avatarUrl = profile?.avatar_url || null;
  const userInitial = userName?.[0]?.toUpperCase() || '?';

  // 로그아웃 핸들러 전역 등록
  window.handleNavigationLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Logout error:', error);
      alert('로그아웃 중 오류가 발생했습니다.');
    }
  };

  // 날짜 바는 오늘 탭일 때만 표시
  const showDateBar = currentRoute === '/today';
  const timezone = profile?.timezone || 'Asia/Seoul';
  const dateDisplayText = showDateBar ? formatSelectedDate(timezone) : '';
  
  // 날짜 바 HTML (오늘 탭일 때만)
  const dateBarHtml = showDateBar ? `
    <div class="date-bar-container">
      <div class="date-bar">
        <button id="date-prev" class="date-nav-btn" title="이전 날짜">
          <i data-lucide="chevron-left"></i>
        </button>
        <button id="date-display" class="date-display-btn">
          <i data-lucide="calendar"></i>
          <span id="date-display-text">${dateDisplayText}</span>
        </button>
        <button id="date-next" class="date-nav-btn" title="다음 날짜">
          <i data-lucide="chevron-right"></i>
        </button>
      </div>
      <div class="date-bar-footer">
        <button id="date-today" class="date-today-btn" style="display: none;">
          <i data-lucide="sun"></i>
          오늘로 이동
        </button>
      </div>
      <!-- 날짜 선택 오버레이 -->
      <div id="date-overlay" class="date-overlay hidden">
        <div id="date-modal" class="date-modal">
          <div class="date-modal-header">
            <span>날짜 선택</span>
            <button id="date-close" class="date-close-btn">
              <i data-lucide="x"></i>
            </button>
          </div>
          <div class="date-modal-body">
            <input type="text" id="date-calendar-input" readonly />
          </div>
          <div class="date-modal-footer">
            <button id="date-today-modal" class="btn btn-secondary">
              <i data-lucide="sun"></i>
              오늘
            </button>
            <button id="date-close-footer" class="btn btn-primary">닫기</button>
          </div>
        </div>
      </div>
    </div>
  ` : '';

  return `
    <div class="app-header-container">
      <!-- 1줄: 브랜드 + 사용자 정보 -->
      <div class="app-header-top">
        <div class="brand">
          <i data-lucide="sparkles" class="brand-mark"></i>
          <span class="brand-text">인생관리시스템</span>
        </div>
        <div class="user-box">
          <div class="user-info">
            ${avatarUrl 
              ? `<img src="${avatarUrl}" class="user-avatar" alt="${userName}" />`
              : `<div class="user-avatar-placeholder">${userInitial}</div>`
            }
            <span class="user-name">${userName}</span>
          </div>
          <button id="logout-btn" class="btn btn-secondary" onclick="window.handleNavigationLogout && window.handleNavigationLogout()">
            로그아웃
          </button>
        </div>
      </div>
      <!-- 2줄: 네비게이션 탭 -->
      <nav class="top-navigation">
        ${navItems}
      </nav>
      <!-- 3줄: 날짜 바 (오늘 탭일 때만) -->
      ${dateBarHtml}
    </div>
  `;
}
