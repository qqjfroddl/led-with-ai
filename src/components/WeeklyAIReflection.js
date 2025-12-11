// 주간 AI 성찰 UI 컴포넌트
import { supabase } from '../config/supabase.js';
import { getWeekStart } from '../utils/date.js';

/**
 * 주간 AI 성찰 UI 렌더링
 * @param {string} weekStart - 주 시작일 (YYYY-MM-DD)
 * @param {string} timezone - 타임존 (기본: Asia/Seoul)
 * @returns {Promise<string>} HTML 문자열
 */
export async function renderWeeklyAIReflection(weekStart, timezone = 'Asia/Seoul') {
  // 저장된 AI 성찰 조회
  const reflection = await getWeeklyAIReflection(weekStart);
  
  const html = `
    <div class="card" style="background: linear-gradient(135deg, #f0e7ff 0%, #fce7f3 100%); border: 2px solid #a78bfa; box-shadow: 0 8px 24px rgba(167, 139, 250, 0.15); margin-bottom: 1.5rem;">
      <div class="card-header" style="border-bottom: 2px solid rgba(167, 139, 250, 0.2); padding-bottom: 1rem; margin-bottom: 1.25rem;">
        <div style="display: flex; align-items: center; justify-content: space-between;">
          <div style="display: flex; align-items: center; gap: 0.75rem;">
            <div style="width: 40px; height: 40px; background: linear-gradient(135deg, #a78bfa 0%, #c084fc 100%); border-radius: 12px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(167, 139, 250, 0.3);">
              <i data-lucide="sparkles" style="width: 24px; height: 24px; color: white; stroke-width: 2.5;"></i>
            </div>
            <div class="card-title" style="color: #7c3aed; font-size: 1.5rem; margin: 0;">AI 주간 성찰</div>
          </div>
        </div>
      </div>
      
      ${reflection 
        ? renderExistingReflection(reflection, timezone)
        : renderEmptyState(weekStart)
      }
    </div>
  `;
  
  return html;
}

/**
 * 저장된 AI 성찰 조회
 */
async function getWeeklyAIReflection(weekStart) {
  try {
    const userId = (await supabase.auth.getUser()).data?.user?.id;
    if (!userId) return null;
    
    // 타임아웃 설정 (3초)
    const queryPromise = supabase
      .from('weekly_ai_reflections')
      .select('*')
      .eq('user_id', userId)
      .eq('week_start', weekStart)
      .single();
    
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Query timeout')), 3000)
    );
    
    const { data, error } = await Promise.race([queryPromise, timeoutPromise]);
    
    if (error && error.code !== 'PGRST116') { // PGRST116 = not found
      console.error('Error fetching AI reflection:', error);
      // 406 오류인 경우 빈 결과 반환 (RLS 정책 문제일 수 있음)
      if (error.code === 'PGRST301' || error.message?.includes('406') || error.status === 406) {
        return null;
      }
      return null;
    }
    
    // 디버깅: DB에서 가져온 원본 데이터 확인
    if (data && data.content_md) {
      console.log('[getWeeklyAIReflection] DB content_md length:', data.content_md.length);
      console.log('[getWeeklyAIReflection] DB content_md preview (first 200 chars):', data.content_md.substring(0, 200));
      console.log('[getWeeklyAIReflection] DB content_md preview (last 200 chars):', data.content_md.substring(Math.max(0, data.content_md.length - 200)));
    }
    
    return data;
  } catch (error) {
    console.error('Error in getWeeklyAIReflection:', error);
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
  
  // 마크다운을 간단한 HTML로 변환 (기본적인 변환)
  // 에러 발생 시 원본 텍스트를 그대로 표시
  let contentHtml = '';
  try {
    contentHtml = convertMarkdownToHtml(reflection.content_md || '');
    // 디버깅: 변환된 HTML 길이 확인
    console.log('[WeeklyAIReflection] Converted HTML length:', contentHtml.length);
    console.log('[WeeklyAIReflection] Original markdown length:', (reflection.content_md || '').length);
    
    // 길이 불일치 확인
    if (contentHtml.length < (reflection.content_md || '').length * 0.5) {
      console.warn('[WeeklyAIReflection] WARNING: Converted HTML is significantly shorter than original markdown!');
      console.warn('[WeeklyAIReflection] This may indicate content was lost during conversion.');
    }
  } catch (error) {
    console.error('Error converting markdown to HTML:', error);
    console.error('Error stack:', error.stack);
    // 에러 발생 시 원본 텍스트를 이스케이프하여 표시
    contentHtml = `<p style="margin-bottom: 1rem; line-height: 1.8;">${escapeHtml(reflection.content_md || '')}</p>`;
  }
  
  // 재생성 여부 확인: updated_at이 created_at보다 최신이면 재생성된 것
  const displayDate = reflection.updated_at && 
    new Date(reflection.updated_at) > new Date(reflection.created_at)
    ? reflection.updated_at 
    : reflection.created_at;
  
  return `
    <div id="ai-reflection-content">
      <div style="background: white; border-radius: 12px; padding: 1.5rem; margin-bottom: 1rem; box-shadow: 0 2px 8px rgba(0,0,0,0.08); max-height: 600px; overflow-y: scroll; overflow-x: hidden; position: relative; display: flex; flex-direction: column;">
        <div id="reflection-markdown" style="color: #111827; line-height: 1.8; word-wrap: break-word; overflow-wrap: break-word; white-space: pre-wrap;">
          ${contentHtml}
        </div>
      </div>
      <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.75rem; background: white; border-radius: 8px; font-size: 0.875rem; color: #6b7280;">
        <div style="display: flex; align-items: center; gap: 0.5rem;">
          <i data-lucide="clock" style="width: 16px; height: 16px; stroke-width: 2.5;"></i>
          <span>생성일: ${formatDate(displayDate, timezone)}</span>
        </div>
        <button 
          id="regenerate-ai-reflection-btn"
          class="btn-regenerate"
          style="background: linear-gradient(135deg, #a78bfa 0%, #c084fc 100%); color: white; border: none; padding: 0.5rem 1rem; border-radius: 8px; cursor: pointer; font-size: 0.875rem; font-weight: 500; transition: all 0.2s;"
          onmouseover="this.style.transform='translateY(-1px)'; this.style.boxShadow='0 4px 12px rgba(167, 139, 250, 0.3)';"
          onmouseout="this.style.transform='none'; this.style.boxShadow='none';"
        >
          <i data-lucide="refresh-cw" style="width: 16px; height: 16px; stroke-width: 2.5; margin-right: 0.25rem;"></i>
          다시 생성
        </button>
      </div>
    </div>
  `;
}

/**
 * 빈 상태 렌더링 (생성 버튼)
 */
function renderEmptyState(weekStart) {
  return `
    <div id="ai-reflection-empty" style="text-align: center; padding: 2rem;">
      <div style="margin-bottom: 1rem;">
        <i data-lucide="sparkles" style="width: 48px; height: 48px; color: #a78bfa; stroke-width: 2.5; margin: 0 auto;"></i>
      </div>
      <h3 style="font-size: 1.1rem; font-weight: 600; color: #111827; margin-bottom: 0.5rem;">
        AI 주간 성찰이 아직 없습니다
      </h3>
      <p style="font-size: 0.875rem; color: #6b7280; margin-bottom: 1.5rem;">
        이번 주의 활동을 분석하여 맞춤형 피드백을 제공합니다.
      </p>
      <button 
        id="generate-ai-reflection-btn"
        class="btn-generate"
        style="background: linear-gradient(135deg, #a78bfa 0%, #c084fc 100%); color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 8px; cursor: pointer; font-size: 1rem; font-weight: 600; transition: all 0.2s; box-shadow: 0 4px 12px rgba(167, 139, 250, 0.3);"
        onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 16px rgba(167, 139, 250, 0.4)';"
        onmouseout="this.style.transform='none'; this.style.boxShadow='0 4px 12px rgba(167, 139, 250, 0.3)';"
      >
        <i data-lucide="sparkles" style="width: 18px; height: 18px; stroke-width: 2.5; margin-right: 0.5rem;"></i>
        AI 성찰 생성하기
      </button>
    </div>
  `;
}

/**
 * 마크다운을 간단한 HTML로 변환 (개선된 버전 - 안정성 강화)
 */
function convertMarkdownToHtml(markdown) {
  if (!markdown) return '';
  
  // 디버깅: 원본 마크다운 길이 확인
  console.log('[convertMarkdownToHtml] Input markdown length:', markdown.length);
  
  // 줄 단위로 분리
  const lines = markdown.split('\n');
  console.log('[convertMarkdownToHtml] Total lines:', lines.length);
  
  const result = [];
  let inList = false;
  let inOrderedList = false;
  let listItems = [];
  let orderedListItems = [];
  let currentPara = [];
  let processedLines = 0;
  
  // 모든 줄을 처리하도록 보장 (전체 루프를 try-catch로 감싸서 예외 발생 시에도 계속 진행)
  for (let i = 0; i < lines.length; i++) {
    try {
      const line = lines[i];
      // null이나 undefined 체크
      if (line == null) {
      // null이나 undefined인 경우 빈 줄로 처리
      if (inOrderedList && orderedListItems.length > 0) {
        result.push(`<ol style="margin: 0.75rem 0; padding-left: 1.5rem; list-style-type: decimal;">${orderedListItems.join('')}</ol>`);
        orderedListItems = [];
        inOrderedList = false;
      }
      if (inList && listItems.length > 0) {
        result.push(`<ul style="margin: 0.75rem 0; padding-left: 1.5rem; list-style-type: disc;">${listItems.join('')}</ul>`);
        listItems = [];
        inList = false;
      }
      if (currentPara.length > 0) {
        result.push(`<p style="margin-bottom: 1rem; line-height: 1.8;">${currentPara.join(' ')}</p>`);
        currentPara = [];
      }
      processedLines++;
      continue;
    }
    
    let trimmed;
    try {
      trimmed = typeof line === 'string' ? line.trim() : String(line).trim();
    } catch (error) {
      console.error(`Error trimming line ${i}:`, error);
      trimmed = '';
    }
    
    // 빈 줄 처리
    if (!trimmed) {
      // 순서 리스트가 진행 중이면 리스트 종료
      if (inOrderedList && orderedListItems.length > 0) {
        result.push(`<ol style="margin: 0.75rem 0; padding-left: 1.5rem; list-style-type: decimal;">${orderedListItems.join('')}</ol>`);
        orderedListItems = [];
        inOrderedList = false;
      }
      // 비순서 리스트가 진행 중이면 리스트 종료
      if (inList && listItems.length > 0) {
        result.push(`<ul style="margin: 0.75rem 0; padding-left: 1.5rem; list-style-type: disc;">${listItems.join('')}</ul>`);
        listItems = [];
        inList = false;
      }
      // 문단이 진행 중이면 문단 종료
      if (currentPara.length > 0) {
        result.push(`<p style="margin-bottom: 1rem; line-height: 1.8;">${currentPara.join(' ')}</p>`);
        currentPara = [];
      }
      processedLines++;
      continue;
    }
    
    // 구분선 처리
    if (trimmed === '---' || trimmed === '***') {
      if (inOrderedList && orderedListItems.length > 0) {
        result.push(`<ol style="margin: 0.75rem 0; padding-left: 1.5rem; list-style-type: decimal;">${orderedListItems.join('')}</ol>`);
        orderedListItems = [];
        inOrderedList = false;
      }
      if (inList && listItems.length > 0) {
        result.push(`<ul style="margin: 0.75rem 0; padding-left: 1.5rem; list-style-type: disc;">${listItems.join('')}</ul>`);
        listItems = [];
        inList = false;
      }
      if (currentPara.length > 0) {
        result.push(`<p style="margin-bottom: 1rem; line-height: 1.8;">${currentPara.join(' ')}</p>`);
        currentPara = [];
      }
      result.push('<hr style="border: none; border-top: 2px solid #e5e7eb; margin: 1.5rem 0;">');
      processedLines++;
      continue;
    }
    
    // 헤더 처리
    if (trimmed.startsWith('#### ')) {
      if (inOrderedList && orderedListItems.length > 0) {
        result.push(`<ol style="margin: 0.75rem 0; padding-left: 1.5rem; list-style-type: decimal;">${orderedListItems.join('')}</ol>`);
        orderedListItems = [];
        inOrderedList = false;
      }
      if (inList && listItems.length > 0) {
        result.push(`<ul style="margin: 0.75rem 0; padding-left: 1.5rem; list-style-type: disc;">${listItems.join('')}</ul>`);
        listItems = [];
        inList = false;
      }
      if (currentPara.length > 0) {
        result.push(`<p style="margin-bottom: 1rem; line-height: 1.8;">${currentPara.join(' ')}</p>`);
        currentPara = [];
      }
      const text = trimmed.substring(5).trim();
      result.push(`<h4 style="font-size: 1rem; font-weight: 600; color: #111827; margin-top: 1.25rem; margin-bottom: 0.5rem;">${escapeHtml(text)}</h4>`);
      processedLines++;
      continue;
    }
    if (trimmed.startsWith('### ')) {
      if (inOrderedList && orderedListItems.length > 0) {
        result.push(`<ol style="margin: 0.75rem 0; padding-left: 1.5rem; list-style-type: decimal;">${orderedListItems.join('')}</ol>`);
        orderedListItems = [];
        inOrderedList = false;
      }
      if (inList && listItems.length > 0) {
        result.push(`<ul style="margin: 0.75rem 0; padding-left: 1.5rem; list-style-type: disc;">${listItems.join('')}</ul>`);
        listItems = [];
        inList = false;
      }
      if (currentPara.length > 0) {
        result.push(`<p style="margin-bottom: 1rem; line-height: 1.8;">${currentPara.join(' ')}</p>`);
        currentPara = [];
      }
      const text = trimmed.substring(4).trim();
      result.push(`<h3 style="font-size: 1.1rem; font-weight: 600; color: #111827; margin-top: 1.5rem; margin-bottom: 0.75rem;">${escapeHtml(text)}</h3>`);
      processedLines++;
      continue;
    }
    if (trimmed.startsWith('## ')) {
      if (inOrderedList && orderedListItems.length > 0) {
        result.push(`<ol style="margin: 0.75rem 0; padding-left: 1.5rem; list-style-type: decimal;">${orderedListItems.join('')}</ol>`);
        orderedListItems = [];
        inOrderedList = false;
      }
      if (inList && listItems.length > 0) {
        result.push(`<ul style="margin: 0.75rem 0; padding-left: 1.5rem; list-style-type: disc;">${listItems.join('')}</ul>`);
        listItems = [];
        inList = false;
      }
      if (currentPara.length > 0) {
        result.push(`<p style="margin-bottom: 1rem; line-height: 1.8;">${currentPara.join(' ')}</p>`);
        currentPara = [];
      }
      const text = trimmed.substring(3).trim();
      result.push(`<h2 style="font-size: 1.25rem; font-weight: 600; color: #111827; margin-top: 1.5rem; margin-bottom: 0.75rem;">${escapeHtml(text)}</h2>`);
      processedLines++;
      continue;
    }
    if (trimmed.startsWith('# ')) {
      if (inOrderedList && orderedListItems.length > 0) {
        result.push(`<ol style="margin: 0.75rem 0; padding-left: 1.5rem; list-style-type: decimal;">${orderedListItems.join('')}</ol>`);
        orderedListItems = [];
        inOrderedList = false;
      }
      if (inList && listItems.length > 0) {
        result.push(`<ul style="margin: 0.75rem 0; padding-left: 1.5rem; list-style-type: disc;">${listItems.join('')}</ul>`);
        listItems = [];
        inList = false;
      }
      if (currentPara.length > 0) {
        result.push(`<p style="margin-bottom: 1rem; line-height: 1.8;">${currentPara.join(' ')}</p>`);
        currentPara = [];
      }
      const text = trimmed.substring(2).trim();
      result.push(`<h1 style="font-size: 1.5rem; font-weight: 700; color: #111827; margin-top: 2rem; margin-bottom: 1rem;">${escapeHtml(text)}</h1>`);
      processedLines++;
      continue;
    }
    
    // 순서 리스트 처리 (비순서 리스트보다 먼저 확인)
    const orderedListMatch = trimmed.match(/^(\d+)\.\s+(.+)$/);
    if (orderedListMatch) {
      // 기존 비순서 리스트가 있으면 먼저 종료
      if (inList && listItems.length > 0) {
        result.push(`<ul style="margin: 0.75rem 0; padding-left: 1.5rem; list-style-type: disc;">${listItems.join('')}</ul>`);
        listItems = [];
        inList = false;
      }
      if (currentPara.length > 0) {
        result.push(`<p style="margin-bottom: 1rem; line-height: 1.8;">${currentPara.join(' ')}</p>`);
        currentPara = [];
      }
      // 순서 리스트 시작
      inOrderedList = true;
      const text = processInlineMarkdown(orderedListMatch[2]);
      orderedListItems.push(`<li style="margin-bottom: 0.5rem;">${text}</li>`);
      processedLines++;
      continue;
    }
    
    // 비순서 리스트 처리
    const listMatch = trimmed.match(/^[-*]\s+(.+)$/);
    if (listMatch) {
      // 기존 순서 리스트가 있으면 먼저 종료
      if (inOrderedList && orderedListItems.length > 0) {
        result.push(`<ol style="margin: 0.75rem 0; padding-left: 1.5rem; list-style-type: decimal;">${orderedListItems.join('')}</ol>`);
        orderedListItems = [];
        inOrderedList = false;
      }
      if (currentPara.length > 0) {
        result.push(`<p style="margin-bottom: 1rem; line-height: 1.8;">${currentPara.join(' ')}</p>`);
        currentPara = [];
      }
      inList = true;
      const text = processInlineMarkdown(listMatch[1]);
      listItems.push(`<li style="margin-bottom: 0.5rem;">${text}</li>`);
      processedLines++;
      continue;
    }
    
    // 일반 텍스트 (리스트가 진행 중이면 리스트 종료)
    if (inOrderedList && orderedListItems.length > 0) {
      result.push(`<ol style="margin: 0.75rem 0; padding-left: 1.5rem; list-style-type: decimal;">${orderedListItems.join('')}</ol>`);
      orderedListItems = [];
      inOrderedList = false;
    }
    if (inList && listItems.length > 0) {
      result.push(`<ul style="margin: 0.75rem 0; padding-left: 1.5rem; list-style-type: disc;">${listItems.join('')}</ul>`);
      listItems = [];
      inList = false;
    }
    
    // 인라인 마크다운 처리 후 문단에 추가
    try {
      currentPara.push(processInlineMarkdown(trimmed));
      processedLines++;
    } catch (error) {
      // 인라인 마크다운 처리 실패 시 이스케이프만 수행
      console.error(`Error processing inline markdown on line ${i}:`, error);
      currentPara.push(escapeHtml(trimmed));
      processedLines++;
    }
    } catch (error) {
      // 개별 줄 처리 중 예외 발생 시 해당 줄을 이스케이프하여 추가
      console.error(`Error processing line ${i}:`, error);
      console.error(`Line content:`, lines[i]);
      if (currentPara.length > 0) {
        result.push(`<p style="margin-bottom: 1rem; line-height: 1.8;">${currentPara.join(' ')}</p>`);
        currentPara = [];
      }
      // 에러가 난 줄을 이스케이프하여 추가
      try {
        currentPara.push(escapeHtml(String(lines[i] || '')));
      } catch (e) {
        // 이스케이프도 실패하면 빈 문자열 추가
        console.error(`Error escaping line ${i}:`, e);
      }
      processedLines++;
    }
  }
  
  // 마지막 순서 리스트 처리
  if (inOrderedList && orderedListItems.length > 0) {
    result.push(`<ol style="margin: 0.75rem 0; padding-left: 1.5rem; list-style-type: decimal;">${orderedListItems.join('')}</ol>`);
  }
  
  // 마지막 비순서 리스트 처리
  if (inList && listItems.length > 0) {
    result.push(`<ul style="margin: 0.75rem 0; padding-left: 1.5rem; list-style-type: disc;">${listItems.join('')}</ul>`);
  }
  
  // 마지막 문단 처리
  if (currentPara.length > 0) {
    result.push(`<p style="margin-bottom: 1rem; line-height: 1.8;">${currentPara.join(' ')}</p>`);
  }
  
  const finalHtml = result.join('');
  console.log('[convertMarkdownToHtml] Processed lines:', processedLines, '/', lines.length);
  console.log('[convertMarkdownToHtml] Output HTML length:', finalHtml.length);
  
  return finalHtml;
}

/**
 * 인라인 마크다운 처리 (볼드, 이탤릭)
 */
function processInlineMarkdown(text) {
  if (!text) return '';
  
  // HTML 이스케이프 먼저
  let html = escapeHtml(text);
  
  // 볼드 처리 (순서 중요: ** 먼저)
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong style="font-weight: 600;">$1</strong>');
  
  // 이탤릭 처리 (볼드 처리 후 남은 * 처리)
  // 단독 *만 처리 (앞뒤에 *가 없는 경우)
  html = html.replace(/\*([^*]+?)\*/g, '<em style="font-style: italic;">$1</em>');
  
  return html;
}

/**
 * HTML 이스케이프
 */
function escapeHtml(text) {
  if (!text) return '';
  const div = typeof document !== 'undefined' ? document.createElement('div') : null;
  if (div) {
    div.textContent = text;
    return div.innerHTML;
  }
  // fallback: 기본 이스케이프
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * 날짜 포맷팅 (타임존 처리) - 개선된 버전
 */
function formatDate(dateString, timezone = 'Asia/Seoul') {
  if (!dateString) return '';
  
  // Luxon 사용하여 타임존 처리
  const DateTime = typeof window !== 'undefined' && window.luxon 
    ? window.luxon.DateTime 
    : null;
  
  if (!DateTime) {
    // Luxon이 없으면 기본 JavaScript 사용 (fallback)
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: timezone
    });
  }
  
  // Luxon을 사용하여 타임존 변환
  // dateString이 이미 타임존 정보를 포함하고 있을 수 있으므로 확인
  let dt;
  if (dateString.includes('Z') || dateString.includes('+') || (dateString.includes('-') && dateString.length > 10)) {
    // 이미 타임존 정보가 있으면 그대로 파싱
    dt = DateTime.fromISO(dateString).setZone(timezone);
  } else {
    // 타임존 정보가 없으면 UTC로 가정
    dt = DateTime.fromISO(dateString, { zone: 'utc' }).setZone(timezone);
  }
  
  // toFormat을 사용하여 안정적인 포맷팅
  const year = dt.year;
  const month = dt.month;
  const day = dt.day;
  const hour = dt.hour;
  const minute = dt.minute;
  
  // 한국어 월 이름 매핑
  const monthNames = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];
  const ampm = hour >= 12 ? '오후' : '오전';
  const displayHour = hour > 12 ? hour - 12 : (hour === 0 ? 12 : hour);
  
  return `${year}년 ${monthNames[month - 1]} ${day}일 ${ampm} ${displayHour}:${String(minute).padStart(2, '0')}`;
}

/**
 * AI 성찰 생성 이벤트 바인딩
 */
export function initWeeklyAIReflection(onGenerate, weekStart) {
  // 생성 버튼
  const generateBtn = document.getElementById('generate-ai-reflection-btn');
  if (generateBtn) {
    generateBtn.addEventListener('click', async () => {
      generateBtn.disabled = true;
      generateBtn.innerHTML = '<i data-lucide="loader-2" style="width: 18px; height: 18px; stroke-width: 2.5; margin-right: 0.5rem; animation: spin 1s linear infinite;"></i> 생성 중...';
      
      if (window.lucide) {
        window.lucide.createIcons();
      }
      
      try {
        await onGenerate(weekStart);
      } catch (error) {
        console.error('Error generating AI reflection:', error);
        alert('AI 성찰 생성 중 오류가 발생했습니다: ' + error.message);
        generateBtn.disabled = false;
        generateBtn.innerHTML = '<i data-lucide="sparkles" style="width: 18px; height: 18px; stroke-width: 2.5; margin-right: 0.5rem;"></i> AI 성찰 생성하기';
      }
    });
  }
  
  // 재생성 버튼
  const regenerateBtn = document.getElementById('regenerate-ai-reflection-btn');
  if (regenerateBtn) {
    regenerateBtn.addEventListener('click', async () => {
      if (!confirm('AI 성찰을 다시 생성하시겠습니까? 기존 성찰은 덮어씌워집니다.')) {
        return;
      }
      
      regenerateBtn.disabled = true;
      regenerateBtn.innerHTML = '<i data-lucide="loader-2" style="width: 16px; height: 16px; stroke-width: 2.5; margin-right: 0.25rem; animation: spin 1s linear infinite;"></i> 생성 중...';
      
      if (window.lucide) {
        window.lucide.createIcons();
      }
      
      try {
        await onGenerate(weekStart);
      } catch (error) {
        console.error('Error regenerating AI reflection:', error);
        alert('AI 성찰 생성 중 오류가 발생했습니다: ' + error.message);
        regenerateBtn.disabled = false;
        regenerateBtn.innerHTML = '<i data-lucide="refresh-cw" style="width: 16px; height: 16px; stroke-width: 2.5; margin-right: 0.25rem;"></i> 다시 생성';
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

