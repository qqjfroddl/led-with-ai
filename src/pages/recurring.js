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
    <div class="card" style="background: linear-gradient(135deg, #f0e7ff 0%, #fce7f3 100%); border: 2px solid #9b8cd9; box-shadow: 0 8px 24px rgba(155, 140, 217, 0.15);">
      <div class="card-header" style="border-bottom: 2px solid rgba(155, 140, 217, 0.2); padding-bottom: 1rem; margin-bottom: 1.25rem;">
        <div style="display: flex; align-items: center; gap: 0.75rem;">
          <div style="width: 40px; height: 40px; background: linear-gradient(135deg, #9b8cd9 0%, #8678c7 100%); border-radius: 12px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(155, 140, 217, 0.3);">
            <i data-lucide="repeat" style="width: 24px; height: 24px; color: white; stroke-width: 2.5;"></i>
          </div>
          <div style="flex: 1;">
            <div style="display: flex; align-items: center; gap: 0.75rem;">
              <div class="card-title" style="color: #6b21a8; font-size: 1.5rem; margin: 0;">반복업무</div>
              <button id="toggle-recurring" class="btn-icon" style="background: transparent; border: none; padding: 0.25rem; cursor: pointer;">
                <i data-lucide="chevron-down" style="width: 20px; height: 20px; color: #6b21a8;"></i>
              </button>
            </div>
            <p style="color: #6b7280; font-size: 1rem; margin: 0.25rem 0 0 0;">반복되는 할일을 설정하고 관리하세요</p>
          </div>
          <button id="add-recurring-btn" class="btn btn-primary" style="padding: 0.5rem 1rem; font-size: 0.9rem;">
            <i data-lucide="plus" style="width: 16px; height: 16px;"></i>
            추가
          </button>
        </div>
      </div>

      <div id="recurring-content" style="display: block;">
        <!-- 반복업무 목록 -->
        <div id="recurring-tasks-list" style="display: flex; flex-direction: column; gap: 1rem; margin-bottom: 1rem;"></div>
        
        <!-- 빈 상태 -->
        <div id="recurring-empty" style="text-align: center; padding: 3rem 1rem; color: #9ca3af; display: none;">
          <i data-lucide="repeat" style="width: 48px; height: 48px; margin: 0 auto 1rem; opacity: 0.5;"></i>
          <p style="font-size: 1.1rem; margin-bottom: 0.5rem;">등록된 반복업무가 없습니다</p>
          <p style="font-size: 0.9rem;">새 반복업무를 추가하여 시작하세요</p>
        </div>
      </div>
    </div>

    <!-- 반복업무 추가/수정 모달 -->
    <div id="recurring-modal" style="display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, 0.5); z-index: 1000; align-items: center; justify-content: center;">
      <div style="background: white; border-radius: 16px; padding: 1.5rem; width: 90%; max-width: 600px; max-height: 90vh; overflow-y: auto; box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.25rem;">
          <h3 id="recurring-modal-title" style="margin: 0; font-size: 1.25rem; font-weight: 700; color: #1f2937;">반복업무 추가</h3>
          <button id="recurring-modal-close" style="background: transparent; border: none; padding: 0.25rem; cursor: pointer; color: #9ca3af; transition: color 0.2s;">
            <i data-lucide="x" style="width: 24px; height: 24px;"></i>
          </button>
        </div>
        
        <div style="display: flex; flex-direction: column; gap: 1rem;">
          <!-- 카테고리 선택 -->
          <div>
            <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: #1f2937;">카테고리</label>
            <select id="recurring-category-input" style="width: 100%; padding: 0.75rem 1rem; border: 2px solid #e5e7eb; border-radius: 10px; font-size: 0.95rem; background: white; cursor: pointer;">
              <option value="work">Work</option>
              <option value="job">Job</option>
              <option value="self_dev">Growth</option>
              <option value="personal">Personal</option>
            </select>
          </div>

          <!-- 할일 입력 -->
          <div>
            <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: #1f2937;">할일</label>
            <input type="text" id="recurring-title-input" placeholder="반복할 할일을 입력하세요" style="width: 100%; padding: 0.75rem 1rem; border: 2px solid #e5e7eb; border-radius: 10px; font-size: 1rem; transition: border-color 0.2s; outline: none;" onfocus="this.style.borderColor='#6366f1'" onblur="this.style.borderColor='#e5e7eb'">
          </div>

          <!-- 반복 주기 선택 -->
          <div>
            <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: #1f2937;">반복 주기</label>
            <select id="recurring-repeat-type-input" style="width: 100%; padding: 0.75rem 1rem; border: 2px solid #e5e7eb; border-radius: 10px; font-size: 0.95rem; background: white; cursor: pointer;">
              <option value="weekdays">주중 매일 (월~금)</option>
              <option value="weekly">주간 (특정 요일)</option>
              <option value="monthly">월간 (특정 날짜)</option>
            </select>
          </div>

          <!-- 주간 선택 (주간 선택 시에만 표시) -->
          <div id="recurring-weekly-config" style="display: none;">
            <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: #1f2937;">요일 선택</label>
            <select id="recurring-weekly-day-input" style="width: 100%; padding: 0.75rem 1rem; border: 2px solid #e5e7eb; border-radius: 10px; font-size: 0.95rem; background: white; cursor: pointer;">
              <option value="0">일요일</option>
              <option value="1">월요일</option>
              <option value="2">화요일</option>
              <option value="3">수요일</option>
              <option value="4">목요일</option>
              <option value="5">금요일</option>
              <option value="6">토요일</option>
            </select>
          </div>

          <!-- 월간 선택 (월간 선택 시에만 표시) -->
          <div id="recurring-monthly-config" style="display: none;">
            <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: #1f2937;">날짜 선택</label>
            <input type="number" id="recurring-monthly-day-input" min="1" max="31" placeholder="1~31" style="width: 100%; padding: 0.75rem 1rem; border: 2px solid #e5e7eb; border-radius: 10px; font-size: 1rem; transition: border-color 0.2s; outline: none;" onfocus="this.style.borderColor='#6366f1'" onblur="this.style.borderColor='#e5e7eb'">
          </div>

          <!-- 시작일 -->
          <div>
            <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: #1f2937;">시작일</label>
            <input type="date" id="recurring-start-date-input" style="width: 100%; padding: 0.75rem 1rem; border: 2px solid #e5e7eb; border-radius: 10px; font-size: 1rem; transition: border-color 0.2s; outline: none;" onfocus="this.style.borderColor='#6366f1'" onblur="this.style.borderColor='#e5e7eb'">
          </div>

          <!-- 종료일 (선택) -->
          <div>
            <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: #1f2937;">
              종료일 (선택)
              <span style="font-weight: 400; font-size: 0.85rem; color: #6b7280;">(비워두면 3개월 후까지 등록)</span>
            </label>
            <input type="date" id="recurring-end-date-input" style="width: 100%; padding: 0.75rem 1rem; border: 2px solid #e5e7eb; border-radius: 10px; font-size: 1rem; transition: border-color 0.2s; outline: none;" onfocus="this.style.borderColor='#6366f1'" onblur="this.style.borderColor='#e5e7eb'">
          </div>

          <!-- 저장 버튼 -->
          <div style="display: flex; gap: 0.75rem; margin-top: 0.5rem;">
            <button id="recurring-modal-save" style="flex: 1; padding: 0.75rem 1.5rem; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; border: none; border-radius: 10px; font-size: 1rem; font-weight: 600; cursor: pointer; box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3); transition: transform 0.2s, box-shadow 0.2s;" onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 16px rgba(99, 102, 241, 0.4)'" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 12px rgba(99, 102, 241, 0.3)'">
              <i data-lucide="check" style="width: 18px; height: 18px; margin-right: 0.25rem; vertical-align: -3px;"></i>
              저장
            </button>
            <button id="recurring-modal-cancel" style="padding: 0.75rem 1.5rem; background: #f3f4f6; color: #1f2937; border: none; border-radius: 10px; font-size: 1rem; font-weight: 600; cursor: pointer;">
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

    if (tasksList) tasksList.style.display = 'flex';
    if (emptyState) emptyState.style.display = 'none';

    // 반복업무 목록 렌더링
    const tasksHtml = tasks.map(task => renderRecurringTaskCard(task)).join('');
    if (tasksList) {
      tasksList.innerHTML = tasksHtml;
    }

    if (window.lucide?.createIcons) window.lucide.createIcons();
  } catch (error) {
    console.error('Error loading recurring tasks:', error);
    alert('반복업무를 불러오는 중 오류가 발생했습니다.');
  }
}

function renderRecurringTaskCard(task) {
  const categoryLabels = {
    work: 'Work',
    job: 'Job',
    self_dev: 'Growth',
    personal: 'Personal'
  };

  const categoryColors = {
    work: { bg: '#fff7e6', border: '#f5d38f', gradient: 'linear-gradient(135deg, #F59E42 0%, #E8922E 100%)' },
    job: { bg: '#e7f8ff', border: '#b5e6ff', gradient: 'linear-gradient(135deg, #22C7DD 0%, #1AACBE 100%)' },
    self_dev: { bg: '#f4e9ff', border: '#d8c7ff', gradient: 'linear-gradient(135deg, #9B8CD9 0%, #8678C7 100%)' },
    personal: { bg: '#ffe9f0', border: '#f8c7d6', gradient: 'linear-gradient(135deg, #E66BA4 0%, #D65590 100%)' }
  };

  const colors = categoryColors[task.category] || categoryColors.work;
  const repeatTypeLabels = {
    weekdays: '주중 매일 (월~금)',
    weekly: `매주 ${getDayOfWeekLabel(task.repeat_config.day_of_week)}`,
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
    dateRange = `${task.start_date} ~ ${threeMonthsLaterStr} (3개월 후까지 등록)`;
  }

  return `
    <div class="recurring-task-card" data-task-id="${task.id}" 
         style="background: ${colors.bg}; border: 2px solid ${colors.border}; border-radius: 12px; padding: 1.25rem; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem; gap: 0.75rem; flex-wrap: wrap;">
        <div style="display: flex; align-items: center; gap: 0.5rem; flex: 1; min-width: 0; flex-wrap: wrap;">
          <span style="font-size: 0.75rem; padding: 0.125rem 0.5rem; background: ${colors.gradient}; color: white; border-radius: 999px; font-weight: 500; white-space: nowrap; flex-shrink: 0;">${categoryLabels[task.category]}</span>
          <span style="font-size: 0.75rem; color: #6b7280; white-space: nowrap; flex-shrink: 0;">${repeatLabel}</span>
          <h4 style="color: #1f2937; font-size: 1rem; font-weight: 600; margin: 0; white-space: nowrap; flex-shrink: 0;">${task.title}</h4>
          <span style="font-size: 0.85rem; color: #6b7280; white-space: nowrap; flex-shrink: 0;">${dateRange}</span>
        </div>
        <div style="display: flex; gap: 0.5rem; flex-shrink: 0;">
          <button class="delete-recurring-btn" data-task-id="${task.id}" style="background: transparent; border: none; color: #ef4444; cursor: pointer; padding: 0.25rem;" title="삭제">
            <i data-lucide="trash-2" style="width: 16px; height: 16px;"></i>
          </button>
        </div>
      </div>
      <button class="register-recurring-todos-btn" data-task-id="${task.id}" style="width: 100%; padding: 0.75rem; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; box-shadow: 0 2px 8px rgba(99, 102, 241, 0.3);">
        <i data-lucide="calendar-check" style="width: 18px; height: 18px; margin-right: 0.5rem;"></i>
        오늘 할일 등록하기
      </button>
    </div>
  `;
}

function getDayOfWeekLabel(dayOfWeek) {
  const days = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
  return days[dayOfWeek] || '알 수 없음';
}

function setupEventHandlers(profile) {
  // 토글 버튼
  const toggleBtn = document.getElementById('toggle-recurring');
  if (toggleBtn) {
    const newToggleBtn = toggleBtn.cloneNode(true);
    toggleBtn.parentNode.replaceChild(newToggleBtn, toggleBtn);
    newToggleBtn.addEventListener('click', () => {
      const content = document.getElementById('recurring-content');
      const icon = newToggleBtn.querySelector('i');
      if (content && icon) {
        if (content.style.display === 'none') {
          content.style.display = 'block';
          icon.setAttribute('data-lucide', 'chevron-down');
        } else {
          content.style.display = 'none';
          icon.setAttribute('data-lucide', 'chevron-up');
        }
        if (window.lucide?.createIcons) window.lucide.createIcons();
      }
    });
  }

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
        alert('추가 기능을 불러오는 중 오류가 발생했습니다. 페이지를 새로고침해주세요.');
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
      const monthlyConfig = document.getElementById('recurring-monthly-config');
      
      if (newInput.value === 'weekly') {
        if (weeklyConfig) weeklyConfig.style.display = 'block';
        if (monthlyConfig) monthlyConfig.style.display = 'none';
      } else if (newInput.value === 'monthly') {
        if (weeklyConfig) weeklyConfig.style.display = 'none';
        if (monthlyConfig) monthlyConfig.style.display = 'block';
      } else {
        if (weeklyConfig) weeklyConfig.style.display = 'none';
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
    
    // 설정 UI 숨기기
    const weeklyConfig = document.getElementById('recurring-weekly-config');
    const monthlyConfig = document.getElementById('recurring-monthly-config');
    if (weeklyConfig) weeklyConfig.style.display = 'none';
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
        alert('할일을 입력해주세요.');
        titleInput?.focus();
        return;
      }

      if (!startDateInput || !startDateInput.value) {
        alert('시작일을 선택해주세요.');
        startDateInput?.focus();
        return;
      }

      // 반복 설정 구성
      let repeatConfig = {};
      if (repeatTypeInput.value === 'weekly') {
        if (!weeklyDayInput || !weeklyDayInput.value) {
          alert('요일을 선택해주세요.');
          return;
        }
        repeatConfig = { day_of_week: parseInt(weeklyDayInput.value) };
      } else if (repeatTypeInput.value === 'monthly') {
        if (!monthlyDayInput || !monthlyDayInput.value || parseInt(monthlyDayInput.value) < 1 || parseInt(monthlyDayInput.value) > 31) {
          alert('날짜를 1~31 사이로 입력해주세요.');
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
        alert('반복업무 저장 중 오류가 발생했습니다.');
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
    alert('반복업무 삭제 중 오류가 발생했습니다.');
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
    case 'weekdays':
      // 월~금 체크
      const dayOfWeek = new Date(today + 'T00:00:00').getDay();
      return dayOfWeek >= 1 && dayOfWeek <= 5; // 월요일(1) ~ 금요일(5)
    
    case 'weekly':
      // 특정 요일 체크
      const targetDay = repeat_config.day_of_week; // 0=일요일, 1=월요일, ...
      return new Date(today + 'T00:00:00').getDay() === targetDay;
    
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
      alert('등록할 할일이 없습니다. 해당 날짜가 없습니다.');
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
      alert('등록할 할일이 없습니다. 모든 날짜에 이미 등록되어 있거나 해당 날짜가 없습니다.');
      return;
    }

    // todos에 일괄 등록
    const { error: insertError } = await supabase
      .from('todos')
      .insert(todosToInsert);

    if (insertError) throw insertError;

    alert(`${todosToInsert.length}개의 할일이 등록되었습니다.`);
    await loadRecurringTasks(profile);
  } catch (error) {
    console.error('Error registering recurring task:', error);
    alert('할일 등록 중 오류가 발생했습니다.');
  } finally {
    // 플래그 해제
    registeringRecurringTasks = false;
  }
}

