import { getSupabase } from '../config/supabase.js';

/**
 * Google OAuth 로그인
 */
export async function signInWithGoogle() {
  const supabase = await getSupabase();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/index.html`
    }
  });
  
  if (error) throw error;
  return data;
}

/**
 * 로그아웃
 */
export async function signOut() {
  const supabase = await getSupabase();
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

/**
 * 프로필 자동 생성 (profiles가 없을 때)
 */
async function createProfileIfMissing(user) {
  try {
    const supabase = await getSupabase();
    console.log('[Auth] Creating missing profile for user:', user.id, user.email);
    
    // RLS 정책 수정 후 직접 INSERT 시도
    const { data, error } = await supabase
      .from('profiles')
      .insert({
        id: user.id,
        email: user.email,
        name: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || '',
        avatar_url: user.user_metadata?.avatar_url || null,
        status: 'pending',
        role: 'user'
      })
      .select()
      .single();

    if (error) {
      console.error('[Auth] Failed to create profile:', error);
      console.error('[Auth] Error code:', error.code);
      console.error('[Auth] Error hint:', error.hint);
      console.error('[Auth] Error details:', JSON.stringify(error, null, 2));
      
      // 이미 존재하는 경우 다시 조회 시도
      if (error.code === '23505') { // unique_violation
        console.log('[Auth] Profile already exists, fetching...');
        const { data: existing, error: fetchError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        
        if (!fetchError && existing) {
          console.log('[Auth] Found existing profile:', existing);
          return existing;
        }
      }
      
      // RLS 정책 문제일 수 있음 - 트리거가 생성할 때까지 짧게 대기 (300ms)
      console.warn('[Auth] Profile creation failed, waiting for trigger...');
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const { data: retryData, error: retryError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (!retryError && retryData) {
        console.log('[Auth] Profile found after retry (created by trigger):', retryData);
        return retryData;
      }
      
      return null;
    }

    console.log('[Auth] Profile created successfully:', data);
    return data;
  } catch (err) {
    console.error('[Auth] Exception creating profile:', err);
    return null;
  }
}

/**
 * 현재 사용자 프로필 조회 (승인 상태 포함)
 * 프로필이 없으면 자동 생성 시도
 */
export async function getCurrentProfile() {
  // 타임아웃 2초로 단축 (속도 개선, 안정성 유지)
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('getCurrentProfile timeout')), 2000);
  });

  try {
    const profilePromise = (async () => {
      const supabase = await getSupabase();
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        console.warn('getUser error:', userError);
        return null;
      }
      
      if (!user) {
        console.log('No user logged in');
        return null;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        // 프로필이 없을 때 자동 생성 시도
        if (error.code === 'PGRST116') {
          console.log('[Auth] Profile not found (PGRST116), attempting to create...');
          console.log('[Auth] User info:', { id: user.id, email: user.email });
          
          // 빠른 생성 시도 (대기 시간 최소화)
          const newProfile = await createProfileIfMissing(user);
          if (newProfile) {
            console.log('[Auth] Profile created/found:', newProfile);
            return newProfile;
          }
          
          // 트리거가 생성했을 수 있으므로 빠른 재조회 (300ms로 단축)
          console.log('[Auth] Quick retry for trigger-created profile...');
          await new Promise(resolve => setTimeout(resolve, 300));
          
          const { data: retryData, error: retryError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();
          
          if (!retryError && retryData) {
            console.log('[Auth] Profile found on retry:', retryData);
            return retryData;
          }
          
          // 최종 실패 - null 반환하여 로그인 화면 표시
          console.warn('[Auth] Profile not found after attempts, returning null');
          return null;
        }
        console.error('getCurrentProfile error:', error);
        return null;
      }
      
      return data;
    })();

    // 타임아웃과 프로필 조회 중 먼저 완료되는 것 반환
    return await Promise.race([profilePromise, timeoutPromise]);
  } catch (error) {
    if (error.message === 'getCurrentProfile timeout') {
      console.warn('[Auth] getCurrentProfile timeout, returning null');
      return null;
    }
    console.error('getCurrentProfile exception:', error);
    return null;
  }
}

/**
 * 승인된 사용자인지 확인 (만료일 포함)
 */
export async function isApprovedUser() {
  const profile = await getCurrentProfile();
  if (!profile || profile.status !== 'approved') {
    return false;
  }
  
  // 만료일 체크
  if (profile.expires_at) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiryDate = new Date(profile.expires_at);
    if (expiryDate < today) {
      return false; // 만료됨
    }
  }
  
  return true;
}

/**
 * 관리자인지 확인
 */
export async function isAdmin() {
  const profile = await getCurrentProfile();
  const isAdminResult = profile?.role === 'admin';
  console.log('[Auth] isAdmin check:', { 
    userId: profile?.id, 
    role: profile?.role, 
    isAdmin: isAdminResult 
  });
  return isAdminResult;
}

