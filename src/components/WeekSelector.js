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
    <div class="week-selector d-flex ai-center jc-space-between gap-1rem p-1rem bg-surface br-12px sh-0-2px-8px-rgba42_38_34_0_08 mb-1_5rem">
      <!-- 이전 주 버튼 -->
      <button id="week-prev-btn" class="btn-week-nav bg-none bd-1px-solid-line p-0_5rem-0_75rem br-8px cur-pointer d-flex ai-center jc-center tr-all-0_2s c-muted hov-bg-bg2 hov-bdc-line2" title="이전 주">
        <i class="w-20px h-20px sw-2_5" data-lucide="chevron-left"></i>
      </button>
      
      <!-- 주차 정보 및 선택 -->
      <div class="fx-1 d-flex fd-column ai-center gap-0_5rem pos-relative">
        <button class="d-flex ai-center gap-0_5rem bg-none bd-none cur-pointer p-0_5rem br-8px tr-all-0_2s hov-bg-bg2" id="week-selector-btn">
          <i class="w-18px h-18px c-accent sw-2_5" data-lucide="calendar"></i>
          <span class="fwt-600 c-text fz-1rem">
            ${year}년 ${month}월 ${weekNumber}주차
          </span>
          <i class="w-16px h-16px c-muted sw-2_5 tr-transform-0_2s" data-lucide="chevron-down" id="week-selector-chevron"></i>
          ${isCurrentWeek ? '<span class="bg-success c-white p-0_15rem-0_5rem br-999px fz-0_75rem fwt-500">이번 주</span>' : ''}
        </button>
        <div class="fz-0_875rem c-muted">
          ${startDate} ~ ${endDate}
        </div>
      </div>
      
      <!-- 주차 선택 모달 -->
      <div id="week-selector-overlay" class="date-overlay hidden pos-fixed ins-0 bg-rgba42_38_34_0_35 bf-blur6px d-none ai-center jc-center z-2000 p-1rem">
        <div class="bg-surface sh-0-20px-40px-rgba42_38_34_0_18 w-min360px_90vw p-1rem d-flex fd-column gap-0_75rem bd-1px-solid-line" id="week-selector-modal">
          <div class="d-flex jc-space-between ai-center">
            <span class="fwt-700 c-text fz-1rem">주차 선택</span>
            <button class="bg-none bd-none cur-pointer p-0_25rem br-4px d-flex ai-center jc-center tr-all-0_2s hov-bg-bg2" id="week-selector-close">
              <i class="w-20px h-20px c-muted sw-2_5" data-lucide="x"></i>
            </button>
          </div>
          <div class="bg-bg p-0_5rem bd-1px-solid-line maxh-300px ovy-auto">
            <div class="d-flex fd-column gap-0_25rem" id="week-selector-options">
              ${generateWeekOptions(currentWeekStart, timezone, selectedWeekStart, 4)}
            </div>
          </div>
        </div>
      </div>
      
      <!-- 다음 주 버튼 -->
      <button id="week-next-btn" class="btn-week-nav bg-none bd-1px-solid-line p-0_5rem-0_75rem br-8px cur-pointer d-flex ai-center jc-center tr-all-0_2s c-muted hov-bg-bg2 hov-bdc-line2" title="다음 주">
        <i class="w-20px h-20px sw-2_5" data-lucide="chevron-right"></i>
      </button>
      
      <!-- 이번 주로 이동 버튼 -->
      ${!isCurrentWeek ? `
        <button id="week-current-btn" class="btn-week-current bg-accent c-white bd-none p-0_5rem-1rem br-8px cur-pointer fz-0_875rem fwt-500 ws-nowrap tr-all-0_2s hov-tf-translatey-1px hov-sh-0-4px-12px-rgba42_38_34_0_15" title="이번 주로 이동">
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
      ? 'background: var(--t-accent); color: white;'
      : 'background: var(--t-surface); color: var(--t-text);';
    
    options.push(`
      <button class="week-option-btn br-8px cur-pointer ta-left fz-0_875rem tr-all-0_2s w-100pct" data-week-start="${weekStart}" style="${selectedStyle} padding: 0.75rem 1rem; border: 1px solid ${isSelected ? 'var(--t-accent)' : 'var(--t-line)'}; font-weight: ${isSelected ? '600' : '500'};" onmouseover="if (!this.dataset.selected) { this.style.background='var(--t-bg2)'; this.style.borderColor='var(--t-line2)'; }" onmouseout="if (!this.dataset.selected) { this.style.background='white'; this.style.borderColor='var(--t-line)'; }"
        ${isSelected ? 'data-selected="true"' : ''}>
        ${label}
        ${isSelected ? '<i class="w-16px h-16px fl-right sw-2_5" data-lucide="check"></i>' : ''}
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

