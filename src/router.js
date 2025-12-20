import { getCurrentProfile, isApprovedUser } from './utils/auth.js';
import { renderToday } from './pages/today.js';
import { renderReports } from './pages/reports.js';
import { renderMonthly } from './pages/monthly.js';
import { renderYearly } from './pages/yearly.js';
import { renderGoals } from './pages/goals.js';
import { renderProjects } from './pages/projects.js';
import { renderPending } from './pages/pending.js';
import { renderRejected } from './pages/rejected.js';
import { renderExpired } from './pages/expired.js';
import { renderNavigation } from './components/navigation.js';
import { getSelectedDate, shiftSelectedDate, formatSelectedDate, resetSelectedDate, setSelectedDate } from './state/dateState.js';
import { getToday } from './utils/date.js';

class Router {
  constructor() {
    this.routes = {
      '/today': renderToday,
      '/reports': renderReports,
      '/weekly': renderReports, // 주간 리포트 (renderReports 사용)
      '/monthly': renderMonthly, // 월간 리포트
      '/yearly': renderYearly, // 연간 리포트
      '/goals': renderGoals,
      '/projects': renderProjects
    };
  }

  renderIcons() {
    if (window.lucide?.createIcons) {
      window.lucide.createIcons({
        attrs: {
          'aria-hidden': 'true',
          focusable: 'false',
        },
      });
    }
  }

  init() {
    // 새로고침 시 오늘 날짜로 초기화 (요구사항)
    resetSelectedDate('Asia/Seoul');
    window.addEventListener('hashchange', () => this.handleRoute());
  }

  bindDateBar(profile) {
    const timezone = profile?.timezone || 'Asia/Seoul';
    const prevBtn = document.getElementById('date-prev');
    const nextBtn = document.getElementById('date-next');
    const displayEl = document.getElementById('date-display');
    const displayTextEl = document.getElementById('date-display-text');
    const todayBtn = document.getElementById('date-today');
    const overlay = document.getElementById('date-overlay');
    const calendarInput = document.getElementById('date-calendar-input');
    const overlayClose = document.getElementById('date-close');
    const overlayCloseFooter = document.getElementById('date-close-footer');
    const overlayToday = document.getElementById('date-today-modal');

    // 날짜 바가 없으면 종료
    if (!displayEl) {
      return;
    }

    const selected = getSelectedDate(timezone);
    const today = getToday(timezone);
    const isToday = selected === today;

    // 날짜 표시 업데이트 함수
    const updateDateDisplay = () => {
      if (displayTextEl) {
        displayTextEl.textContent = formatSelectedDate(timezone);
      }
      const newSelected = getSelectedDate(timezone);
      const newIsToday = newSelected === today;
      if (todayBtn) {
        todayBtn.style.display = newIsToday ? 'none' : 'inline-flex';
      }
    };

    // 초기 날짜 표시
    updateDateDisplay();

    const rerender = () => {
      updateDateDisplay();
      this.handleRoute();
    };

    if (prevBtn) {
      prevBtn.onclick = () => {
        shiftSelectedDate(-1, timezone);
        rerender();
      };
    }
    if (nextBtn) {
      nextBtn.onclick = () => {
        shiftSelectedDate(1, timezone);
        rerender();
      };
    }
    if (todayBtn) {
      todayBtn.onclick = () => {
        resetSelectedDate(timezone);
        rerender();
      };
    }

    // 오버레이 달력 (flatpickr)
    const closeOverlay = () => {
      if (overlay) overlay.classList.add('hidden');
    };
    const openOverlay = () => {
      if (!overlay || !calendarInput || !window.flatpickr) return;
      const currentSelected = getSelectedDate(timezone);
      if (!calendarInput._fp) {
        calendarInput._fp = window.flatpickr(calendarInput, {
          inline: true,
          defaultDate: currentSelected,
          locale: (window.flatpickr.l10ns && window.flatpickr.l10ns.ko) ? window.flatpickr.l10ns.ko : undefined,
          onChange: (dates) => {
            if (dates && dates[0]) {
              // 로컬 날짜 사용 (UTC 변환 방지)
              const d = dates[0];
              const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
              setSelectedDate(iso);
              closeOverlay();
              rerender();
            }
          },
        });
      } else {
        calendarInput._fp.setDate(currentSelected, true);
      }
      overlay.classList.remove('hidden');
    };

    if (displayEl) {
      displayEl.onclick = openOverlay;
    }
    if (overlayClose) overlayClose.onclick = closeOverlay;
    if (overlayCloseFooter) overlayCloseFooter.onclick = closeOverlay;
    if (overlayToday) {
      overlayToday.onclick = () => {
        setSelectedDate(today);
        closeOverlay();
        rerender();
      };
    }
    if (overlay) {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          closeOverlay();
        }
      });
    }
  }

  // 모바일에서 외부 링크 클릭 핸들러 (target="_blank"가 모바일에서 작동하지 않을 수 있음)
  bindExternalNavLinks() {
    const isMobile = window.innerWidth <= 768;
    if (!isMobile) return; // PC에서는 기본 동작 사용

    const externalLinks = document.querySelectorAll('.nav-item-external');
    externalLinks.forEach(link => {
      // 기본 클릭 동작 방지하고 같은 탭에서 열기
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const url = link.getAttribute('href') || link.getAttribute('data-external-url');
        if (url) {
          window.location.href = url;
        }
      });
    });
  }

  async handleRoute() {
    const app = document.getElementById('app');
    if (!app) {
      console.error('App element not found');
      return;
    }

    try {
      console.log('Router: Getting current profile...');
      
      // 프로필 조회 (내부 타임아웃 2초)
      const profile = await getCurrentProfile();
      
      console.log('Router: Profile result:', profile ? 'found' : 'null');
      console.log('Router: Profile details:', profile ? { id: profile.id, email: profile.email, status: profile.status } : 'none');
      this.currentProfile = profile;
      
      // 로그인하지 않은 경우 (또는 타임아웃)
      if (!profile) {
        console.log('Router: No profile, showing login screen');
        app.innerHTML = `
          <div class="auth-container">
            <div class="auth-logo-wrapper">
              <img src="/logo.png" alt="인생관리시스템" class="auth-logo" onerror="this.style.display='none'" />
              <button id="login-btn" class="auth-login-btn">
                <svg width="20" height="20" viewBox="0 0 24 24" style="margin-right: 4px;">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Google로 로그인
              </button>
            </div>
            <div id="login-error" style="margin-top: 1rem; color: #ef4444; display: none;"></div>
          </div>
        `;
        
        // 로그인 버튼 이벤트 핸들러 (에러 처리 포함)
        const loginBtn = document.getElementById('login-btn');
        if (loginBtn) {
          loginBtn.onclick = async () => {
            const errorDiv = document.getElementById('login-error');
            try {
              loginBtn.disabled = true;
              loginBtn.textContent = '로그인 중...';
              if (errorDiv) {
                errorDiv.style.display = 'none';
                errorDiv.textContent = '';
              }
              
              // signInWithGoogle 함수 직접 import (window 등록 대기 불필요)
              const { signInWithGoogle } = await import('./utils/auth.js');
              
              console.log('[Router] Starting Google login...');
              await signInWithGoogle();
              // OAuth는 리디렉션이 발생하므로 여기까지 도달하지 않을 수 있음
            } catch (error) {
              console.error('[Router] Login error:', error);
              console.error('[Router] Error details:', JSON.stringify(error, null, 2));
              if (errorDiv) {
                errorDiv.style.display = 'block';
                errorDiv.textContent = `로그인 실패: ${error.message || '알 수 없는 오류'}`;
              } else {
                alert(`로그인 실패: ${error.message || '알 수 없는 오류'}`);
              }
              loginBtn.disabled = false;
              loginBtn.textContent = 'Google로 로그인';
            }
          };
        }
        
        this.renderIcons();
        return;
      }

    // 승인 상태별 처리
    if (profile.status === 'pending' || profile.status === 'rejected') {
      app.innerHTML = await renderPending(profile);
      this.renderIcons();
      return;
    }

    if (profile.status === 'blocked') {
      app.innerHTML = await renderRejected(profile);
      this.renderIcons();
      return;
    }

    // 승인된 사용자만 라우팅 (만료일 체크 포함)
    if (profile.status === 'approved') {
      // 만료일 체크
      if (profile.expires_at) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const expiryDate = new Date(profile.expires_at);
        if (expiryDate < today) {
          app.innerHTML = await renderExpired(profile);
          this.renderIcons();
          return;
        }
      }
      // 만료되지 않은 승인 사용자는 아래 라우팅 로직 계속
    } else {
      app.innerHTML = '<div class="error">알 수 없는 상태입니다.</div>';
      return;
    }

      // 해시 기반 라우팅
      let hash = window.location.hash.slice(1) || '/today';
      
      // /reports를 /weekly로 리다이렉트 (하위 호환성)
      if (hash === '/reports') {
        hash = '/weekly';
        window.location.hash = '/weekly';
      }
      
      console.log('Router: Rendering route:', hash);
      const renderFn = this.routes[hash] || renderToday;
      
      app.innerHTML = '<div id="loading">로딩 중...</div>';
      try {
        const result = await renderFn();
        const content = typeof result === 'string' ? result : result?.html || '';
        console.log('Router: Content rendered, updating DOM');
        const navigation = await renderNavigation(hash, profile);
        app.innerHTML = navigation + content;
        
        // date-bar가 필요한 라우트에만 바인딩 (오늘 탭일 때만)
        if (hash === '/today') {
          this.bindDateBar(profile);
        }
        // 모바일에서 관리자 탭 클릭 핸들러 추가 (target="_blank"가 모바일에서 작동하지 않을 수 있음)
        this.bindExternalNavLinks();
        // 후처리(onMount) 실행
        if (result && typeof result === 'object' && typeof result.onMount === 'function') {
          await result.onMount();
        }
        this.renderIcons();
      } catch (error) {
        console.error('Route render error:', error);
        app.innerHTML = `<div class="error">오류가 발생했습니다: ${error.message}<br><pre>${error.stack}</pre></div>`;
      }
    } catch (error) {
      console.error('Router handleRoute error:', error);
      app.innerHTML = `<div class="error">라우터 오류가 발생했습니다: ${error.message}<br><pre>${error.stack}</pre></div>`;
    }
  }
}

export const router = new Router();

