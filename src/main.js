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
    
    // 세션 조회 (타임아웃: 5초)
    console.log('Main: Getting session...');
    
    let sessionResult;
    
    // 로컬 스토리지에 Supabase 관련 세션 토큰이 있는지 확인
    try {
      // Supabase는 여러 형식의 localStorage 키를 사용할 수 있음
      // 모든 localStorage 키를 확인하여 Supabase 관련 키 찾기
      let hasLocalSession = false;
      try {
        const supabaseUrl = new URL(window.SUPABASE_CONFIG.url);
        const projectRef = supabaseUrl.hostname.split('.')[0];
        hasLocalSession = !!localStorage.getItem(`sb-${projectRef}-auth-token`);
      } catch (e) {
        // URL 파싱 실패 시 무시
      }
      
      // 다른 형식의 키도 확인
      if (!hasLocalSession) {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (key.includes('supabase') || key.includes('sb-') || key.includes('auth-token'))) {
            hasLocalSession = true;
            console.log('Main: Found Supabase session key:', key);
            break;
          }
        }
      }
      
      if (!hasLocalSession) {
        console.log('Main: No local session found, skipping network request');
        // 에러를 던지지 않고 null 세션으로 처리
        sessionResult = { data: { session: null }, error: null };
      } else {
        // 로컬 세션이 있으면 네트워크 요청 (타임아웃: 5초)
        console.log('Main: Local session found, fetching from server...');
        const sessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('getSession timeout')), 5000)
        );
        
        try {
          sessionResult = await Promise.race([sessionPromise, timeoutPromise]);
          console.log('Main: Session fetched:', sessionResult?.data?.session ? 'found' : 'null');
        } catch (timeoutError) {
          console.warn('Main: getSession timeout, using null session');
          sessionResult = { data: { session: null }, error: null };
        }
      }
    } catch (checkError) {
      console.warn('Main: Error checking local session, trying direct getSession:', checkError);
      // 에러 발생 시 직접 getSession 시도 (타임아웃: 5초)
      try {
        const sessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('getSession timeout')), 5000)
        );
        sessionResult = await Promise.race([sessionPromise, timeoutPromise]);
      } catch (directError) {
        console.warn('Main: Direct getSession also failed, using null session');
        sessionResult = { data: { session: null }, error: null };
      }
    }
    
    const { data: { session }, error: sessionError } = sessionResult || { data: { session: null }, error: null };
    
    if (sessionError) {
      console.warn('Main: Session error:', sessionError);
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

