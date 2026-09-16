// AI 성찰(주간·월간·연간) 공용 — 마크다운 → HTML, 이스케이프, 생성일 포맷
// 2026-09-17 세 컴포넌트에 같은 코드가 한 벌씩 있던 것을 합쳤다(골든 테스트 scripts/test/golden-reflection-markdown.mjs).
// escapeHtml의 작은따옴표는 &#039; — 9/12 색 토큰 치환이 '#039'를 hex로 오인해 '&var(--t-accent);'로 바꿔 놓았던 것을 바로잡았다.

/**
 * 마크다운을 간단한 HTML로 변환 (개선된 버전 - 안정성 강화)
 */
export function convertMarkdownToHtml(markdown) {
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
        result.push(`<ol class="m-0_75rem-0 pl-1_5rem list-style-type-decimal">${orderedListItems.join('')}</ol>`);
        orderedListItems = [];
        inOrderedList = false;
      }
      if (inList && listItems.length > 0) {
        result.push(`<ul class="m-0_75rem-0 pl-1_5rem list-style-type-disc">${listItems.join('')}</ul>`);
        listItems = [];
        inList = false;
      }
      if (currentPara.length > 0) {
        result.push(`<p class="mb-1rem lh-1_8">${currentPara.join(' ')}</p>`);
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
        result.push(`<ol class="m-0_75rem-0 pl-1_5rem list-style-type-decimal">${orderedListItems.join('')}</ol>`);
        orderedListItems = [];
        inOrderedList = false;
      }
      // 비순서 리스트가 진행 중이면 리스트 종료
      if (inList && listItems.length > 0) {
        result.push(`<ul class="m-0_75rem-0 pl-1_5rem list-style-type-disc">${listItems.join('')}</ul>`);
        listItems = [];
        inList = false;
      }
      // 문단이 진행 중이면 문단 종료
      if (currentPara.length > 0) {
        result.push(`<p class="mb-1rem lh-1_8">${currentPara.join(' ')}</p>`);
        currentPara = [];
      }
      processedLines++;
      continue;
    }
    
    // 구분선 처리
    if (trimmed === '---' || trimmed === '***') {
      if (inOrderedList && orderedListItems.length > 0) {
        result.push(`<ol class="m-0_75rem-0 pl-1_5rem list-style-type-decimal">${orderedListItems.join('')}</ol>`);
        orderedListItems = [];
        inOrderedList = false;
      }
      if (inList && listItems.length > 0) {
        result.push(`<ul class="m-0_75rem-0 pl-1_5rem list-style-type-disc">${listItems.join('')}</ul>`);
        listItems = [];
        inList = false;
      }
      if (currentPara.length > 0) {
        result.push(`<p class="mb-1rem lh-1_8">${currentPara.join(' ')}</p>`);
        currentPara = [];
      }
      result.push('<hr class="bd-none bdt-2px-solid-line m-1_5rem-0">');
      processedLines++;
      continue;
    }
    
    // 헤더 처리
    if (trimmed.startsWith('#### ')) {
      if (inOrderedList && orderedListItems.length > 0) {
        result.push(`<ol class="m-0_75rem-0 pl-1_5rem list-style-type-decimal">${orderedListItems.join('')}</ol>`);
        orderedListItems = [];
        inOrderedList = false;
      }
      if (inList && listItems.length > 0) {
        result.push(`<ul class="m-0_75rem-0 pl-1_5rem list-style-type-disc">${listItems.join('')}</ul>`);
        listItems = [];
        inList = false;
      }
      if (currentPara.length > 0) {
        result.push(`<p class="mb-1rem lh-1_8">${currentPara.join(' ')}</p>`);
        currentPara = [];
      }
      const text = trimmed.substring(5).trim();
      result.push(`<h4 class="fz-1rem fwt-600 c-text mt-1_25rem mb-0_5rem">${escapeHtml(text)}</h4>`);
      processedLines++;
      continue;
    }
    if (trimmed.startsWith('### ')) {
      if (inOrderedList && orderedListItems.length > 0) {
        result.push(`<ol class="m-0_75rem-0 pl-1_5rem list-style-type-decimal">${orderedListItems.join('')}</ol>`);
        orderedListItems = [];
        inOrderedList = false;
      }
      if (inList && listItems.length > 0) {
        result.push(`<ul class="m-0_75rem-0 pl-1_5rem list-style-type-disc">${listItems.join('')}</ul>`);
        listItems = [];
        inList = false;
      }
      if (currentPara.length > 0) {
        result.push(`<p class="mb-1rem lh-1_8">${currentPara.join(' ')}</p>`);
        currentPara = [];
      }
      const text = trimmed.substring(4).trim();
      result.push(`<h3 class="fz-1_1rem fwt-600 c-text mt-1_5rem mb-0_75rem">${escapeHtml(text)}</h3>`);
      processedLines++;
      continue;
    }
    if (trimmed.startsWith('## ')) {
      if (inOrderedList && orderedListItems.length > 0) {
        result.push(`<ol class="m-0_75rem-0 pl-1_5rem list-style-type-decimal">${orderedListItems.join('')}</ol>`);
        orderedListItems = [];
        inOrderedList = false;
      }
      if (inList && listItems.length > 0) {
        result.push(`<ul class="m-0_75rem-0 pl-1_5rem list-style-type-disc">${listItems.join('')}</ul>`);
        listItems = [];
        inList = false;
      }
      if (currentPara.length > 0) {
        result.push(`<p class="mb-1rem lh-1_8">${currentPara.join(' ')}</p>`);
        currentPara = [];
      }
      const text = trimmed.substring(3).trim();
      result.push(`<h2 class="fz-1_25rem fwt-600 c-text mt-1_5rem mb-0_75rem">${escapeHtml(text)}</h2>`);
      processedLines++;
      continue;
    }
    if (trimmed.startsWith('# ')) {
      if (inOrderedList && orderedListItems.length > 0) {
        result.push(`<ol class="m-0_75rem-0 pl-1_5rem list-style-type-decimal">${orderedListItems.join('')}</ol>`);
        orderedListItems = [];
        inOrderedList = false;
      }
      if (inList && listItems.length > 0) {
        result.push(`<ul class="m-0_75rem-0 pl-1_5rem list-style-type-disc">${listItems.join('')}</ul>`);
        listItems = [];
        inList = false;
      }
      if (currentPara.length > 0) {
        result.push(`<p class="mb-1rem lh-1_8">${currentPara.join(' ')}</p>`);
        currentPara = [];
      }
      const text = trimmed.substring(2).trim();
      result.push(`<h1 class="fz-1_5rem fwt-700 c-text mt-2rem mb-1rem">${escapeHtml(text)}</h1>`);
      processedLines++;
      continue;
    }
    
    // 순서 리스트 처리 (비순서 리스트보다 먼저 확인)
    const orderedListMatch = trimmed.match(/^(\d+)\.\s+(.+)$/);
    if (orderedListMatch) {
      // 기존 비순서 리스트가 있으면 먼저 종료
      if (inList && listItems.length > 0) {
        result.push(`<ul class="m-0_75rem-0 pl-1_5rem list-style-type-disc">${listItems.join('')}</ul>`);
        listItems = [];
        inList = false;
      }
      if (currentPara.length > 0) {
        result.push(`<p class="mb-1rem lh-1_8">${currentPara.join(' ')}</p>`);
        currentPara = [];
      }
      // 순서 리스트 시작
      inOrderedList = true;
      const text = processInlineMarkdown(orderedListMatch[2]);
      orderedListItems.push(`<li class="mb-0_5rem">${text}</li>`);
      processedLines++;
      continue;
    }
    
    // 비순서 리스트 처리
    const listMatch = trimmed.match(/^[-*]\s+(.+)$/);
    if (listMatch) {
      // 기존 순서 리스트가 있으면 먼저 종료
      if (inOrderedList && orderedListItems.length > 0) {
        result.push(`<ol class="m-0_75rem-0 pl-1_5rem list-style-type-decimal">${orderedListItems.join('')}</ol>`);
        orderedListItems = [];
        inOrderedList = false;
      }
      if (currentPara.length > 0) {
        result.push(`<p class="mb-1rem lh-1_8">${currentPara.join(' ')}</p>`);
        currentPara = [];
      }
      inList = true;
      const text = processInlineMarkdown(listMatch[1]);
      listItems.push(`<li class="mb-0_5rem">${text}</li>`);
      processedLines++;
      continue;
    }
    
    // 일반 텍스트 (리스트가 진행 중이면 리스트 종료)
    if (inOrderedList && orderedListItems.length > 0) {
      result.push(`<ol class="m-0_75rem-0 pl-1_5rem list-style-type-decimal">${orderedListItems.join('')}</ol>`);
      orderedListItems = [];
      inOrderedList = false;
    }
    if (inList && listItems.length > 0) {
      result.push(`<ul class="m-0_75rem-0 pl-1_5rem list-style-type-disc">${listItems.join('')}</ul>`);
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
        result.push(`<p class="mb-1rem lh-1_8">${currentPara.join(' ')}</p>`);
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
    result.push(`<ol class="m-0_75rem-0 pl-1_5rem list-style-type-decimal">${orderedListItems.join('')}</ol>`);
  }
  
  // 마지막 비순서 리스트 처리
  if (inList && listItems.length > 0) {
    result.push(`<ul class="m-0_75rem-0 pl-1_5rem list-style-type-disc">${listItems.join('')}</ul>`);
  }
  
  // 마지막 문단 처리
  if (currentPara.length > 0) {
    result.push(`<p class="mb-1rem lh-1_8">${currentPara.join(' ')}</p>`);
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
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong class="fwt-600">$1</strong>');
  
  // 이탤릭 처리 (볼드 처리 후 남은 * 처리)
  // 단독 *만 처리 (앞뒤에 *가 없는 경우)
  html = html.replace(/\*([^*]+?)\*/g, '<em class="fst-italic">$1</em>');
  
  return html;
}

/**
 * HTML 이스케이프
 */
export function escapeHtml(text) {
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
export function formatDate(dateString, timezone = 'Asia/Seoul') {
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
