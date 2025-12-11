// 주차 선택 컴포넌트
import { getWeekStart, getWeekEnd, getToday } from '../utils/date.js';

function getDateTimeLib() {
  if (typeof window !== 'undefined' && window.luxon) return window.luxon.DateTime;
  if (typeof globalThis !== 'undefined' && globalThis.luxon) return globalThis.luxon.DateTime;
  throw new Error('Luxon not available');
}

/**
 * 주차 선택 UI 렌더링
 * @param {string} selectedWeekStart - 선택된 주의 시작일 (YYYY-MM-DD)
 * @param {Function} onWeekChange - 주 변경 콜백 (weekStart) => void
 * @param {string} timezone - 타임존 (기본: Asia/Seoul)
 * @returns {string} HTML 문자열
 */
export function renderWeekSelector(selectedWeekStart, onWeekChange, timezone = 'Asia/Seoul') {
  const DateTime = getDateTimeLib();
  const today = getToday(timezone);
  const currentWeekStart = getWeekStart(today, timezone);
  
  // 선택된 주 정보
  const weekStartDt = DateTime.fromISO(selectedWeekStart).setZone(timezone);
  const weekEndDt = weekStartDt.plus({ days: 6 });
  
  // 이전/다음 주 계산
  const prevWeekStart = weekStartDt.minus({ weeks: 1 }).toISODate();
  const nextWeekStart = weekStartDt.plus({ weeks: 1 }).toISODate();
  
  // 현재 주인지 확인
  const isCurrentWeek = selectedWeekStart === currentWeekStart;
  
  // 주차 표시 형식: "2025년 12월 1주차 (12/2 ~ 12/8)"
  const month = weekStartDt.month;
  const year = weekStartDt.year;
  // 주차 계산: 해당 월의 첫 번째 월요일 기준으로 계산
  const firstDayOfMonth = weekStartDt.startOf('month');
  const daysFromFirstMonday = (weekStartDt.weekday - 1 + (weekStartDt.day - 1)) % 7;
  const weekNumber = Math.floor((weekStartDt.day - 1 - daysFromFirstMonday) / 7) + 1;
  const startDate = weekStartDt.toFormat('M/d');
  const endDate = weekEndDt.toFormat('M/d');
  
  const html = `
    <div class="week-selector" style="display: flex; align-items: center; justify-content: space-between; gap: 1rem; padding: 1rem; background: white; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); margin-bottom: 1.5rem;">
      <!-- 이전 주 버튼 -->
      <button 
        id="week-prev-btn" 
        class="btn-week-nav"
        style="background: none; border: 1px solid #e5e7eb; padding: 0.5rem 0.75rem; border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; color: #6b7280;"
        onmouseover="this.style.background='#f3f4f6'; this.style.borderColor='#d1d5db';"
        onmouseout="this.style.background='none'; this.style.borderColor='#e5e7eb';"
        title="이전 주"
      >
        <i data-lucide="chevron-left" style="width: 20px; height: 20px; stroke-width: 2.5;"></i>
      </button>
      
      <!-- 주차 정보 및 선택 -->
      <div style="flex: 1; display: flex; flex-direction: column; align-items: center; gap: 0.5rem; position: relative;">
        <button 
          id="week-selector-btn"
          style="display: flex; align-items: center; gap: 0.5rem; background: none; border: none; cursor: pointer; padding: 0.5rem; border-radius: 8px; transition: all 0.2s;"
          onmouseover="this.style.background='#f3f4f6';"
          onmouseout="this.style.background='none';"
        >
          <i data-lucide="calendar" style="width: 18px; height: 18px; color: #6366f1; stroke-width: 2.5;"></i>
          <span style="font-weight: 600; color: #111827; font-size: 1rem;">
            ${year}년 ${month}월 ${weekNumber}주차
          </span>
          <i data-lucide="chevron-down" id="week-selector-chevron" style="width: 16px; height: 16px; color: #6b7280; stroke-width: 2.5; transition: transform 0.2s;"></i>
          ${isCurrentWeek ? '<span style="background: #10b981; color: white; padding: 0.15rem 0.5rem; border-radius: 999px; font-size: 0.75rem; font-weight: 500;">이번 주</span>' : ''}
        </button>
        <div style="font-size: 0.875rem; color: #6b7280;">
          ${startDate} ~ ${endDate}
        </div>
      </div>
      
      <!-- 주차 선택 모달 -->
      <div id="week-selector-overlay" class="date-overlay hidden" style="position: fixed; inset: 0; background: rgba(15, 23, 42, 0.35); backdrop-filter: blur(6px); display: none; align-items: center; justify-content: center; z-index: 2000; padding: 1rem;">
        <div id="week-selector-modal" style="background: #ffffff; border-radius: 1rem; box-shadow: 0 20px 40px rgba(0,0,0,0.18); width: min(360px, 90vw); padding: 1rem; display: flex; flex-direction: column; gap: 0.75rem; border: 1px solid #e5e7eb;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="font-weight: 700; color: #111827; font-size: 1rem;">주차 선택</span>
            <button 
              id="week-selector-close"
              style="background: none; border: none; cursor: pointer; padding: 0.25rem; border-radius: 4px; display: flex; align-items: center; justify-content: center; transition: all 0.2s;"
              onmouseover="this.style.background='#f3f4f6';"
              onmouseout="this.style.background='none';"
            >
              <i data-lucide="x" style="width: 20px; height: 20px; color: #6b7280; stroke-width: 2.5;"></i>
            </button>
          </div>
          <div style="background: #f8fafc; border-radius: 0.75rem; padding: 0.5rem; border: 1px solid #e2e8f0; max-height: 300px; overflow-y: auto;">
            <div id="week-selector-options" style="display: flex; flex-direction: column; gap: 0.25rem;">
              ${generateWeekOptions(currentWeekStart, timezone, selectedWeekStart, 4)}
            </div>
          </div>
        </div>
      </div>
      
      <!-- 다음 주 버튼 -->
      <button 
        id="week-next-btn" 
        class="btn-week-nav"
        style="background: none; border: 1px solid #e5e7eb; padding: 0.5rem 0.75rem; border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; color: #6b7280;"
        onmouseover="this.style.background='#f3f4f6'; this.style.borderColor='#d1d5db';"
        onmouseout="this.style.background='none'; this.style.borderColor='#e5e7eb';"
        title="다음 주"
      >
        <i data-lucide="chevron-right" style="width: 20px; height: 20px; stroke-width: 2.5;"></i>
      </button>
      
      <!-- 이번 주로 이동 버튼 -->
      ${!isCurrentWeek ? `
        <button 
          id="week-current-btn" 
          class="btn-week-current"
          style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; border: none; padding: 0.5rem 1rem; border-radius: 8px; cursor: pointer; font-size: 0.875rem; font-weight: 500; white-space: nowrap; transition: all 0.2s;"
          onmouseover="this.style.transform='translateY(-1px)'; this.style.boxShadow='0 4px 12px rgba(99, 102, 241, 0.3)';"
          onmouseout="this.style.transform='none'; this.style.boxShadow='none';"
          title="이번 주로 이동"
        >
          이번 주
        </button>
      ` : ''}
    </div>
  `;
  
  return html;
}

/**
 * 주차 선택 옵션 생성 (최근 4주)
 */
function generateWeekOptions(currentWeekStart, timezone, selectedWeekStart, maxWeeks = 4) {
  const DateTime = getDateTimeLib();
  const options = [];
  
  // 현재 주부터 maxWeeks 주 전까지
  for (let i = maxWeeks - 1; i >= 0; i--) {
    const weekStartDt = DateTime.fromISO(currentWeekStart).setZone(timezone).minus({ weeks: i });
    const weekEndDt = weekStartDt.plus({ days: 6 });
    const weekStart = weekStartDt.toISODate();
    
    const month = weekStartDt.month;
    const year = weekStartDt.year;
    // 주차 계산: 해당 월의 첫 번째 월요일 기준으로 계산
    const daysFromFirstMonday = (weekStartDt.weekday - 1 + (weekStartDt.day - 1)) % 7;
    const weekNumber = Math.floor((weekStartDt.day - 1 - daysFromFirstMonday) / 7) + 1;
    const startDate = weekStartDt.toFormat('M/d');
    const endDate = weekEndDt.toFormat('M/d');
    
    const label = i === 0 
      ? `이번 주 (${startDate} ~ ${endDate})`
      : `${year}년 ${month}월 ${weekNumber}주차 (${startDate} ~ ${endDate})`;
    
    const isSelected = weekStart === selectedWeekStart;
    const selectedStyle = isSelected 
      ? 'background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white;'
      : 'background: white; color: #111827;';
    
    options.push(`
      <button 
        class="week-option-btn"
        data-week-start="${weekStart}"
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
 * 주차 선택 컴포넌트 초기화 (이벤트 바인딩)
 */
export function initWeekSelector(onWeekChange, selectedWeekStart, timezone = 'Asia/Seoul') {
  // 전역 콜백 등록
  window.handleWeekChange = onWeekChange;
  
  const DateTime = getDateTimeLib();
  const today = getToday(timezone);
  const currentWeekStart = getWeekStart(today, timezone);
  const weekStartDt = DateTime.fromISO(selectedWeekStart).setZone(timezone);
  const prevWeekStart = weekStartDt.minus({ weeks: 1 }).toISODate();
  const nextWeekStart = weekStartDt.plus({ weeks: 1 }).toISODate();
  
  // 이전 주 버튼
  const prevBtn = document.getElementById('week-prev-btn');
  if (prevBtn) {
    // 기존 이벤트 리스너 제거 후 새로 추가 (중복 방지)
    const newPrevBtn = prevBtn.cloneNode(true);
    prevBtn.parentNode.replaceChild(newPrevBtn, prevBtn);
    newPrevBtn.addEventListener('click', () => {
      if (onWeekChange) onWeekChange(prevWeekStart);
    });
  }
  
  // 다음 주 버튼
  const nextBtn = document.getElementById('week-next-btn');
  if (nextBtn) {
    const newNextBtn = nextBtn.cloneNode(true);
    nextBtn.parentNode.replaceChild(newNextBtn, nextBtn);
    newNextBtn.addEventListener('click', () => {
      if (onWeekChange) onWeekChange(nextWeekStart);
    });
  }
  
  // 이번 주 버튼
  const currentBtn = document.getElementById('week-current-btn');
  if (currentBtn) {
    const newCurrentBtn = currentBtn.cloneNode(true);
    currentBtn.parentNode.replaceChild(newCurrentBtn, currentBtn);
    newCurrentBtn.addEventListener('click', () => {
      if (onWeekChange) onWeekChange(currentWeekStart);
    });
  }
  
  // 주차 선택 버튼 (모달 열기)
  const weekSelectorBtn = document.getElementById('week-selector-btn');
  const weekSelectorOverlay = document.getElementById('week-selector-overlay');
  const weekSelectorModal = document.getElementById('week-selector-modal');
  const weekSelectorClose = document.getElementById('week-selector-close');
  const weekSelectorChevron = document.getElementById('week-selector-chevron');
  
  if (weekSelectorBtn && weekSelectorOverlay) {
    // 모달이 기본적으로 닫혀있도록 보장
    weekSelectorOverlay.classList.add('hidden');
    weekSelectorOverlay.style.display = 'none';
    
    // 모달 열기
    const openModal = () => {
      weekSelectorOverlay.classList.remove('hidden');
      weekSelectorOverlay.style.display = 'flex';
      if (weekSelectorChevron) {
        weekSelectorChevron.style.transform = 'rotate(180deg)';
      }
    };
    
    // 모달 닫기
    const closeModal = () => {
      weekSelectorOverlay.classList.add('hidden');
      weekSelectorOverlay.style.display = 'none';
      if (weekSelectorChevron) {
        weekSelectorChevron.style.transform = 'rotate(0deg)';
      }
    };
    
    // 버튼 클릭으로 모달 열기
    const newBtn = weekSelectorBtn.cloneNode(true);
    weekSelectorBtn.parentNode.replaceChild(newBtn, weekSelectorBtn);
    newBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      openModal();
    });
    
    // 닫기 버튼
    if (weekSelectorClose) {
      const newCloseBtn = weekSelectorClose.cloneNode(true);
      weekSelectorClose.parentNode.replaceChild(newCloseBtn, weekSelectorClose);
      newCloseBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        closeModal();
      });
    }
    
    // 오버레이 클릭으로 모달 닫기 (직접 바인딩, cloneNode 사용 안 함)
    weekSelectorOverlay.addEventListener('click', (e) => {
      if (e.target === weekSelectorOverlay) {
        closeModal();
      }
    });
    
    // 모달 내부 클릭은 전파 방지
    if (weekSelectorModal) {
      weekSelectorModal.addEventListener('click', (e) => {
        e.stopPropagation();
      });
    }
    
    // 주차 옵션 버튼들 (이벤트 위임 사용)
    const optionsContainer = document.getElementById('week-selector-options');
    if (optionsContainer) {
      optionsContainer.addEventListener('click', (e) => {
        const btn = e.target.closest('.week-option-btn');
        if (btn) {
          e.stopPropagation();
          const weekStart = btn.dataset.weekStart;
          if (weekStart && onWeekChange) {
            closeModal();
            onWeekChange(weekStart);
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

