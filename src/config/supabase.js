// CDN 방식: window.Supabase 사용
// Vite 방식: import.meta.env 사용

// CDN이 로드될 때까지 기다리는 함수
function waitForSupabaseCDN(maxWait = 2000) { // 대기 시간 단축
  return new Promise((resolve, reject) => {
    // 이미 로드되어 있으면 즉시 반환 (최우선)
    if (typeof window !== 'undefined' && (window.Supabase || window.supabase)) {
      resolve();
      return;
    }
    
    // 50ms 간격으로 빠르게 확인
    let attempts = 0;
    const checkInterval = setInterval(() => {
      attempts++;
      if (typeof window !== 'undefined' && (window.Supabase || window.supabase)) {
        clearInterval(checkInterval);
        resolve();
      } else if (attempts * 50 > maxWait) {
        clearInterval(checkInterval);
        reject(new Error('Supabase CDN load timeout'));
      }
    }, 50);
  });
}

async function initSupabase() {
  let createClient;
  let supabaseUrl, supabaseAnonKey;

  // CDN 방식 시도
  if (typeof window !== 'undefined') {
    try {
      await waitForSupabaseCDN();
      // Supabase UMD는 다양한 이름으로 export될 수 있음
      // CDN에서 로드된 전역 변수 확인
      const SupabaseLib = window.Supabase || window.supabase || (window.supabase && window.supabase.default);
      
      // 디버깅: window 객체에서 supabase 관련 속성 찾기
      if (!SupabaseLib) {
        const supabaseKeys = Object.keys(window).filter(key => 
          key.toLowerCase().includes('supabase')
        );
        console.log('Available Supabase keys on window:', supabaseKeys);
        console.log('Full window keys (first 20):', Object.keys(window).slice(0, 20));
      }
      
      if (SupabaseLib && SupabaseLib.createClient) {
        createClient = SupabaseLib.createClient;
        const config = window.SUPABASE_CONFIG || {};
        supabaseUrl = config.url;
        supabaseAnonKey = config.anonKey;
        
        if (supabaseUrl && supabaseAnonKey) {
          console.log('✅ Supabase client initialized via CDN');
          return createClient(supabaseUrl, supabaseAnonKey);
        } else {
          console.error('❌ Supabase config missing:', { url: !!supabaseUrl, anonKey: !!supabaseAnonKey, config: window.SUPABASE_CONFIG });
        }
      } else {
        console.error('❌ Supabase library not found on window');
        console.log('Window.Supabase:', window.Supabase);
        console.log('Window.supabase:', window.supabase);
      }
    } catch (e) {
      console.warn('CDN load failed, trying Vite mode:', e);
    }
  }

  // Vite 방식 시도
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    try {
      const supabaseModule = await import('@supabase/supabase-js');
      createClient = supabaseModule.createClient;
      supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      if (supabaseUrl && supabaseAnonKey) {
        return createClient(supabaseUrl, supabaseAnonKey);
      }
    } catch (e) {
      console.warn('Vite mode failed:', e);
    }
  }

  // 둘 다 실패
  throw new Error('Supabase client not available. Please:\n1. Load CDN scripts in index.html\n2. Set window.SUPABASE_CONFIG in config.js with url and anonKey\n3. Or use Vite with .env.local file');
}

export const supabase = await initSupabase();

