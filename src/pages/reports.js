// 주간 리포트 페이지
import { toast } from '../utils/toast.js';
import { supabase } from '../config/supabase.js';
import { getCurrentProfile } from '../utils/auth.js';
import { getWeekStart, getToday } from '../utils/date.js';
import { getWeeklyStats } from '../utils/weeklyStats.js';
import { renderWeekSelector, initWeekSelector } from '../components/WeekSelector.js';
import { renderPeriodStats } from '../components/PeriodStats.js';
import { renderPeriodInsights } from '../components/PeriodInsights.js';
import { renderWeeklyAIReflection, initWeeklyAIReflection } from '../components/WeeklyAIReflection.js';

// 주차 상태 관리 (localStorage)
const WEEK_STORAGE_KEY = 'reports_selected_week';

function getSelectedWeek(timezone = 'Asia/Seoul') {
  // localStorage에서 저장된 주차 읽기
  const saved = typeof localStorage !== 'undefined' ? localStorage.getItem(WEEK_STORAGE_KEY) : null;
  
  // 저장된 값이 있고 유효한 날짜 형식이면 사용
  if (saved) {
    // 날짜 형식 검증 (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (dateRegex.test(saved)) {
      return saved;
    }
  }
  
  // 저장된 값이 없거나 유효하지 않으면 이번 주를 기본값으로 사용
  const today = getToday(timezone);
  const weekStart = getWeekStart(today, timezone);
  return weekStart;
}

function setSelectedWeek(weekStart) {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(WEEK_STORAGE_KEY, weekStart);
  }
}

/**
 * 리포트 페이지 렌더링
 */
export async function renderReports() {
  const profile = await getCurrentProfile();
  if (!profile) {
    return '<div class="card"><p>로그인이 필요합니다.</p></div>';
  }
  
  const timezone = profile.timezone || 'Asia/Seoul';
  const selectedWeekStart = getSelectedWeek(timezone);
  
  // 주간 통계 조회
  let stats;
  let statsError = null;
  try {
    stats = await getWeeklyStats(selectedWeekStart, timezone);
  } catch (error) {
    console.error('Error loading weekly stats:', error);
    statsError = error.message;
  }
  
  // 비동기 컴포넌트 먼저 렌더링 (템플릿 리터럴 안에서 await 사용 불가)
  const weekSelectorHtml = renderWeekSelector(selectedWeekStart, null, timezone);
  
  // AI 성찰 렌더링 - 타임아웃 추가하여 무한 대기 방지
  let aiReflectionHtml = '';
  try {
    // 타임아웃 설정 (5초)
    const reflectionPromise = renderWeeklyAIReflection(selectedWeekStart, timezone);
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('AI 성찰 로딩 시간 초과')), 20000) // 7/18 B2: 5초 → 20초
    );
    aiReflectionHtml = await Promise.race([reflectionPromise, timeoutPromise]);
  } catch (error) {
    console.error('Error rendering AI reflection:', error);
    aiReflectionHtml = '<div class="card p-1rem c-danger">AI 성찰을 불러오는 중 오류가 발생했습니다.</div>';
  }
  
  const html = `
    <!-- 주차 선택 -->
    ${weekSelectorHtml}
    
    ${statsError 
      ? `<div class="card bg-danger-soft bd-2px-solid-danger p-1_5rem mb-1_5rem">
           <div class="d-flex ai-center gap-0_75rem c-danger">
             <i class="w-24px h-24px sw-2_5" data-lucide="alert-circle"></i>
             <div>
               <h3 class="fwt-600 mb-0_25rem">통계를 불러올 수 없습니다</h3>
               <p class="fz-0_875rem c-danger">${statsError}</p>
             </div>
           </div>
         </div>`
      : stats
        ? (() => {
            // 데이터가 없는 주간인지 확인
            const hasNoData = stats.todos.total === 0 && 
                             stats.routines.totalRoutines === 0 && 
                             stats.reflections.writtenDays === 0;
            
            return hasNoData
              ? `
                 <div class="card bg-bg bd-2px-solid-line p-2rem ta-center mb-1_5rem">
                   <i class="w-48px h-48px c-muted2 sw-2_5 m-0-auto-1rem d-block" data-lucide="inbox"></i>
                   <h3 class="fz-1_1rem fwt-600 c-text mb-0_5rem">
                     이번 주에는 기록된 데이터가 없습니다
                   </h3>
                   <p class="fz-0_875rem c-muted mb-1rem">
                     할일, 루틴, 성찰을 기록하면 주간 리포트가 생성됩니다.
                   </p>
                   <a class="d-inline-block p-0_5rem-1rem bg-accent c-white br-8px td-none fz-0_875rem fwt-500" href="#/today">
                     오늘 페이지로 이동
                   </a>
                 </div>
                 
                 <!-- AI 주간 성찰 (데이터 없어도 표시) -->
                 ${aiReflectionHtml}
               `
              : `
                 <!-- 정량 지표 -->
                 ${renderPeriodStats(stats, 'week')}
                 
                 <!-- 정성 분석 -->
                 ${renderPeriodInsights(stats, 'week')}
                 
                 <!-- AI 주간 성찰 -->
                 ${aiReflectionHtml}
               `;
          })()
        : '<div class="card"><p>통계를 불러오는 중...</p></div>'
    }
    
   `;
   
    // 이벤트 바인딩을 위한 onMount 반환 (router.js에서 지원)
    return {
      html,
      onMount: async () => {
        try {
          // 주차 선택 초기화 (selectedWeekStart와 timezone 전달)
          initWeekSelector((weekStart) => {
            setSelectedWeek(weekStart);
            window.location.reload();
          }, selectedWeekStart, timezone);
          
          if (stats) {
            initWeeklyAIReflection(generateAIReflection, selectedWeekStart);
          }
          
          // Lucide 아이콘 렌더링
          if (window.lucide) {
            setTimeout(() => {
              window.lucide.createIcons();
            }, 200);
          }
        } catch (error) {
          console.error('Error in onMount:', error);
        }
      }
    };
}

/**
 * 주차 변경 핸들러
 */
function handleWeekChange(weekStart, timezone) {
  setSelectedWeek(weekStart);
  // 페이지 새로고침으로 통계 재조회
  window.location.reload();
}

/**
 * AI 성찰 생성
 */
async function generateAIReflection(weekStart) {
  try {
    const userId = (await supabase.auth.getUser()).data?.user?.id;
    if (!userId) {
      throw new Error('로그인이 필요합니다.');
    }
    
    // Edge Function 호출 - 직접 fetch 사용하여 에러 본문 확인 가능하도록
    const session = await supabase.auth.getSession();
    if (!session.data.session) {
      throw new Error('로그인이 필요합니다.');
    }
    
    // config.js에서 Supabase URL과 Key 가져오기
    const supabaseUrl = window.SUPABASE_CONFIG?.url || supabase.supabaseUrl;
    const supabaseKey = window.SUPABASE_CONFIG?.anonKey || supabase.supabaseKey;
    
    const response = await fetch(
      `${supabaseUrl}/functions/v1/ai-weekly-reflection`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.data.session.access_token}`,
          'apikey': supabaseKey,
        },
        body: JSON.stringify({ week_start: weekStart }),
      }
    );
    
    const responseData = await response.json();
    
    if (!response.ok) {
      console.error('Edge Function error response:', responseData);
      
      // 에러 메시지 추출 (객체일 수 있으므로 처리)
      let errorMessage = 'AI 성찰 생성에 실패했습니다.';
      let rawErrorMessage = '';
      
      // 1. message 필드를 우선 확인 (Edge Function에서 추출한 메시지)
      if (responseData.message) {
        rawErrorMessage = String(responseData.message);
        errorMessage = rawErrorMessage;
      }
      // 2. details 필드 확인 (Gemini API 에러가 여기 있을 수 있음)
      else if (responseData.details) {
        if (typeof responseData.details === 'object') {
          // Gemini API 에러 형식: { error: { message: "...", code: ... } }
          if (responseData.details.error?.message) {
            rawErrorMessage = responseData.details.error.message;
            errorMessage = rawErrorMessage;
          } 
          // 또는 직접 message 필드가 있는 경우
          else if (responseData.details.message) {
            rawErrorMessage = responseData.details.message;
            errorMessage = rawErrorMessage;
          }
          // 또는 status 필드가 있는 경우 (Gemini API)
          else if (responseData.details.status) {
            rawErrorMessage = responseData.details.message || '알 수 없는 오류';
            errorMessage = `API 오류 (${responseData.details.status}): ${rawErrorMessage}`;
          }
          else {
            // 객체를 문자열로 변환 시도
            try {
              rawErrorMessage = JSON.stringify(responseData.details);
              errorMessage = rawErrorMessage;
            } catch {
              errorMessage = '알 수 없는 오류가 발생했습니다.';
            }
          }
        } else {
          rawErrorMessage = String(responseData.details);
          errorMessage = rawErrorMessage;
        }
      } 
      // 3. error 필드 확인
      else if (responseData.error) {
        if (typeof responseData.error === 'object') {
          rawErrorMessage = responseData.error.message || JSON.stringify(responseData.error);
          errorMessage = rawErrorMessage;
        } else {
          rawErrorMessage = String(responseData.error);
          errorMessage = rawErrorMessage;
        }
      }
      
      // 할당량 초과 에러 감지 및 처리
      if (rawErrorMessage.includes('exceeded your current quota') || 
          rawErrorMessage.includes('Quota exceeded') || 
          rawErrorMessage.includes('RESOURCE_EXHAUSTED') ||
          errorMessage.includes('exceeded your current quota') || 
          errorMessage.includes('Quota exceeded')) {
        
        // 재시도 시간 추출 (원본 에러 메시지에서)
        const retryMatch = rawErrorMessage.match(/Please retry in ([\d.]+)s/i) || 
                          errorMessage.match(/Please retry in ([\d.]+)s/i);
        let retryMessage = '';
        if (retryMatch) {
          const retrySeconds = parseFloat(retryMatch[1]);
          const retryMinutes = Math.floor(retrySeconds / 60);
          const remainingSeconds = Math.ceil(retrySeconds % 60);
          
          if (retryMinutes > 0) {
            retryMessage = `약 ${retryMinutes}분 ${remainingSeconds}초 후 다시 시도해주세요.`;
          } else {
            retryMessage = `약 ${Math.ceil(retrySeconds)}초 후 다시 시도해주세요.`;
          }
        }
        
        // 할당량 제한 정보 추출
        const limitMatch = rawErrorMessage.match(/limit: (\d+)/i) || 
                          errorMessage.match(/limit: (\d+)/i);
        const limitInfo = limitMatch ? ` (일일 ${limitMatch[1]}회 제한)` : '';
        
        errorMessage = `Gemini API 할당량을 초과했습니다${limitInfo}.\n\n${retryMessage || '잠시 후 다시 시도해주세요.'}\n\n무료 티어는 제한이 있으므로, 잠시 기다린 후 다시 시도해주시기 바랍니다.`;
      }
      // 레이트리밋 에러인 경우 특별 처리 (앱 레벨 레이트리밋)
      else if (response.status === 429 || errorMessage.includes('Rate limit exceeded')) {
        errorMessage = '레이트리밋에 도달했습니다. 다음 주에 다시 시도해주세요.';
      }
      // API 키 관련 에러
      else if (errorMessage.includes('API key') || errorMessage.includes('UNAUTHENTICATED')) {
        errorMessage = 'API 키 오류가 발생했습니다. 관리자에게 문의해주세요.';
      }
      
      throw new Error(errorMessage);
    }
    
    if (!responseData.content_md) {
      throw new Error('AI 성찰 생성 결과가 없습니다.');
    }
    
    // 성공 시 페이지 새로고침하여 결과 표시
    toast('AI 성찰이 생성되었습니다!');
    window.location.reload();
    
  } catch (error) {
    console.error('Error generating AI reflection:', error);
    toast('AI 성찰 생성 중 오류가 발생했습니다: ' + error.message);
    throw error;
  }
}

// 전역 함수로 등록 (인라인 스크립트에서 호출 가능하도록)
if (typeof window !== 'undefined') {
  window.generateAIReflection = generateAIReflection;
  window.setSelectedWeek = setSelectedWeek;
}
