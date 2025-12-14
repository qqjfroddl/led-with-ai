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
      const errorMessage = responseData.details || responseData.message || responseData.error || 'AI 성찰 생성에 실패했습니다.';
      throw new Error(errorMessage);
    }
    
    if (!responseData.content_md) {
      throw new Error('AI 성찰 생성 결과가 없습니다.');
    }
    
    // 성공 시 페이지 새로고침하여 결과 표시
    alert('AI 성찰이 생성되었습니다!');
    window.location.reload();
    
  } catch (error) {
    console.error('Error generating AI reflection:', error);
    alert('AI 성찰 생성 중 오류가 발생했습니다: ' + error.message);
    throw error;
  }
}

// 전역 함수로 등록 (인라인 스크립트에서 호출 가능하도록)
if (typeof window !== 'undefined') {
  window.generateAIReflection = generateAIReflection;
  window.setSelectedYear = setSelectedYear;
}
