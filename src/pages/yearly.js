// 연간 리포트 페이지
import { supabase } from '../config/supabase.js';
import { getCurrentProfile } from '../utils/auth.js';
import { getToday } from '../utils/date.js';
import { getYearlyStats } from '../utils/yearlyStats.js';
import { renderYearSelector, initYearSelector } from '../components/YearSelector.js';
import { renderYearlyStats } from '../components/YearlyStats.js';
import { renderYearlyInsights } from '../components/YearlyInsights.js';
import { renderYearlyAIReflection, initYearlyAIReflection } from '../components/YearlyAIReflection.js';

// 연도 선택 상태 관리 (localStorage)
const YEAR_STORAGE_KEY = 'reports_selected_year';

function getSelectedYear() {
  // localStorage에서 저장된 연도 읽기
  const saved = typeof localStorage !== 'undefined' ? localStorage.getItem(YEAR_STORAGE_KEY) : null;
  
  // 저장된 값이 있고 유효한 연도이면 사용
  if (saved) {
    const year = parseInt(saved);
    if (!isNaN(year) && year >= 2000 && year <= 2100) {
      return year;
    }
  }
  
  // 저장된 값이 없거나 유효하지 않으면 올해를 기본값으로 사용
  const today = getToday();
  const currentYear = parseInt(today.substring(0, 4));
  return currentYear;
}

function setSelectedYear(year) {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(YEAR_STORAGE_KEY, String(year));
  }
}

/**
 * 연간 리포트 페이지 렌더링
 */
export async function renderYearly() {
  const profile = await getCurrentProfile();
  if (!profile) {
    return '<div class="card"><p>로그인이 필요합니다.</p></div>';
  }
  
  const timezone = profile.timezone || 'Asia/Seoul';
  const selectedYear = getSelectedYear();
  
  // 연간 통계 조회
  let stats;
  let statsError = null;
  try {
    stats = await getYearlyStats(selectedYear, timezone);
  } catch (error) {
    console.error('Error loading yearly stats:', error);
    statsError = error.message;
  }
  
  // 비동기 컴포넌트 먼저 렌더링 (템플릿 리터럴 안에서 await 사용 불가)
  const yearSelectorHtml = renderYearSelector(selectedYear, null, timezone);
  
  // AI 성찰 렌더링 - 타임아웃 추가하여 무한 대기 방지
  let aiReflectionHtml = '';
  try {
    // 타임아웃 설정 (5초)
    const reflectionPromise = renderYearlyAIReflection(selectedYear, timezone);
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('AI 성찰 로딩 시간 초과')), 5000)
    );
    aiReflectionHtml = await Promise.race([reflectionPromise, timeoutPromise]);
  } catch (error) {
    console.error('Error rendering AI reflection:', error);
    aiReflectionHtml = '<div class="card" style="padding: 1rem; color: #dc2626;">AI 성찰을 불러오는 중 오류가 발생했습니다.</div>';
  }
  
  const html = `
    <!-- 연도 선택 -->
    ${yearSelectorHtml}
    
    ${statsError 
      ? `<div class="card" style="background: #fee2e2; border: 2px solid #ef4444; padding: 1.5rem; margin-bottom: 1.5rem;">
           <div style="display: flex; align-items: center; gap: 0.75rem; color: #dc2626;">
             <i data-lucide="alert-circle" style="width: 24px; height: 24px; stroke-width: 2.5;"></i>
             <div>
               <h3 style="font-weight: 600; margin-bottom: 0.25rem;">통계를 불러올 수 없습니다</h3>
               <p style="font-size: 0.875rem; color: #991b1b;">${statsError}</p>
             </div>
           </div>
         </div>`
      : stats
        ? (() => {
            // 데이터가 없는 연도인지 확인
            const hasNoData = stats.todos.total === 0 && 
                             stats.routines.totalChecks === 0 && 
                             stats.reflections.writtenDays === 0;
            
            return hasNoData
              ? `
                 <div class="card" style="background: #f9fafb; border: 2px solid #e5e7eb; padding: 2rem; text-align: center; margin-bottom: 1.5rem;">
                   <i data-lucide="inbox" style="width: 48px; height: 48px; color: #9ca3af; stroke-width: 2.5; margin: 0 auto 1rem; display: block;"></i>
                   <h3 style="font-size: 1.1rem; font-weight: 600; color: #111827; margin-bottom: 0.5rem;">
                     ${selectedYear}년에는 기록된 데이터가 없습니다
                   </h3>
                   <p style="font-size: 0.875rem; color: #6b7280; margin-bottom: 1rem;">
                     할일, 루틴, 성찰을 기록하면 연간 리포트가 생성됩니다.
                   </p>
                   <a href="#/today" style="display: inline-block; padding: 0.5rem 1rem; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; border-radius: 8px; text-decoration: none; font-size: 0.875rem; font-weight: 500;">
                     오늘 페이지로 이동
                   </a>
                 </div>
                 
                 <!-- AI 연간 성찰 (데이터 없어도 표시) -->
                 ${aiReflectionHtml}
               `
              : `
                 <!-- 정량 지표 -->
                 ${renderYearlyStats(stats)}
                 
                 <!-- 정성 분석 -->
                 ${renderYearlyInsights(stats)}
                 
                 <!-- AI 연간 성찰 -->
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
         // 연도 선택 초기화
         initYearSelector((year) => {
           setSelectedYear(year);
           window.location.reload();
         }, selectedYear, timezone);
         
         if (stats) {
           initYearlyAIReflection(generateAIReflection, selectedYear);
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
 * 연도 변경 핸들러
 */
function handleYearChange(year, timezone) {
  setSelectedYear(year);
  // 페이지 새로고침으로 통계 재조회
  window.location.reload();
}

/**
 * Gemini API 에러 메시지를 한글로 변환
 */
function translateErrorMessage(errorMessage) {
  if (!errorMessage) return '알 수 없는 오류가 발생했습니다.';
  
  const message = String(errorMessage).toLowerCase();
  
  // 할당량 초과
  if (message.includes('quota') || message.includes('exceeded') || message.includes('limit')) {
    return '일일 사용 한도를 초과했습니다. 내일 다시 시도해주세요.';
  }
  
  // API 키 오류
  if (message.includes('api key') || message.includes('invalid key') || message.includes('unauthorized')) {
    return 'API 키가 유효하지 않습니다. 관리자에게 문의해주세요.';
  }
  
  // 네트워크 오류
  if (message.includes('network') || message.includes('timeout') || message.includes('connection')) {
    return '네트워크 연결 오류가 발생했습니다. 인터넷 연결을 확인하고 다시 시도해주세요.';
  }
  
  // 서버 오류
  if (message.includes('internal server') || message.includes('server error') || message.includes('500')) {
    return '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
  }
  
  // 모델 과부하
  if (message.includes('overloaded') || message.includes('overload')) {
    return 'AI 모델이 일시적으로 과부하 상태입니다. 잠시 후 다시 시도해주세요.';
  }
  
  // 기타 알려진 오류
  if (message.includes('rate limit')) {
    return '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.';
  }
  
  if (message.includes('forbidden') || message.includes('403')) {
    return '접근이 거부되었습니다. 권한을 확인해주세요.';
  }
  
  if (message.includes('not found') || message.includes('404')) {
    return '요청한 리소스를 찾을 수 없습니다.';
  }
  
  // 원본 메시지 반환 (한글이거나 이미 번역된 경우)
  return errorMessage;
}

/**
 * AI 성찰 생성
 */
async function generateAIReflection(year) {
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
      `${supabaseUrl}/functions/v1/ai-yearly-reflection`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.data.session.access_token}`,
          'apikey': supabaseKey,
        },
        body: JSON.stringify({ year }),
      }
    );
    
    const responseData = await response.json();
    
    if (!response.ok) {
      console.error('Edge Function error response:', responseData);
      // details 객체의 전체 내용을 로깅 (디버깅용)
      if (responseData.details) {
        console.error('Error details:', JSON.stringify(responseData.details, null, 2));
      }
      
      // 에러 메시지 추출 (우선순위: details.error.message > message > error > details)
      let errorMessage = 'AI 성찰 생성에 실패했습니다.';
      
      // 1순위: responseData.details.error.message (Gemini API의 실제 에러 메시지 - 가장 구체적)
      if (responseData.details && typeof responseData.details === 'object') {
        if (responseData.details.error?.message) {
          errorMessage = String(responseData.details.error.message);
        }
        // 2순위: responseData.details.message
        else if (responseData.details.message) {
          errorMessage = String(responseData.details.message);
        }
        // 3순위: responseData.details.status (HTTP 에러)
        else if (responseData.details.status) {
          errorMessage = `HTTP ${responseData.details.status} 오류`;
        }
      }
      // 4순위: responseData.message (Edge Function에서 추출한 메시지)
      else if (responseData.message && 
               responseData.message !== 'AI generation failed' && 
               responseData.message !== 'Unknown error') {
        errorMessage = String(responseData.message);
      }
      // 5순위: responseData.error
      else if (responseData.error) {
        errorMessage = String(responseData.error);
      }
      // 6순위: responseData.details (문자열인 경우)
      else if (responseData.details && typeof responseData.details !== 'object') {
        errorMessage = String(responseData.details);
      }
      
      // 에러 메시지를 한글로 변환
      const translatedMessage = translateErrorMessage(errorMessage);
      throw new Error(translatedMessage);
    }
    
    if (!responseData.content_md) {
      throw new Error('AI 성찰 생성 결과가 없습니다.');
    }
    
    // 성공 시 페이지 새로고침하여 결과 표시
    alert('AI 성찰이 생성되었습니다!');
    window.location.reload();
    
  } catch (error) {
    console.error('Error generating AI reflection:', error);
    // 에러는 컴포넌트에서 처리하므로 여기서는 throw만 수행
    throw error;
  }
}

// 전역 함수로 등록 (인라인 스크립트에서 호출 가능하도록)
if (typeof window !== 'undefined') {
  window.generateAIReflection = generateAIReflection;
  window.setSelectedYear = setSelectedYear;
}


