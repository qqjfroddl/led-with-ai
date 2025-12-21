import { signOut, isAdmin } from '../utils/auth.js';
import { formatSelectedDate } from '../state/dateState.js';

/**
 * 네비게이션 바 렌더링 (헤더 포함)
 * @param {string} currentRoute - 현재 라우트 (예: '/today', '/weekly', '/monthly', '/goals')
 * @param {object} profile - 사용자 프로필
 * @returns {Promise<string>} 네비게이션 HTML
 */
export async function renderNavigation(currentRoute, profile) {
  // Plan-Do-See 그룹 정의
  const navGroups = [
    {
      id: 'plan',
      label: '계획',
      color: { bg: '#f3e8ff', border: '#c4b5fd', active: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)' },
      routes: [
        { path: '/goals', label: '목표관리', icon: 'target' },
        { path: '/projects', label: '프로젝트', icon: 'folder-kanban' },
        { path: '/recurring', label: '반복업무', icon: 'repeat' }
      ]
    },
    {
      id: 'do',
      label: '실행',
      color: { bg: '#e0f2fe', border: '#7dd3fc', active: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' },
      routes: [
        { path: '/today', label: '오늘', icon: 'sun' }
      ]
    },
    {
      id: 'see',
      label: '리뷰',
      color: { bg: '#d1fae5', border: '#6ee7b7', active: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' },
      routes: [
        { path: '/weekly', label: '주간', icon: 'calendar-days' },
        { path: '/monthly', label: '월간', icon: 'calendar-range' },
        { path: '/yearly', label: '연간', icon: 'calendar-check' }
      ]
    }
  ];

  // 관리자인 경우 관리자 그룹 추가
  const isUserAdmin = await isAdmin();
  if (isUserAdmin) {
    navGroups.push({
      id: 'admin',
      label: '관리',
      color: { bg: '#fef3c7', border: '#fcd34d', active: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' },
      routes: [
        { path: '/admin', label: '관리자', icon: 'shield-check', external: true, url: '/admin.html' }
      ]
    });
  }

  // 현재 라우트가 속한 그룹 찾기
  const findActiveGroup = () => {
    for (const group of navGroups) {
      for (const route of group.routes) {
        if (currentRoute === route.path || 
            (route.path === '/weekly' && currentRoute === '/reports') ||
            (route.path === '/monthly' && currentRoute === '/reports')) {
          return group.id;
        }
      }
    }
    return null;
  };
  const activeGroupId = findActiveGroup();

  // 그룹별 HTML 생성
  const navGroupsHtml = navGroups.map(group => {
    const isGroupActive = group.id === activeGroupId;
    
    const routesHtml = group.routes.map(route => {
      const isActive = currentRoute === route.path || 
                       (route.path === '/weekly' && currentRoute === '/reports') ||
                       (route.path === '/monthly' && currentRoute === '/reports');
      
      const activeStyle = isActive 
        ? `background: ${group.color.active}; color: white; border-color: transparent; box-shadow: 0 4px 12px rgba(0,0,0,0.15);`
        : `background: white; color: #374151; border-color: ${group.color.border};`;
      
      // 관리자 탭: 모바일에서는 같은 탭에서 열기 (target="_blank"는 모바일에서 제대로 작동하지 않을 수 있음)
      if (route.external) {
        // 모바일에서는 같은 탭에서 열고, PC에서는 새 탭에서 열기
        // 모바일 감지를 위해 클라이언트 사이드에서 처리하도록 data 속성 사용
        return `
          <a href="${route.url}" target="_blank" rel="noopener noreferrer"
             class="nav-item-new nav-item-external ${isActive ? 'active' : ''}" 
             style="${activeStyle}"
             data-route="${route.path}"
             data-external-url="${route.url}">
            <i data-lucide="${route.icon}"></i>
            <span>${route.label}</span>
          </a>
        `;
      }
      
      return `
        <a href="#${route.path}" 
           class="nav-item-new ${isActive ? 'active' : ''}" 
           style="${activeStyle}"
           data-route="${route.path}">
          <i data-lucide="${route.icon}"></i>
          <span>${route.label}</span>
        </a>
      `;
    }).join('');

    return `
      <div class="nav-group" data-group="${group.id}" style="background: ${group.color.bg}; border: 1px solid ${group.color.border};">
        ${group.label ? `<span class="nav-group-label">${group.label}</span>` : ''}
        <div class="nav-group-items">
          ${routesHtml}
        </div>
      </div>
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
      <!-- 2줄: 네비게이션 탭 (Plan-Do-See 그룹) -->
      <nav class="top-navigation-grouped">
        ${navGroupsHtml}
      </nav>
      <!-- 3줄: 날짜 바 (오늘 탭일 때만) -->
      ${dateBarHtml}
    </div>
  `;
}
