import { toast } from '../utils/toast.js';
import { supabase } from '../config/supabase.js';
import { getCurrentProfile } from '../utils/auth.js';
import { getToday } from '../utils/date.js';

// 이벤트 리스너 중복 등록 방지 플래그
let recurringEventsBound = false;
let recurringEventHandler = null; // 이벤트 핸들러 참조 저장

// 수정 모드 관리
let editingRecurringTaskId = null;

// 등록 중 플래그 (동시 실행 방지)
let registeringRecurringTasks = false;

export async function renderRecurring() {
  const profile = await getCurrentProfile();
  if (!profile) {
    return '<div class="error">로그인이 필요합니다.</div>';
  }

  const html = `
    <div class="card bg-accent2-soft bd-2px-solid-accent2 sh-0-8px-24px-rgba42_38_34_0_07">
      <div class="card-header bdb-2px-solid-accent2-line pb-1rem mb-1_25rem">
        <div class="d-flex ai-center gap-0_75rem">
          <div class="w-40px h-40px bg-accent2 br-12px d-flex ai-center jc-center sh-0-4px-12px-rgba42_38_34_0_15">
            <i class="w-24px h-24px c-white sw-2_5" data-lucide="repeat"></i>
          </div>
          <div class="fx-1">
            <div class="card-title c-accent2 fz-1_5rem m-0">반복업무</div>
            <p class="c-muted fz-1rem m-0_25rem-0-0-0">반복되는 할일을 설정하고 관리하세요</p>
          </div>
          <button id="add-recurring-btn" class="btn btn-primary p-0_5rem-1rem fz-0_9rem">
            <i class="w-16px h-16px" data-lucide="plus"></i>
            추가
          </button>
        </div>
      </div>

      <div class="d-block" id="recurring-content">
        <!-- 반복업무 목록 -->
        <div class="d-grid gtc-repeatauto-fill_minmax280px_1fr gap-1rem mb-1rem" id="recurring-tasks-list"></div>
        
        <!-- 빈 상태 -->
        <div class="ta-center p-3rem-1rem c-muted2 d-none" id="recurring-empty">
          <i class="w-48px h-48px m-0-auto-1rem op-0_5" data-lucide="repeat"></i>
          <p class="fz-1_1rem mb-0_5rem">등록된 반복업무가 없습니다</p>
          <p class="fz-0_9rem">새 반복업무를 추가하여 시작하세요</p>
        </div>
      </div>
    </div>

    <!-- 반복업무 추가/수정 모달 -->
    <div class="d-none pos-fixed t-0 l-0 r-0 b-0 bg-rgba42_38_34_0_5 z-1000 ai-center jc-center" id="recurring-modal">
      <div class="bg-surface br-16px p-1_5rem w-90pct maxw-600px maxh-90vh ovy-auto sh-0-20px-60px-rgba42_38_34_0_3">
        <div class="d-flex ai-center jc-space-between mb-1_25rem">
          <h3 class="m-0 fz-1_25rem fwt-700 c-text" id="recurring-modal-title">반복업무 추가</h3>
          <button class="bg-transparent bd-none p-0_25rem cur-pointer c-muted2 tr-color-0_2s" id="recurring-modal-close">
            <i class="w-24px h-24px" data-lucide="x"></i>
          </button>
        </div>
        
        <div class="d-flex fd-column gap-1rem">
          <!-- 카테고리 선택 -->
          <div>
            <label class="d-block mb-0_5rem fwt-600 c-text">카테고리</label>
            <select class="w-100pct p-0_75rem-1rem bd-2px-solid-line br-10px fz-0_95rem bg-surface cur-pointer" id="recurring-category-input">
              <option value="work">Work</option>
              <option value="job">Job</option>
              <option value="self_dev">Growth</option>
              <option value="personal">Personal</option>
            </select>
          </div>

          <!-- 할일 입력 -->
          <div>
            <label class="d-block mb-0_5rem fwt-600 c-text">할일</label>
            <input class="w-100pct p-0_75rem-1rem bd-2px-solid-line br-10px fz-1rem tr-border-color-0_2s ol-none" type="text" id="recurring-title-input" placeholder="반복할 할일을 입력하세요" onfocus="this.style.borderColor='var(--t-accent)'" onblur="this.style.borderColor='var(--t-line)'">
          </div>

          <!-- 반복 주기 선택 -->
          <div>
            <label class="d-block mb-0_5rem fwt-600 c-text">반복 주기</label>
            <select class="w-100pct p-0_75rem-1rem bd-2px-solid-line br-10px fz-0_95rem bg-surface cur-pointer" id="recurring-repeat-type-input">
              <option value="daily">매일 (월~일)</option>
              <option value="weekdays">주중 매일 (월~금)</option>
              <option value="weekends">매주 주말 (토, 일)</option>
              <option value="weekly">주간 (특정 요일)</option>
              <option value="custom_weekly">주간 (여러 요일 선택)</option>
              <option value="monthly">월간 (특정 날짜)</option>
            </select>
          </div>

          <!-- 주간 선택 (주간 선택 시에만 표시) -->
          <div class="d-none" id="recurring-weekly-config">
            <label class="d-block mb-0_5rem fwt-600 c-text">요일 선택</label>
            <select class="w-100pct p-0_75rem-1rem bd-2px-solid-line br-10px fz-0_95rem bg-surface cur-pointer" id="recurring-weekly-day-input">
              <option value="0">일요일</option>
              <option value="1">월요일</option>
              <option value="2">화요일</option>
              <option value="3">수요일</option>
              <option value="4">목요일</option>
              <option value="5">금요일</option>
              <option value="6">토요일</option>
            </select>
          </div>

          <!-- 여러 요일 선택 (custom_weekly 선택 시에만 표시) -->
          <div class="d-none" id="recurring-custom-weekly-config">
            <label class="d-block mb-0_75rem fwt-600 c-text">요일 선택 (여러 개 가능)</label>
            <div class="d-grid gtc-repeat4_1fr gap-0_5rem">
              <label class="day-checkbox-label d-flex ai-center gap-0_5rem p-0_75rem bd-2px-solid-line br-8px cur-pointer tr-all-0_2s" onmouseover="this.style.borderColor='var(--t-accent)'; this.style.background='var(--t-accent2-soft)'" onmouseout="this.style.borderColor='var(--t-line)'; this.style.background='white'">
                <input type="checkbox" class="recurring-day-checkbox w-18px h-18px cur-pointer" value="1">
                <span class="fz-0_9rem fwt-500">월</span>
              </label>
              <label class="day-checkbox-label d-flex ai-center gap-0_5rem p-0_75rem bd-2px-solid-line br-8px cur-pointer tr-all-0_2s" onmouseover="this.style.borderColor='var(--t-accent)'; this.style.background='var(--t-accent2-soft)'" onmouseout="this.style.borderColor='var(--t-line)'; this.style.background='white'">
                <input type="checkbox" class="recurring-day-checkbox w-18px h-18px cur-pointer" value="2">
                <span class="fz-0_9rem fwt-500">화</span>
              </label>
              <label class="day-checkbox-label d-flex ai-center gap-0_5rem p-0_75rem bd-2px-solid-line br-8px cur-pointer tr-all-0_2s" onmouseover="this.style.borderColor='var(--t-accent)'; this.style.background='var(--t-accent2-soft)'" onmouseout="this.style.borderColor='var(--t-line)'; this.style.background='white'">
                <input type="checkbox" class="recurring-day-checkbox w-18px h-18px cur-pointer" value="3">
                <span class="fz-0_9rem fwt-500">수</span>
              </label>
              <label class="day-checkbox-label d-flex ai-center gap-0_5rem p-0_75rem bd-2px-solid-line br-8px cur-pointer tr-all-0_2s" onmouseover="this.style.borderColor='var(--t-accent)'; this.style.background='var(--t-accent2-soft)'" onmouseout="this.style.borderColor='var(--t-line)'; this.style.background='white'">
                <input type="checkbox" class="recurring-day-checkbox w-18px h-18px cur-pointer" value="4">
                <span class="fz-0_9rem fwt-500">목</span>
              </label>
              <label class="day-checkbox-label d-flex ai-center gap-0_5rem p-0_75rem bd-2px-solid-line br-8px cur-pointer tr-all-0_2s" onmouseover="this.style.borderColor='var(--t-accent)'; this.style.background='var(--t-accent2-soft)'" onmouseout="this.style.borderColor='var(--t-line)'; this.style.background='white'">
                <input type="checkbox" class="recurring-day-checkbox w-18px h-18px cur-pointer" value="5">
                <span class="fz-0_9rem fwt-500">금</span>
              </label>
              <label class="day-checkbox-label d-flex ai-center gap-0_5rem p-0_75rem bd-2px-solid-line br-8px cur-pointer tr-all-0_2s" onmouseover="this.style.borderColor='var(--t-accent)'; this.style.background='var(--t-accent2-soft)'" onmouseout="this.style.borderColor='var(--t-line)'; this.style.background='white'">
                <input type="checkbox" class="recurring-day-checkbox w-18px h-18px cur-pointer" value="6">
                <span class="fz-0_9rem fwt-500">토</span>
              </label>
              <label class="day-checkbox-label d-flex ai-center gap-0_5rem p-0_75rem bd-2px-solid-line br-8px cur-pointer tr-all-0_2s" onmouseover="this.style.borderColor='var(--t-accent)'; this.style.background='var(--t-accent2-soft)'" onmouseout="this.style.borderColor='var(--t-line)'; this.style.background='white'">
                <input type="checkbox" class="recurring-day-checkbox w-18px h-18px cur-pointer" value="0">
                <span class="fz-0_9rem fwt-500">일</span>
              </label>
            </div>
          </div>

          <!-- 월간 선택 (월간 선택 시에만 표시) -->
          <div class="d-none" id="recurring-monthly-config">
            <label class="d-block mb-0_5rem fwt-600 c-text">날짜 선택</label>
            <input class="w-100pct p-0_75rem-1rem bd-2px-solid-line br-10px fz-1rem tr-border-color-0_2s ol-none" type="number" id="recurring-monthly-day-input" min="1" max="31" placeholder="1~31" onfocus="this.style.borderColor='var(--t-accent)'" onblur="this.style.borderColor='var(--t-line)'">
          </div>

          <!-- 시작일 -->
          <div>
            <label class="d-block mb-0_5rem fwt-600 c-text">시작일</label>
            <input class="w-100pct p-0_75rem-1rem bd-2px-solid-line br-10px fz-1rem tr-border-color-0_2s ol-none" type="date" id="recurring-start-date-input" onfocus="this.style.borderColor='var(--t-accent)'" onblur="this.style.borderColor='var(--t-line)'">
          </div>

          <!-- 종료일 (선택) -->
          <div>
            <label class="d-block mb-0_5rem fwt-600 c-text">
              종료일 (선택)
              <span class="fwt-400 fz-0_85rem c-muted">(비워두면 3개월 후까지 등록)</span>
            </label>
            <input class="w-100pct p-0_75rem-1rem bd-2px-solid-line br-10px fz-1rem tr-border-color-0_2s ol-none" type="date" id="recurring-end-date-input" onfocus="this.style.borderColor='var(--t-accent)'" onblur="this.style.borderColor='var(--t-line)'">
          </div>

          <!-- 저장 버튼 -->
          <div class="d-flex gap-0_75rem mt-0_5rem">
            <button class="fx-1 p-0_75rem-1_5rem bg-accent c-white bd-none br-10px fz-1rem fwt-600 cur-pointer sh-0-4px-12px-rgba42_38_34_0_15 tr-transform-0_2s_box-shadow-0_2s" id="recurring-modal-save" onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 16px rgba(42,38,34, 0.18)'" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 12px rgba(42,38,34, 0.15)'">
              <i class="w-18px h-18px mr-0_25rem va--3px" data-lucide="check"></i>
              저장
            </button>
            <button class="p-0_75rem-1_5rem bg-bg2 c-text bd-none br-10px fz-1rem fwt-600 cur-pointer" id="recurring-modal-cancel">
              취소
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

  return {
    html,
    onMount: async () => {
      // 이벤트 바인딩 플래그 초기화 (페이지가 다시 렌더링될 때마다)
      recurringEventsBound = false;
      await loadRecurringTasks(profile);
      setupEventHandlers(profile);
    }
  };
}

async function loadRecurringTasks(profile) {
  try {
    // 모든 반복업무 조회
    const { data: tasks, error } = await supabase
      .from('recurring_tasks')
      .select('*')
      .eq('user_id', profile.id)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const tasksList = document.getElementById('recurring-tasks-list');
    const emptyState = document.getElementById('recurring-empty');

    if (!tasks || tasks.length === 0) {
      if (tasksList) tasksList.style.display = 'none';
      if (emptyState) emptyState.style.display = 'block';
      if (window.lucide?.createIcons) window.lucide.createIcons();
      return;
    }

    if (tasksList) tasksList.style.display = 'grid';
    if (emptyState) emptyState.style.display = 'none';

    // 반복업무 목록 렌더링
    const tasksHtml = tasks.map(task => renderRecurringTaskCard(task)).join('');
    if (tasksList) {
      tasksList.innerHTML = tasksHtml;
    }

    if (window.lucide?.createIcons) window.lucide.createIcons();
  } catch (error) {
    console.error('Error loading recurring tasks:', error);
    toast('반복업무를 불러오는 중 오류가 발생했습니다.');
  }
}

function renderRecurringTaskCard(task) {
  const categoryLabels = {
    work: 'Work',
    job: 'Job',
    self_dev: 'Growth',
    personal: 'Personal'
  };

  const categoryIcons = {
    work: 'briefcase',
    job: 'clipboard-list',
    self_dev: 'book-open',
    personal: 'home'
  };

  const categoryColors = {
    work: { bg: 'var(--t-cat-work-soft)', border: 'var(--t-cat-work-line)', gradient: 'var(--t-cat-work)', shadow: 'rgba(42,38,34, 0.15)' },
    job: { bg: 'var(--t-cat-job-soft)', border: 'var(--t-cat-job-line)', gradient: 'var(--t-cat-job)', shadow: 'rgba(42,38,34, 0.15)' },
    self_dev: { bg: 'var(--t-accent2-soft)', border: 'var(--t-accent2-line)', gradient: 'var(--t-accent2)', shadow: 'rgba(42,38,34, 0.15)' },
    personal: { bg: 'var(--t-cat-personal-soft)', border: 'var(--t-cat-personal-line)', gradient: 'var(--t-cat-personal)', shadow: 'rgba(42,38,34, 0.15)' }
  };

  const colors = categoryColors[task.category] || categoryColors.work;
  const icon = categoryIcons[task.category] || 'repeat';
  
  const repeatTypeLabels = {
    daily: '매일 (월~일)',
    weekdays: '주중 매일 (월~금)',
    weekends: '매주 주말 (토, 일)',
    weekly: `매주 ${getDayOfWeekLabel(task.repeat_config.day_of_week)}`,
    custom_weekly: formatCustomWeeklyLabel(task.repeat_config.days_of_week),
    monthly: `매월 ${task.repeat_config.day_of_month}일`
  };

  const repeatLabel = repeatTypeLabels[task.repeat_type] || task.repeat_type;
  
  // 종료일이 없을 때 3개월 후 날짜 계산
  let dateRange;
  if (task.end_date) {
    dateRange = `${task.start_date} ~ ${task.end_date}`;
  } else {
    const start = new Date(task.start_date + 'T00:00:00');
    const threeMonthsLater = new Date(start);
    threeMonthsLater.setMonth(threeMonthsLater.getMonth() + 3);
    const year = threeMonthsLater.getFullYear();
    const month = String(threeMonthsLater.getMonth() + 1).padStart(2, '0');
    const day = String(threeMonthsLater.getDate()).padStart(2, '0');
    const threeMonthsLaterStr = `${year}-${month}-${day}`;
    dateRange = `${task.start_date} ~ ${threeMonthsLaterStr}`;
  }

  return `
    <div class="recurring-task-card br-12px p-1rem tr-all-0_2s sh-0-2px-8px-rgba42_38_34_0_08 d-flex fd-column" data-task-id="${task.id}" style="background: ${colors.bg}; border: 2px solid ${colors.border};">
      <div class="d-flex ai-start gap-0_75rem mb-0_75rem">
        <div class="w-36px h-36px br-10px d-flex ai-center jc-center fs-0" style="background: ${colors.gradient};">
          <i class="w-20px h-20px c-white" data-lucide="${icon}"></i>
        </div>
        <div class="fx-1 minw-0">
          <h4 class="c-text fz-1rem fwt-600 m-0-0-0_5rem-0 lh-1_4 wb-break-word">${task.title}</h4>
          <div class="d-flex ai-center gap-0_5rem fwrap-wrap">
            <span class="fz-0_75rem p-0_125rem-0_5rem c-white br-999px fwt-500" style="background: ${colors.gradient};">${categoryLabels[task.category]}</span>
          </div>
        </div>
        <button class="delete-recurring-btn bg-transparent bd-none c-danger cur-pointer p-0_25rem fs-0" data-task-id="${task.id}" title="삭제">
          <i class="w-16px h-16px" data-lucide="trash-2"></i>
        </button>
      </div>
      
      <div class="mt-auto pt-0_75rem" style="border-top: 1px dashed ${colors.border};">
        <div class="mb-0_75rem">
          <div class="fz-0_75rem c-muted mb-0_25rem d-flex ai-center gap-0_25rem">
            <i class="w-12px h-12px" data-lucide="repeat"></i>
            <span>${repeatLabel}</span>
          </div>
          <div class="fz-0_75rem c-muted d-flex ai-center gap-0_25rem">
            <i class="w-12px h-12px" data-lucide="calendar"></i>
            <span>${dateRange}</span>
          </div>
        </div>
        <button class="register-recurring-todos-btn w-100pct p-0_75rem bg-accent c-white bd-none br-8px fwt-600 cur-pointer sh-0-2px-8px-rgba42_38_34_0_15 tr-transform-0_2s_box-shadow-0_2s" data-task-id="${task.id}" onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 12px rgba(42,38,34, 0.18)'" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 2px 8px rgba(42,38,34, 0.15)'">
          <i class="w-18px h-18px mr-0_5rem" data-lucide="calendar-check"></i>
          오늘 할일 등록하기
        </button>
      </div>
    </div>
  `;
}

function getDayOfWeekLabel(dayOfWeek) {
  const days = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
  return days[dayOfWeek] || '알 수 없음';
}

function formatCustomWeeklyLabel(daysOfWeek) {
  if (!daysOfWeek || !Array.isArray(daysOfWeek) || daysOfWeek.length === 0) {
    return '요일 미선택';
  }
  const dayLabels = ['일', '월', '화', '수', '목', '금', '토'];
  // 0~6 범위 검증 및 중복 제거
  const validDays = [...new Set(daysOfWeek.filter(d => d >= 0 && d <= 6))];
  if (validDays.length === 0) return '요일 미선택';
  // 요일 순서대로 정렬 (일요일부터)
  validDays.sort((a, b) => a - b);
  return '매주 ' + validDays.map(d => dayLabels[d]).join(', ');
}

function setupEventHandlers(profile) {
  // 반복업무 추가 버튼
  const addBtn = document.getElementById('add-recurring-btn');
  if (addBtn) {
    const newAddBtn = addBtn.cloneNode(true);
    addBtn.parentNode.replaceChild(newAddBtn, addBtn);
    newAddBtn.addEventListener('click', () => {
      if (window.openRecurringModal) {
        window.openRecurringModal(null, profile);
      } else {
        console.error('openRecurringModal function not found');
        toast('추가 기능을 불러오는 중 오류가 발생했습니다. 페이지를 새로고침해주세요.');
      }
    });
  }

  // 반복 주기 선택에 따른 UI 변경
  const repeatTypeInput = document.getElementById('recurring-repeat-type-input');
  if (repeatTypeInput) {
    const newInput = repeatTypeInput.cloneNode(true);
    repeatTypeInput.parentNode.replaceChild(newInput, repeatTypeInput);
    newInput.addEventListener('change', () => {
      const weeklyConfig = document.getElementById('recurring-weekly-config');
      const customWeeklyConfig = document.getElementById('recurring-custom-weekly-config');
      const monthlyConfig = document.getElementById('recurring-monthly-config');
      
      if (newInput.value === 'weekly') {
        if (weeklyConfig) weeklyConfig.style.display = 'block';
        if (customWeeklyConfig) customWeeklyConfig.style.display = 'none';
        if (monthlyConfig) monthlyConfig.style.display = 'none';
      } else if (newInput.value === 'custom_weekly') {
        if (weeklyConfig) weeklyConfig.style.display = 'none';
        if (customWeeklyConfig) customWeeklyConfig.style.display = 'block';
        if (monthlyConfig) monthlyConfig.style.display = 'none';
      } else if (newInput.value === 'monthly') {
        if (weeklyConfig) weeklyConfig.style.display = 'none';
        if (customWeeklyConfig) customWeeklyConfig.style.display = 'none';
        if (monthlyConfig) monthlyConfig.style.display = 'block';
      } else {
        if (weeklyConfig) weeklyConfig.style.display = 'none';
        if (customWeeklyConfig) customWeeklyConfig.style.display = 'none';
        if (monthlyConfig) monthlyConfig.style.display = 'none';
      }
    });
  }

  // 이벤트 위임: 반복업무 카드 내부 버튼들
  // 기존 이벤트 리스너 제거 (중복 방지)
  if (recurringEventHandler) {
    document.removeEventListener('click', recurringEventHandler);
    recurringEventHandler = null;
  }
  
  recurringEventsBound = true;

  // 이벤트 핸들러 함수 정의
  recurringEventHandler = async (e) => {
    // 반복업무 삭제 버튼
    if (e.target.closest('.delete-recurring-btn')) {
      const btn = e.target.closest('.delete-recurring-btn');
      const taskId = btn.dataset.taskId;
      if (confirm('이 반복업무를 삭제하시겠습니까? 연결된 할일도 함께 삭제됩니다.')) {
        await deleteRecurringTask(taskId, profile);
      }
    }

    // 오늘 할일 등록 버튼
    if (e.target.closest('.register-recurring-todos-btn')) {
      const btn = e.target.closest('.register-recurring-todos-btn');
      const taskId = btn.dataset.taskId;
      // 중복 실행 방지
      if (!registeringRecurringTasks) {
        await registerRecurringTaskToTodos(taskId, profile);
      }
    }
  };
  
  // 이벤트 리스너 등록
  document.addEventListener('click', recurringEventHandler);

  // 모달 이벤트
  setupRecurringModalEvents(profile);
}

function setupRecurringModalEvents(profile) {
  const modal = document.getElementById('recurring-modal');
  const closeBtn = document.getElementById('recurring-modal-close');
  const cancelBtn = document.getElementById('recurring-modal-cancel');
  const saveBtn = document.getElementById('recurring-modal-save');
  const categoryInput = document.getElementById('recurring-category-input');
  const titleInput = document.getElementById('recurring-title-input');
  const repeatTypeInput = document.getElementById('recurring-repeat-type-input');
  const weeklyDayInput = document.getElementById('recurring-weekly-day-input');
  const monthlyDayInput = document.getElementById('recurring-monthly-day-input');
  const startDateInput = document.getElementById('recurring-start-date-input');
  const endDateInput = document.getElementById('recurring-end-date-input');

  let currentTaskId = null;

  const closeModal = () => {
    if (modal) modal.style.display = 'none';
    currentTaskId = null;
    if (titleInput) titleInput.value = '';
    if (categoryInput) categoryInput.value = 'work';
    if (repeatTypeInput) repeatTypeInput.value = 'weekdays';
    if (weeklyDayInput) weeklyDayInput.value = '1';
    if (monthlyDayInput) monthlyDayInput.value = '1';
    if (startDateInput) startDateInput.value = '';
    if (endDateInput) endDateInput.value = '';
    
    // 체크박스 초기화
    const checkboxes = document.querySelectorAll('.recurring-day-checkbox');
    checkboxes.forEach(cb => cb.checked = false);
    
    // 설정 UI 숨기기
    const weeklyConfig = document.getElementById('recurring-weekly-config');
    const customWeeklyConfig = document.getElementById('recurring-custom-weekly-config');
    const monthlyConfig = document.getElementById('recurring-monthly-config');
    if (weeklyConfig) weeklyConfig.style.display = 'none';
    if (customWeeklyConfig) customWeeklyConfig.style.display = 'none';
    if (monthlyConfig) monthlyConfig.style.display = 'none';
  };

  if (closeBtn) closeBtn.onclick = closeModal;
  if (cancelBtn) cancelBtn.onclick = closeModal;
  
  // 모달 배경 클릭 시 닫기
  if (modal) {
    modal.onclick = (e) => {
      if (e.target === modal) closeModal();
    };
  }

  if (saveBtn) {
    saveBtn.onclick = async () => {
      if (!titleInput || !titleInput.value.trim()) {
        toast('할일을 입력해주세요.');
        titleInput?.focus();
        return;
      }

      if (!startDateInput || !startDateInput.value) {
        toast('시작일을 선택해주세요.');
        startDateInput?.focus();
        return;
      }

      // 반복 설정 구성
      let repeatConfig = {};
      if (repeatTypeInput.value === 'weekly') {
        if (!weeklyDayInput || !weeklyDayInput.value) {
          toast('요일을 선택해주세요.');
          return;
        }
        repeatConfig = { day_of_week: parseInt(weeklyDayInput.value) };
      } else if (repeatTypeInput.value === 'custom_weekly') {
        // 체크박스에서 선택된 요일 수집
        const checkboxes = document.querySelectorAll('.recurring-day-checkbox:checked');
        const selectedDays = Array.from(checkboxes).map(cb => parseInt(cb.value));
        
        // 검증: 최소 1개 선택
        if (selectedDays.length === 0) {
          toast('최소 1개 이상의 요일을 선택해주세요.');
          return;
        }
        
        // 검증: 0~6 범위 체크 및 중복 제거
        const validDays = [...new Set(selectedDays.filter(d => d >= 0 && d <= 6))];
        if (validDays.length === 0) {
          toast('올바른 요일을 선택해주세요.');
          return;
        }
        
        // 요일 순서대로 정렬
        validDays.sort((a, b) => a - b);
        repeatConfig = { days_of_week: validDays };
      } else if (repeatTypeInput.value === 'monthly') {
        if (!monthlyDayInput || !monthlyDayInput.value || parseInt(monthlyDayInput.value) < 1 || parseInt(monthlyDayInput.value) > 31) {
          toast('날짜를 1~31 사이로 입력해주세요.');
          return;
        }
        repeatConfig = { day_of_month: parseInt(monthlyDayInput.value) };
      }

      try {
        const taskData = {
          user_id: profile.id,
          category: categoryInput.value,
          title: titleInput.value.trim(),
          repeat_type: repeatTypeInput.value,
          repeat_config: repeatConfig,
          start_date: startDateInput.value,
          end_date: endDateInput.value || null
        };

        if (currentTaskId) {
          // 수정
          const { error } = await supabase
            .from('recurring_tasks')
            .update(taskData)
            .eq('id', currentTaskId);

          if (error) throw error;
        } else {
          // 추가
          const { error } = await supabase
            .from('recurring_tasks')
            .insert(taskData);

          if (error) throw error;
        }

        closeModal();
        await loadRecurringTasks(profile);
      } catch (error) {
        console.error('Error saving recurring task:', error);
        toast('반복업무 저장 중 오류가 발생했습니다.');
      }
    };
  }

  window.openRecurringModal = async (taskId, prof) => {
    currentTaskId = taskId;
    if (modal) modal.style.display = 'flex';

    if (taskId) {
      // 수정 모드
      const titleEl = document.getElementById('recurring-modal-title');
      if (titleEl) titleEl.textContent = '반복업무 수정';
      
      const { data: task, error } = await supabase
        .from('recurring_tasks')
        .select('*')
        .eq('id', taskId)
        .single();

      if (!error && task) {
        if (categoryInput) categoryInput.value = task.category;
        if (titleInput) titleInput.value = task.title;
        if (repeatTypeInput) {
          repeatTypeInput.value = task.repeat_type;
          // 반복 주기 변경 이벤트 트리거
          repeatTypeInput.dispatchEvent(new Event('change'));
        }
        if (weeklyDayInput && task.repeat_config.day_of_week !== undefined) {
          weeklyDayInput.value = task.repeat_config.day_of_week.toString();
        }
        // custom_weekly 체크박스 설정
        if (task.repeat_type === 'custom_weekly' && task.repeat_config.days_of_week) {
          const daysOfWeek = task.repeat_config.days_of_week;
          const checkboxes = document.querySelectorAll('.recurring-day-checkbox');
          checkboxes.forEach(cb => {
            cb.checked = daysOfWeek.includes(parseInt(cb.value));
          });
        }
        if (monthlyDayInput && task.repeat_config.day_of_month !== undefined) {
          monthlyDayInput.value = task.repeat_config.day_of_month.toString();
        }
        if (startDateInput) startDateInput.value = task.start_date;
        if (endDateInput) endDateInput.value = task.end_date || '';
      }
    } else {
      // 추가 모드
      const titleEl = document.getElementById('recurring-modal-title');
      if (titleEl) titleEl.textContent = '반복업무 추가';
      
      // 오늘 날짜를 기본 시작일로 설정
      const today = getToday(prof.timezone || 'Asia/Seoul');
      if (startDateInput) startDateInput.value = today;
    }

    if (window.lucide?.createIcons) window.lucide.createIcons();
    
    // 입력 필드에 포커스
    setTimeout(() => titleInput?.focus(), 100);
  };
}

async function deleteRecurringTask(taskId, profile) {
  try {
    // 연결된 todos를 soft delete
    await supabase
      .from('todos')
      .update({ deleted_at: new Date().toISOString() })
      .eq('recurring_task_id', taskId)
      .is('deleted_at', null);

    // 반복업무 soft delete
    const { error } = await supabase
      .from('recurring_tasks')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', taskId);

    if (error) throw error;
    await loadRecurringTasks(profile);
  } catch (error) {
    console.error('Error deleting recurring task:', error);
    toast('반복업무 삭제 중 오류가 발생했습니다.');
  }
}

// 반복 주기 계산 함수
function shouldCreateTodoToday(recurringTask, today) {
  const { repeat_type, repeat_config, start_date, end_date } = recurringTask;
  
  // 시작일 체크
  if (start_date && today < start_date) return false;
  
  // 종료일 체크
  if (end_date && today > end_date) return false;
  
  // 반복 주기별 체크
  switch (repeat_type) {
    case 'daily':
      // 매일 (월~일) - 모든 요일
      return true;
    
    case 'weekdays':
      // 월~금 체크
      const dayOfWeek = new Date(today + 'T00:00:00').getDay();
      return dayOfWeek >= 1 && dayOfWeek <= 5; // 월요일(1) ~ 금요일(5)
    
    case 'weekends':
      // 토, 일 체크
      const dayOfWeekWeekends = new Date(today + 'T00:00:00').getDay();
      return dayOfWeekWeekends === 0 || dayOfWeekWeekends === 6; // 일요일(0) 또는 토요일(6)
    
    case 'weekly':
      // 특정 요일 체크
      const targetDay = repeat_config.day_of_week; // 0=일요일, 1=월요일, ...
      return new Date(today + 'T00:00:00').getDay() === targetDay;
    
    case 'custom_weekly':
      // 여러 요일 선택 체크 (NEW!)
      const daysOfWeek = repeat_config.days_of_week || []; // [1,3,5] 형식
      if (!Array.isArray(daysOfWeek) || daysOfWeek.length === 0) return false;
      const currentDay = new Date(today + 'T00:00:00').getDay();
      return daysOfWeek.includes(currentDay);
    
    case 'monthly':
      // 특정 날짜 체크
      const targetDate = repeat_config.day_of_month;
      return new Date(today + 'T00:00:00').getDate() === targetDate;
    
    default:
      return false;
  }
}

// 날짜 범위 내의 모든 날짜를 순회하는 함수
function* iterateDates(startDate, endDate) {
  const start = new Date(startDate + 'T00:00:00');
  const end = new Date(endDate + 'T00:00:00');
  const current = new Date(start);
  
  while (current <= end) {
    const year = current.getFullYear();
    const month = String(current.getMonth() + 1).padStart(2, '0');
    const day = String(current.getDate()).padStart(2, '0');
    yield `${year}-${month}-${day}`;
    current.setDate(current.getDate() + 1);
  }
}

async function registerRecurringTaskToTodos(taskId, profile) {
  // 동시 실행 방지
  if (registeringRecurringTasks) {
    console.log('이미 등록 중입니다. 잠시 후 다시 시도해주세요.');
    return;
  }
  
  registeringRecurringTasks = true;
  
  try {
    // 반복업무 정보 조회
    const { data: recurringTask, error: taskError } = await supabase
      .from('recurring_tasks')
      .select('*')
      .eq('id', taskId)
      .single();

    if (taskError) throw taskError;

    // 시작일과 종료일 설정
    const startDate = recurringTask.start_date;
    let endDate;
    if (recurringTask.end_date) {
      endDate = recurringTask.end_date;
    } else {
      // 종료일이 없으면 시작일 기준 3개월 후까지
      const start = new Date(startDate + 'T00:00:00');
      const threeMonthsLater = new Date(start);
      threeMonthsLater.setMonth(threeMonthsLater.getMonth() + 3);
      const year = threeMonthsLater.getFullYear();
      const month = String(threeMonthsLater.getMonth() + 1).padStart(2, '0');
      const day = String(threeMonthsLater.getDate()).padStart(2, '0');
      endDate = `${year}-${month}-${day}`;
    }

    // 시작일부터 종료일까지 모든 날짜를 순회하며 할일 생성
    const todosToInsert = [];
    const datesToCheck = [];
    
    // 먼저 모든 날짜를 수집
    for (const date of iterateDates(startDate, endDate)) {
      // 해당 날짜에 할일을 생성해야 하는지 확인
      if (!shouldCreateTodoToday(recurringTask, date)) {
        continue; // 해당 날짜는 스킵
      }
      datesToCheck.push(date);
    }
    
    if (datesToCheck.length === 0) {
      toast('등록할 할일이 없습니다. 해당 날짜가 없습니다.');
      return;
    }
    
    // 이미 등록된 할일 조회 (중복 체크용) - 한 번에 조회
    const { data: existingTodos, error: existingError } = await supabase
      .from('todos')
      .select('date')
      .eq('recurring_task_id', taskId)
      .in('date', datesToCheck)
      .is('deleted_at', null);

    if (existingError) throw existingError;

    const existingDates = new Set(existingTodos?.map(t => t.date) || []);

    // 중복되지 않는 날짜만 등록할 목록에 추가
    for (const date of datesToCheck) {
      // 이미 등록된 할일인지 확인
      if (existingDates.has(date)) {
        continue; // 이미 등록되어 있으면 스킵
      }

      // 등록할 할일 목록에 추가
      todosToInsert.push({
        user_id: profile.id,
        date: date,
        category: recurringTask.category,
        title: recurringTask.title,
        recurring_task_id: taskId,
        is_done: false
      });
    }

    if (todosToInsert.length === 0) {
      toast('등록할 할일이 없습니다. 모든 날짜에 이미 등록되어 있거나 해당 날짜가 없습니다.');
      return;
    }

    // todos에 일괄 등록
    const { error: insertError } = await supabase
      .from('todos')
      .insert(todosToInsert);

    if (insertError) throw insertError;

    toast(`${todosToInsert.length}개의 할일이 등록되었습니다.`);
    await loadRecurringTasks(profile);
  } catch (error) {
    console.error('Error registering recurring task:', error);
    toast('할일 등록 중 오류가 발생했습니다.');
  } finally {
    // 플래그 해제
    registeringRecurringTasks = false;
  }
}

