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
    <div class="month-selector" style="display: flex; align-items: center; justify-content: space-between; gap: 1rem; padding: 1rem; background: white; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); margin-bottom: 1.5rem;">
      <!-- 이전 월 버튼 -->
      <button 
        id="month-prev-btn" 
        class="btn-month-nav"
        style="background: none; border: 1px solid #e5e7eb; padding: 0.5rem 0.75rem; border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; color: #6b7280;"
        onmouseover="this.style.background='#f3f4f6'; this.style.borderColor='#d1d5db';"
        onmouseout="this.style.background='none'; this.style.borderColor='#e5e7eb';"
        title="이전 월"
      >
        <i data-lucide="chevron-left" style="width: 20px; height: 20px; stroke-width: 2.5;"></i>
      </button>
      
      <!-- 월 정보 및 선택 -->
      <div style="flex: 1; display: flex; flex-direction: column; align-items: center; gap: 0.5rem; position: relative;">
        <button 
          id="month-selector-btn"
          style="display: flex; align-items: center; gap: 0.5rem; background: none; border: none; cursor: pointer; padding: 0.5rem; border-radius: 8px; transition: all 0.2s;"
          onmouseover="this.style.background='#f3f4f6';"
          onmouseout="this.style.background='none';"
        >
          <i data-lucide="calendar" style="width: 18px; height: 18px; color: #6366f1; stroke-width: 2.5;"></i>
          <span style="font-weight: 600; color: #111827; font-size: 1rem;">
            ${year}년 ${month}월
          </span>
          <i data-lucide="chevron-down" id="month-selector-chevron" style="width: 16px; height: 16px; color: #6b7280; stroke-width: 2.5; transition: transform 0.2s;"></i>
          ${isCurrentMonth ? '<span style="background: #10b981; color: white; padding: 0.15rem 0.5rem; border-radius: 999px; font-size: 0.75rem; font-weight: 500;">이번 달</span>' : ''}
        </button>
        <div style="font-size: 0.875rem; color: #6b7280;">
          ${startDate} ~ ${endDate}
        </div>
      </div>
      
      <!-- 월 선택 모달 -->
      <div id="month-selector-overlay" class="date-overlay hidden" style="position: fixed; inset: 0; background: rgba(15, 23, 42, 0.35); backdrop-filter: blur(6px); display: none; align-items: center; justify-content: center; z-index: 2000; padding: 1rem;">
        <div id="month-selector-modal" style="background: #ffffff; border-radius: 1rem; box-shadow: 0 20px 40px rgba(0,0,0,0.18); width: min(360px, 90vw); padding: 1rem; display: flex; flex-direction: column; gap: 0.75rem; border: 1px solid #e5e7eb;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="font-weight: 700; color: #111827; font-size: 1rem;">월 선택</span>
            <button 
              id="month-selector-close"
              style="background: none; border: none; cursor: pointer; padding: 0.25rem; border-radius: 4px; display: flex; align-items: center; justify-content: center; transition: all 0.2s;"
              onmouseover="this.style.background='#f3f4f6';"
              onmouseout="this.style.background='none';"
            >
              <i data-lucide="x" style="width: 20px; height: 20px; color: #6b7280; stroke-width: 2.5;"></i>
            </button>
          </div>
          <div style="background: #f8fafc; border-radius: 0.75rem; padding: 0.5rem; border: 1px solid #e2e8f0; max-height: 300px; overflow-y: auto;">
            <div id="month-selector-options" style="display: flex; flex-direction: column; gap: 0.25rem;">
              ${generateMonthOptions(currentMonthStart, timezone, selectedMonthStart, 6)}
            </div>
          </div>
        </div>
      </div>
      
      <!-- 다음 월 버튼 -->
      <button 
        id="month-next-btn" 
        class="btn-month-nav"
        style="background: none; border: 1px solid #e5e7eb; padding: 0.5rem 0.75rem; border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; color: #6b7280;"
        onmouseover="this.style.background='#f3f4f6'; this.style.borderColor='#d1d5db';"
        onmouseout="this.style.background='none'; this.style.borderColor='#e5e7eb';"
        title="다음 월"
      >
        <i data-lucide="chevron-right" style="width: 20px; height: 20px; stroke-width: 2.5;"></i>
      </button>
      
      <!-- 이번 달로 이동 버튼 -->
      ${!isCurrentMonth ? `
        <button 
          id="month-current-btn" 
          class="btn-month-current"
          style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; border: none; padding: 0.5rem 1rem; border-radius: 8px; cursor: pointer; font-size: 0.875rem; font-weight: 500; white-space: nowrap; transition: all 0.2s;"
          onmouseover="this.style.transform='translateY(-1px)'; this.style.boxShadow='0 4px 12px rgba(99, 102, 241, 0.3)';"
          onmouseout="this.style.transform='none'; this.style.boxShadow='none';"
          title="이번 달로 이동"
        >
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
      ? 'background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white;'
      : 'background: white; color: #111827;';
    
    options.push(`
      <button 
        class="month-option-btn"
        data-month-start="${monthStart}"
        style="${selectedStyle} padding: 0.75rem 1rem; border: 1px solid ${isSelected ? '#6366f1' : '#e5e7eb'}; border-radius: 8px; cursor: pointer; text-align: left; font-size: 0.875rem; font-weight: ${isSelected ? '600' : '500'}; transition: all 0.2s; width: 100%;"
        onmouseover="if (!this.dataset.selected) { this.style.background='#f3f4f6'; this.style.borderColor='#d1d5db'; }"
        onmouseout="if (!this.dataset.selected) { this.style.background='white'; this.style.borderColor='#e5e7eb'; }"
        ${isSelected ? 'data-selected="true"' : ''}
      >
        ${label}
        ${isSelected ? '<i data-lucide="check" style="width: 16px; height: 16px; float: right; stroke-width: 2.5;"></i>' : ''}
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





