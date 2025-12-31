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
    <div class="year-selector" style="display: flex; align-items: center; justify-content: space-between; gap: 1rem; padding: 1rem; background: white; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); margin-bottom: 1.5rem;">
      <!-- 이전 연도 버튼 -->
      <button 
        id="year-prev-btn" 
        class="btn-year-nav"
        style="background: none; border: 1px solid #e5e7eb; padding: 0.5rem 0.75rem; border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; color: #6b7280;"
        onmouseover="this.style.background='#f3f4f6'; this.style.borderColor='#d1d5db';"
        onmouseout="this.style.background='none'; this.style.borderColor='#e5e7eb';"
        title="이전 연도"
      >
        <i data-lucide="chevron-left" style="width: 20px; height: 20px; stroke-width: 2.5;"></i>
      </button>
      
      <!-- 연도 정보 및 선택 -->
      <div style="flex: 1; display: flex; flex-direction: column; align-items: center; gap: 0.5rem; position: relative;">
        <button 
          id="year-selector-btn"
          style="display: flex; align-items: center; gap: 0.5rem; background: none; border: none; cursor: pointer; padding: 0.5rem; border-radius: 8px; transition: all 0.2s;"
          onmouseover="this.style.background='#f3f4f6';"
          onmouseout="this.style.background='none';"
        >
          <i data-lucide="calendar" style="width: 18px; height: 18px; color: #6366f1; stroke-width: 2.5;"></i>
          <span style="font-weight: 600; color: #111827; font-size: 1rem;">
            ${selectedYear}년
          </span>
          <i data-lucide="chevron-down" id="year-selector-chevron" style="width: 16px; height: 16px; color: #6b7280; stroke-width: 2.5; transition: transform 0.2s;"></i>
          ${isCurrentYear ? '<span style="background: #10b981; color: white; padding: 0.15rem 0.5rem; border-radius: 999px; font-size: 0.75rem; font-weight: 500;">올해</span>' : ''}
        </button>
        <div style="font-size: 0.875rem; color: #6b7280;">
          ${selectedYear}년 1월 1일 ~ 12월 31일
        </div>
      </div>
      
      <!-- 연도 선택 모달 -->
      <div id="year-selector-overlay" class="date-overlay hidden" style="position: fixed; inset: 0; background: rgba(15, 23, 42, 0.35); backdrop-filter: blur(6px); display: none; align-items: center; justify-content: center; z-index: 2000; padding: 1rem;">
        <div id="year-selector-modal" style="background: #ffffff; border-radius: 1rem; box-shadow: 0 20px 40px rgba(0,0,0,0.18); width: min(360px, 90vw); padding: 1rem; display: flex; flex-direction: column; gap: 0.75rem; border: 1px solid #e5e7eb;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="font-weight: 700; color: #111827; font-size: 1rem;">연도 선택</span>
            <button 
              id="year-selector-close"
              style="background: none; border: none; cursor: pointer; padding: 0.25rem; border-radius: 4px; display: flex; align-items: center; justify-content: center; transition: all 0.2s;"
              onmouseover="this.style.background='#f3f4f6';"
              onmouseout="this.style.background='none';"
            >
              <i data-lucide="x" style="width: 20px; height: 20px; color: #6b7280; stroke-width: 2.5;"></i>
            </button>
          </div>
          <div style="background: #f8fafc; border-radius: 0.75rem; padding: 0.5rem; border: 1px solid #e2e8f0; max-height: 300px; overflow-y: auto;">
            <div id="year-selector-options" style="display: flex; flex-direction: column; gap: 0.25rem;">
              ${generateYearOptions(currentYear, selectedYear, 5)}
            </div>
          </div>
        </div>
      </div>
      
      <!-- 다음 연도 버튼 -->
      <button 
        id="year-next-btn" 
        class="btn-year-nav"
        style="background: none; border: 1px solid #e5e7eb; padding: 0.5rem 0.75rem; border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; color: #6b7280;"
        onmouseover="this.style.background='#f3f4f6'; this.style.borderColor='#d1d5db';"
        onmouseout="this.style.background='none'; this.style.borderColor='#e5e7eb';"
        title="다음 연도"
      >
        <i data-lucide="chevron-right" style="width: 20px; height: 20px; stroke-width: 2.5;"></i>
      </button>
      
      <!-- 올해로 이동 버튼 -->
      ${!isCurrentYear ? `
        <button 
          id="year-current-btn" 
          class="btn-year-current"
          style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; border: none; padding: 0.5rem 1rem; border-radius: 8px; cursor: pointer; font-size: 0.875rem; font-weight: 500; white-space: nowrap; transition: all 0.2s;"
          onmouseover="this.style.transform='translateY(-1px)'; this.style.boxShadow='0 4px 12px rgba(99, 102, 241, 0.3)';"
          onmouseout="this.style.transform='none'; this.style.boxShadow='none';"
          title="올해로 이동"
        >
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
      ? 'background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white;'
      : 'background: white; color: #111827;';
    
    options.push(`
      <button 
        class="year-option-btn"
        data-year="${year}"
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

















