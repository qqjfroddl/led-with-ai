// 연도 선택 컴포넌트
function getDateTimeLib() {
  if (typeof window !== 'undefined' && window.luxon) return window.luxon.DateTime;
  if (typeof globalThis !== 'undefined' && globalThis.luxon) return globalThis.luxon.DateTime;
  throw new Error('Luxon not available');
}

/**
 * 연도 선택 UI 렌더링
 * @param {number} selectedYear - 선택된 연도 (예: 2025)
 * @param {Function} onYearChange - 연도 변경 콜백 (year) => void
 * @param {string} timezone - 타임존 (기본: Asia/Seoul)
 * @returns {string} HTML 문자열
 */
export function renderYearSelector(selectedYear, onYearChange, timezone = 'Asia/Seoul') {
  const DateTime = getDateTimeLib();
  const today = DateTime.now().setZone(timezone);
  const currentYear = today.year;
  
  // 이전/다음 연도 계산
  const prevYear = selectedYear - 1;
  const nextYear = selectedYear + 1;
  
  // 현재 연도인지 확인
  const isCurrentYear = selectedYear === currentYear;
  
  const html = `
    <div class="year-selector d-flex ai-center jc-space-between gap-1rem p-1rem bg-surface br-12px sh-0-2px-8px-rgba42_38_34_0_08 mb-1_5rem">
      <!-- 이전 연도 버튼 -->
      <button id="year-prev-btn" class="btn-year-nav bg-none bd-1px-solid-line p-0_5rem-0_75rem br-8px cur-pointer d-flex ai-center jc-center tr-all-0_2s c-muted hov-bg-bg2 hov-bdc-line2" title="이전 연도">
        <i class="w-20px h-20px sw-2_5" data-lucide="chevron-left"></i>
      </button>
      
      <!-- 연도 정보 및 선택 -->
      <div class="fx-1 d-flex fd-column ai-center gap-0_5rem pos-relative">
        <button class="d-flex ai-center gap-0_5rem bg-none bd-none cur-pointer p-0_5rem br-8px tr-all-0_2s hov-bg-bg2" id="year-selector-btn">
          <i class="w-18px h-18px c-accent sw-2_5" data-lucide="calendar"></i>
          <span class="fwt-600 c-text fz-1rem">
            ${selectedYear}년
          </span>
          <i class="w-16px h-16px c-muted sw-2_5 tr-transform-0_2s" data-lucide="chevron-down" id="year-selector-chevron"></i>
          ${isCurrentYear ? '<span class="bg-success c-white p-0_15rem-0_5rem br-999px fz-0_75rem fwt-500">올해</span>' : ''}
        </button>
        <div class="fz-0_875rem c-muted">
          ${selectedYear}년 1월 1일 ~ 12월 31일
        </div>
      </div>
      
      <!-- 연도 선택 모달 -->
      <div id="year-selector-overlay" class="date-overlay hidden pos-fixed ins-0 bg-rgba42_38_34_0_35 bf-blur6px d-none ai-center jc-center z-2000 p-1rem">
        <div class="bg-surface sh-0-20px-40px-rgba42_38_34_0_18 w-min360px_90vw p-1rem d-flex fd-column gap-0_75rem bd-1px-solid-line" id="year-selector-modal">
          <div class="d-flex jc-space-between ai-center">
            <span class="fwt-700 c-text fz-1rem">연도 선택</span>
            <button class="bg-none bd-none cur-pointer p-0_25rem br-4px d-flex ai-center jc-center tr-all-0_2s hov-bg-bg2" id="year-selector-close">
              <i class="w-20px h-20px c-muted sw-2_5" data-lucide="x"></i>
            </button>
          </div>
          <div class="bg-bg p-0_5rem bd-1px-solid-line maxh-300px ovy-auto">
            <div class="d-flex fd-column gap-0_25rem" id="year-selector-options">
              ${generateYearOptions(currentYear, selectedYear, 5)}
            </div>
          </div>
        </div>
      </div>
      
      <!-- 다음 연도 버튼 -->
      <button id="year-next-btn" class="btn-year-nav bg-none bd-1px-solid-line p-0_5rem-0_75rem br-8px cur-pointer d-flex ai-center jc-center tr-all-0_2s c-muted hov-bg-bg2 hov-bdc-line2" title="다음 연도">
        <i class="w-20px h-20px sw-2_5" data-lucide="chevron-right"></i>
      </button>
      
      <!-- 올해로 이동 버튼 -->
      ${!isCurrentYear ? `
        <button id="year-current-btn" class="btn-year-current bg-accent c-white bd-none p-0_5rem-1rem br-8px cur-pointer fz-0_875rem fwt-500 ws-nowrap tr-all-0_2s hov-tf-translatey-1px hov-sh-0-4px-12px-rgba42_38_34_0_15" title="올해로 이동">
          올해
        </button>
      ` : ''}
    </div>
  `;
  
  return html;
}

/**
 * 연도 선택 옵션 생성 (현재 연도 기준 앞뒤 5년)
 */
function generateYearOptions(currentYear, selectedYear, maxYears = 5) {
  const options = [];
  
  // 현재 연도부터 maxYears년 전까지
  for (let i = maxYears; i >= 0; i--) {
    const year = currentYear - i;
    const label = i === 0 
      ? `올해 (${year}년)`
      : `${year}년`;
    
    const isSelected = year === selectedYear;
    const selectedStyle = isSelected 
      ? 'background: var(--t-accent); color: white;'
      : 'background: var(--t-surface); color: var(--t-text);';
    
    options.push(`
      <button class="year-option-btn br-8px cur-pointer ta-left fz-0_875rem tr-all-0_2s w-100pct" data-year="${year}" style="${selectedStyle} padding: 0.75rem 1rem; border: 1px solid ${isSelected ? 'var(--t-accent)' : 'var(--t-line)'}; font-weight: ${isSelected ? '600' : '500'};" onmouseover="if (!this.dataset.selected) { this.style.background='var(--t-bg2)'; this.style.borderColor='var(--t-line2)'; }" onmouseout="if (!this.dataset.selected) { this.style.background='white'; this.style.borderColor='var(--t-line)'; }"
        ${isSelected ? 'data-selected="true"' : ''}>
        ${label}
        ${isSelected ? '<i class="w-16px h-16px fl-right sw-2_5" data-lucide="check"></i>' : ''}
      </button>
    `);
  }
  
  return options.join('');
}

/**
 * 연도 선택 컴포넌트 초기화 (이벤트 바인딩)
 */
export function initYearSelector(onYearChange, selectedYear, timezone = 'Asia/Seoul') {
  // 전역 콜백 등록
  window.handleYearChange = onYearChange;
  
  const DateTime = getDateTimeLib();
  const today = DateTime.now().setZone(timezone);
  const currentYear = today.year;
  const prevYear = selectedYear - 1;
  const nextYear = selectedYear + 1;
  
  // 이전 연도 버튼
  const prevBtn = document.getElementById('year-prev-btn');
  if (prevBtn) {
    const newPrevBtn = prevBtn.cloneNode(true);
    prevBtn.parentNode.replaceChild(newPrevBtn, prevBtn);
    newPrevBtn.addEventListener('click', () => {
      if (onYearChange) onYearChange(prevYear);
    });
  }
  
  // 다음 연도 버튼
  const nextBtn = document.getElementById('year-next-btn');
  if (nextBtn) {
    const newNextBtn = nextBtn.cloneNode(true);
    nextBtn.parentNode.replaceChild(newNextBtn, nextBtn);
    newNextBtn.addEventListener('click', () => {
      if (onYearChange) onYearChange(nextYear);
    });
  }
  
  // 올해 버튼
  const currentBtn = document.getElementById('year-current-btn');
  if (currentBtn) {
    const newCurrentBtn = currentBtn.cloneNode(true);
    currentBtn.parentNode.replaceChild(newCurrentBtn, currentBtn);
    newCurrentBtn.addEventListener('click', () => {
      if (onYearChange) onYearChange(currentYear);
    });
  }
  
  // 연도 선택 버튼 (모달 열기)
  const yearSelectorBtn = document.getElementById('year-selector-btn');
  const yearSelectorOverlay = document.getElementById('year-selector-overlay');
  const yearSelectorModal = document.getElementById('year-selector-modal');
  const yearSelectorClose = document.getElementById('year-selector-close');
  const yearSelectorChevron = document.getElementById('year-selector-chevron');
  
  if (yearSelectorBtn && yearSelectorOverlay) {
    // 모달이 기본적으로 닫혀있도록 보장
    yearSelectorOverlay.classList.add('hidden');
    yearSelectorOverlay.style.display = 'none';
    
    // 모달 열기
    const openModal = () => {
      yearSelectorOverlay.classList.remove('hidden');
      yearSelectorOverlay.style.display = 'flex';
      if (yearSelectorChevron) {
        yearSelectorChevron.style.transform = 'rotate(180deg)';
      }
    };
    
    // 모달 닫기
    const closeModal = () => {
      yearSelectorOverlay.classList.add('hidden');
      yearSelectorOverlay.style.display = 'none';
      if (yearSelectorChevron) {
        yearSelectorChevron.style.transform = 'rotate(0deg)';
      }
    };
    
    // 버튼 클릭으로 모달 열기
    const newBtn = yearSelectorBtn.cloneNode(true);
    yearSelectorBtn.parentNode.replaceChild(newBtn, yearSelectorBtn);
    newBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      openModal();
    });
    
    // 닫기 버튼
    if (yearSelectorClose) {
      const newCloseBtn = yearSelectorClose.cloneNode(true);
      yearSelectorClose.parentNode.replaceChild(newCloseBtn, yearSelectorClose);
      newCloseBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        closeModal();
      });
    }
    
    // 오버레이 클릭으로 모달 닫기
    yearSelectorOverlay.addEventListener('click', (e) => {
      if (e.target === yearSelectorOverlay) {
        closeModal();
      }
    });
    
    // 모달 내부 클릭은 전파 방지
    if (yearSelectorModal) {
      yearSelectorModal.addEventListener('click', (e) => {
        e.stopPropagation();
      });
    }
    
    // 연도 옵션 버튼들 (이벤트 위임 사용)
    const optionsContainer = document.getElementById('year-selector-options');
    if (optionsContainer) {
      optionsContainer.addEventListener('click', (e) => {
        const btn = e.target.closest('.year-option-btn');
        if (btn) {
          e.stopPropagation();
          const year = parseInt(btn.dataset.year);
          if (year && onYearChange) {
            closeModal();
            onYearChange(year);
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

























