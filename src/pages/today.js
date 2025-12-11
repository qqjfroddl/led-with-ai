// 오늘 페이지 (루틴 + 할일)
import { supabase } from '../config/supabase.js';
import { getCurrentProfile } from '../utils/auth.js';
import { getSelectedDate } from '../state/dateState.js';
import { getToday } from '../utils/date.js';

export async function renderToday() {
  const profile = await getCurrentProfile();
  if (!profile) {
    return '<div class="card"><p>로그인이 필요합니다.</p></div>';
  }

  const timezone = profile.timezone || 'Asia/Seoul';
  const selectedDate = getSelectedDate(timezone);
  const today = getToday(timezone);

  const html = `
    <!-- 오늘 루틴 -->
    <div id="today-routines-section" class="card" style="background: linear-gradient(135deg, #e0f7f4 0%, #f0fdf4 100%); border: 2px solid #14b8a6; border-radius: 12px; box-shadow: 0 8px 24px rgba(20, 184, 166, 0.15); margin-bottom: 1.5rem;">
      <div class="card-header" style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid rgba(20, 184, 166, 0.2); padding-bottom: 1rem; margin-bottom: 1.25rem;">
        <div style="display: flex; align-items: center; gap: 0.75rem;">
          <div style="width: 40px; height: 40px; background: linear-gradient(135deg, #14b8a6 0%, #10b981 100%); border-radius: 12px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(20, 184, 166, 0.3);">
            <i data-lucide="target" style="width: 24px; height: 24px; color: white; stroke-width: 2.5;"></i>
          </div>
          <div>
            <div class="card-title" style="color: #0f766e; font-size: 1.5rem; margin: 0;">오늘 루틴</div>
          </div>
          <button id="toggle-routines" class="btn-icon" style="background: transparent; border: none; padding: 0.25rem; cursor: pointer;">
            <i data-lucide="chevron-down" style="width: 20px; height: 20px; color: #0f766e;"></i>
          </button>
        </div>
        <div id="routines-progress" style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.9rem; color: #0f766e; font-weight: 600;">
          <span>✓ 0 / 0</span>
          <div style="width: 60px; height: 8px; background: rgba(20, 184, 166, 0.2); border-radius: 4px; overflow: hidden;">
            <div style="width: 0%; height: 100%; background: linear-gradient(90deg, #14b8a6, #10b981); transition: width 0.3s;"></div>
          </div>
          <span>0%</span>
        </div>
      </div>
      <div id="routines-content" style="display: block;">
        <div style="display: grid; grid-template-columns: 1fr auto 1fr; gap: 1rem; align-items: start;">
          <!-- 모닝루틴 -->
          <div id="morning-routines">
            <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1rem;">
              <i data-lucide="sunrise" style="width: 20px; height: 20px; color: #f59e0b;"></i>
              <h4 style="color: #0f766e; font-weight: 600; margin: 0;">모닝루틴</h4>
              <span id="morning-progress" style="font-size: 0.85rem; color: #6b7280;">☀ 0 / 0</span>
            </div>
            <div id="morning-routines-list" style="display: flex; flex-direction: column; gap: 0.5rem;"></div>
            <div id="morning-empty" style="color: #9ca3af; font-size: 0.9rem; padding: 1rem 0; text-align: center; display: none;">
              오늘 수행할 모닝루틴이 없습니다
            </div>
          </div>
          
          <!-- 구분선 -->
          <div style="width: 2px; height: 100%; background: linear-gradient(180deg, transparent, #14b8a6, transparent); min-height: 100px;"></div>
          
          <!-- 나이트루틴 -->
          <div id="night-routines">
            <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1rem;">
              <i data-lucide="moon" style="width: 20px; height: 20px; color: #6366f1;"></i>
              <h4 style="color: #0f766e; font-weight: 600; margin: 0;">나이트루틴</h4>
              <span id="night-progress" style="font-size: 0.85rem; color: #6b7280;">🌙 0 / 0</span>
            </div>
            <div id="night-routines-list" style="display: flex; flex-direction: column; gap: 0.5rem;"></div>
            <div id="night-empty" style="color: #9ca3af; font-size: 0.9rem; padding: 1rem 0; text-align: center; display: none;">
              오늘 수행할 나이트루틴이 없습니다
            </div>
          </div>
        </div>
        <div id="routines-no-data" style="text-align: center; padding: 2rem; color: #9ca3af; display: none;">
          <p>오늘 수행할 루틴이 없습니다.</p>
          <a href="#/goals" style="color: #14b8a6; text-decoration: underline;">목표 탭에서 루틴을 등록하세요</a>
        </div>
      </div>
    </div>

    <!-- 오늘 할일 -->
    <div id="today-todos-section" class="card" style="background: linear-gradient(135deg, #eef2ff 0%, #f5f3ff 100%); border: 2px solid #6366f1; border-radius: 12px; box-shadow: 0 8px 24px rgba(99, 102, 241, 0.15);">
      <div class="card-header" style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid rgba(99, 102, 241, 0.2); padding-bottom: 1rem; margin-bottom: 1.25rem;">
        <div style="display: flex; align-items: center; gap: 0.75rem;">
          <div style="width: 40px; height: 40px; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); border-radius: 12px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);">
            <i data-lucide="list-checks" style="width: 24px; height: 24px; color: white; stroke-width: 2.5;"></i>
          </div>
          <div>
            <div class="card-title" style="color: #4f46e5; font-size: 1.5rem; margin: 0;">오늘 할일</div>
          </div>
          <button id="toggle-todos" class="btn-icon" style="background: transparent; border: none; padding: 0.25rem; cursor: pointer;">
            <i data-lucide="chevron-down" style="width: 20px; height: 20px; color: #4f46e5;"></i>
          </button>
        </div>
        <div style="display: flex; gap: 0.75rem; align-items: center;">
          <div id="todo-filter-tabs" style="display: none;">
            <button class="todo-filter-tab" data-filter="today" style="padding: 0.5rem 1rem; font-size: 0.9rem; border-radius: 8px; border: 2px solid #6366f1; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; font-weight: 600; cursor: pointer;">오늘</button>
            <button class="todo-filter-tab" data-filter="future" style="padding: 0.5rem 1rem; font-size: 0.9rem; border-radius: 8px; border: 2px solid #e5e7eb; background: #f9fafb; color: #6b7280; font-weight: 600; cursor: pointer;">미래</button>
            <button class="todo-filter-tab" data-filter="past" style="padding: 0.5rem 1rem; font-size: 0.9rem; border-radius: 8px; border: 2px solid #e5e7eb; background: #f9fafb; color: #6b7280; font-weight: 600; cursor: pointer;">지난</button>
          </div>
          <div id="category-tabs" style="display: flex; gap: 0.5rem;">
            <button class="category-tab" data-category="work">Work</button>
            <button class="category-tab" data-category="job">Job</button>
            <button class="category-tab" data-category="self_dev">Growth</button>
            <button class="category-tab" data-category="personal">Personal</button>
          </div>
        </div>
      </div>
      <div id="todos-content" style="display: block;">
        <div id="todo-input-section" style="margin-bottom: 1.5rem; display: flex; gap: 0.75rem; align-items: center;">
          <input type="text" id="todo-input" placeholder="복잡하고 어려운 일을 입력하세요..." style="flex: 1; padding: 0.75rem; border: 2px solid #6366f1; border-radius: 8px; font-size: 1rem;">
          <button id="add-todo-btn" class="btn" style="padding: 0.75rem 1.25rem; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; border: none; white-space: nowrap; flex-shrink: 0;">+ 추가</button>
        </div>

        <!-- Work 카테고리 섹션 -->
        <div id="category-work-section" class="category-section" style="margin-bottom: 1.5rem; background: #fff7e6; border: 2px solid #f5d38f; border-radius: 12px; padding: 1rem; box-shadow: 0 8px 24px rgba(251, 146, 60, 0.15);">
          <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1rem;">
            <i data-lucide="briefcase" style="width: 20px; height: 20px; color: #fb923c;"></i>
            <h4 style="color: #fb923c; font-weight: 600; margin: 0; font-size: 1.1rem;">Work</h4>
          </div>
          <div id="todos-work-list" style="display: flex; flex-direction: column; gap: 0.75rem;"></div>
          <div id="todos-work-empty" style="text-align: center; padding: 1rem; color: #9ca3af; font-size: 0.9rem; display: none;">
            등록된 할일이 없습니다.
          </div>
        </div>

        <!-- Job 카테고리 섹션 -->
        <div id="category-job-section" class="category-section" style="margin-bottom: 1.5rem; background: #e7f8ff; border: 2px solid #b5e6ff; border-radius: 12px; padding: 1rem; box-shadow: 0 8px 24px rgba(34, 211, 238, 0.15);">
          <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1rem;">
            <i data-lucide="clipboard-list" style="width: 20px; height: 20px; color: #22d3ee;"></i>
            <h4 style="color: #22d3ee; font-weight: 600; margin: 0; font-size: 1.1rem;">Job</h4>
          </div>
          <div id="todos-job-list" style="display: flex; flex-direction: column; gap: 0.75rem;"></div>
          <div id="todos-job-empty" style="text-align: center; padding: 1rem; color: #9ca3af; font-size: 0.9rem; display: none;">
            등록된 할일이 없습니다.
          </div>
        </div>

        <!-- Growth 카테고리 섹션 -->
        <div id="category-self_dev-section" class="category-section" style="margin-bottom: 1.5rem; background: #f4e9ff; border: 2px solid #d8c7ff; border-radius: 12px; padding: 1rem; box-shadow: 0 8px 24px rgba(167, 139, 250, 0.15);">
          <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1rem;">
            <i data-lucide="book-open" style="width: 20px; height: 20px; color: #a78bfa;"></i>
            <h4 style="color: #a78bfa; font-weight: 600; margin: 0; font-size: 1.1rem;">Growth</h4>
          </div>
          <div id="todos-self_dev-list" style="display: flex; flex-direction: column; gap: 0.75rem;"></div>
          <div id="todos-self_dev-empty" style="text-align: center; padding: 1rem; color: #9ca3af; font-size: 0.9rem; display: none;">
            등록된 할일이 없습니다.
          </div>
        </div>

        <!-- Personal 카테고리 섹션 -->
        <div id="category-personal-section" class="category-section" style="margin-bottom: 1.5rem; background: #ffe9f0; border: 2px solid #f8c7d6; border-radius: 12px; padding: 1rem; box-shadow: 0 8px 24px rgba(244, 114, 182, 0.15);">
          <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1rem;">
            <i data-lucide="home" style="width: 20px; height: 20px; color: #f472b6;"></i>
            <h4 style="color: #f472b6; font-weight: 600; margin: 0; font-size: 1.1rem;">Personal</h4>
          </div>
          <div id="todos-personal-list" style="display: flex; flex-direction: column; gap: 0.75rem;"></div>
          <div id="todos-personal-empty" style="text-align: center; padding: 1rem; color: #9ca3af; font-size: 0.9rem; display: none;">
            등록된 할일이 없습니다.
          </div>
        </div>
      </div>
    </div>

    <!-- 하루 성찰 -->
    <div id="today-reflection-section" class="card" style="background: linear-gradient(135deg, #f3e8ff 0%, #fce7f3 100%); border: 2px solid #a78bfa; box-shadow: 0 8px 24px rgba(167, 139, 250, 0.15); margin-top: 1.5rem;">
      <div class="card-header" style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid rgba(167, 139, 250, 0.2); padding-bottom: 1rem; margin-bottom: 1.25rem;">
        <div style="display: flex; align-items: center; gap: 0.75rem;">
          <div style="width: 40px; height: 40px; background: linear-gradient(135deg, #a78bfa 0%, #c084fc 100%); border-radius: 12px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(167, 139, 250, 0.3);">
            <i data-lucide="pen-square" style="width: 24px; height: 24px; color: white; stroke-width: 2.5;"></i>
          </div>
          <div>
            <div class="card-title" style="color: #7c3aed; font-size: 1.5rem; margin: 0;">하루 성찰</div>
          </div>
          <button id="toggle-reflection" class="btn-icon" style="background: transparent; border: none; padding: 0.25rem; cursor: pointer;">
            <i data-lucide="chevron-down" style="width: 20px; height: 20px; color: #7c3aed;"></i>
          </button>
        </div>
      </div>
      <div id="reflection-content" style="display: block;">
        <div id="reflection-button-container" style="text-align: center; margin-bottom: 1rem;">
          <button id="open-reflection-form" class="btn" style="background: linear-gradient(135deg, #a78bfa 0%, #c084fc 100%); color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 12px; box-shadow: 0 4px 12px rgba(167, 139, 250, 0.3); font-size: 1rem; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 0.5rem;">
            <i data-lucide="pen-square" style="width: 20px; height: 20px;"></i>
            하루 성찰 작성하기
          </button>
        </div>
        <div id="reflection-form-container" style="display: none;">
          <div style="display: flex; flex-direction: column; gap: 1.25rem;">
            <!-- 감사한 일 -->
            <div>
              <label style="display: flex; align-items: center; gap: 0.5rem; color: #7c3aed; font-weight: 600; margin-bottom: 0.5rem; font-size: 1rem;">
                <i data-lucide="heart" style="width: 18px; height: 18px; color: #a78bfa;"></i>
                감사한 일
              </label>
              <textarea id="reflection-grateful" placeholder="오늘 감사했던 일을 기록해보세요..." style="width: 100%; min-height: 100px; padding: 0.75rem; border: 2px solid #c084fc; border-radius: 8px; font-size: 1rem; font-family: inherit; resize: vertical; background: white;"></textarea>
            </div>
            
            <!-- 잘한 일 -->
            <div>
              <label style="display: flex; align-items: center; gap: 0.5rem; color: #7c3aed; font-weight: 600; margin-bottom: 0.5rem; font-size: 1rem;">
                <i data-lucide="star" style="width: 18px; height: 18px; color: #a78bfa;"></i>
                잘한 일
              </label>
              <textarea id="reflection-well-done" placeholder="오늘 잘한 일을 기록해보세요..." style="width: 100%; min-height: 100px; padding: 0.75rem; border: 2px solid #c084fc; border-radius: 8px; font-size: 1rem; font-family: inherit; resize: vertical; background: white;"></textarea>
            </div>
            
            <!-- 아쉬운 일 -->
            <div>
              <label style="display: flex; align-items: center; gap: 0.5rem; color: #7c3aed; font-weight: 600; margin-bottom: 0.5rem; font-size: 1rem;">
                <i data-lucide="alert-circle" style="width: 18px; height: 18px; color: #a78bfa;"></i>
                아쉬운 일
              </label>
              <textarea id="reflection-regret" placeholder="오늘 아쉬웠던 일을 기록해보세요..." style="width: 100%; min-height: 100px; padding: 0.75rem; border: 2px solid #c084fc; border-radius: 8px; font-size: 1rem; font-family: inherit; resize: vertical; background: white;"></textarea>
            </div>
            
            <!-- 내일의 다짐 -->
            <div>
              <label style="display: flex; align-items: center; gap: 0.5rem; color: #7c3aed; font-weight: 600; margin-bottom: 0.5rem; font-size: 1rem;">
                <i data-lucide="target" style="width: 18px; height: 18px; color: #a78bfa;"></i>
                내일의 다짐
              </label>
              <textarea id="reflection-tomorrow-promise" placeholder="내일을 위한 다짐을 기록해보세요..." style="width: 100%; min-height: 100px; padding: 0.75rem; border: 2px solid #c084fc; border-radius: 8px; font-size: 1rem; font-family: inherit; resize: vertical; background: white;"></textarea>
            </div>
            
            <!-- 저장 버튼 -->
            <div style="text-align: center; margin-top: 0.5rem;">
              <button id="save-reflection-btn" class="btn" style="background: linear-gradient(135deg, #a78bfa 0%, #c084fc 100%); color: white; border: none; padding: 0.75rem 2rem; border-radius: 12px; box-shadow: 0 4px 12px rgba(167, 139, 250, 0.3); font-size: 1rem; font-weight: 600; cursor: pointer;">
                성찰 저장하기
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Carry-over 모달 (미완료 할일 이월) -->
    <div id="carryover-modal" style="display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, 0.5); z-index: 1000; align-items: center; justify-content: center; flex-direction: column;">
      <div id="carryover-modal-content" style="background: white; border-radius: 12px; padding: 2rem; max-width: 600px; width: 90%; max-height: 80vh; overflow-y: auto; box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);" onclick="event.stopPropagation();">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
          <h2 style="margin: 0; color: #1f2937; font-size: 1.5rem; font-weight: 700;">미완료 할일 이월</h2>
          <button id="carryover-modal-close" style="background: transparent; border: none; color: #6b7280; cursor: pointer; padding: 0.5rem; border-radius: 8px; transition: background 0.2s;" onmouseover="this.style.background='#f3f4f6'" onmouseout="this.style.background='transparent'">
            <i data-lucide="x" style="width: 24px; height: 24px;"></i>
          </button>
        </div>
        <p style="color: #6b7280; margin-bottom: 1.5rem; line-height: 1.6;">
          지난 날짜에 미완료된 할일이 있습니다. 오늘로 이어가거나 포기할 수 있습니다.
        </p>
        <div id="carryover-todos-list" style="display: flex; flex-direction: column; gap: 0.75rem; margin-bottom: 1.5rem;">
          <!-- 동적으로 채워짐 -->
        </div>
        <div style="display: flex; gap: 0.75rem; justify-content: space-between; align-items: center;">
          <button id="carryover-carry-all-btn" style="padding: 0.75rem 1.5rem; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; transition: transform 0.2s;" onmouseover="this.style.transform='translateY(-1px)'" onmouseout="this.style.transform='translateY(0)'">
            모두 이어가기
          </button>
          <div style="display: flex; gap: 0.75rem;">
            <button id="carryover-later-btn" style="padding: 0.75rem 1.5rem; background: #f3f4f6; color: #1f2937; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; transition: background 0.2s;" onmouseover="this.style.background='#e5e7eb'" onmouseout="this.style.background='#f3f4f6'">
              나중에
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
      todoEventsBound = false;
      
      // 루틴과 할일 로드 및 이벤트 바인딩
      await loadRoutines(selectedDate, profile);
      await loadTodos(selectedDate, profile, timezone);
      await loadReflection(selectedDate, profile);
      setupEventHandlers(selectedDate, profile, timezone);
      
      // Carry-over 모달 체크 (오늘 날짜일 때만)
      console.log('[Carryover] Checking modal...', { selectedDate, today, match: selectedDate === today });
      if (selectedDate === today) {
        // ⭐ 중요: 할일이 실제로 있는지 먼저 확인
        const todos = await fetchCarryoverTodos(profile, timezone);
        console.log('[Carryover] Found carryover todos:', todos.length);
        
        if (todos.length > 0) {
          // 할일이 있으면 localStorage 마킹 여부와 관계없이 모달 표시
          const shouldShow = shouldShowCarryoverModal(timezone);
          console.log('[Carryover] shouldShowCarryoverModal:', shouldShow);
          if (shouldShow) {
            console.log('[Carryover] Calling showCarryoverModal...');
            await showCarryoverModal(profile, timezone);
          } else {
            // localStorage에 마킹이 되어 있지만 할일이 있으면 강제로 표시
            console.log('[Carryover] Modal marked as shown but todos exist, showing anyway');
            // localStorage 마킹 제거 (할일이 있으므로 다시 표시)
            const today = getToday(timezone);
            const key = `carryover_shown_${today}`;
            localStorage.removeItem(key);
            await showCarryoverModal(profile, timezone);
          }
        } else {
          console.log('[Carryover] No carryover todos found');
        }
      } else {
        console.log('[Carryover] Not today, skipping modal check');
      }
    }
  };
}

async function loadRoutines(date, profile) {
  try {
    // 활성 루틴 조회
    const { data: routines, error } = await supabase
      .from('routines')
      .select('*')
      .eq('user_id', profile.id)
      .eq('is_active', true)
      .is('deleted_at', null);

    if (error) throw error;

    // 오늘 날짜에 해당하는 루틴 필터링
    const today = new Date(date);
    const dayOfWeek = today.getDay(); // 0=일요일, 1=월요일...
    const adjustedDay = dayOfWeek === 0 ? 7 : dayOfWeek; // 일요일을 7로 변환

    const todayRoutines = routines.filter(routine => {
      const schedule = routine.schedule;
      if (!schedule) return false;

      if (schedule.type === 'daily') return true;
      if (schedule.type === 'weekly' && schedule.days?.includes(adjustedDay)) return true;
      if (schedule.type === 'monthly') {
        const monthStart = schedule.month;
        const currentMonth = date.substring(0, 7) + '-01';
        return monthStart === currentMonth;
      }
      return false;
    });

    // 루틴 로그 조회
    const { data: logs } = await supabase
      .from('routine_logs')
      .select('*')
      .eq('user_id', profile.id)
      .eq('date', date)
      .eq('checked', true);

    const checkedRoutineIds = new Set(logs?.map(log => log.routine_id) || []);

    // 모닝/나이트 분리
    const morningRoutines = todayRoutines.filter(r => r.schedule?.category === 'morning');
    const nightRoutines = todayRoutines.filter(r => r.schedule?.category === 'night');

    // 렌더링
    renderRoutines(morningRoutines, nightRoutines, checkedRoutineIds, date, profile);
  } catch (error) {
    console.error('Error loading routines:', error);
  }
}

function renderRoutines(morningRoutines, nightRoutines, checkedRoutineIds, date, profile) {
  const morningList = document.getElementById('morning-routines-list');
  const nightList = document.getElementById('night-routines-list');
  const morningEmpty = document.getElementById('morning-empty');
  const nightEmpty = document.getElementById('night-empty');
  const noData = document.getElementById('routines-no-data');

  // 모닝루틴 렌더링
  if (morningRoutines.length === 0) {
    morningList.style.display = 'none';
    morningEmpty.style.display = 'block';
  } else {
    morningList.style.display = 'flex';
    morningEmpty.style.display = 'none';
    morningList.innerHTML = morningRoutines.map(routine => {
      const isChecked = checkedRoutineIds.has(routine.id);
      return `
        <div class="routine-item" data-routine-id="${routine.id}" style="background: white; border-radius: 8px; padding: 0.75rem; display: flex; align-items: center; gap: 0.75rem; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
          <input type="checkbox" ${isChecked ? 'checked' : ''} style="width: 20px; height: 20px; cursor: pointer;">
          <span style="flex: 1; ${isChecked ? 'text-decoration: line-through; color: #9ca3af;' : ''}">${routine.title}</span>
        </div>
      `;
    }).join('');
  }

  // 나이트루틴 렌더링
  if (nightRoutines.length === 0) {
    nightList.style.display = 'none';
    nightEmpty.style.display = 'block';
  } else {
    nightList.style.display = 'flex';
    nightEmpty.style.display = 'none';
    nightList.innerHTML = nightRoutines.map(routine => {
      const isChecked = checkedRoutineIds.has(routine.id);
      return `
        <div class="routine-item" data-routine-id="${routine.id}" style="background: white; border-radius: 8px; padding: 0.75rem; display: flex; align-items: center; gap: 0.75rem; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
          <input type="checkbox" ${isChecked ? 'checked' : ''} style="width: 20px; height: 20px; cursor: pointer;">
          <span style="flex: 1; ${isChecked ? 'text-decoration: line-through; color: #9ca3af;' : ''}">${routine.title}</span>
        </div>
      `;
    }).join('');
  }

  // 전체 데이터 없음 처리
  if (morningRoutines.length === 0 && nightRoutines.length === 0) {
    document.getElementById('routines-content').style.display = 'none';
    noData.style.display = 'block';
  } else {
    document.getElementById('routines-content').style.display = 'block';
    noData.style.display = 'none';
  }

  // 진행률 업데이트
  const totalRoutines = morningRoutines.length + nightRoutines.length;
  const checkedCount = checkedRoutineIds.size;
  const progress = totalRoutines > 0 ? (checkedCount / totalRoutines * 100).toFixed(0) : 0;

  document.getElementById('routines-progress').innerHTML = `
    <span>✓ ${checkedCount} / ${totalRoutines}</span>
    <div style="width: 60px; height: 8px; background: rgba(20, 184, 166, 0.2); border-radius: 4px; overflow: hidden;">
      <div style="width: ${progress}%; height: 100%; background: linear-gradient(90deg, #14b8a6, #10b981); transition: width 0.3s;"></div>
    </div>
    <span>${progress}%</span>
  `;

  const morningChecked = morningRoutines.filter(r => checkedRoutineIds.has(r.id)).length;
  const nightChecked = nightRoutines.filter(r => checkedRoutineIds.has(r.id)).length;

  document.getElementById('morning-progress').textContent = `☀ ${morningChecked} / ${morningRoutines.length}`;
  document.getElementById('night-progress').textContent = `🌙 ${nightChecked} / ${nightRoutines.length}`;

  // 체크박스 이벤트 바인딩
  document.querySelectorAll('.routine-item input[type="checkbox"]').forEach(checkbox => {
    checkbox.addEventListener('change', async (e) => {
      const routineId = e.target.closest('.routine-item').dataset.routineId;
      const checked = e.target.checked;
      await toggleRoutineCheck(routineId, date, profile, checked);
      await loadRoutines(date, profile); // 재로드
    });
  });
}

async function toggleRoutineCheck(routineId, date, profile, checked) {
  try {
    const { error } = await supabase
      .from('routine_logs')
      .upsert({
        user_id: profile.id,
        routine_id: routineId,
        date: date,
        checked: checked
      }, {
        onConflict: 'user_id,routine_id,date'
      });

    if (error) throw error;
  } catch (error) {
    console.error('Error toggling routine check:', error);
    alert('루틴 체크 중 오류가 발생했습니다.');
  }
}

let todos = []; // 전역 변수로 todos 저장 (순서 변경 함수에서 사용)
let currentFilter = 'today'; // 현재 필터 상태 (today/future/past)
let addingTodo = false; // 중복 방지 플래그

async function loadTodos(date, profile, timezone = 'Asia/Seoul') {
  try {
    const today = getToday(timezone);
    let query = supabase
      .from('todos')
      .select('*')
      .eq('user_id', profile.id)
      .is('deleted_at', null);

    // 필터에 따라 날짜 조건 추가
    if (currentFilter === 'today') {
      query = query.eq('date', date);
    } else if (currentFilter === 'future') {
      query = query.gt('date', date);
    } else if (currentFilter === 'past') {
      query = query.lt('date', date);
    }

    const { data, error } = await query
      .order('category', { ascending: true })
      .order('is_done', { ascending: true })
      .order('display_order', { ascending: true, nullsFirst: false })
      .order('pinned', { ascending: false })
      .order('due_date', { ascending: true, nullsFirst: false })
      .order('priority', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: true });

    if (error) throw error;

    todos = data || [];
    renderTodos(todos, date, profile, timezone);
    
    // DOM이 렌더링된 후 이벤트 바인딩 (삭제/수정 후 재렌더링 시에도 이벤트가 바인딩되도록)
    setTimeout(() => {
      bindTodoEvents(date, profile, timezone);
    }, 50);
  } catch (error) {
    console.error('Error loading todos:', error);
  }
}

let editingTodoId = null;
let editingTodoValue = '';

function renderTodos(todosList, date, profile, timezone) {
  const today = getToday(timezone);
  const actualToday = today;
  const isPastDate = date < actualToday;

  // 카테고리별로 그룹화
  const categories = {
    work: todosList.filter(todo => todo.category === 'work'),
    job: todosList.filter(todo => todo.category === 'job'),
    self_dev: todosList.filter(todo => todo.category === 'self_dev'),
    personal: todosList.filter(todo => todo.category === 'personal')
  };

  // 각 카테고리별로 렌더링
  Object.keys(categories).forEach(category => {
    const categoryTodos = categories[category];
    const listEl = document.getElementById(`todos-${category === 'self_dev' ? 'self_dev' : category}-list`);
    const emptyEl = document.getElementById(`todos-${category === 'self_dev' ? 'self_dev' : category}-empty`);
    const sectionEl = document.getElementById(`category-${category === 'self_dev' ? 'self_dev' : category}-section`);

    if (!listEl || !emptyEl || !sectionEl) return;

    if (categoryTodos.length === 0) {
      listEl.style.display = 'none';
      emptyEl.style.display = 'block';
      sectionEl.style.display = 'none'; // 할일이 없으면 섹션 숨김
    } else {
      listEl.style.display = 'flex';
      emptyEl.style.display = 'none';
      sectionEl.style.display = 'block';
      listEl.innerHTML = categoryTodos.map(todo => {
      const isProcessed = todo.carried_over_at || todo.skipped_at;
      const isExistingTodo = isPastDate && todo.date < actualToday;
      const isReadOnly = isProcessed || isExistingTodo;
      const isEditing = editingTodoId === todo.id;
      const canMove = !todo.is_done && !isReadOnly && !isEditing;

      return `
        <div class="todo-item" data-todo-id="${todo.id}" data-category="${todo.category}" style="background: ${isExistingTodo ? '#f3f4f6' : 'white'}; border-radius: 8px; padding: 0.75rem; display: flex; align-items: center; gap: 0.75rem; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
          ${canMove ? `
            <button class="move-todo-btn" data-move-up="${todo.id}" style="background: transparent; border: none; color: #6b7280; cursor: pointer; padding: 0.25rem;" title="위로 이동">
              <i data-lucide="chevron-up" style="width: 16px; height: 16px;"></i>
            </button>
            <button class="move-todo-btn" data-move-down="${todo.id}" style="background: transparent; border: none; color: #6b7280; cursor: pointer; padding: 0.25rem;" title="아래로 이동">
              <i data-lucide="chevron-down" style="width: 16px; height: 16px;"></i>
            </button>
          ` : '<div style="width: 36px;"></div>'}
          <input type="checkbox" ${todo.is_done ? 'checked' : ''} ${isReadOnly ? 'disabled' : ''} style="width: 20px; height: 20px; cursor: ${isReadOnly ? 'not-allowed' : 'pointer'}; opacity: ${isReadOnly ? 0.5 : 1};">
          ${isEditing ? `
            <input type="text" class="todo-edit-input" value="${todo.title.replace(/"/g, '&quot;')}" style="flex: 1; padding: 0.5rem; border: 2px solid #6366f1; border-radius: 4px; font-size: 1rem;">
          ` : `
            <div style="flex: 1; display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
              ${todo.pinned ? '<i data-lucide="pin" style="width: 14px; height: 14px; color: #f59e0b; flex-shrink: 0;"></i>' : ''}
              ${todo.priority ? `<span style="font-size: 0.7rem; padding: 0.15rem 0.4rem; border-radius: 4px; font-weight: 600; flex-shrink: 0; ${todo.priority === 3 ? 'background: #fee2e2; color: #991b1b;' : todo.priority === 2 ? 'background: #fef3c7; color: #92400e;' : 'background: #dbeafe; color: #1e40af;'}">P${todo.priority}</span>` : ''}
              <span class="todo-title" data-todo-title="${todo.id}" style="${todo.is_done ? 'text-decoration: line-through; color: #9ca3af;' : ''} ${!isReadOnly && !todo.is_done ? 'cursor: pointer;' : ''}">${todo.title}</span>
              ${todo.due_date ? `<span style="font-size: 0.7rem; color: #6b7280; flex-shrink: 0;">📅 ${todo.due_date}</span>` : ''}
            </div>
          `}
          ${isExistingTodo ? '<span style="font-size: 0.75rem; color: #6b7280; padding: 0.25rem 0.5rem; background: #e5e7eb; border-radius: 4px;">지난 날짜</span>' : ''}
          ${isProcessed ? (todo.carried_over_at ? '<span style="font-size: 0.75rem; color: #10b981; padding: 0.25rem 0.5rem; background: #d1fae5; border-radius: 4px;">→ 오늘로 이동됨</span>' : '<span style="font-size: 0.75rem; color: #ef4444; padding: 0.25rem 0.5rem; background: #fee2e2; border-radius: 4px;">× 포기함</span>') : ''}
          ${!isReadOnly ? `
            ${!isEditing ? `
              <button class="edit-todo-btn" data-edit-todo="${todo.id}" style="background: transparent; border: none; color: #6366f1; cursor: pointer; padding: 0.25rem;" title="수정">
                <i data-lucide="pencil" style="width: 18px; height: 18px;"></i>
              </button>
            ` : `
              <button class="save-todo-btn" data-save-todo="${todo.id}" style="background: transparent; border: none; color: #10b981; cursor: pointer; padding: 0.25rem;">
                <i data-lucide="check" style="width: 18px; height: 18px;"></i>
              </button>
              <button class="cancel-todo-btn" data-cancel-todo="${todo.id}" style="background: transparent; border: none; color: #ef4444; cursor: pointer; padding: 0.25rem;">
                <i data-lucide="x" style="width: 18px; height: 18px;"></i>
              </button>
            `}
            <button class="delete-todo-btn" data-delete-todo="${todo.id}" style="background: transparent; border: none; color: #ef4444; cursor: pointer; padding: 0.25rem;">
              <i data-lucide="trash-2" style="width: 18px; height: 18px;"></i>
            </button>
          ` : ''}
        </div>
      `;
      }).join('');
    }
  });

  // Lucide 아이콘 업데이트
  if (window.lucide?.createIcons) window.lucide.createIcons();

  // 수정 모드 입력 필드에 Enter/Escape 키 이벤트 바인딩
  // renderTodos가 호출될 때마다 새로 생성된 입력 필드에 이벤트를 바인딩해야 함
  document.querySelectorAll('.todo-edit-input').forEach(input => {
    // 기존 이벤트 리스너 제거 (중복 방지)
    const newInput = input.cloneNode(true);
    input.parentNode.replaceChild(newInput, input);
    
    // 새 이벤트 리스너 등록
    newInput.addEventListener('keydown', async (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        const todoId = newInput.closest('.todo-item')?.dataset?.todoId;
        if (todoId) {
          await saveTodoEdit(todoId, newInput.value.trim(), date, profile, timezone);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        editingTodoId = null;
        editingTodoValue = '';
        loadTodos(date, profile, timezone);
      }
    });
    
    // 포커스 및 선택 (약간의 지연을 두어 DOM이 완전히 렌더링된 후 실행)
    setTimeout(() => {
      newInput.focus();
      newInput.select();
    }, 10);
  });
}

function setupEventHandlers(date, profile, timezone) {
  // 루틴 토글
  const toggleRoutines = document.getElementById('toggle-routines');
  if (toggleRoutines) {
    toggleRoutines.addEventListener('click', () => {
      const content = document.getElementById('routines-content');
      const icon = toggleRoutines.querySelector('i');
      if (content.style.display === 'none') {
        content.style.display = 'block';
        icon.setAttribute('data-lucide', 'chevron-down');
      } else {
        content.style.display = 'none';
        icon.setAttribute('data-lucide', 'chevron-up');
      }
      if (window.lucide?.createIcons) window.lucide.createIcons();
    });
  }

  // 할일 토글
  const toggleTodos = document.getElementById('toggle-todos');
  if (toggleTodos) {
    toggleTodos.addEventListener('click', () => {
      const content = document.getElementById('todos-content');
      const icon = toggleTodos.querySelector('i');
      if (content.style.display === 'none') {
        content.style.display = 'block';
        icon.setAttribute('data-lucide', 'chevron-down');
      } else {
        content.style.display = 'none';
        icon.setAttribute('data-lucide', 'chevron-up');
      }
      if (window.lucide?.createIcons) window.lucide.createIcons();
    });
  }

  // 하루 성찰 토글
  const toggleReflection = document.getElementById('toggle-reflection');
  if (toggleReflection) {
    toggleReflection.addEventListener('click', () => {
      const content = document.getElementById('reflection-content');
      const icon = toggleReflection.querySelector('i');
      if (content.style.display === 'none') {
        content.style.display = 'block';
        icon.setAttribute('data-lucide', 'chevron-down');
      } else {
        content.style.display = 'none';
        icon.setAttribute('data-lucide', 'chevron-up');
      }
      if (window.lucide?.createIcons) window.lucide.createIcons();
    });
  }

  // 하루 성찰 폼 열기
  const openReflectionForm = document.getElementById('open-reflection-form');
  if (openReflectionForm) {
    openReflectionForm.addEventListener('click', () => {
      const buttonContainer = document.getElementById('reflection-button-container');
      const formContainer = document.getElementById('reflection-form-container');
      if (buttonContainer && formContainer) {
        buttonContainer.style.display = 'none';
        formContainer.style.display = 'block';
        localStorage.setItem('reflection-form-open', 'true');
      }
    });
  }

  // 하루 성찰 저장
  const saveReflectionBtn = document.getElementById('save-reflection-btn');
  if (saveReflectionBtn) {
    saveReflectionBtn.addEventListener('click', async () => {
      await saveReflection(date, profile);
      await loadReflection(date, profile);
    });
  }

  // 필터 탭
  document.querySelectorAll('.todo-filter-tab').forEach(tab => {
    tab.addEventListener('click', async () => {
      document.querySelectorAll('.todo-filter-tab').forEach(t => {
        t.style.background = '#f9fafb';
        t.style.color = '#6b7280';
        t.style.borderColor = '#e5e7eb';
      });
      tab.style.background = 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)';
      tab.style.color = 'white';
      tab.style.borderColor = '#6366f1';
      currentFilter = tab.dataset.filter;
      await loadTodos(date, profile, timezone);
    });
  });

  // 카테고리 탭 (선택된 카테고리만 강조 표시, 필터링 아님)
  document.querySelectorAll('.category-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.category-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const category = tab.dataset.category;
      const input = document.getElementById('todo-input');
      const placeholders = {
        work: '복잡하고 어려운 일을 입력하세요...',
        job: '간단한 할일을 입력하세요...',
        self_dev: '성장과 관련된 내용을 입력하세요...',
        personal: '개인적인 삶을 입력하세요...'
      };
      if (input) input.placeholder = placeholders[category] || placeholders.work;
      // 모든 카테고리 섹션이 표시되므로 재렌더링 불필요
    });
  });

  // 첫 번째 탭 활성화
  document.querySelector('.category-tab[data-category="work"]')?.classList.add('active');

  // 할일 추가
  const addTodoBtn = document.getElementById('add-todo-btn');
  const todoInput = document.getElementById('todo-input');
  if (addTodoBtn && todoInput) {
    // 기존 이벤트 리스너 제거 (중복 방지)
    const newAddBtn = addTodoBtn.cloneNode(true);
    addTodoBtn.parentNode.replaceChild(newAddBtn, addTodoBtn);
    const newInput = todoInput.cloneNode(true);
    todoInput.parentNode.replaceChild(newInput, todoInput);

    const addTodo = async () => {
      // 중복 실행 방지
      if (addingTodo) {
        return;
      }

      const title = newInput.value.trim();
      if (!title) {
        alert('할일을 입력해주세요.');
        return;
      }

      addingTodo = true;
      newAddBtn.disabled = true;
      newInput.disabled = true;

      const activeTab = document.querySelector('.category-tab.active');
      const category = activeTab?.dataset.category || 'work';

      try {
        const { error } = await supabase
          .from('todos')
          .insert({
            user_id: profile.id,
            date: date,
            category: category,
            title: title,
            memo: null,
            due_date: null,
            priority: null,
            pinned: false
          });

        if (error) throw error;

        newInput.value = '';
        await loadTodos(date, profile, timezone);
      } catch (error) {
        console.error('Error adding todo:', error);
        alert('할일 추가 중 오류가 발생했습니다.');
      } finally {
        addingTodo = false;
        newAddBtn.disabled = false;
        newInput.disabled = false;
        newInput.focus();
      }
    };

    newAddBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      addTodo();
    });
    
    newInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        addTodo();
      }
    });
  }

  // 할일 이벤트는 동적으로 바인딩되므로 loadTodos 후에 처리
  setTimeout(() => {
    bindTodoEvents(date, profile, timezone);
  }, 100);
}

// 이벤트 위임을 위한 전역 핸들러 (한 번만 등록)
let todoEventsBound = false;

function bindTodoEvents(date, profile, timezone) {
  const today = getToday(timezone);
  const actualToday = today;
  const isPastDate = date < actualToday;

  // 이벤트 위임: todos-content에 한 번만 이벤트 리스너 등록
  const todosContent = document.getElementById('todos-content');
  if (!todosContent || todoEventsBound) return;
  
  todoEventsBound = true;

  // 체크박스 이벤트 (이벤트 위임)
  todosContent.addEventListener('change', async (e) => {
    if (e.target.type === 'checkbox' && e.target.closest('.todo-item')) {
      const todoItem = e.target.closest('.todo-item');
      const todoId = todoItem.dataset.todoId;
      const todo = todos.find(t => t.id === todoId);
      const isExistingTodo = isPastDate && todo?.date < actualToday;
      
      if (isExistingTodo) {
        e.preventDefault();
        e.target.checked = !e.target.checked;
        return;
      }
      
      const checked = e.target.checked;
      await toggleTodoDone(todoId, checked);
      await loadTodos(date, profile, timezone);
    }
  });

  // 모든 버튼 클릭 이벤트 (이벤트 위임)
  todosContent.addEventListener('click', async (e) => {
    const target = e.target.closest('button, [data-todo-title]');
    if (!target) return;

    const todoItem = target.closest('.todo-item');
    if (!todoItem) return;

    const todoId = todoItem.dataset.todoId;
    const todo = todos.find(t => t.id === todoId);
    const isExistingTodo = isPastDate && todo?.date < actualToday;

    // 위로 이동 버튼
    if (target.hasAttribute('data-move-up')) {
      e.stopPropagation();
      await moveTodoUp(todoId, date, profile, timezone);
      return;
    }

    // 아래로 이동 버튼
    if (target.hasAttribute('data-move-down')) {
      e.stopPropagation();
      await moveTodoDown(todoId, date, profile, timezone);
      return;
    }

    // 제목 클릭 수정
    if (target.hasAttribute('data-todo-title')) {
      if (todo?.is_done || isExistingTodo || editingTodoId) return;
      editingTodoId = todoId;
      editingTodoValue = todo.title;
      loadTodos(date, profile, timezone);
      return;
    }

    // 편집 버튼
    if (target.hasAttribute('data-edit-todo')) {
      e.stopPropagation();
      if (todo?.is_done || isExistingTodo || editingTodoId) return;
      editingTodoId = todoId;
      editingTodoValue = todo.title;
      loadTodos(date, profile, timezone);
      return;
    }

    // 저장 버튼
    if (target.hasAttribute('data-save-todo')) {
      e.stopPropagation();
      const input = todoItem.querySelector('.todo-edit-input');
      if (input) {
        await saveTodoEdit(todoId, input.value.trim(), date, profile, timezone);
      }
      return;
    }

    // 취소 버튼
    if (target.hasAttribute('data-cancel-todo')) {
      e.stopPropagation();
      editingTodoId = null;
      editingTodoValue = '';
      loadTodos(date, profile, timezone);
      return;
    }

    // 삭제 버튼
    if (target.hasAttribute('data-delete-todo')) {
      e.stopPropagation();
      await deleteTodo(todoId);
      await loadTodos(date, profile, timezone);
      return;
    }
  });
}

async function toggleTodoDone(todoId, isDone) {
  try {
    const { error } = await supabase
      .from('todos')
      .update({
        is_done: isDone,
        done_at: isDone ? new Date().toISOString() : null
      })
      .eq('id', todoId);

    if (error) throw error;
  } catch (error) {
    console.error('Error toggling todo:', error);
    alert('할일 상태 변경 중 오류가 발생했습니다.');
  }
}

async function deleteTodo(todoId) {
  try {
    const { error } = await supabase
      .from('todos')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', todoId);

    if (error) throw error;
  } catch (error) {
    console.error('Error deleting todo:', error);
    alert('할일 삭제 중 오류가 발생했습니다.');
  }
}

async function saveTodoEdit(todoId, newTitle, date, profile, timezone = 'Asia/Seoul') {
  if (!newTitle.trim()) {
    alert('할일을 입력해주세요.');
    return;
  }

  try {
    const { error } = await supabase
      .from('todos')
      .update({ title: newTitle.trim() })
      .eq('id', todoId);

    if (error) throw error;

    editingTodoId = null;
    editingTodoValue = '';
    await loadTodos(date, profile, timezone);
  } catch (error) {
    console.error('Error saving todo:', error);
    alert('할일 수정 중 오류가 발생했습니다.');
  }
}

async function moveTodoUp(todoId, date, profile, timezone = 'Asia/Seoul') {
  try {
    const todo = todos.find(t => t.id === todoId);
    if (!todo || todo.is_done) return;

    // todo의 실제 category 사용 (activeTab에 의존하지 않음)
    const todoCategory = todo.category;
    
    const sameCategoryTodos = todos
      .filter(t => t.category === todoCategory && !t.is_done && t.date === date)
      .sort((a, b) => {
        // display_order로 정렬 (NULL은 마지막)
        if (a.display_order !== null && b.display_order !== null) {
          return a.display_order - b.display_order;
        }
        if (a.display_order !== null) return -1;
        if (b.display_order !== null) return 1;
        // 둘 다 NULL이면 created_at으로 정렬
        return new Date(a.created_at) - new Date(b.created_at);
      });

    const currentIndex = sameCategoryTodos.findIndex(t => t.id === todoId);
    if (currentIndex <= 0) return;

    const prevIndex = currentIndex - 1;
    
    // 인덱스 기반으로 display_order 재할당 (10 단위 간격으로 안정적 유지)
    await Promise.all([
      supabase.from('todos').update({ display_order: (prevIndex + 1) * 10 }).eq('id', todoId),
      supabase.from('todos').update({ display_order: (currentIndex + 1) * 10 }).eq('id', sameCategoryTodos[prevIndex].id)
    ]);

    await loadTodos(date, profile, timezone);
  } catch (error) {
    console.error('Error moving todo up:', error);
    alert('순서 변경 중 오류가 발생했습니다.');
  }
}

async function moveTodoDown(todoId, date, profile, timezone = 'Asia/Seoul') {
  try {
    const todo = todos.find(t => t.id === todoId);
    if (!todo || todo.is_done) return;

    // todo의 실제 category 사용 (activeTab에 의존하지 않음)
    const todoCategory = todo.category;
    
    const sameCategoryTodos = todos
      .filter(t => t.category === todoCategory && !t.is_done && t.date === date)
      .sort((a, b) => {
        // display_order로 정렬 (NULL은 마지막)
        if (a.display_order !== null && b.display_order !== null) {
          return a.display_order - b.display_order;
        }
        if (a.display_order !== null) return -1;
        if (b.display_order !== null) return 1;
        // 둘 다 NULL이면 created_at으로 정렬
        return new Date(a.created_at) - new Date(b.created_at);
      });

    const currentIndex = sameCategoryTodos.findIndex(t => t.id === todoId);
    if (currentIndex < 0 || currentIndex >= sameCategoryTodos.length - 1) return;

    const nextIndex = currentIndex + 1;
    
    // 인덱스 기반으로 display_order 재할당 (10 단위 간격으로 안정적 유지)
    await Promise.all([
      supabase.from('todos').update({ display_order: (nextIndex + 1) * 10 }).eq('id', todoId),
      supabase.from('todos').update({ display_order: (currentIndex + 1) * 10 }).eq('id', sameCategoryTodos[nextIndex].id)
    ]);

    await loadTodos(date, profile, timezone);
  } catch (error) {
    console.error('Error moving todo down:', error);
    alert('순서 변경 중 오류가 발생했습니다.');
  }
}

// 하루 성찰 관련 함수들
async function loadReflection(date, profile) {
  try {
    const { data, error } = await supabase
      .from('daily_reflections')
      .select('*')
      .eq('user_id', profile.id)
      .eq('date', date)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116은 "no rows returned" 에러
      throw error;
    }

    renderReflection(data || null);
  } catch (error) {
    console.error('Error loading reflection:', error);
  }
}

function renderReflection(reflection) {
  const gratefulEl = document.getElementById('reflection-grateful');
  const wellDoneEl = document.getElementById('reflection-well-done');
  const regretEl = document.getElementById('reflection-regret');
  const tomorrowPromiseEl = document.getElementById('reflection-tomorrow-promise');
  const buttonContainer = document.getElementById('reflection-button-container');
  const formContainer = document.getElementById('reflection-form-container');

  if (!gratefulEl || !wellDoneEl || !regretEl || !tomorrowPromiseEl) return;

  if (reflection) {
    // 데이터가 있으면 폼에 채우고 폼 표시
    gratefulEl.value = reflection.grateful || '';
    wellDoneEl.value = reflection.well_done || '';
    regretEl.value = reflection.regret || '';
    tomorrowPromiseEl.value = reflection.tomorrow_promise || '';
    
    // 폼 표시, 버튼 숨김
    buttonContainer.style.display = 'none';
    formContainer.style.display = 'block';
  } else {
    // 데이터가 없으면 폼 초기화
    gratefulEl.value = '';
    wellDoneEl.value = '';
    regretEl.value = '';
    tomorrowPromiseEl.value = '';
    
    // localStorage에서 토글 상태 확인
    const isFormOpen = localStorage.getItem('reflection-form-open') === 'true';
    if (isFormOpen) {
      buttonContainer.style.display = 'none';
      formContainer.style.display = 'block';
    } else {
      buttonContainer.style.display = 'block';
      formContainer.style.display = 'none';
    }
  }

  // Lucide 아이콘 업데이트
  if (window.lucide?.createIcons) window.lucide.createIcons();
}

// ============================================
// Carry-over (미완료 할일 이월) 관련 함수들
// ============================================

// 이월 대상 할일 조회
async function fetchCarryoverTodos(profile, timezone = 'Asia/Seoul') {
  try {
    const today = getToday(timezone);
    console.log('[Carryover] fetchCarryoverTodos - today:', today, 'user_id:', profile.id);
    
    const { data, error } = await supabase
      .from('todos')
      .select('*')
      .eq('user_id', profile.id)
      .lt('date', today)
      .eq('is_done', false)
      .is('deleted_at', null)
      .is('carried_over_at', null)
      .is('skipped_at', null)
      .order('date', { ascending: false })
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[Carryover] Error fetching carryover todos:', error);
      throw error;
    }
    
    console.log('[Carryover] Found carryover todos:', data?.length || 0, data);
    return data || [];
  } catch (error) {
    console.error('[Carryover] Error fetching carryover todos:', error);
    return [];
  }
}

// 모달 표시 여부 체크 (localStorage)
function shouldShowCarryoverModal(timezone = 'Asia/Seoul') {
  const today = getToday(timezone);
  const key = `carryover_shown_${today}`;
  const shown = localStorage.getItem(key);
  const result = shown !== 'true';
  console.log('[Carryover] shouldShowCarryoverModal:', { today, key, shown, result });
  return result;
}

// 모달 표시 마킹 (localStorage)
function markCarryoverModalShown(timezone = 'Asia/Seoul') {
  const today = getToday(timezone);
  const key = `carryover_shown_${today}`;
  localStorage.setItem(key, 'true');
}

// Carry-over 모달 표시
async function showCarryoverModal(profile, timezone = 'Asia/Seoul') {
  const modal = document.getElementById('carryover-modal');
  if (!modal) {
    console.error('[Carryover] Modal element not found!');
    return;
  }

  const todos = await fetchCarryoverTodos(profile, timezone);
  console.log('[Carryover] showCarryoverModal - todos count:', todos.length);
  
  if (todos.length === 0) {
    console.log('[Carryover] No todos to carry over, modal not shown');
    return; // 대상이 없으면 모달 표시 안 함
  }

  console.log('[Carryover] Showing modal with', todos.length, 'todos');

  // 모달 목록 렌더링
  const listEl = document.getElementById('carryover-todos-list');
  if (listEl) {
    listEl.innerHTML = todos.map(todo => {
      const categoryLabels = {
        work: 'Work',
        job: 'Job',
        self_dev: 'Growth',
        personal: 'Personal'
      };
      const categoryLabel = categoryLabels[todo.category] || todo.category;
      const dateStr = new Date(todo.date + 'T00:00:00').toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });

      return `
        <div class="carryover-todo-item" data-todo-id="${todo.id}" style="background: #f9fafb; border: 2px solid #e5e7eb; border-radius: 8px; padding: 1rem; display: flex; justify-content: space-between; align-items: center; gap: 1rem;">
          <div style="flex: 1;">
            <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
              <span style="font-size: 0.75rem; color: #6b7280; background: #e5e7eb; padding: 0.25rem 0.5rem; border-radius: 4px;">${categoryLabel}</span>
              <span style="font-size: 0.75rem; color: #6b7280;">${dateStr}</span>
            </div>
            <div style="font-weight: 500; color: #1f2937;">${todo.title}</div>
          </div>
          <div style="display: flex; gap: 0.5rem;">
            <button class="carryover-carry-btn" data-carry-todo="${todo.id}" style="padding: 0.5rem 1rem; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 0.875rem; transition: transform 0.2s;" onmouseover="this.style.transform='translateY(-1px)'" onmouseout="this.style.transform='translateY(0)'">
              이어가기
            </button>
            <button class="carryover-skip-btn" data-skip-todo="${todo.id}" style="padding: 0.5rem 1rem; background: #f3f4f6; color: #6b7280; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 0.875rem; transition: background 0.2s;" onmouseover="this.style.background='#e5e7eb'" onmouseout="this.style.background='#f3f4f6'">
              포기
            </button>
          </div>
        </div>
      `;
    }).join('');
  }

  // 모달 표시 (flex로 변경)
  modal.style.display = 'flex';
  
  // ⭐ 중요: 모달이 실제로 표시된 것을 표시 (이벤트 바인딩에서 사용)
  modal.setAttribute('data-modal-shown', 'true');
  
  // Lucide 아이콘 업데이트
  setTimeout(() => {
    if (window.lucide?.createIcons) window.lucide.createIcons();
  }, 100);

  // 이벤트 바인딩
  setupCarryoverModalEvents(profile, timezone);
}

// Carry-over 모달 이벤트 바인딩
function setupCarryoverModalEvents(profile, timezone = 'Asia/Seoul') {
  const modal = document.getElementById('carryover-modal');
  const closeBtn = document.getElementById('carryover-modal-close');
  const laterBtn = document.getElementById('carryover-later-btn');

  // 모달 닫기 함수
  const closeModal = () => {
    // ⭐ 중요: 모달이 실제로 표시된 경우에만 localStorage 마킹
    if (modal && modal.getAttribute('data-modal-shown') === 'true') {
      markCarryoverModalShown(timezone);
      modal.removeAttribute('data-modal-shown');
    }
    if (modal) modal.style.display = 'none';
    if (window.lucide?.createIcons) window.lucide.createIcons();
  };

  // 닫기 버튼
  if (closeBtn) {
    closeBtn.onclick = closeModal;
  }

  // 나중에 버튼
  if (laterBtn) {
    laterBtn.onclick = closeModal;
  }

  // 모두 이어가기 버튼
  const carryAllBtn = document.getElementById('carryover-carry-all-btn');
  if (carryAllBtn) {
    carryAllBtn.onclick = async () => {
      await carryOverAllTodos(profile, timezone);
    };
  }

  // 모달 배경 클릭 시 닫기 (내부 컨텐츠 클릭은 무시)
  if (modal) {
    // cloneNode 제거하고 직접 이벤트 등록 (이벤트 위임 사용)
    modal.onclick = (e) => {
      if (e.target === modal) {
        closeModal();
      }
    };
  }

  // 이어가기 버튼
  document.querySelectorAll('.carryover-carry-btn').forEach(btn => {
    btn.onclick = async (e) => {
      e.stopPropagation();
      const todoId = btn.getAttribute('data-carry-todo');
      await carryOverTodo(todoId, profile, timezone);
    };
  });

  // 포기 버튼
  document.querySelectorAll('.carryover-skip-btn').forEach(btn => {
    btn.onclick = async (e) => {
      e.stopPropagation();
      const todoId = btn.getAttribute('data-skip-todo');
      await skipTodo(todoId, profile, timezone);
    };
  });
}

// 할일 이어가기 (오늘로 복제 + 원본에 carried_over_at 기록)
async function carryOverTodo(todoId, profile, timezone = 'Asia/Seoul') {
  try {
    const today = getToday(timezone);
    
    // 원본 할일 조회
    const { data: originalTodo, error: fetchError } = await supabase
      .from('todos')
      .select('*')
      .eq('id', todoId)
      .single();

    if (fetchError) throw fetchError;
    if (!originalTodo) {
      alert('할일을 찾을 수 없습니다.');
      return;
    }

    // 오늘로 복제 (새 ID 생성)
    const { data: newTodo, error: insertError } = await supabase
      .from('todos')
      .insert({
        user_id: profile.id,
        date: today,
        category: originalTodo.category,
        title: originalTodo.title,
        memo: originalTodo.memo,
        due_date: originalTodo.due_date,
        priority: originalTodo.priority,
        pinned: originalTodo.pinned,
        is_done: false,
        done_at: null,
        display_order: null
      })
      .select()
      .single();

    if (insertError) throw insertError;

    // 원본에 carried_over_at 기록
    const { error: updateError } = await supabase
      .from('todos')
      .update({ carried_over_at: new Date().toISOString() })
      .eq('id', todoId);

    if (updateError) throw updateError;

    // 모달에서 해당 항목 처리 표시
    const todoItem = document.querySelector(`.carryover-todo-item[data-todo-id="${todoId}"]`);
    if (todoItem) {
      todoItem.setAttribute('data-processed', 'true');
      todoItem.style.opacity = '0.5';
      todoItem.style.pointerEvents = 'none';
      const carryBtn = todoItem.querySelector('.carryover-carry-btn');
      const skipBtn = todoItem.querySelector('.carryover-skip-btn');
      if (carryBtn) {
        carryBtn.textContent = '이어감';
        carryBtn.style.background = '#d1fae5';
        carryBtn.style.color = '#059669';
        carryBtn.disabled = true;
      }
      if (skipBtn) skipBtn.style.display = 'none';
    }

    // 오늘 할일 목록 새로고침
    await loadTodos(today, profile, timezone);

    // 남은 항목이 없으면 모달 닫기
    setTimeout(() => {
      const remainingItems = document.querySelectorAll('.carryover-todo-item:not([data-processed="true"])');
      if (remainingItems.length === 0) {
        markCarryoverModalShown(timezone);
        const modal = document.getElementById('carryover-modal');
        if (modal) modal.style.display = 'none';
      }
    }, 100);
  } catch (error) {
    console.error('Error carrying over todo:', error);
    alert('할일 이어가기 중 오류가 발생했습니다.');
  }
}

// 모든 미처리 할일 이어가기
async function carryOverAllTodos(profile, timezone = 'Asia/Seoul') {
  try {
    const today = getToday(timezone);
    
    // 모달에서 미처리 항목들 조회
    const unprocessedItems = document.querySelectorAll('.carryover-todo-item:not([data-processed="true"])');
    
    if (unprocessedItems.length === 0) {
      return;
    }

    // 모든 항목을 순차적으로 이어가기
    for (const item of unprocessedItems) {
      const todoId = item.getAttribute('data-todo-id');
      if (todoId) {
        await carryOverTodo(todoId, profile, timezone);
        // 각 항목 처리 후 약간의 지연 (DB 부하 방지)
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    // 모든 항목 처리 후 모달 닫기
    markCarryoverModalShown(timezone);
    const modal = document.getElementById('carryover-modal');
    if (modal) modal.style.display = 'none';
    
    // 오늘 할일 목록 새로고침
    await loadTodos(today, profile, timezone);
  } catch (error) {
    console.error('Error carrying over all todos:', error);
    alert('모든 할일 이어가기 중 오류가 발생했습니다.');
  }
}

// 할일 포기 (원본에 skipped_at 기록)
async function skipTodo(todoId, profile, timezone = 'Asia/Seoul') {
  try {
    // 원본에 skipped_at 기록
    const { error } = await supabase
      .from('todos')
      .update({ skipped_at: new Date().toISOString() })
      .eq('id', todoId);

    if (error) throw error;

    // 모달에서 해당 항목 처리 표시
    const todoItem = document.querySelector(`.carryover-todo-item[data-todo-id="${todoId}"]`);
    if (todoItem) {
      todoItem.setAttribute('data-processed', 'true');
      todoItem.style.opacity = '0.5';
      todoItem.style.pointerEvents = 'none';
      const carryBtn = todoItem.querySelector('.carryover-carry-btn');
      const skipBtn = todoItem.querySelector('.carryover-skip-btn');
      if (carryBtn) carryBtn.style.display = 'none';
      if (skipBtn) {
        skipBtn.textContent = '포기함';
        skipBtn.style.background = '#fee2e2';
        skipBtn.style.color = '#991b1b';
        skipBtn.disabled = true;
      }
    }

    // 남은 항목이 없으면 모달 닫기
    setTimeout(() => {
      const remainingItems = document.querySelectorAll('.carryover-todo-item:not([data-processed="true"])');
      if (remainingItems.length === 0) {
        markCarryoverModalShown(timezone);
        const modal = document.getElementById('carryover-modal');
        if (modal) modal.style.display = 'none';
      }
    }, 100);
  } catch (error) {
    console.error('Error skipping todo:', error);
    alert('할일 포기 중 오류가 발생했습니다.');
  }
}

async function saveReflection(date, profile) {
  const gratefulEl = document.getElementById('reflection-grateful');
  const wellDoneEl = document.getElementById('reflection-well-done');
  const regretEl = document.getElementById('reflection-regret');
  const tomorrowPromiseEl = document.getElementById('reflection-tomorrow-promise');

  if (!gratefulEl || !wellDoneEl || !regretEl || !tomorrowPromiseEl) return;

  const grateful = gratefulEl.value.trim();
  const wellDone = wellDoneEl.value.trim();
  const regret = regretEl.value.trim();
  const tomorrowPromise = tomorrowPromiseEl.value.trim();

  // 4개 모두 공란이면 저장 불가
  if (!grateful && !wellDone && !regret && !tomorrowPromise) {
    alert('최소 한 가지 항목은 입력해주세요.');
    return;
  }

  try {
    const { error } = await supabase
      .from('daily_reflections')
      .upsert({
        user_id: profile.id,
        date: date,
        grateful: grateful || null,
        well_done: wellDone || null,
        regret: regret || null,
        tomorrow_promise: tomorrowPromise || null
      }, {
        onConflict: 'user_id,date'
      });

    if (error) throw error;

    alert('성찰이 저장되었습니다.');
    // 저장 후 폼은 열린 상태 유지
    localStorage.setItem('reflection-form-open', 'true');
  } catch (error) {
    console.error('Error saving reflection:', error);
    alert('성찰 저장 중 오류가 발생했습니다.');
  }
}
