// 연간 AI 성찰 UI 컴포넌트
import { toast } from '../utils/toast.js';
import { confirmDialog } from '../utils/confirm.js';
import { supabase } from '../config/supabase.js';
import { convertMarkdownToHtml, escapeHtml, formatDate } from '../utils/reflectionMarkdown.js';

/**
 * 연간 AI 성찰 UI 렌더링
 * @param {number} year - 연도 (예: 2025)
 * @param {string} timezone - 타임존 (기본: Asia/Seoul)
 * @returns {Promise<string>} HTML 문자열
 */
export async function renderYearlyAIReflection(year, timezone = 'Asia/Seoul') {
  // 저장된 AI 성찰 조회
  const reflection = await getYearlyAIReflection(year);
  
  const html = `
    <div class="card bg-accent2-soft bd-2px-solid-accent2 sh-0-8px-24px-rgba42_38_34_0_07 mb-1_5rem">
      <div class="card-header bdb-2px-solid-accent2-line pb-1rem mb-1_25rem">
        <div class="d-flex ai-center jc-space-between">
          <div class="d-flex ai-center gap-0_75rem">
            <div class="w-40px h-40px bg-accent2 br-12px d-flex ai-center jc-center sh-0-4px-12px-rgba42_38_34_0_15">
              <i class="w-24px h-24px c-white sw-2_5" data-lucide="sparkles"></i>
            </div>
            <div class="card-title c-accent2 fz-1_5rem m-0">AI 연간 성찰</div>
          </div>
        </div>
      </div>
      
      ${reflection 
        ? renderExistingReflection(reflection, timezone)
        : renderEmptyState(year)
      }
    </div>
  `;
  
  return html;
}

/**
 * 저장된 AI 성찰 조회
 */
async function getYearlyAIReflection(year) {
  try {
    const userId = (await supabase.auth.getUser()).data?.user?.id;
    if (!userId) {
      console.warn('[getYearlyAIReflection] No user ID found');
      return null;
    }
    
    console.log('[getYearlyAIReflection] Fetching reflection for:', { userId, year });
    
    // 타임아웃 설정 (5초)
    const queryPromise = supabase
      .from('yearly_ai_reflections')
      .select('*')
      .eq('user_id', userId)
      .eq('year', year)
      .maybeSingle(); // .single() 대신 .maybeSingle() 사용 (결과 없을 때 406 방지)
    
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Query timeout')), 15000) // 5초는 느린 망에서 정상 응답도 오류로 보였다(7/18 B2)
    );
    
    const { data, error } = await Promise.race([queryPromise, timeoutPromise]);
    
    if (error) {
      console.error('[getYearlyAIReflection] Error details:', {
        code: error.code,
        message: error.message,
        status: error.status,
        details: error.details,
        hint: error.hint
      });
      
      // PGRST116 = not found (정상)
      if (error.code === 'PGRST116') {
        console.log('[getYearlyAIReflection] No reflection found (normal)');
        return null;
      }
      
      // 406 오류인 경우 상세 로그
      if (error.code === 'PGRST301' || error.message?.includes('406') || error.status === 406) {
        console.error('[getYearlyAIReflection] 406 Not Acceptable - RLS policy may be blocking access');
        return null;
      }
      
      return null;
    }
    
    // 디버깅: DB에서 가져온 원본 데이터 확인
    if (data && data.content_md) {
      console.log('[getYearlyAIReflection] DB content_md length:', data.content_md.length);
      console.log('[getYearlyAIReflection] DB content_md preview (first 200 chars):', data.content_md.substring(0, 200));
    }
    
    return data;
  } catch (error) {
    console.error('Error in getYearlyAIReflection:', error);
    return null;
  }
}

/**
 * 기존 성찰 렌더링
 */
function renderExistingReflection(reflection, timezone = 'Asia/Seoul') {
  // 디버깅: 원본 데이터 확인
  console.log('[renderExistingReflection] Reflection object:', {
    hasContentMd: !!reflection.content_md,
    contentMdLength: reflection.content_md?.length || 0,
    contentMdPreview: reflection.content_md?.substring(0, 100) || 'N/A'
  });
  
  // 마크다운을 간단한 HTML로 변환
  let contentHtml = '';
  try {
    contentHtml = convertMarkdownToHtml(reflection.content_md || '');
    console.log('[YearlyAIReflection] Converted HTML length:', contentHtml.length);
    console.log('[YearlyAIReflection] Original markdown length:', (reflection.content_md || '').length);
  } catch (error) {
    console.error('Error converting markdown to HTML:', error);
    contentHtml = `<p class="mb-1rem lh-1_8">${escapeHtml(reflection.content_md || '')}</p>`;
  }
  
  // 재생성 여부 확인: updated_at이 created_at보다 최신이면 재생성된 것
  const displayDate = reflection.updated_at && 
    new Date(reflection.updated_at) > new Date(reflection.created_at)
    ? reflection.updated_at 
    : reflection.created_at;
  
  return `
    <div id="ai-reflection-content">
      <div class="bg-surface br-12px p-1_5rem mb-1rem sh-0-2px-8px-rgba42_38_34_0_08 maxh-600px ovy-scroll ovx-hidden pos-relative d-flex fd-column">
        <div class="c-text lh-1_8 word-wrap-break-word ow-break-word ws-pre-wrap" id="reflection-markdown">
          ${contentHtml}
        </div>
      </div>
      <div class="d-flex ai-center jc-space-between p-0_75rem bg-surface br-8px fz-0_875rem c-muted">
        <div class="d-flex ai-center gap-0_5rem">
          <i class="w-16px h-16px sw-2_5" data-lucide="clock"></i>
          <span>생성일: ${formatDate(displayDate, timezone)}</span>
        </div>
        <button id="regenerate-ai-reflection-btn" class="btn-regenerate bg-accent2 c-white bd-none p-0_5rem-1rem br-8px cur-pointer fz-0_875rem fwt-500 tr-all-0_2s ws-nowrap d-flex ai-center gap-0_25rem hov-tf-translatey-1px hov-sh-0-4px-12px-rgba42_38_34_0_15">
          <i class="w-16px h-16px sw-2_5" data-lucide="refresh-cw"></i>
          다시 생성
        </button>
      </div>
    </div>
  `;
}

/**
 * 빈 상태 렌더링 (생성 버튼)
 */
function renderEmptyState(year) {
  return `
    <div class="ta-center p-2rem" id="ai-reflection-empty">
      <div class="mb-1rem">
        <i class="w-48px h-48px c-accent2 sw-2_5 m-0-auto" data-lucide="sparkles"></i>
      </div>
      <h3 class="fz-1_1rem fwt-600 c-text mb-0_5rem">
        AI 연간 성찰이 아직 없습니다
      </h3>
      <p class="fz-0_875rem c-muted mb-1_5rem">
        ${year}년 한 해 동안의 활동을 분석하여 맞춤형 피드백을 제공합니다.
      </p>
      <button id="generate-ai-reflection-btn" class="btn-generate bg-accent2 c-white bd-none p-0_75rem-1_5rem br-8px cur-pointer fz-1rem fwt-600 tr-all-0_2s sh-0-4px-12px-rgba42_38_34_0_15 ws-nowrap d-flex ai-center gap-0_5rem m-0-auto hov-tf-translatey-2px hov-sh-0-6px-16px-rgba42_38_34_0_18">
        <i class="w-18px h-18px sw-2_5" data-lucide="sparkles"></i>
        AI 성찰 생성하기
      </button>
    </div>
  `;
}

/**
 * 레이트리밋 사용량 조회
 */
/**
 * AI 성찰 생성 이벤트 바인딩
 */
export function initYearlyAIReflection(onGenerate, year) {
  // 생성 버튼
  const generateBtn = document.getElementById('generate-ai-reflection-btn');
  if (generateBtn) {
    generateBtn.addEventListener('click', async () => {
      // 확인 메시지
      if (!(await confirmDialog('AI가 올해 활동을 분석하여 성찰을 생성합니다.\n\n계속하시겠습니까?', { confirmText: '생성' }))) {
        return;
      }
      
      generateBtn.disabled = true;
      generateBtn.innerHTML = '<i class="w-18px h-18px sw-2_5 mr-0_5rem an-spin-1s-linear-infinite" data-lucide="loader-2"></i> 생성 중...';
      
      if (window.lucide) {
        window.lucide.createIcons();
      }
      
      try {
        await onGenerate(year);
      } catch (error) {
        console.error('Error generating AI reflection:', error);
        toast('AI 성찰 생성 중 오류가 발생했습니다: ' + error.message);
        generateBtn.disabled = false;
        generateBtn.innerHTML = '<i class="w-18px h-18px sw-2_5" data-lucide="sparkles"></i> AI 성찰 생성하기';
        
        // Lucide 아이콘 다시 렌더링
        if (window.lucide) {
          window.lucide.createIcons();
        }
      }
    });
  }
  
  // 재생성 버튼
  const regenerateBtn = document.getElementById('regenerate-ai-reflection-btn');
  if (regenerateBtn) {
    regenerateBtn.addEventListener('click', async () => {
      // 확인 메시지
      if (!(await confirmDialog('AI 성찰을 다시 생성하시겠습니까?\n\n기존 성찰은 덮어씌워집니다.', { confirmText: '다시 생성', danger: true }))) {
        return;
      }
      
      regenerateBtn.disabled = true;
      regenerateBtn.innerHTML = '<i class="w-16px h-16px sw-2_5 an-spin-1s-linear-infinite" data-lucide="loader-2"></i> 생성 중...';
      
      if (window.lucide) {
        window.lucide.createIcons();
      }
      
      try {
        await onGenerate(year);
      } catch (error) {
        console.error('Error regenerating AI reflection:', error);
        toast('AI 성찰 생성 중 오류가 발생했습니다: ' + error.message);
        regenerateBtn.disabled = false;
        regenerateBtn.innerHTML = '<i class="w-16px h-16px sw-2_5" data-lucide="refresh-cw"></i> 다시 생성';
        
        // Lucide 아이콘 다시 렌더링
        if (window.lucide) {
          window.lucide.createIcons();
        }
      }
    });
  }
  
  // Lucide 아이콘 렌더링
  if (window.lucide) {
    setTimeout(() => {
      window.lucide.createIcons();
    }, 100);
  }
}

// CSS 애니메이션 추가 (스핀)
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(style);
}


















