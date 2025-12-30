import { getSupabase } from './config/supabase.js';
import { getCurrentProfile, signInWithGoogle, signOut } from './utils/auth.js';
import { router } from './router.js';

// 전역 상태
let currentUser = null;
let currentProfile = null;

// 초기 로드
async function init() {
  try {
    console.log('Main: Initializing...');
    
    // Supabase 클라이언트 초기화 대기
    const supabase = await getSupabase();
    console.log('Main: Supabase client:', supabase ? 'available' : 'missing');
    
    // 인증 상태 변경 감지 (Supabase 초기화 후)
    supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN') {
        // 로그인 시에만 라우팅
        currentUser = session?.user || null;
        if (currentUser) {
          currentProfile = await getCurrentProfile();
        }
        router.handleRoute();
      } else if (event === 'TOKEN_REFRESHED') {
        // 토큰 갱신은 인증 상태 변경이 아니므로 라우팅하지 않음
        // 세션 정보만 조용히 업데이트 (입력 중인 내용 보존)
        currentUser = session?.user || null;
        if (currentUser) {
          currentProfile = await getCurrentProfile();
        }
        // router.handleRoute() 호출 제거 - 페이지 재렌더링 방지
      } else if (event === 'SIGNED_OUT') {
        currentUser = null;
        currentProfile = null;
        router.handleRoute();
      }
    });
    
    // 간소화된 세션 조회 (속도 개선)
    console.log('Main: Getting session...');
    let { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.warn('Main: Session error:', sessionError);
    }
    
    // 모바일 브라우저 세션 복구 (삼성 인터넷, 앱 내장 브라우저 등)
    if (!session) {
      console.log('Main: No session found, checking URL for OAuth callback...');
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const accessToken = hashParams.get('access_token');
      
      if (accessToken) {
        console.log('Main: OAuth access token found in URL, waiting for session...');
        // Supabase가 OAuth 콜백을 처리할 시간 대기
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // 세션 다시 확인
        const { data: { session: recoveredSession } } = await supabase.auth.getSession();
        if (recoveredSession) {
          console.log('Main: Session recovered successfully! ✅');
          session = recoveredSession;
        } else {
          console.warn('Main: Session recovery failed, access token found but no session');
        }
      }
    }
    
    if (session) {
      console.log('Main: Session found, user:', session.user?.email || 'no email');
      currentUser = session.user;
      console.log('Main: Getting profile...');
      currentProfile = await getCurrentProfile();
      console.log('Main: Profile loaded:', currentProfile ? { status: currentProfile.status, role: currentProfile.role } : 'null');
    } else {
      console.log('Main: No session found');
    }
    
    // 라우터 초기화
    console.log('Main: Initializing router...');
    router.init();
    console.log('Main: Handling route...');
    await router.handleRoute();
    
    // 전역 함수 등록
    window.signInWithGoogle = signInWithGoogle;
    window.signOut = signOut;
    
    console.log('Main: Initialization complete ✅');
  } catch (error) {
    console.error('Main init error:', error);
    console.error('Error stack:', error.stack);
    const app = document.getElementById('app');
    if (app) {
      app.innerHTML = `
        <div class="error" style="margin: 2rem; padding: 2rem;">
          <h2>초기화 오류</h2>
          <p>${error.message}</p>
          <details style="margin-top: 1rem;">
            <summary>상세 정보</summary>
            <pre style="background: #f5f5f5; padding: 1rem; margin-top: 0.5rem; border-radius: 0.5rem; overflow-x: auto;">${error.stack}</pre>
          </details>
        </div>
      `;
    }
  }
}

init();

