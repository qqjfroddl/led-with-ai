// 월 선택 컴포넌트
import { getMonthStart, getToday } from '../utils/date.js';

function getDateTimeLib() {
  if (typeof window !== 'undefined' && window.luxon) return window.luxon.DateTime;
  if (typeof globalThis !== 'undefined' && globalThis.luxon) return globalThis.luxon.DateTime;
  throw new Error('Luxon not available');
}

/**
 * 월 선택 UI 렌더링
 * @param {string} selectedMonthStart - 선택된 월의 시작일 (YYYY-MM-01)
 * @param {Function} onMonthChange - 월 변경 콜백 (monthStart) => void
 * @param {string} timezone - 타임존 (기본: Asia/Seoul)
 * @returns {string} HTML 문자열
 */
export function renderMonthSelector(selectedMonthStart, onMonthChange, timezone = 'Asia/Seoul') {
  const DateTime = getDateTimeLib();
  const today = getToday(timezone);
  const currentMonthStart = getMonthStart(today, timezone);
  
  // 선택된 월 정보
  const monthStartDt = DateTime.fromISO(selectedMonthStart).setZone(timezone);
  const monthEndDt = monthStartDt.endOf('month');
  
  // 이전/다음 월 계산
  const prevMonthStart = monthStartDt.minus({ months: 1 }).startOf('month').toISODate();
  const nextMonthStart = monthStartDt.plus({ months: 1 }).startOf('month').toISODate();
  
  // 현재 월인지 확인
  const isCurrentMonth = selectedMonthStart === currentMonthStart;
  
  // 월 표시 형식: "2025년 12월"
  const month = monthStartDt.month;
  const year = monthStartDt.year;
  const startDate = monthStartDt.toFormat('M/d');
  const endDate = monthEndDt.toFormat('M/d');
  
  const html = `
    <div class="month-selector d-flex ai-center jc-space-between gap-1rem p-1rem bg-surface br-12px sh-0-2px-8px-rgba42_38_34_0_08 mb-1_5rem">
      <!-- 이전 월 버튼 -->
      <button id="month-prev-btn" class="btn-month-nav bg-none bd-1px-solid-line p-0_5rem-0_75rem br-8px cur-pointer d-flex ai-center jc-center tr-all-0_2s c-muted hov-bg-bg2 hov-bdc-line2" title="이전 월">
        <i class="w-20px h-20px sw-2_5" data-lucide="chevron-left"></i>
      </button>
      
      <!-- 월 정보 및 선택 -->
      <div class="fx-1 d-flex fd-column ai-center gap-0_5rem pos-relative">
        <button class="d-flex ai-center gap-0_5rem bg-none bd-none cur-pointer p-0_5rem br-8px tr-all-0_2s hov-bg-bg2" id="month-selector-btn">
          <i class="w-18px h-18px c-accent sw-2_5" data-lucide="calendar"></i>
          <span class="fwt-600 c-text fz-1rem">
            ${year}년 ${month}월
          </span>
          <i class="w-16px h-16px c-muted sw-2_5 tr-transform-0_2s" data-lucide="chevron-down" id="month-selector-chevron"></i>
          ${isCurrentMonth ? '<span class="bg-success c-white p-0_15rem-0_5rem br-999px fz-0_75rem fwt-500">이번 달</span>' : ''}
        </button>
        <div class="fz-0_875rem c-muted">
          ${startDate} ~ ${endDate}
        </div>
      </div>
      
      <!-- 월 선택 모달 -->
      <div id="month-selector-overlay" class="date-overlay hidden pos-fixed ins-0 bg-rgba42_38_34_0_35 bf-blur6px d-none ai-center jc-center z-2000 p-1rem">
        <div class="bg-surface sh-0-20px-40px-rgba42_38_34_0_18 w-min360px_90vw p-1rem d-flex fd-column gap-0_75rem bd-1px-solid-line" id="month-selector-modal">
          <div class="d-flex jc-space-between ai-center">
            <span class="fwt-700 c-text fz-1rem">월 선택</span>
            <button class="bg-none bd-none cur-pointer p-0_25rem br-4px d-flex ai-center jc-center tr-all-0_2s hov-bg-bg2" id="month-selector-close">
              <i class="w-20px h-20px c-muted sw-2_5" data-lucide="x"></i>
            </button>
          </div>
          <div class="bg-bg p-0_5rem bd-1px-solid-line maxh-300px ovy-auto">
            <div class="d-flex fd-column gap-0_25rem" id="month-selector-options">
              ${generateMonthOptions(currentMonthStart, timezone, selectedMonthStart, 6)}
            </div>
          </div>
        </div>
      </div>
      
      <!-- 다음 월 버튼 -->
      <button id="month-next-btn" class="btn-month-nav bg-none bd-1px-solid-line p-0_5rem-0_75rem br-8px cur-pointer d-flex ai-center jc-center tr-all-0_2s c-muted hov-bg-bg2 hov-bdc-line2" title="다음 월">
        <i class="w-20px h-20px sw-2_5" data-lucide="chevron-right"></i>
      </button>
      
      <!-- 이번 달로 이동 버튼 -->
      ${!isCurrentMonth ? `
        <button id="month-current-btn" class="btn-month-current bg-accent c-white bd-none p-0_5rem-1rem br-8px cur-pointer fz-0_875rem fwt-500 ws-nowrap tr-all-0_2s hov-tf-translatey-1px hov-sh-0-4px-12px-rgba42_38_34_0_15" title="이번 달로 이동">
          이번 달
        </button>
      ` : ''}
    </div>
  `;
  
  return html;
}

/**
 * 월 선택 옵션 생성 (최근 6개월)
 */
function generateMonthOptions(currentMonthStart, timezone, selectedMonthStart, maxMonths = 6) {
  const DateTime = getDateTimeLib();
  const options = [];
  
  // 현재 월부터 maxMonths 개월 전까지
  for (let i = maxMonths - 1; i >= 0; i--) {
    const monthStartDt = DateTime.fromISO(currentMonthStart).setZone(timezone).minus({ months: i });
    const monthEndDt = monthStartDt.endOf('month');
    const monthStart = monthStartDt.startOf('month').toISODate();
    
    const month = monthStartDt.month;
    const year = monthStartDt.year;
    const startDate = monthStartDt.toFormat('M/d');
    const endDate = monthEndDt.toFormat('M/d');
    
    const label = i === 0 
      ? `이번 달 (${startDate} ~ ${endDate})`
      : `${year}년 ${month}월 (${startDate} ~ ${endDate})`;
    
    const isSelected = monthStart === selectedMonthStart;
    const selectedStyle = isSelected 
      ? 'background: var(--t-accent); color: white;'
      : 'background: var(--t-surface); color: var(--t-text);';
    
    options.push(`
      <button class="month-option-btn br-8px cur-pointer ta-left fz-0_875rem tr-all-0_2s w-100pct" data-month-start="${monthStart}" style="${selectedStyle} padding: 0.75rem 1rem; border: 1px solid ${isSelected ? 'var(--t-accent)' : 'var(--t-line)'}; font-weight: ${isSelected ? '600' : '500'};" onmouseover="if (!this.dataset.selected) { this.style.background='var(--t-bg2)'; this.style.borderColor='var(--t-line2)'; }" onmouseout="if (!this.dataset.selected) { this.style.background='white'; this.style.borderColor='var(--t-line)'; }"
        ${isSelected ? 'data-selected="true"' : ''}>
        ${label}
        ${isSelected ? '<i class="w-16px h-16px fl-right sw-2_5" data-lucide="check"></i>' : ''}
      </button>
    `);
  }
  
  return options.join('');
}

/**
 * 월 선택 컴포넌트 초기화 (이벤트 바인딩)
 */
export function initMonthSelector(onMonthChange, selectedMonthStart, timezone = 'Asia/Seoul') {
  // 전역 콜백 등록
  window.handleMonthChange = onMonthChange;
  
  const DateTime = getDateTimeLib();
  const today = getToday(timezone);
  const currentMonthStart = getMonthStart(today, timezone);
  const monthStartDt = DateTime.fromISO(selectedMonthStart).setZone(timezone);
  const prevMonthStart = monthStartDt.minus({ months: 1 }).startOf('month').toISODate();
  const nextMonthStart = monthStartDt.plus({ months: 1 }).startOf('month').toISODate();
  
  // 이전 월 버튼
  const prevBtn = document.getElementById('month-prev-btn');
  if (prevBtn) {
    // 기존 이벤트 리스너 제거 후 새로 추가 (중복 방지)
    const newPrevBtn = prevBtn.cloneNode(true);
    prevBtn.parentNode.replaceChild(newPrevBtn, prevBtn);
    newPrevBtn.addEventListener('click', () => {
      if (onMonthChange) onMonthChange(prevMonthStart);
    });
  }
  
  // 다음 월 버튼
  const nextBtn = document.getElementById('month-next-btn');
  if (nextBtn) {
    const newNextBtn = nextBtn.cloneNode(true);
    nextBtn.parentNode.replaceChild(newNextBtn, nextBtn);
    newNextBtn.addEventListener('click', () => {
      if (onMonthChange) onMonthChange(nextMonthStart);
    });
  }
  
  // 이번 달 버튼
  const currentBtn = document.getElementById('month-current-btn');
  if (currentBtn) {
    const newCurrentBtn = currentBtn.cloneNode(true);
    currentBtn.parentNode.replaceChild(newCurrentBtn, currentBtn);
    newCurrentBtn.addEventListener('click', () => {
      if (onMonthChange) onMonthChange(currentMonthStart);
    });
  }
  
  // 월 선택 버튼 (모달 열기)
  const monthSelectorBtn = document.getElementById('month-selector-btn');
  const monthSelectorOverlay = document.getElementById('month-selector-overlay');
  const monthSelectorModal = document.getElementById('month-selector-modal');
  const monthSelectorClose = document.getElementById('month-selector-close');
  const monthSelectorChevron = document.getElementById('month-selector-chevron');
  
  if (monthSelectorBtn && monthSelectorOverlay) {
    // 모달이 기본적으로 닫혀있도록 보장
    monthSelectorOverlay.classList.add('hidden');
    monthSelectorOverlay.style.display = 'none';
    
    // 모달 열기
    const openModal = () => {
      monthSelectorOverlay.classList.remove('hidden');
      monthSelectorOverlay.style.display = 'flex';
      if (monthSelectorChevron) {
        monthSelectorChevron.style.transform = 'rotate(180deg)';
      }
    };
    
    // 모달 닫기
    const closeModal = () => {
      monthSelectorOverlay.classList.add('hidden');
      monthSelectorOverlay.style.display = 'none';
      if (monthSelectorChevron) {
        monthSelectorChevron.style.transform = 'rotate(0deg)';
      }
    };
    
    // 버튼 클릭으로 모달 열기
    const newBtn = monthSelectorBtn.cloneNode(true);
    monthSelectorBtn.parentNode.replaceChild(newBtn, monthSelectorBtn);
    newBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      openModal();
    });
    
    // 닫기 버튼
    if (monthSelectorClose) {
      const newCloseBtn = monthSelectorClose.cloneNode(true);
      monthSelectorClose.parentNode.replaceChild(newCloseBtn, monthSelectorClose);
      newCloseBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        closeModal();
      });
    }
    
    // 오버레이 클릭으로 모달 닫기 (직접 바인딩, cloneNode 사용 안 함)
    monthSelectorOverlay.addEventListener('click', (e) => {
      if (e.target === monthSelectorOverlay) {
        closeModal();
      }
    });
    
    // 모달 내부 클릭은 전파 방지
    if (monthSelectorModal) {
      monthSelectorModal.addEventListener('click', (e) => {
        e.stopPropagation();
      });
    }
    
    // 월 옵션 버튼들 (이벤트 위임 사용)
    const optionsContainer = document.getElementById('month-selector-options');
    if (optionsContainer) {
      optionsContainer.addEventListener('click', (e) => {
        const btn = e.target.closest('.month-option-btn');
        if (btn) {
          e.stopPropagation();
          const monthStart = btn.dataset.monthStart;
          if (monthStart && onMonthChange) {
            closeModal();
            onMonthChange(monthStart);
          }
        }
      });
    }
  }
  
  // Lucide 아이콘 렌더링
  if (window.lucide) {
    setTimeout(() => {
      window.lucide.createIcons();
    }, 100);
  }
}



























