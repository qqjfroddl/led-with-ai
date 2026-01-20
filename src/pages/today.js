// 오늘 페이지 (루틴 + 할일)
import { supabase } from '../config/supabase.js';
import { getCurrentProfile } from '../utils/auth.js';
import { getSelectedDate, formatSelectedDate, shiftSelectedDate, resetSelectedDate, setSelectedDate } from '../state/dateState.js';
import { getToday } from '../utils/date.js';
import { router } from '../router.js';

export async function renderToday() {
  // ✅ 페이지 진입 시 필터 초기화 (다른 탭에서 돌아올 때 필터 상태 리셋)
  currentFilter = 'today';
  
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
        <div style="display: grid; grid-template-columns: 1fr auto 1fr auto 1fr; gap: 1rem; align-items: start;">
          <!-- 모닝루틴 -->
          <div id="morning-routines">
            <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1rem;">
              <i data-lucide="sunrise" style="width: 20px; height: 20px; color: #f59e0b;"></i>
              <h4 style="color: #0f766e; font-weight: 600; margin: 0;">모닝루틴</h4>
              <span id="morning-progress" style="font-size: 0.85rem; color: #6b7280;">0 / 0</span>
            </div>
            <div id="morning-routines-list" style="display: flex; flex-direction: column; gap: 0.5rem;"></div>
            <div id="morning-empty" style="color: #9ca3af; font-size: 0.9rem; padding: 1rem 0; text-align: center; display: none;">
              오늘 수행할 모닝루틴이 없습니다
            </div>
          </div>
          
          <!-- 구분선 -->
          <div style="width: 2px; height: 100%; background: linear-gradient(180deg, transparent, #14b8a6, transparent); min-height: 100px;"></div>
          
          <!-- 데이타임 루틴 -->
          <div id="daytime-routines">
            <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1rem;">
              <i data-lucide="cloud-sun" style="width: 20px; height: 20px; color: #06b6d4;"></i>
              <h4 style="color: #0f766e; font-weight: 600; margin: 0;">데이타임 루틴</h4>
              <span id="daytime-progress" style="font-size: 0.85rem; color: #6b7280;">0 / 0</span>
            </div>
            <div id="daytime-routines-list" style="display: flex; flex-direction: column; gap: 0.5rem;"></div>
            <div id="daytime-empty" style="color: #9ca3af; font-size: 0.9rem; padding: 1rem 0; text-align: center; display: none;">
              오늘 수행할 데이타임 루틴이 없습니다
            </div>
          </div>
          
          <!-- 구분선 -->
          <div style="width: 2px; height: 100%; background: linear-gradient(180deg, transparent, #14b8a6, transparent); min-height: 100px;"></div>
          
          <!-- 나이트루틴 -->
          <div id="night-routines">
            <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1rem;">
              <i data-lucide="moon" style="width: 20px; height: 20px; color: #6366f1;"></i>
              <h4 style="color: #0f766e; font-weight: 600; margin: 0;">나이트루틴</h4>
              <span id="night-progress" style="font-size: 0.85rem; color: #6b7280;">0 / 0</span>
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
        <!-- 왼쪽: 오늘 할일 -->
        <div style="display: flex; align-items: center; gap: 0.75rem; flex-shrink: 0;">
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
        
        <!-- 가운데: 날짜 이동 바 -->
        <div id="todo-date-nav-section" style="display: flex; align-items: center; gap: 0.5rem; flex: 1; justify-content: center; margin: 0 1rem; min-width: 0;">
          <button id="todo-date-prev" class="date-nav-btn" title="이전 날짜" style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 0.4rem; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1); color: #6b7280; width: 32px; height: 32px; flex-shrink: 0;">
            <i data-lucide="chevron-left" style="width: 18px; height: 18px;"></i>
          </button>
          <button id="todo-date-display" class="date-display-btn" style="display: flex; align-items: center; gap: 0.4rem; padding: 0.4rem 0.875rem; background: var(--primary-blue, #5B5FC7); color: white; border: none; border-radius: 999px; cursor: pointer; font-weight: 600; font-size: 0.9rem; transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1); white-space: nowrap; flex-shrink: 0;">
            <i data-lucide="calendar" style="width: 16px; height: 16px;"></i>
            <span id="todo-date-display-text">${formatSelectedDate(timezone)}</span>
          </button>
          <button id="todo-date-next" class="date-nav-btn" title="다음 날짜" style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 0.4rem; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1); color: #6b7280; width: 32px; height: 32px; flex-shrink: 0;">
            <i data-lucide="chevron-right" style="width: 18px; height: 18px;"></i>
          </button>
          <!-- 오늘로 이동 버튼 (PC만 표시) -->
          <button id="todo-date-today" class="date-today-btn date-today-btn-pc" style="display: ${selectedDate === today ? 'none' : 'inline-flex'}; align-items: center; gap: 0.375rem; padding: 0.375rem 0.875rem; font-size: 0.875rem; background: #E8EBFA; color: #1f2937; border: 1px solid rgba(91, 95, 199, 0.2); border-radius: 999px; cursor: pointer; transition: all 0.2s; white-space: nowrap; flex-shrink: 0;">
            <i data-lucide="sun" style="width: 16px; height: 16px;"></i>
            오늘로 이동
          </button>
          <!-- 오늘로 이동 아이콘 (모바일만 표시) -->
          <button id="todo-date-today-mobile" class="date-today-icon-btn date-today-btn-mobile" title="오늘로 이동" style="display: ${selectedDate === today ? 'none' : 'inline-flex'}; align-items: center; justify-content: center; padding: 0.4rem; background: #E8EBFA; color: #1f2937; border: 1px solid rgba(91, 95, 199, 0.2); border-radius: 8px; cursor: pointer; transition: all 0.2s; width: 32px; height: 32px; flex-shrink: 0;">
            <i data-lucide="sun" style="width: 18px; height: 18px;"></i>
          </button>
        </div>
        
        <!-- 오른쪽: 카테고리 탭 -->
        <div style="display: flex; gap: 0.75rem; align-items: center; flex-shrink: 0;">
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
            <i data-lucide="chevron-up" style="width: 20px; height: 20px; color: #7c3aed;"></i>
          </button>
        </div>
        <button id="open-reflection-form" class="btn" style="background: linear-gradient(135deg, #a78bfa 0%, #c084fc 100%); color: white; border: none; padding: 0.5rem 1rem; border-radius: 8px; box-shadow: 0 4px 12px rgba(167, 139, 250, 0.3); font-size: 0.95rem; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 0.5rem;">
          <i data-lucide="pen-square" style="width: 18px; height: 18px;"></i>
          성찰 작성하기
        </button>
      </div>
      <div id="reflection-content" style="display: none;">
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

    <!-- 할일 날짜 이동 모달 -->
    <div id="todo-date-overlay" class="date-overlay hidden" style="position: fixed; inset: 0; background: rgba(15, 23, 42, 0.35); backdrop-filter: blur(6px); display: none; align-items: center; justify-content: center; z-index: 2000; padding: 1rem;">
      <div id="todo-date-modal" class="date-modal" style="background: white; border-radius: 1rem; box-shadow: 0 20px 40px rgba(0, 0, 0, 0.18); width: min(400px, 90vw); max-height: 90vh; overflow: hidden; display: flex; flex-direction: column;">
        <div class="date-modal-header" style="display: flex; justify-content: space-between; align-items: center; padding: 1.25rem; border-bottom: 1px solid #e5e7eb;">
          <span style="font-weight: 700; font-size: 1.125rem; color: #111827;">날짜 선택</span>
          <button id="todo-date-close" class="date-close-btn" style="background: none; border: none; cursor: pointer; padding: 0.25rem; border-radius: 4px; display: flex; align-items: center; justify-content: center; transition: all 0.2s; color: #6b7280;">
            <i data-lucide="x" style="width: 20px; height: 20px;"></i>
          </button>
        </div>
        <div class="date-modal-body" style="padding: 1.25rem; flex: 1; overflow-y: auto;">
          <input type="text" id="todo-date-calendar-input" readonly style="width: 100%; border: 2px solid #e5e7eb; border-radius: 8px; padding: 0.75rem;" />
        </div>
        <div class="date-modal-footer" style="display: flex; justify-content: flex-end; gap: 0.75rem; padding: 1.25rem; border-top: 1px solid #e5e7eb;">
          <button id="todo-date-today-modal" class="btn btn-secondary" style="padding: 0.625rem 1.25rem; background: #f3f4f6; color: #1f2937; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 0.5rem;">
            <i data-lucide="sun" style="width: 18px; height: 18px;"></i>
            오늘
          </button>
          <button id="todo-date-close-footer" class="btn btn-primary" style="padding: 0.625rem 1.25rem; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer;">닫기</button>
        </div>
      </div>
    </div>

    <!-- 할일 복제 모달 -->
    <div id="todo-duplicate-overlay" class="date-overlay hidden" style="position: fixed; inset: 0; background: rgba(15, 23, 42, 0.35); backdrop-filter: blur(6px); display: none; align-items: center; justify-content: center; z-index: 2000; padding: 1rem;">
      <div id="todo-duplicate-modal" class="date-modal" style="background: white; border-radius: 1rem; box-shadow: 0 20px 40px rgba(0, 0, 0, 0.18); width: min(400px, 90vw); max-height: 90vh; overflow: hidden; display: flex; flex-direction: column;">
        <div class="date-modal-header" style="display: flex; justify-content: space-between; align-items: center; padding: 1.25rem; border-bottom: 1px solid #e5e7eb;">
          <span style="font-weight: 700; font-size: 1.125rem; color: #111827;">복제할 날짜 선택</span>
          <button id="todo-duplicate-close" class="date-close-btn" style="background: none; border: none; cursor: pointer; padding: 0.25rem; border-radius: 4px; display: flex; align-items: center; justify-content: center; transition: all 0.2s; color: #6b7280;">
            <i data-lucide="x" style="width: 20px; height: 20px;"></i>
          </button>
        </div>
        <div class="date-modal-body" style="padding: 1.25rem; flex: 1; overflow-y: auto;">
          <input type="text" id="todo-duplicate-calendar-input" readonly style="width: 100%; border: 2px solid #e5e7eb; border-radius: 8px; padding: 0.75rem;" />
        </div>
        <div class="date-modal-footer" style="display: flex; justify-content: flex-end; gap: 0.75rem; padding: 1.25rem; border-top: 1px solid #e5e7eb;">
          <button id="todo-duplicate-today-modal" class="btn btn-secondary" style="padding: 0.625rem 1.25rem; background: #f3f4f6; color: #1f2937; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 0.5rem;">
            <i data-lucide="sun" style="width: 18px; height: 18px;"></i>
            오늘
          </button>
          <button id="todo-duplicate-close-footer" class="btn btn-primary" style="padding: 0.625rem 1.25rem; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer;">닫기</button>
        </div>
      </div>
    </div>

    <!-- 할일 입력 필드 날짜 이동 모달 -->
    <div id="todo-input-date-overlay" class="date-overlay hidden" style="position: fixed; inset: 0; background: rgba(15, 23, 42, 0.35); backdrop-filter: blur(6px); display: none; align-items: center; justify-content: center; z-index: 2000; padding: 1rem;">
      <div id="todo-input-date-modal" class="date-modal" style="background: white; border-radius: 1rem; box-shadow: 0 20px 40px rgba(0, 0, 0, 0.18); width: min(400px, 90vw); max-height: 90vh; overflow: hidden; display: flex; flex-direction: column;">
        <div class="date-modal-header" style="display: flex; justify-content: space-between; align-items: center; padding: 1.25rem; border-bottom: 1px solid #e5e7eb;">
          <span style="font-weight: 700; font-size: 1.125rem; color: #111827;">날짜 선택</span>
          <button id="todo-input-date-close" class="date-close-btn" style="background: none; border: none; cursor: pointer; padding: 0.25rem; border-radius: 4px; display: flex; align-items: center; justify-content: center; transition: all 0.2s; color: #6b7280;">
            <i data-lucide="x" style="width: 20px; height: 20px;"></i>
          </button>
        </div>
        <div class="date-modal-body" style="padding: 1.25rem; flex: 1; overflow-y: auto;">
          <input type="text" id="todo-input-date-calendar-input" readonly style="width: 100%; border: 2px solid #e5e7eb; border-radius: 8px; padding: 0.75rem;" />
        </div>
        <div class="date-modal-footer" style="display: flex; justify-content: flex-end; gap: 0.75rem; padding: 1.25rem; border-top: 1px solid #e5e7eb;">
          <button id="todo-input-date-today-modal" class="btn btn-secondary" style="padding: 0.625rem 1.25rem; background: #f3f4f6; color: #1f2937; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 0.5rem;">
            <i data-lucide="sun" style="width: 18px; height: 18px;"></i>
            오늘
          </button>
          <button id="todo-input-date-close-footer" class="btn btn-primary" style="padding: 0.625rem 1.25rem; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer;">닫기</button>
        </div>
      </div>
    </div>
  `;

  return {
    html,
    onMount: async () => {
      // 이벤트 바인딩 플래그 초기화 (페이지가 다시 렌더링될 때마다)
      todoEventsBound = false;
      todoDatePickerInitialized = false;
      dragAndDropInitialized = false;
      
      // 루틴과 할일 로드 및 이벤트 바인딩
      await loadRoutines(selectedDate, profile);
      await loadTodos(selectedDate, profile, timezone);
      await loadReflection(selectedDate, profile);
      
      // ✅ Lucide 렌더링 완료 후 이벤트 리스너 등록 (타이밍 보장)
      setTimeout(() => {
        setupEventHandlers(selectedDate, profile, timezone);
      }, 50);
      
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
    // ✅ PRD 요구사항: is_active 조건 없이 모든 루틴 조회 (비활성화된 루틴 포함)
    const { data: routines, error } = await supabase
      .from('routines')
      .select('*')
      .eq('user_id', profile.id);
      // is_active 조건 제거
      // deleted_at 조건 제거 (날짜 기준으로 필터링)

    if (error) throw error;

    // 날짜 기준 필터링 함수
    function isRoutineDue(routine, selectedDate) {
      const schedule = typeof routine.schedule === 'string' 
        ? (() => { try { return JSON.parse(routine.schedule); } catch { return routine.schedule; } })()
        : routine.schedule;
      
      if (!schedule) return false;

      // 적용 시작일 확인
      let activeFromDate;
      if (schedule.active_from_date) {
        activeFromDate = schedule.active_from_date;
      } else if (routine.created_at) {
        // active_from_date가 없으면 created_at의 날짜 부분 사용
        activeFromDate = routine.created_at.substring(0, 10);
      } else {
        return false; // 시작일을 알 수 없으면 제외
      }

      // 비활성화일 확인
      let deletedAtDate = null;
      if (routine.deleted_at) {
        deletedAtDate = routine.deleted_at.substring(0, 10);
      }

      // 날짜 범위 체크: 적용 시작일 <= 선택 날짜 < 비활성화일
      if (activeFromDate > selectedDate) {
        return false; // 아직 적용 시작 전
      }
      if (deletedAtDate && deletedAtDate <= selectedDate) {
        return false; // 이미 비활성화됨
      }

      // 타입별 필터링
      if (schedule.type === 'daily') return true;
      
      if (schedule.type === 'weekly') {
        const today = new Date(selectedDate);
        const dayOfWeek = today.getDay(); // 0=일요일, 1=월요일...
        const adjustedDay = dayOfWeek === 0 ? 7 : dayOfWeek; // 일요일을 7로 변환
        return schedule.days?.includes(adjustedDay);
      }
      
      if (schedule.type === 'monthly') {
        const monthStart = schedule.month;
        const currentMonth = selectedDate.substring(0, 7) + '-01';
        return monthStart === currentMonth;
      }
      
      return false;
    }

    // ✅ 날짜 기준 필터링 적용
    const todayRoutines = routines.filter(routine => isRoutineDue(routine, date));

    // 루틴 로그 조회
    const { data: logs } = await supabase
      .from('routine_logs')
      .select('*')
      .eq('user_id', profile.id)
      .eq('date', date)
      .eq('checked', true);

    const checkedRoutineIds = new Set(logs?.map(log => log.routine_id) || []);

    // 모닝/데이타임/나이트 분리 (schedule이 JSONB이므로 안전하게 파싱)
    const morningRoutines = todayRoutines.filter(r => {
      const schedule = typeof r.schedule === 'string' 
        ? (() => { try { return JSON.parse(r.schedule); } catch { return r.schedule; } })()
        : r.schedule;
      return schedule?.category === 'morning';
    });
    const daytimeRoutines = todayRoutines.filter(r => {
      const schedule = typeof r.schedule === 'string' 
        ? (() => { try { return JSON.parse(r.schedule); } catch { return r.schedule; } })()
        : r.schedule;
      return schedule?.category === 'daytime';
    });
    const nightRoutines = todayRoutines.filter(r => {
      const schedule = typeof r.schedule === 'string' 
        ? (() => { try { return JSON.parse(r.schedule); } catch { return r.schedule; } })()
        : r.schedule;
      return schedule?.category === 'night';
    });

    // 렌더링
    renderRoutines(morningRoutines, daytimeRoutines, nightRoutines, checkedRoutineIds, date, profile);
  } catch (error) {
    console.error('Error loading routines:', error);
  }
}

function renderRoutines(morningRoutines, daytimeRoutines, nightRoutines, checkedRoutineIds, date, profile) {
  const morningList = document.getElementById('morning-routines-list');
  const daytimeList = document.getElementById('daytime-routines-list');
  const nightList = document.getElementById('night-routines-list');
  const morningEmpty = document.getElementById('morning-empty');
  const daytimeEmpty = document.getElementById('daytime-empty');
  const nightEmpty = document.getElementById('night-empty');
  const noData = document.getElementById('routines-no-data');

  // ✅ 루틴 정렬 함수 (schedule.order 기준, NULL이면 created_at 기준)
  const sortRoutines = (routines) => {
    return [...routines].sort((a, b) => {
      const scheduleA = typeof a.schedule === 'string' ? JSON.parse(a.schedule) : a.schedule;
      const scheduleB = typeof b.schedule === 'string' ? JSON.parse(b.schedule) : b.schedule;
      
      const orderA = scheduleA?.order ?? 9999; // order가 없으면 마지막으로
      const orderB = scheduleB?.order ?? 9999;
      
      if (orderA !== orderB) {
        return orderA - orderB;
      }
      
      // order가 같으면 created_at으로 정렬
      return new Date(a.created_at) - new Date(b.created_at);
    });
  };

  // ✅ 정렬된 루틴 사용
  const sortedMorningRoutines = sortRoutines(morningRoutines);
  const sortedDaytimeRoutines = sortRoutines(daytimeRoutines);
  const sortedNightRoutines = sortRoutines(nightRoutines);

  // 모닝루틴 렌더링
  if (sortedMorningRoutines.length === 0) {
    morningList.style.display = 'none';
    morningEmpty.style.display = 'block';
  } else {
    morningList.style.display = 'flex';
    morningEmpty.style.display = 'none';
    morningList.innerHTML = sortedMorningRoutines.map(routine => {
      const isChecked = checkedRoutineIds.has(routine.id);
      return `
        <div class="routine-item" data-routine-id="${routine.id}" style="background: white; border-radius: 8px; padding: 0.75rem; display: flex; align-items: center; gap: 0.75rem; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
          <input type="checkbox" ${isChecked ? 'checked' : ''} style="width: 20px; height: 20px; cursor: pointer;">
          <span style="flex: 1; ${isChecked ? 'text-decoration: line-through; color: #9ca3af;' : ''}">${routine.title}</span>
        </div>
      `;
    }).join('');
  }

  // 데이타임 루틴 렌더링
  if (sortedDaytimeRoutines.length === 0) {
    daytimeList.style.display = 'none';
    daytimeEmpty.style.display = 'block';
  } else {
    daytimeList.style.display = 'flex';
    daytimeEmpty.style.display = 'none';
    daytimeList.innerHTML = sortedDaytimeRoutines.map(routine => {
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
  if (sortedNightRoutines.length === 0) {
    nightList.style.display = 'none';
    nightEmpty.style.display = 'block';
  } else {
    nightList.style.display = 'flex';
    nightEmpty.style.display = 'none';
    nightList.innerHTML = sortedNightRoutines.map(routine => {
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
  if (sortedMorningRoutines.length === 0 && sortedDaytimeRoutines.length === 0 && sortedNightRoutines.length === 0) {
    document.getElementById('routines-content').style.display = 'none';
    noData.style.display = 'block';
  } else {
    document.getElementById('routines-content').style.display = 'block';
    noData.style.display = 'none';
  }

  // 진행률 업데이트
  const totalRoutines = sortedMorningRoutines.length + sortedDaytimeRoutines.length + sortedNightRoutines.length;
  const checkedCount = checkedRoutineIds.size;
  const progress = totalRoutines > 0 ? (checkedCount / totalRoutines * 100).toFixed(0) : 0;

  document.getElementById('routines-progress').innerHTML = `
    <span>✓ ${checkedCount} / ${totalRoutines}</span>
    <div style="width: 60px; height: 8px; background: rgba(20, 184, 166, 0.2); border-radius: 4px; overflow: hidden;">
      <div style="width: ${progress}%; height: 100%; background: linear-gradient(90deg, #14b8a6, #10b981); transition: width 0.3s;"></div>
    </div>
    <span>${progress}%</span>
  `;

  const morningChecked = sortedMorningRoutines.filter(r => checkedRoutineIds.has(r.id)).length;
  const daytimeChecked = sortedDaytimeRoutines.filter(r => checkedRoutineIds.has(r.id)).length;
  const nightChecked = sortedNightRoutines.filter(r => checkedRoutineIds.has(r.id)).length;

  document.getElementById('morning-progress').textContent = `${morningChecked} / ${sortedMorningRoutines.length}`;
  document.getElementById('daytime-progress').textContent = `${daytimeChecked} / ${sortedDaytimeRoutines.length}`;
  document.getElementById('night-progress').textContent = `${nightChecked} / ${sortedNightRoutines.length}`;

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
let syncingTodo = false; // 동기화 플래그 (무한 루프 방지)

async function loadTodos(date, profile, timezone = 'Asia/Seoul') {
  try {
    const today = getToday(timezone);
    let query = supabase
      .from('todos')
      .select(`
        *,
        project_task:project_tasks(
          id,
          project:projects(
            id,
            name
          )
        )
      `)
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

    // 과거 날짜 조회 시에도 이월/포기한 할일을 표시 (배지로 시각적 구분)
    // - 이월된 할일: "→ 오늘로 이동됨" 녹색 배지 + 회색 배경 + 읽기 전용
    // - 포기한 할일: "× 포기함" 빨간 배지 + 회색 배경 + 읽기 전용
    // 중복 방지는 이월/프로젝트/반복업무 등록 시 carried_over_at/skipped_at 체크로 처리됨
    // (이월 시: 2112-2113, 2166-2167번째 줄, 프로젝트 등록 시: 1367-1368번째 줄)
    let filteredData = data || [];

    todos = filteredData;
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
        <div class="todo-item" data-todo-id="${todo.id}" data-category="${todo.category}" draggable="false" style="background: ${isExistingTodo ? '#f3f4f6' : 'white'}; border-radius: 8px; padding: 0.75rem; display: flex; align-items: center; gap: 0.75rem; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
          ${canMove ? `
            <div class="todo-drag-handle" draggable="true" style="display: flex; align-items: center; padding: 0.25rem 0.5rem; cursor: grab; color: #9ca3af; border-radius: 4px; transition: all 0.2s ease; user-select: none;" title="드래그하여 순서 변경">
              <i data-lucide="grip-vertical" style="width: 18px; height: 18px; pointer-events: none;"></i>
            </div>
            <div class="move-todo-buttons" style="display: flex; flex-direction: row; gap: 0; align-items: center;">
              <button class="move-todo-btn" data-move-up="${todo.id}" style="background: transparent; border: none; color: #6b7280; cursor: pointer; padding: 0.25rem;" title="위로 이동">
                <i data-lucide="chevron-up" style="width: 16px; height: 16px;"></i>
              </button>
              <button class="move-todo-btn" data-move-down="${todo.id}" style="background: transparent; border: none; color: #6b7280; cursor: pointer; padding: 0.25rem;" title="아래로 이동">
                <i data-lucide="chevron-down" style="width: 16px; height: 16px;"></i>
              </button>
            </div>
          ` : '<div style="width: 36px;"></div>'}
          <input type="checkbox" ${todo.is_done ? 'checked' : ''} ${isReadOnly ? 'disabled' : ''} style="width: 20px; height: 20px; cursor: ${isReadOnly ? 'not-allowed' : 'pointer'}; opacity: ${isReadOnly ? 0.5 : 1};">
          ${isEditing ? `
            <input type="text" class="todo-edit-input" value="${todo.title.replace(/"/g, '&quot;')}" style="flex: 1; padding: 0.5rem; border: 2px solid #6366f1; border-radius: 4px; font-size: 1rem;">
          ` : `
            <div style="flex: 1; display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
              ${todo.pinned ? '<i data-lucide="pin" style="width: 14px; height: 14px; color: #f59e0b; flex-shrink: 0;"></i>' : ''}
              ${todo.priority ? `<span style="font-size: 0.7rem; padding: 0.15rem 0.4rem; border-radius: 4px; font-weight: 600; flex-shrink: 0; ${todo.priority === 3 ? 'background: #fee2e2; color: #991b1b;' : todo.priority === 2 ? 'background: #fef3c7; color: #92400e;' : 'background: #dbeafe; color: #1e40af;'}">P${todo.priority}</span>` : ''}
              ${todo.project_task_id ? `<span style="font-size: 0.7rem; padding: 0.15rem 0.4rem; border-radius: 4px; font-weight: 600; flex-shrink: 0; background: #e0e7ff; color: #4f46e5; display: inline-flex; align-items: center; gap: 0.25rem;"><i data-lucide="folder-kanban" style="width: 12px; height: 12px;"></i>프로젝트${todo.project_task?.project?.name ? `: ${todo.project_task.project.name}` : ''}</span>` : ''}
              ${todo.recurring_task_id ? '<span style="font-size: 0.7rem; padding: 0.15rem 0.4rem; border-radius: 4px; font-weight: 600; flex-shrink: 0; background: #f3e8ff; color: #6b21a8; display: inline-flex; align-items: center; gap: 0.25rem;"><i data-lucide="repeat" style="width: 12px; height: 12px;"></i>반복업무</span>' : ''}
              <span class="todo-title" data-todo-title="${todo.id}" style="${todo.is_done ? 'text-decoration: line-through; color: #9ca3af;' : ''} ${!isReadOnly && !todo.is_done ? 'cursor: pointer;' : ''}">${todo.title}</span>
              ${todo.due_date ? `<span style="font-size: 0.7rem; color: #6b7280; flex-shrink: 0;">📅 ${todo.due_date}</span>` : ''}
            </div>
          `}
          ${isExistingTodo ? '<span style="font-size: 0.75rem; color: #6b7280; padding: 0.25rem 0.5rem; background: #e5e7eb; border-radius: 4px;">지난 날짜</span>' : ''}
          ${isProcessed ? (todo.carried_over_at ? '<span style="font-size: 0.75rem; color: #10b981; padding: 0.25rem 0.5rem; background: #d1fae5; border-radius: 4px;">→ 오늘로 이동됨</span>' : '<span style="font-size: 0.75rem; color: #ef4444; padding: 0.25rem 0.5rem; background: #fee2e2; border-radius: 4px;">× 포기함</span>') : ''}
          ${!isReadOnly ? `
            ${!isEditing ? `
              <button class="move-todo-date-btn" data-move-todo-date="${todo.id}" style="background: transparent; border: none; color: #6366f1; cursor: pointer; padding: 0.25rem;" title="날짜 이동">
                <i data-lucide="calendar" style="width: 18px; height: 18px;"></i>
              </button>
              <button class="duplicate-todo-btn" data-duplicate-todo="${todo.id}" style="background: transparent; border: none; color: #10b981; cursor: pointer; padding: 0.25rem;" title="복제">
                <i data-lucide="copy" style="width: 18px; height: 18px;"></i>
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
  // ✅ 이벤트 리스너 중복 등록 방지: cloneNode 패턴 사용
  const setupToggle = (buttonId, contentId) => {
    const button = document.getElementById(buttonId);
    if (!button) return;
    
    // 기존 이벤트 리스너 제거를 위한 클론
    const newButton = button.cloneNode(true);
    button.parentNode?.replaceChild(newButton, button);
    
    newButton.addEventListener('click', () => {
      const content = document.getElementById(contentId);
      // ✅ 안전하게 아이콘 찾기: SVG 또는 data-lucide 속성이 있는 요소 우선
      const icon = newButton.querySelector('svg') || 
                   newButton.querySelector('[data-lucide]') || 
                   newButton.querySelector('i');
      
      if (!icon) {
        console.error(`${buttonId} toggle icon not found`);
        return;
      }
      
      if (content && content.style.display === 'none') {
        content.style.display = 'block';
        icon.setAttribute('data-lucide', 'chevron-down');
      } else if (content) {
        content.style.display = 'none';
        icon.setAttribute('data-lucide', 'chevron-up');
      }
      if (window.lucide?.createIcons) {
        setTimeout(() => window.lucide.createIcons(), 10);
      }
    });
  };

  // 루틴 토글
  setupToggle('toggle-routines', 'routines-content');
  
  // 할일 토글
  setupToggle('toggle-todos', 'todos-content');
  
  // 하루 성찰 토글
  setupToggle('toggle-reflection', 'reflection-content');

  // 하루 성찰 폼 열기
  const openReflectionForm = document.getElementById('open-reflection-form');
  if (openReflectionForm) {
    // 기존 이벤트 리스너 제거를 위한 클론
    const newOpenReflectionForm = openReflectionForm.cloneNode(true);
    openReflectionForm.parentNode?.replaceChild(newOpenReflectionForm, openReflectionForm);
    
    newOpenReflectionForm.addEventListener('click', () => {
      const content = document.getElementById('reflection-content');
      const formContainer = document.getElementById('reflection-form-container');
      const toggleBtn = document.getElementById('toggle-reflection');
      
      if (content && formContainer) {
        // 섹션 펼치기
        content.style.display = 'block';
        // 폼 표시
        formContainer.style.display = 'block';
        // 토글 아이콘 업데이트
        if (toggleBtn) {
          const icon = toggleBtn.querySelector('svg') || 
                       toggleBtn.querySelector('[data-lucide]') || 
                       toggleBtn.querySelector('i');
          if (icon) {
            icon.setAttribute('data-lucide', 'chevron-down');
            if (window.lucide?.createIcons) {
              setTimeout(() => window.lucide.createIcons(), 10);
            }
          }
        }
      }
    });
  }

  // 하루 성찰 저장 (이벤트 리스너 중복 등록 방지: cloneNode 패턴 사용)
  const saveReflectionBtn = document.getElementById('save-reflection-btn');
  if (saveReflectionBtn) {
    // 기존 이벤트 리스너 제거를 위한 클론
    const newSaveReflectionBtn = saveReflectionBtn.cloneNode(true);
    saveReflectionBtn.parentNode?.replaceChild(newSaveReflectionBtn, saveReflectionBtn);
    
    newSaveReflectionBtn.addEventListener('click', async () => {
      await saveReflection(date, profile);
      // loadReflection은 saveReflection 함수 내부에서 이미 호출되므로 중복 호출 제거
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

  // 날짜 이동 바 이벤트 핸들러 (별도 모달 사용으로 충돌 방지)
  const setupTodoDateNav = () => {
    const todoDatePrevBtn = document.getElementById('todo-date-prev');
    const todoDateNextBtn = document.getElementById('todo-date-next');
    const todoDateDisplayBtn = document.getElementById('todo-date-display');
    const todoDateTodayBtn = document.getElementById('todo-date-today'); // PC용
    const todoDateTodayMobileBtn = document.getElementById('todo-date-today-mobile'); // 모바일용
    const todoDateDisplayText = document.getElementById('todo-date-display-text');
    
    if (!todoDatePrevBtn || !todoDateNextBtn || !todoDateDisplayBtn) {
      return; // 요소가 없으면 종료
    }
    
    // 별도 모달 요소들
    const overlay = document.getElementById('todo-input-date-overlay');
    const calendarInput = document.getElementById('todo-input-date-calendar-input');
    const closeBtn = document.getElementById('todo-input-date-close');
    const closeFooterBtn = document.getElementById('todo-input-date-close-footer');
    const todayBtn = document.getElementById('todo-input-date-today-modal');
    
    // 스크롤 중복 방지 플래그
    let isScrolling = false;
    
    const updateTodoDateDisplay = () => {
      const currentSelected = getSelectedDate(timezone);
      const currentToday = getToday(timezone);
      const isToday = currentSelected === currentToday;
      
      if (todoDateDisplayText) {
        todoDateDisplayText.textContent = formatSelectedDate(timezone);
      }
      // PC용 "오늘로 이동" 버튼 표시/숨김
      if (todoDateTodayBtn) {
        todoDateTodayBtn.style.display = isToday ? 'none' : 'inline-flex';
      }
      // 모바일용 "오늘로 이동" 아이콘 버튼 표시/숨김
      if (todoDateTodayMobileBtn) {
        todoDateTodayMobileBtn.style.display = isToday ? 'none' : 'inline-flex';
      }
    };
    
    const rerenderTodos = async () => {
      updateTodoDateDisplay();
      // 날짜 변경 시 강제 재렌더링
      router.lastRenderedState = null;
      
      try {
        await router.handleRoute();
        
        // ✅ 렌더링 완료 후 "오늘 할일" 섹션으로 스크롤 (오늘 할일 헤더의 날짜 이동에서만)
        // 중복 스크롤 방지
        if (isScrolling) {
          return;
        }
        
        isScrolling = true;
        
        // DOM 업데이트를 기다리기 위해 requestAnimationFrame 사용
        requestAnimationFrame(() => {
          setTimeout(() => {
            const todosSection = document.getElementById('today-todos-section');
            if (todosSection) {
              todosSection.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'start',
                inline: 'nearest'
              });
              
              // 스크롤 완료 후 플래그 해제 (스크롤 애니메이션 시간 고려)
              setTimeout(() => {
                isScrolling = false;
              }, 500); // smooth 스크롤 애니메이션 시간
            } else {
              // 요소가 없으면 즉시 플래그 해제
              isScrolling = false;
            }
          }, 100); // 렌더링 완료 대기
        });
      } catch (error) {
        console.error('Error in rerenderTodos:', error);
        isScrolling = false; // 에러 발생 시 플래그 해제
      }
    };
    
    const closeOverlay = () => {
      if (overlay) {
        overlay.style.display = 'none';
        overlay.classList.add('hidden');
      }
    };
    
    const openOverlay = () => {
      if (!overlay || !calendarInput || !window.flatpickr) {
        console.error('Todo input date picker elements not found or flatpickr not loaded');
        return;
      }
      
      const currentSelected = getSelectedDate(timezone);
      overlay.style.display = 'flex';
      overlay.classList.remove('hidden');
      
      // flatpickr 인스턴스가 있으면 날짜 업데이트, 없으면 새로 생성
      if (calendarInput._fp) {
        calendarInput._fp.setDate(currentSelected, true);
      } else {
        const DateTime = window.luxon?.DateTime;
        if (!DateTime) {
          console.error('Luxon not available');
          return;
        }
        
        calendarInput._fp = window.flatpickr(calendarInput, {
          inline: true,
          defaultDate: currentSelected,
          dateFormat: 'Y-m-d',
          locale: (window.flatpickr.l10ns && window.flatpickr.l10ns.ko) ? window.flatpickr.l10ns.ko : undefined,
          onChange: (dates) => {
            if (dates && dates[0]) {
              // 로컬 날짜 사용 (UTC 변환 방지)
              const d = dates[0];
              const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
              setSelectedDate(iso);
              closeOverlay();
              rerenderTodos();
            }
          },
        });
      }
    };
    
    // 이전 날짜 버튼 (cloneNode 패턴)
    const newPrevBtn = todoDatePrevBtn.cloneNode(true);
    todoDatePrevBtn.parentNode?.replaceChild(newPrevBtn, todoDatePrevBtn);
    newPrevBtn.onclick = () => {
      shiftSelectedDate(-1, timezone);
      rerenderTodos();
    };
    
    // 다음 날짜 버튼 (cloneNode 패턴)
    const newNextBtn = todoDateNextBtn.cloneNode(true);
    todoDateNextBtn.parentNode?.replaceChild(newNextBtn, todoDateNextBtn);
    newNextBtn.onclick = () => {
      shiftSelectedDate(1, timezone);
      rerenderTodos();
    };
    
    // 날짜 표시 버튼 (cloneNode 패턴) - 별도 모달 사용
    const newDisplayBtn = todoDateDisplayBtn.cloneNode(true);
    todoDateDisplayBtn.parentNode?.replaceChild(newDisplayBtn, todoDateDisplayBtn);
    newDisplayBtn.onclick = openOverlay;
    
    // 오늘로 이동 버튼 - PC용 (cloneNode 패턴)
    if (todoDateTodayBtn) {
      const newTodayBtn = todoDateTodayBtn.cloneNode(true);
      todoDateTodayBtn.parentNode?.replaceChild(newTodayBtn, todoDateTodayBtn);
      newTodayBtn.onclick = () => {
        resetSelectedDate(timezone);
        rerenderTodos();
      };
    }
    
    // 오늘로 이동 버튼 - 모바일용 (cloneNode 패턴)
    if (todoDateTodayMobileBtn) {
      const newTodayMobileBtn = todoDateTodayMobileBtn.cloneNode(true);
      todoDateTodayMobileBtn.parentNode?.replaceChild(newTodayMobileBtn, todoDateTodayMobileBtn);
      newTodayMobileBtn.onclick = () => {
        resetSelectedDate(timezone);
        rerenderTodos();
      };
    }
    
    // 모달 닫기 버튼들 (cloneNode 패턴)
    if (closeBtn) {
      const newCloseBtn = closeBtn.cloneNode(true);
      closeBtn.parentNode?.replaceChild(newCloseBtn, closeBtn);
      newCloseBtn.onclick = closeOverlay;
    }
    
    if (closeFooterBtn) {
      const newCloseFooterBtn = closeFooterBtn.cloneNode(true);
      closeFooterBtn.parentNode?.replaceChild(newCloseFooterBtn, closeFooterBtn);
      newCloseFooterBtn.onclick = closeOverlay;
    }
    
    if (todayBtn) {
      const newTodayModalBtn = todayBtn.cloneNode(true);
      todayBtn.parentNode?.replaceChild(newTodayModalBtn, todayBtn);
      newTodayModalBtn.onclick = () => {
        const today = getToday(timezone);
        setSelectedDate(today);
        closeOverlay();
        rerenderTodos();
      };
    }
    
    // 모달 배경 클릭 시 닫기
    if (overlay) {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          closeOverlay();
        }
      });
    }
    
    // 초기 날짜 표시 업데이트
    updateTodoDateDisplay();
  };
  
  setupTodoDateNav();

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
      
      // ✅ 날짜 이동 바에서 변경된 날짜 사용
      const currentDate = getSelectedDate(timezone);

      try {
        const { error } = await supabase
          .from('todos')
          .insert({
            user_id: profile.id,
            date: currentDate, // ✅ getSelectedDate 사용
            category: category,
            title: title,
            memo: null,
            due_date: null,
            priority: null,
            pinned: false
          });

        if (error) throw error;

        newInput.value = '';
        await loadTodos(currentDate, profile, timezone); // ✅ currentDate 사용
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
let todoDatePickerInitialized = false;
let dragAndDropInitialized = false;

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

    // 날짜 이동 버튼 (삭제 버튼 전에 처리)
    if (target.hasAttribute('data-move-todo-date')) {
      e.stopPropagation();
      if (isExistingTodo || editingTodoId) return;
      const todoId = target.getAttribute('data-move-todo-date');
      openTodoDatePicker(todoId, todo?.date || date, date, profile, timezone);
      return;
    }

    // 복제 버튼 (날짜 이동 버튼 다음에 처리)
    if (target.hasAttribute('data-duplicate-todo')) {
      e.stopPropagation();
      if (isExistingTodo || editingTodoId) return;
      const todoId = target.getAttribute('data-duplicate-todo');
      openTodoDuplicatePicker(todoId, todo?.date || date, date, profile, timezone);
      return;
    }

    // 삭제 버튼
    if (target.hasAttribute('data-delete-todo')) {
      e.stopPropagation();
      
      // 삭제 확인 팝업 추가
      if (confirm('이 할일을 삭제하시겠습니까?')) {
        await deleteTodo(todoId);
        await loadTodos(date, profile, timezone);
      }
      return;
    }
  });
  
  // 드래그 앤 드롭 이벤트 설정 (PC에서만, 한 번만 등록)
  // 모바일 감지: 화면 너비 768px 이하 또는 터치 이벤트 지원
  const isMobile = window.innerWidth <= 768 || ('ontouchstart' in window || navigator.maxTouchPoints > 0);
  if (!dragAndDropInitialized && !isMobile) {
    setupDragAndDrop(date, profile, timezone);
    dragAndDropInitialized = true;
  }
}

// 드래그 앤 드롭 설정 함수 (mousedown/mousemove/mouseup 기반 커스텀 구현)
function setupDragAndDrop(date, profile, timezone) {
  const todosContent = document.getElementById('todos-content');
  if (!todosContent) {
    console.error('[Drag] todos-content element not found');
    return;
  }

  // 기존 이벤트 리스너 제거 (중복 등록 방지)
  if (window._dragDropHandlers) {
    console.log('[Drag] Removing existing handlers');
    if (window._dragDropHandlers.mousedown) {
      window._dragDropHandlers.todosContent.removeEventListener('mousedown', window._dragDropHandlers.mousedown);
    }
    if (window._dragDropHandlers.mousemove) {
      document.removeEventListener('mousemove', window._dragDropHandlers.mousemove);
    }
    if (window._dragDropHandlers.mouseup) {
      document.removeEventListener('mouseup', window._dragDropHandlers.mouseup);
    }
    if (window._dragDropHandlers.mouseleave) {
      document.removeEventListener('mouseleave', window._dragDropHandlers.mouseleave);
    }
    // 기존 상태도 초기화
    if (window._dragDropState) {
      window._dragDropState.isDragging = false;
      window._dragDropState.draggedElement = null;
      window._dragDropState.draggedTodoId = null;
      window._dragDropState.draggedCategory = null;
    }
  }

  // 전역 상태 관리 (여러 번 호출되어도 동일한 상태 공유)
  if (!window._dragDropState) {
    window._dragDropState = {
      isDragging: false,
      draggedElement: null,
      draggedTodoId: null,
      draggedCategory: null,
      dragStartY: 0,
      dragOffsetY: 0,
      date: null,
      profile: null,
      timezone: null,
      lastTargetTodoId: null,
      lastInsertBefore: null
    };
  }
  
  // 현재 날짜/프로필/타임존 업데이트
  window._dragDropState.date = date;
  window._dragDropState.profile = profile;
  window._dragDropState.timezone = timezone;
  
  const state = window._dragDropState;
  
  console.log('[Drag] setupDragAndDrop initialized (custom)', todosContent);

  // mousedown 이벤트 핸들러
  const handleMouseDown = (e) => {
    // 이미 드래그 중이면 무시
    if (state.isDragging) return;
    
    // todo-drag-handle에서만 드래그 시작
    const dragHandle = e.target.closest('.todo-drag-handle');
    if (!dragHandle) return;
    
    // 버튼 클릭 방지
    if (e.target.closest('button') || e.target.type === 'checkbox') return;
    
    const todoItem = dragHandle.closest('.todo-item');
    if (!todoItem || !todoItem.classList.contains('todo-item')) return;
    
    // 완료된 할일이나 읽기 전용은 드래그 불가
    const todoId = todoItem.dataset.todoId;
    const todo = todos.find(t => t.id === todoId);
    if (!todo || todo.is_done) return;
    
    console.log('[Drag] mousedown on handle', todoId);
    
    state.isDragging = true;
    state.draggedElement = todoItem;
    state.draggedTodoId = todoId;
    state.draggedCategory = todoItem.dataset.category;
    
    const rect = todoItem.getBoundingClientRect();
    state.dragStartY = e.clientY;
    state.dragOffsetY = e.clientY - rect.top;
    
    // 시각적 피드백
    todoItem.classList.add('dragging');
    todoItem.style.opacity = '0.5';
    todoItem.style.transform = 'rotate(2deg) scale(0.98)';
    todoItem.style.cursor = 'grabbing';
    todoItem.style.position = 'relative';
    todoItem.style.zIndex = '1000';
    
    e.preventDefault();
  };

  // mousemove 이벤트 핸들러
  const handleMouseMove = (e) => {
    if (!state.isDragging || !state.draggedElement) return;
    
    e.preventDefault();
    
    // todos-content 내부 요소 찾기
    const todosContent = document.getElementById('todos-content');
    if (!todosContent) return;
    
    // 마우스 위치의 요소 찾기
    const elementBelow = document.elementFromPoint(e.clientX, e.clientY);
    if (!elementBelow || !todosContent.contains(elementBelow)) {
      // 삽입 지시선 제거
      document.querySelectorAll('.drag-insertion-line').forEach(el => el.remove());
      return;
    }
    
    // todo-item 찾기
    let todoItem = elementBelow.closest('.todo-item');
    if (!todoItem) {
      const dragHandle = elementBelow.closest('.todo-drag-handle');
      if (dragHandle) {
        todoItem = dragHandle.closest('.todo-item');
      }
    }
    
    // todo-item을 찾지 못했지만, todos-content 내부이고 첫 번째 항목 위 영역이면 처리
    if (!todoItem || !todoItem.classList.contains('todo-item')) {
      // 첫 번째 항목 위 빈 공간 감지
      const listContainer = todosContent.querySelector(`[id^="todos-${state.draggedCategory}"]`);
      if (listContainer) {
        const containerRect = listContainer.getBoundingClientRect();
        const firstItem = listContainer.querySelector('.todo-item');
        
        // 마우스가 컨테이너 상단과 첫 번째 항목 사이에 있으면 첫 번째 항목 위로 삽입
        if (firstItem && e.clientY >= containerRect.top && e.clientY < firstItem.getBoundingClientRect().top) {
          todoItem = firstItem;
        } else {
          document.querySelectorAll('.drag-insertion-line').forEach(el => el.remove());
          return;
        }
      } else {
        document.querySelectorAll('.drag-insertion-line').forEach(el => el.remove());
        return;
      }
    }
    
    const targetTodoId = todoItem.dataset.todoId;
    const targetCategory = todoItem.dataset.category;
    
    // 같은 카테고리 내에서만 드롭 가능
    if (targetCategory !== state.draggedCategory) {
      document.querySelectorAll('.drag-insertion-line').forEach(el => el.remove());
      todoItem.style.opacity = '0.3';
      return;
    }
    
    // 자기 자신은 드롭 불가
    if (targetTodoId === state.draggedTodoId) {
      document.querySelectorAll('.drag-insertion-line').forEach(el => el.remove());
      return;
    }
    
    // 드롭 가능한 항목 강조
    todoItem.style.opacity = '1';
    todoItem.style.boxShadow = '0 4px 12px rgba(99, 102, 241, 0.3)';
    
    // 삽입 지시선 표시
    const rect = todoItem.getBoundingClientRect();
    const mouseY = e.clientY;
    const itemCenterY = rect.top + rect.height / 2;
    
    document.querySelectorAll('.drag-insertion-line').forEach(el => el.remove());
    
    const insertionLine = document.createElement('div');
    insertionLine.className = 'drag-insertion-line';
    
    const listContainer = todoItem.closest('[id^="todos-"]');
    if (listContainer) {
      const containerRect = listContainer.getBoundingClientRect();
      insertionLine.style.cssText = `
        position: fixed;
        left: ${containerRect.left + 8}px;
        width: ${containerRect.width - 16}px;
        height: 3px;
        background: linear-gradient(90deg, #6366f1, #8b5cf6);
        z-index: 1000;
        pointer-events: none;
        border-radius: 2px;
        box-shadow: 0 0 8px rgba(99, 102, 241, 0.6);
      `;
      
      // 첫 번째 항목 위로 드래그할 때도 제대로 감지되도록 개선
      const isFirstItem = !todoItem.previousElementSibling || 
                          !todoItem.previousElementSibling.classList.contains('todo-item');
      
      // 위/아래 판단 로직 개선
      let insertBefore = false;
      if (isFirstItem) {
        // 첫 번째 항목인 경우: 상단 40% 영역은 위로, 하단 60% 영역은 아래로
        insertBefore = mouseY < rect.top + rect.height * 0.4;
      } else {
        // 일반 항목: 중앙 기준
        insertBefore = mouseY < itemCenterY;
      }
      
      if (insertBefore) {
        // 위에 삽입
        insertionLine.style.top = `${rect.top - 1}px`;
        todoItem.dataset.insertBefore = 'true';
      } else {
        // 아래에 삽입
        insertionLine.style.top = `${rect.bottom - 2}px`;
        todoItem.dataset.insertBefore = 'false';
      }
      
      // 전역 상태에 저장 (mouseup에서 사용)
      state.lastTargetTodoId = targetTodoId;
      state.lastInsertBefore = insertBefore;
      
      document.body.appendChild(insertionLine);
    }
  };

  // mouseleave 이벤트 핸들러 (브라우저 밖으로 마우스가 나갔을 때)
  const handleMouseLeave = (e) => {
    if (state.isDragging) {
      console.log('[Drag] mouseleave during drag, cleaning up');
      cleanup();
    }
  };

  // mouseup 이벤트 핸들러
  const handleMouseUp = async (e) => {
    if (!state.isDragging || !state.draggedElement || !state.draggedTodoId) {
      // 드래그 중이 아니어도 cleanup 호출 (안전장치)
      if (state.draggedElement) {
        cleanup();
      }
      return;
    }
    
    const currentDraggedElement = state.draggedElement;
    const currentDraggedTodoId = state.draggedTodoId;
    
    // todos-content 내부 요소 찾기
    const todosContent = document.getElementById('todos-content');
    if (!todosContent) {
      state.isDragging = false;
      cleanup();
      return;
    }
    
    // 드래그된 요소를 일시적으로 숨겨서 elementFromPoint가 정확한 요소를 찾도록 함
    const originalDisplay = currentDraggedElement.style.display;
    const originalPointerEvents = currentDraggedElement.style.pointerEvents;
    currentDraggedElement.style.display = 'none';
    currentDraggedElement.style.pointerEvents = 'none';
    
    // 마우스 위치의 요소 찾기
    const elementBelow = document.elementFromPoint(e.clientX, e.clientY);
    
    // 드래그된 요소 다시 표시
    currentDraggedElement.style.display = originalDisplay;
    currentDraggedElement.style.pointerEvents = originalPointerEvents;
    
    if (!elementBelow || !todosContent.contains(elementBelow)) {
      state.isDragging = false;
      cleanup();
      return;
    }
    
    // todo-item 찾기
    let todoItem = elementBelow.closest('.todo-item');
    if (!todoItem) {
      const dragHandle = elementBelow.closest('.todo-drag-handle');
      if (dragHandle) {
        todoItem = dragHandle.closest('.todo-item');
      }
    }
    
    // todo-item을 찾지 못했지만, todos-content 내부이고 첫 번째 항목 위 영역이면 처리
    let listContainer = null;
    if (!todoItem || !todoItem.classList.contains('todo-item')) {
      // 첫 번째 항목 위 빈 공간 감지
      listContainer = todosContent.querySelector(`[id^="todos-${state.draggedCategory}"]`);
      if (listContainer) {
        const containerRect = listContainer.getBoundingClientRect();
        const firstItem = listContainer.querySelector('.todo-item');
        
        // 마우스가 컨테이너 상단과 첫 번째 항목 사이에 있으면 첫 번째 항목 위로 삽입
        if (firstItem && e.clientY >= containerRect.top && e.clientY < firstItem.getBoundingClientRect().top) {
          todoItem = firstItem;
        }
      }
    }
    
    // todo-item을 찾지 못했지만, mousemove에서 저장한 정보가 있으면 사용
    let targetTodoId = null;
    let insertBefore = null;
    
    if (todoItem && todoItem.classList.contains('todo-item')) {
      targetTodoId = todoItem.dataset.todoId;
      const targetCategory = todoItem.dataset.category;
      
      // 같은 카테고리 내에서만 드롭 가능
      if (targetCategory !== state.draggedCategory || targetTodoId === currentDraggedTodoId) {
        state.isDragging = false;
        cleanup();
        return;
      }
      
      // dataset에서 insertBefore 읽기 (mousemove에서 설정한 값)
      // 만약 첫 번째 항목 위 빈 공간에서 드롭했다면 insertBefore = true
      if (listContainer && todoItem === listContainer.querySelector('.todo-item') && 
          e.clientY < todoItem.getBoundingClientRect().top) {
        insertBefore = true;
      } else {
        insertBefore = todoItem.dataset.insertBefore === 'true';
      }
    } else if (state.lastTargetTodoId && state.lastInsertBefore !== null) {
      // todo-item을 찾지 못했지만, mousemove에서 저장한 정보가 있으면 사용
      targetTodoId = state.lastTargetTodoId;
      insertBefore = state.lastInsertBefore;
    } else {
      // 둘 다 없으면 드롭 불가
      state.isDragging = false;
      cleanup();
      return;
    }
    
    state.isDragging = false;
    
    // 시각적 피드백 제거
    currentDraggedElement.classList.remove('dragging');
    currentDraggedElement.style.opacity = '';
    currentDraggedElement.style.transform = '';
    currentDraggedElement.style.cursor = '';
    currentDraggedElement.style.position = '';
    currentDraggedElement.style.zIndex = '';
    
    // 드롭 처리
    await handleDragDrop(currentDraggedTodoId, targetTodoId, insertBefore, state.date, state.profile, state.timezone);
    
    cleanup();
  };
  
  function cleanup() {
    document.querySelectorAll('.drag-insertion-line').forEach(el => el.remove());
    document.querySelectorAll('.todo-item').forEach(el => {
      delete el.dataset.insertBefore;
      if (el.dataset.todoId !== state.draggedTodoId) {
        el.style.opacity = '';
        el.style.boxShadow = '';
      }
    });
    
    // 상태 완전 초기화
    state.isDragging = false;
    state.draggedElement = null;
    state.draggedTodoId = null;
    state.draggedCategory = null;
    state.dragStartY = 0;
    state.dragOffsetY = 0;
    state.lastTargetTodoId = null;
    state.lastInsertBefore = null;
  }

  // 이벤트 리스너 등록
  todosContent.addEventListener('mousedown', handleMouseDown);
  document.addEventListener('mousemove', handleMouseMove);
  document.addEventListener('mouseup', handleMouseUp);
  document.addEventListener('mouseleave', handleMouseLeave);
  
  // 핸들러 저장 (나중에 제거하기 위해)
  window._dragDropHandlers = {
    todosContent: todosContent,
    mousedown: handleMouseDown,
    mousemove: handleMouseMove,
    mouseup: handleMouseUp,
    mouseleave: handleMouseLeave
  };
}

// 드롭 처리 함수
async function handleDragDrop(draggedTodoId, targetTodoId, insertBefore, date, profile, timezone) {
  try {
    const draggedTodo = todos.find(t => t.id === draggedTodoId);
    if (!draggedTodo || draggedTodo.is_done) return;
    
    const todoCategory = draggedTodo.category;
    
    // 같은 카테고리, 미완료, 같은 날짜 필터링
    const sameCategoryTodos = todos.filter(
      t => t.category === todoCategory && !t.is_done && t.date === date
    );
    
    // loadTodos와 동일한 정렬 적용
    const sortedTodos = sortTodosForDisplay(sameCategoryTodos);
    
    const draggedIndex = sortedTodos.findIndex(t => t.id === draggedTodoId);
    const targetIndex = sortedTodos.findIndex(t => t.id === targetTodoId);
    
    if (draggedIndex < 0 || targetIndex < 0) return;
    
    // 새 인덱스 계산 (더 간단하고 명확한 방법)
    // 드래그된 항목을 제거한 후의 배열에서의 새 위치를 계산
    let newIndex;
    
    if (insertBefore) {
      // 타겟 앞에 삽입
      if (draggedIndex < targetIndex) {
        // 드래그된 항목이 타겟보다 앞에 있으면, 드래그된 항목을 제거하면 타겟 인덱스가 1 감소
        newIndex = targetIndex - 1;
      } else {
        // 드래그된 항목이 타겟보다 뒤에 있으면, 드래그된 항목을 제거해도 타겟 인덱스는 그대로
        newIndex = targetIndex;
      }
    } else {
      // 타겟 뒤에 삽입
      if (draggedIndex < targetIndex) {
        // 드래그된 항목이 타겟보다 앞에 있으면, 드래그된 항목을 제거하면 타겟 인덱스가 1 감소
        // 타겟 뒤에 삽입하므로 새 인덱스 = (targetIndex - 1) + 1 = targetIndex
        newIndex = targetIndex;
      } else {
        // 드래그된 항목이 타겟보다 뒤에 있으면, 드래그된 항목을 제거해도 타겟 인덱스는 그대로
        // 타겟 뒤에 삽입하므로 새 인덱스 = targetIndex + 1
        newIndex = targetIndex + 1;
      }
    }
    
    // 범위 체크 (0 이상, 배열 길이 미만)
    // newIndex는 드래그된 항목을 제거한 후의 배열 기준이므로, 최대값은 sortedTodos.length - 1
    if (newIndex < 0) newIndex = 0;
    if (newIndex >= sortedTodos.length) newIndex = sortedTodos.length - 1;
    
    // 이미 올바른 위치에 있으면 업데이트하지 않음
    if (newIndex === draggedIndex) {
      console.log('[Drag] Already in correct position', { draggedIndex, newIndex, targetIndex, insertBefore });
      return;
    }
    
    console.log('[Drag] Moving todo', {
      draggedIndex,
      targetIndex,
      insertBefore,
      newIndex,
      totalItems: sortedTodos.length
    });
    
    // 드래그된 항목을 새 위치로 이동한 후, 전체 배열 재구성
    const draggedTodoItem = sortedTodos[draggedIndex];
    const newSortedTodos = [...sortedTodos];
    
    // 드래그된 항목을 원래 위치에서 제거
    newSortedTodos.splice(draggedIndex, 1);
    
    // 새 위치에 삽입
    newSortedTodos.splice(newIndex, 0, draggedTodoItem);
    
    // 모든 항목의 display_order를 재할당 (10 단위 간격으로 안정적 유지)
    const updatePromises = newSortedTodos.map((todo, index) => 
      supabase
        .from('todos')
        .update({ display_order: (index + 1) * 10 })
        .eq('id', todo.id)
    );
    
    await Promise.all(updatePromises);
    
    await loadTodos(date, profile, timezone);
  } catch (error) {
    console.error('Error handling drag drop:', error);
    alert('순서 변경 중 오류가 발생했습니다.');
  }
}

async function toggleTodoDone(todoId, isDone) {
  if (syncingTodo) return; // 동기화 중이면 무시
  
  try {
    syncingTodo = true;
    
    // todos 업데이트
    const { data: todo, error: todoError } = await supabase
      .from('todos')
      .update({
        is_done: isDone,
        done_at: isDone ? new Date().toISOString() : null
      })
      .eq('id', todoId)
      .select()
      .single();

    if (todoError) throw todoError;

    // 동기화: project_task_id가 있으면 프로젝트 할일도 업데이트
    if (todo && todo.project_task_id) {
      // 모든 연결된 todos 조회 (현재 활성 할일만 체크)
      const { data: allTodos, error: todosError } = await supabase
        .from('todos')
        .select('is_done')
        .eq('project_task_id', todo.project_task_id)
        .is('deleted_at', null)
        .is('carried_over_at', null)  // 이월된 원본 할일 제외
        .is('skipped_at', null);       // 포기된 원본 할일 제외

      if (todosError) {
        console.error('Error fetching todos for sync:', todosError);
      } else if (allTodos && allTodos.length > 0) {
        // 모든 todos가 완료되었는지 확인
        const allDone = allTodos.every(t => t.is_done);
        
        const { error: projectTaskError } = await supabase
          .from('project_tasks')
          .update({
            is_done: allDone,
            done_at: allDone ? new Date().toISOString() : null
          })
          .eq('id', todo.project_task_id);

        if (projectTaskError) {
          console.error('Error syncing project task:', projectTaskError);
          // 프로젝트 할일 동기화 실패해도 계속 진행
        }
      } else {
        // todos가 없으면 프로젝트 할일도 미완료로 설정
        const { error: projectTaskError } = await supabase
          .from('project_tasks')
          .update({
            is_done: false,
            done_at: null
          })
          .eq('id', todo.project_task_id);

        if (projectTaskError) {
          console.error('Error syncing project task (no todos):', projectTaskError);
        }
      }
    }
  } catch (error) {
    console.error('Error toggling todo:', error);
    alert('할일 상태 변경 중 오류가 발생했습니다.');
  } finally {
    syncingTodo = false;
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
    // todos 업데이트
    const { data: todo, error: todoError } = await supabase
      .from('todos')
      .update({ title: newTitle.trim() })
      .eq('id', todoId)
      .select()
      .single();

    if (todoError) throw todoError;

    // 동기화: project_task_id가 있으면 프로젝트 할일도 업데이트
    if (todo && todo.project_task_id) {
      const { error: projectTaskError } = await supabase
        .from('project_tasks')
        .update({ title: newTitle.trim() })
        .eq('id', todo.project_task_id);

      if (projectTaskError) {
        console.error('Error syncing project task title:', projectTaskError);
        // 프로젝트 할일 동기화 실패해도 계속 진행
      }
    }

    editingTodoId = null;
    editingTodoValue = '';
    await loadTodos(date, profile, timezone);
  } catch (error) {
    console.error('Error saving todo:', error);
    alert('할일 수정 중 오류가 발생했습니다.');
  }
}

// 공통 정렬 함수 (loadTodos와 동일한 정렬 로직)
// loadTodos의 정렬 순서: display_order → pinned → due_date → priority → created_at
function sortTodosForDisplay(todos) {
  return [...todos].sort((a, b) => {
    // 1. display_order (NULL은 마지막, nullsFirst: false)
    if (a.display_order !== null && b.display_order !== null) {
      if (a.display_order !== b.display_order) {
        return a.display_order - b.display_order;
      }
    } else {
      if (a.display_order !== null) return -1;
      if (b.display_order !== null) return 1;
      // 둘 다 NULL이면 다음 기준으로
    }
    
    // 2. pinned (내림차순: true가 먼저)
    if (a.pinned !== b.pinned) {
      return b.pinned ? 1 : -1;
    }
    
    // 3. due_date (NULL은 마지막, nullsFirst: false)
    if (a.due_date !== null && b.due_date !== null) {
      if (a.due_date !== b.due_date) {
        return a.due_date.localeCompare(b.due_date);
      }
    } else {
      if (a.due_date !== null) return -1;
      if (b.due_date !== null) return 1;
    }
    
    // 4. priority (내림차순, NULL은 마지막, nullsFirst: false)
    if (a.priority !== null && b.priority !== null) {
      if (a.priority !== b.priority) {
        return b.priority - a.priority;
      }
    } else {
      if (a.priority !== null) return -1;
      if (b.priority !== null) return 1;
    }
    
    // 5. created_at (오름차순)
    return new Date(a.created_at) - new Date(b.created_at);
  });
}

async function moveTodoUp(todoId, date, profile, timezone = 'Asia/Seoul') {
  try {
    const todo = todos.find(t => t.id === todoId);
    if (!todo || todo.is_done) return;

    // todo의 실제 category 사용 (activeTab에 의존하지 않음)
    const todoCategory = todo.category;
    
    // 같은 카테고리, 미완료, 같은 날짜 필터링
    const sameCategoryTodos = todos.filter(
      t => t.category === todoCategory && !t.is_done && t.date === date
    );
    
    // loadTodos와 동일한 정렬 적용
    const sortedTodos = sortTodosForDisplay(sameCategoryTodos);

    const currentIndex = sortedTodos.findIndex(t => t.id === todoId);
    if (currentIndex <= 0) return;

    const prevIndex = currentIndex - 1;
    
    // 인덱스 기반으로 display_order 재할당 (10 단위 간격으로 안정적 유지)
    await Promise.all([
      supabase.from('todos').update({ display_order: (prevIndex + 1) * 10 }).eq('id', todoId),
      supabase.from('todos').update({ display_order: (currentIndex + 1) * 10 }).eq('id', sortedTodos[prevIndex].id)
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
    
    // 같은 카테고리, 미완료, 같은 날짜 필터링
    const sameCategoryTodos = todos.filter(
      t => t.category === todoCategory && !t.is_done && t.date === date
    );
    
    // loadTodos와 동일한 정렬 적용
    const sortedTodos = sortTodosForDisplay(sameCategoryTodos);

    const currentIndex = sortedTodos.findIndex(t => t.id === todoId);
    if (currentIndex < 0 || currentIndex >= sortedTodos.length - 1) return;

    const nextIndex = currentIndex + 1;
    
    // 인덱스 기반으로 display_order 재할당 (10 단위 간격으로 안정적 유지)
    await Promise.all([
      supabase.from('todos').update({ display_order: (nextIndex + 1) * 10 }).eq('id', todoId),
      supabase.from('todos').update({ display_order: (currentIndex + 1) * 10 }).eq('id', sortedTodos[nextIndex].id)
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
  const formContainer = document.getElementById('reflection-form-container');

  if (!gratefulEl || !wellDoneEl || !regretEl || !tomorrowPromiseEl) return;

  if (reflection) {
    // 데이터가 있으면 폼에만 채우기 (섹션은 접혀있음)
    gratefulEl.value = reflection.grateful || '';
    wellDoneEl.value = reflection.well_done || '';
    regretEl.value = reflection.regret || '';
    tomorrowPromiseEl.value = reflection.tomorrow_promise || '';
  } else {
    // 데이터가 없으면 폼 초기화
    gratefulEl.value = '';
    wellDoneEl.value = '';
    regretEl.value = '';
    tomorrowPromiseEl.value = '';
  }
  
  // 폼은 기본적으로 숨김 (사용자가 "성찰 작성하기" 버튼을 눌렀을 때만 표시)
  if (formContainer) {
    formContainer.style.display = 'none';
  }

  // Lucide 아이콘 업데이트
  if (window.lucide?.createIcons) {
    setTimeout(() => window.lucide.createIcons(), 10);
  }
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
      .select(`
        *,
        project_task:project_tasks(
          id,
          project:projects(
            id,
            name
          )
        )
      `)
      .eq('user_id', profile.id)
      .lt('date', today)
      .eq('is_done', false)
      .is('deleted_at', null)
      .is('carried_over_at', null)
      .is('skipped_at', null)
      // project_task_id 조건 제거 - 프로젝트 할일도 포함
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
            <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem; flex-wrap: wrap;">
              <span style="font-size: 0.75rem; color: #6b7280; background: #e5e7eb; padding: 0.25rem 0.5rem; border-radius: 4px;">${categoryLabel}</span>
              <span style="font-size: 0.75rem; color: #6b7280;">${dateStr}</span>
              ${todo.project_task_id && todo.project_task?.project?.name ? `<span style="font-size: 0.7rem; padding: 0.15rem 0.4rem; border-radius: 4px; font-weight: 600; background: #e0e7ff; color: #4f46e5;">프로젝트: ${todo.project_task.project.name}</span>` : ''}
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

    // 프로젝트 할일인 경우: 오늘 날짜에 이미 등록된 할일이 있는지 확인
    if (originalTodo.project_task_id) {
      const { data: existingTodo } = await supabase
        .from('todos')
        .select('id')
        .eq('project_task_id', originalTodo.project_task_id)
        .eq('date', today)
        .is('deleted_at', null)
        .is('carried_over_at', null)  // 이월된 원본 할일 제외
        .is('skipped_at', null)       // 포기된 원본 할일 제외
        .maybeSingle();

      if (existingTodo) {
        // 이미 등록되어 있으면 새로 생성하지 않고 원본만 처리
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
            carryBtn.textContent = '이미 등록됨';
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
        return;
      }
    }

    // 반복업무 할일인 경우: 오늘 날짜에 이미 등록된 할일이 있는지 확인
    if (originalTodo.recurring_task_id) {
      const { data: existingTodo } = await supabase
        .from('todos')
        .select('id')
        .eq('recurring_task_id', originalTodo.recurring_task_id)
        .eq('date', today)
        .is('deleted_at', null)
        .is('carried_over_at', null)  // 이월된 원본 할일 제외
        .is('skipped_at', null)       // 포기된 원본 할일 제외
        .maybeSingle();

      if (existingTodo) {
        // 이미 등록되어 있으면 새로 생성하지 않고 원본만 처리
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
            carryBtn.textContent = '이미 등록됨';
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
        return;
      }
    }

    // 일반 할일 또는 프로젝트/반복업무 할일(중복 없음) - 오늘로 복제
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
        display_order: null,
        project_task_id: originalTodo.project_task_id || null,  // 프로젝트 할일인 경우 동기화 유지
        recurring_task_id: originalTodo.recurring_task_id || null  // 반복업무 할일인 경우 동기화 유지
      })
      .select()
      .single();

    if (insertError) throw insertError;

    // 프로젝트 할일인 경우: end_date를 오늘로 연장
    if (originalTodo.project_task_id) {
      // project_tasks 테이블에서 날짜 정보 조회
      const { data: projectTask, error: taskFetchError } = await supabase
        .from('project_tasks')
        .select('start_date, end_date, due_date')
        .eq('id', originalTodo.project_task_id)
        .single();

      if (!taskFetchError && projectTask) {
        const todayDate = new Date(today);
        let needsUpdate = false;
        const updateData = {};

        // start_date/end_date 방식 (새 방식)
        if (projectTask.end_date) {
          const endDate = new Date(projectTask.end_date);
          // end_date가 오늘 이전이면 오늘로 연장
          if (endDate < todayDate) {
            updateData.end_date = today;
            needsUpdate = true;
          }
        }
        // due_date 방식 (구 방식, 하위 호환성)
        else if (projectTask.due_date) {
          const dueDate = new Date(projectTask.due_date);
          // 마감날짜가 오늘 이전이면 오늘로 업데이트
          if (dueDate < todayDate) {
            updateData.due_date = today;
            needsUpdate = true;
          }
        }

        if (needsUpdate) {
          const { error: dateUpdateError } = await supabase
            .from('project_tasks')
            .update(updateData)
            .eq('id', originalTodo.project_task_id);

          if (dateUpdateError) {
            console.error('Error updating project task date:', dateUpdateError);
            // 날짜 업데이트 실패해도 계속 진행 (치명적이지 않음)
          }
        }
      }
    }

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
    // 원본 할일 조회 (project_task_id 확인용)
    const { data: todo, error: fetchError } = await supabase
      .from('todos')
      .select('project_task_id')
      .eq('id', todoId)
      .single();

    if (fetchError) throw fetchError;

    // 원본에 skipped_at 기록
    const { error } = await supabase
      .from('todos')
      .update({ skipped_at: new Date().toISOString() })
      .eq('id', todoId);

    if (error) throw error;

    // 프로젝트 할일/반복업무 포기 시: project_tasks의 due_date는 수정하지 않음
    // (시작일/종료일 기반으로 동작하며, 포기한 할일은 skipped_at으로만 표시)

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
    
    // ✅ 저장 후 섹션 접기
    const content = document.getElementById('reflection-content');
    const formContainer = document.getElementById('reflection-form-container');
    const toggleBtn = document.getElementById('toggle-reflection');
    
    if (content) {
      content.style.display = 'none';
    }
    if (formContainer) {
      formContainer.style.display = 'none';
    }
    // 토글 아이콘 업데이트
    if (toggleBtn) {
      const icon = toggleBtn.querySelector('svg') || 
                   toggleBtn.querySelector('[data-lucide]') || 
                   toggleBtn.querySelector('i');
      if (icon) {
        icon.setAttribute('data-lucide', 'chevron-up');
        if (window.lucide?.createIcons) {
          setTimeout(() => window.lucide.createIcons(), 10);
        }
      }
    }
    
    // 데이터 다시 로드 (폼에 저장된 데이터 채우기)
    await loadReflection(date, profile);
  } catch (error) {
    console.error('Error saving reflection:', error);
    alert('성찰 저장 중 오류가 발생했습니다.');
  }
}

// ============================================
// 할일 날짜 이동 관련 함수들
// ============================================

let currentMovingTodoId = null;
let currentSelectedDateForMove = null;
let currentProfileForMove = null;
let currentTimezoneForMove = null;
let currentTodoDateForMove = null; // 할일의 현재 날짜 (비교용)

// ============================================
// 할일 복제 관련 함수들
// ============================================

let currentDuplicatingTodoId = null;
let currentSelectedDateForDuplicate = null;
let currentProfileForDuplicate = null;
let currentTimezoneForDuplicate = null;
let currentTodoForDuplicate = null; // 복제할 할일 객체
let todoDuplicatePickerInitialized = false;

function openTodoDatePicker(todoId, currentDate, selectedDate, profile, timezone = 'Asia/Seoul') {
  const overlay = document.getElementById('todo-date-overlay');
  const calendarInput = document.getElementById('todo-date-calendar-input');
  const today = getToday(timezone);
  
  if (!overlay || !calendarInput || !window.flatpickr) {
    console.error('Todo date picker elements not found or flatpickr not loaded');
    return;
  }
  
  // 전역 변수에 현재 값 저장 (onChange 콜백에서 사용)
  currentMovingTodoId = todoId;
  currentSelectedDateForMove = selectedDate;
  currentProfileForMove = profile;
  currentTimezoneForMove = timezone;
  currentTodoDateForMove = currentDate; // 할일의 현재 날짜 저장
  console.log('[openTodoDatePicker] Global variables set', { todoId, currentDate, selectedDate, profile: profile?.id, timezone });
  
  const closeOverlay = () => {
    if (overlay) {
      overlay.classList.add('hidden');
      overlay.style.display = 'none';
    }
    currentMovingTodoId = null;
    currentSelectedDateForMove = null;
    currentProfileForMove = null;
    currentTimezoneForMove = null;
    currentTodoDateForMove = null;
    if (window.lucide?.createIcons) {
      setTimeout(() => window.lucide.createIcons(), 10);
    }
  };
  
  // flatpickr 초기화 (매번 새로 생성하여 최신 콜백 보장)
  if (calendarInput._fp) {
    calendarInput._fp.destroy();
    calendarInput._fp = null;
  }
  
  // 초기화 완료 플래그
  let isReady = false;
  let lastSelectedDate = currentDate; // 마지막으로 선택된 날짜 추적
  
  calendarInput._fp = window.flatpickr(calendarInput, {
    inline: true,
    defaultDate: currentDate,
    locale: (window.flatpickr.l10ns && window.flatpickr.l10ns.ko) ? window.flatpickr.l10ns.ko : undefined,
    onReady: (dates, dateStr, instance) => {
      // 초기화 완료 후 플래그 설정
      console.log('[TodoDatePicker] onReady called', { dates, dateStr, instance });
      isReady = true;
      if (dates && dates[0]) {
        // 로컬 날짜 사용 (UTC 변환 방지)
        const d = dates[0];
        lastSelectedDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      }
      
      // flatpickr 캘린더의 날짜 클릭 이벤트 직접 리스닝 (onChange가 제대로 작동하지 않을 때를 대비)
      const handleDateClick = async (e) => {
        // flatpickr-day 클래스를 가진 요소만 처리
        const dayElement = e.target.closest('.flatpickr-day');
        if (!dayElement || !isReady) return;
        
        // 선택 불가능한 날짜는 무시
        if (dayElement.classList.contains('flatpickr-disabled')) return;
        
        // 클릭한 날짜를 직접 추출 (data-day 속성 또는 텍스트에서)
        let clickedDate = null;
        
        // 로컬 날짜를 YYYY-MM-DD 형식으로 변환하는 헬퍼 함수
        const formatLocalDate = (date) => {
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          return `${year}-${month}-${day}`;
        };
        
        // 방법 1: data-day 속성 확인
        if (dayElement.dataset.day) {
          const day = parseInt(dayElement.dataset.day);
          const month = instance?.currentMonth || 0;
          const year = instance?.currentYear || new Date().getFullYear();
          clickedDate = formatLocalDate(new Date(year, month, day));
        }
        // 방법 2: flatpickr 인스턴스에서 선택된 날짜 확인 (약간의 지연 후)
        else if (instance) {
          setTimeout(() => {
            if (instance.selectedDates && instance.selectedDates.length > 0) {
              clickedDate = formatLocalDate(instance.selectedDates[0]);
              processDateClick(clickedDate);
            }
          }, 100);
          return; // 비동기 처리이므로 여기서 리턴
        }
        
        if (clickedDate) {
          processDateClick(clickedDate);
        }
      };
      
      // 날짜 클릭 처리 함수 (중복 코드 제거)
      const processDateClick = async (clickedDate) => {
        console.log('[TodoDatePicker] Date clicked directly', { clickedDate, currentTodoDate: currentTodoDateForMove });
        
        // 날짜가 변경되지 않았으면 무시
        if (clickedDate === lastSelectedDate) {
          return;
        }
        
        // 마지막 선택된 날짜 업데이트
        lastSelectedDate = clickedDate;
        
        if (currentMovingTodoId && currentSelectedDateForMove && currentProfileForMove && currentTimezoneForMove && currentTodoDateForMove) {
          // 같은 날짜로 이동하려고 하면 모달만 닫기
          if (clickedDate === currentTodoDateForMove) {
            console.log('[TodoDatePicker] Same date clicked, closing modal');
            closeOverlay();
            return;
          }
          
          console.log('[TodoDatePicker] Moving todo via direct click', { todoId: currentMovingTodoId, clickedDate, currentSelectedDate: currentSelectedDateForMove });
          await moveTodoDate(currentMovingTodoId, clickedDate, currentSelectedDateForMove, currentProfileForMove, currentTimezoneForMove);
          closeOverlay();
        }
      };
      
      // 캘린더 컨테이너에 이벤트 리스너 추가 (이벤트 위임)
      const calendarContainer = instance?.calendarContainer;
      if (calendarContainer) {
        // 기존 리스너 제거 (중복 방지)
        calendarContainer.removeEventListener('click', handleDateClick);
        calendarContainer.addEventListener('click', handleDateClick);
      }
    },
    onChange: async (dates, dateStr, instance) => {
      console.log('[TodoDatePicker] onChange called', { 
        dates, 
        dateStr, 
        instanceSelectedDates: instance?.selectedDates,
        isReady,
        currentMovingTodoId, 
        currentTodoDateForMove, 
        currentSelectedDateForMove, 
        currentProfileForMove, 
        currentTimezoneForMove 
      });
      
      // 초기화가 완료되지 않았으면 무시
      if (!isReady) {
        console.log('[TodoDatePicker] Not ready yet, ignoring');
        return;
      }
      
      // dateStr을 우선 사용 (이미 올바른 날짜를 가지고 있음)
      // instance.selectedDates는 비동기로 업데이트되어 타이밍 이슈가 있음
      let newDate = null;
      
      // 로컬 날짜를 YYYY-MM-DD 형식으로 변환하는 헬퍼 함수
      const formatLocalDate = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };
      
      // 1순위: dateStr 사용 (가장 신뢰할 수 있음)
      if (dateStr) {
        newDate = dateStr;
        console.log('[TodoDatePicker] Using dateStr (primary)', { newDate });
      } 
      // 2순위: dates 배열 사용 (로컬 날짜로 변환)
      else if (dates && dates.length > 0 && dates[0]) {
        newDate = formatLocalDate(dates[0]);
        console.log('[TodoDatePicker] Using dates[0]', { newDate });
      } 
      // 3순위: instance.selectedDates 사용 (로컬 날짜로 변환)
      else if (instance && instance.selectedDates && instance.selectedDates.length > 0) {
        newDate = formatLocalDate(instance.selectedDates[0]);
        console.log('[TodoDatePicker] Using instance.selectedDates[0] (fallback)', { newDate });
      }
      
      if (!newDate) {
        console.warn('[TodoDatePicker] No date found in onChange');
        return;
      }
      
      // 날짜가 변경되지 않았으면 무시 (중복 호출 방지)
      if (newDate === lastSelectedDate) {
        console.log('[TodoDatePicker] Date unchanged, ignoring', { newDate, lastSelectedDate });
        return;
      }
      
      // 마지막 선택된 날짜 업데이트
      lastSelectedDate = newDate;
      
      if (currentMovingTodoId && currentSelectedDateForMove && currentProfileForMove && currentTimezoneForMove && currentTodoDateForMove) {
        console.log('[TodoDatePicker] Date comparison', { newDate, currentTodoDate: currentTodoDateForMove, isDifferent: newDate !== currentTodoDateForMove });
        
        // 같은 날짜로 이동하려고 하면 모달만 닫기
        if (newDate === currentTodoDateForMove) {
          console.log('[TodoDatePicker] Same date selected, closing modal');
          closeOverlay();
          return;
        }
        
        console.log('[TodoDatePicker] Moving todo', { todoId: currentMovingTodoId, newDate, currentSelectedDate: currentSelectedDateForMove });
        await moveTodoDate(currentMovingTodoId, newDate, currentSelectedDateForMove, currentProfileForMove, currentTimezoneForMove);
        closeOverlay();
      } else {
        console.warn('[TodoDatePicker] onChange conditions not met', { 
          hasNewDate: !!newDate,
          hasTodoId: !!currentMovingTodoId, 
          hasTodoDate: !!currentTodoDateForMove,
          hasSelectedDate: !!currentSelectedDateForMove, 
          hasProfile: !!currentProfileForMove, 
          hasTimezone: !!currentTimezoneForMove 
        });
      }
    },
  });
  
  // 이벤트 리스너는 한 번만 등록 (중복 방지)
  if (!todoDatePickerInitialized) {
    const closeBtn = document.getElementById('todo-date-close');
    const closeFooterBtn = document.getElementById('todo-date-close-footer');
    const todayBtn = document.getElementById('todo-date-today-modal');
    
    if (closeBtn) {
      closeBtn.onclick = closeOverlay;
    }
    if (closeFooterBtn) {
      closeFooterBtn.onclick = closeOverlay;
    }
    if (todayBtn) {
      todayBtn.onclick = async () => {
        if (currentMovingTodoId && currentSelectedDateForMove && currentProfileForMove && currentTimezoneForMove) {
          const today = getToday(currentTimezoneForMove);
          await moveTodoDate(currentMovingTodoId, today, currentSelectedDateForMove, currentProfileForMove, currentTimezoneForMove);
          closeOverlay();
        }
      };
    }
    
    // 오버레이 배경 클릭 시 닫기 (이벤트 위임 사용)
    if (overlay) {
      overlay.onclick = (e) => {
        if (e.target === overlay) {
          closeOverlay();
        }
      };
    }
    
    todoDatePickerInitialized = true;
  }
  
  // 오버레이 표시
  overlay.classList.remove('hidden');
  overlay.style.display = 'flex';
  
  // Lucide 아이콘 업데이트
  if (window.lucide?.createIcons) {
    setTimeout(() => window.lucide.createIcons(), 10);
  }
}

async function moveTodoDate(todoId, newDate, currentSelectedDate, profile, timezone = 'Asia/Seoul') {
  try {
    console.log('[moveTodoDate] Starting', { todoId, newDate, currentSelectedDate });
    
    // 원본 할일 조회 (project_task_id 확인용)
    const { data: todo, error: fetchError } = await supabase
      .from('todos')
      .select('project_task_id')
      .eq('id', todoId)
      .single();

    if (fetchError) throw fetchError;

    // todos 날짜 업데이트
    const { error } = await supabase
      .from('todos')
      .update({ date: newDate })
      .eq('id', todoId);

    if (error) throw error;

    // 프로젝트 할일인 경우: end_date 또는 due_date 동기화
    if (todo && todo.project_task_id) {
      // project_tasks 테이블에서 날짜 정보 조회
      const { data: projectTask, error: taskFetchError } = await supabase
        .from('project_tasks')
        .select('start_date, end_date, due_date')
        .eq('id', todo.project_task_id)
        .single();

      if (!taskFetchError && projectTask) {
        const updateData = {};
        
        // start_date/end_date 방식 (새 방식)
        if (projectTask.end_date) {
          updateData.end_date = newDate;
        }
        // due_date 방식 (구 방식, 하위 호환성)
        else if (projectTask.due_date) {
          updateData.due_date = newDate;
        }

        if (Object.keys(updateData).length > 0) {
          const { error: dateUpdateError } = await supabase
            .from('project_tasks')
            .update(updateData)
            .eq('id', todo.project_task_id);

          if (dateUpdateError) {
            console.error('Error syncing project task date:', dateUpdateError);
            // 날짜 동기화 실패해도 계속 진행
          }
        }
      }
    }

    console.log('[moveTodoDate] Success, reloading todos');
    // 현재 선택된 날짜의 할일 목록 새로고침
    await loadTodos(currentSelectedDate, profile, timezone);
  } catch (error) {
    console.error('Error moving todo date:', error);
    alert('할일 날짜 이동 중 오류가 발생했습니다.');
  }
}

function openTodoDuplicatePicker(todoId, currentDate, selectedDate, profile, timezone = 'Asia/Seoul') {
  const overlay = document.getElementById('todo-duplicate-overlay');
  const calendarInput = document.getElementById('todo-duplicate-calendar-input');
  const today = getToday(timezone);
  
  if (!overlay || !calendarInput || !window.flatpickr) {
    console.error('Todo duplicate picker elements not found or flatpickr not loaded');
    return;
  }
  
  // 복제할 할일 정보 조회
  const todo = todos.find(t => t.id === todoId);
  if (!todo) {
    console.error('Todo not found for duplication', { todoId });
    alert('할일을 찾을 수 없습니다.');
    return;
  }
  
  // 전역 변수에 현재 값 저장 (onChange 콜백에서 사용)
  currentDuplicatingTodoId = todoId;
  currentSelectedDateForDuplicate = selectedDate;
  currentProfileForDuplicate = profile;
  currentTimezoneForDuplicate = timezone;
  currentTodoForDuplicate = todo; // 할일 객체 저장
  console.log('[openTodoDuplicatePicker] Global variables set', { todoId, currentDate, selectedDate, profile: profile?.id, timezone });
  
  const closeOverlay = () => {
    if (overlay) {
      overlay.classList.add('hidden');
      overlay.style.display = 'none';
    }
    currentDuplicatingTodoId = null;
    currentSelectedDateForDuplicate = null;
    currentProfileForDuplicate = null;
    currentTimezoneForDuplicate = null;
    currentTodoForDuplicate = null;
    if (window.lucide?.createIcons) {
      setTimeout(() => window.lucide.createIcons(), 10);
    }
  };
  
  // flatpickr 초기화 (매번 새로 생성하여 최신 콜백 보장)
  if (calendarInput._fp) {
    calendarInput._fp.destroy();
    calendarInput._fp = null;
  }
  
  // 초기화 완료 플래그
  let isReady = false;
  let lastSelectedDate = selectedDate; // 마지막으로 선택된 날짜 추적 (기본값은 현재 선택된 날짜)
  
  calendarInput._fp = window.flatpickr(calendarInput, {
    inline: true,
    defaultDate: selectedDate,
    locale: (window.flatpickr.l10ns && window.flatpickr.l10ns.ko) ? window.flatpickr.l10ns.ko : undefined,
    onReady: (dates, dateStr, instance) => {
      console.log('[TodoDuplicatePicker] onReady called', { dates, dateStr, instance });
      isReady = true;
      
      // 로컬 날짜를 YYYY-MM-DD 형식으로 변환하는 헬퍼 함수
      const formatLocalDate = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };
      
      if (dates && dates[0]) {
        lastSelectedDate = formatLocalDate(dates[0]);
      }
      
      // flatpickr 캘린더의 날짜 클릭 이벤트 직접 리스닝
      const handleDateClick = async (e) => {
        const dayElement = e.target.closest('.flatpickr-day');
        if (!dayElement || !isReady) return;
        
        if (dayElement.classList.contains('flatpickr-disabled')) return;
        
        let clickedDate = null;
        
        if (dayElement.dataset.day) {
          const day = parseInt(dayElement.dataset.day);
          const month = instance?.currentMonth || 0;
          const year = instance?.currentYear || new Date().getFullYear();
          clickedDate = formatLocalDate(new Date(year, month, day));
        } else if (instance) {
          setTimeout(() => {
            if (instance.selectedDates && instance.selectedDates.length > 0) {
              clickedDate = formatLocalDate(instance.selectedDates[0]);
              processDateClick(clickedDate);
            }
          }, 100);
          return;
        }
        
        if (clickedDate) {
          processDateClick(clickedDate);
        }
      };
      
      const processDateClick = async (clickedDate) => {
        console.log('[TodoDuplicatePicker] Date clicked directly', { clickedDate });
        
        if (clickedDate === lastSelectedDate) {
          return;
        }
        
        lastSelectedDate = clickedDate;
        
        if (currentDuplicatingTodoId && currentSelectedDateForDuplicate && currentProfileForDuplicate && currentTimezoneForDuplicate && currentTodoForDuplicate) {
          console.log('[TodoDuplicatePicker] Duplicating todo via direct click', { todoId: currentDuplicatingTodoId, clickedDate });
          await duplicateTodo(currentDuplicatingTodoId, clickedDate, currentSelectedDateForDuplicate, currentProfileForDuplicate, currentTimezoneForDuplicate, currentTodoForDuplicate);
          closeOverlay();
        }
      };
      
      const calendarContainer = instance?.calendarContainer;
      if (calendarContainer) {
        calendarContainer.removeEventListener('click', handleDateClick);
        calendarContainer.addEventListener('click', handleDateClick);
      }
    },
    onChange: async (dates, dateStr, instance) => {
      console.log('[TodoDuplicatePicker] onChange called', { 
        dates, 
        dateStr, 
        instanceSelectedDates: instance?.selectedDates,
        isReady,
        currentDuplicatingTodoId, 
        currentSelectedDateForDuplicate, 
        currentProfileForDuplicate, 
        currentTimezoneForDuplicate 
      });
      
      if (!isReady) {
        console.log('[TodoDuplicatePicker] Not ready yet, ignoring');
        return;
      }
      
      let newDate = null;
      
      // 로컬 날짜를 YYYY-MM-DD 형식으로 변환하는 헬퍼 함수
      const formatLocalDate = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };
      
      if (dateStr) {
        newDate = dateStr;
        console.log('[TodoDuplicatePicker] Using dateStr (primary)', { newDate });
      } else if (dates && dates.length > 0 && dates[0]) {
        newDate = formatLocalDate(dates[0]);
        console.log('[TodoDuplicatePicker] Using dates[0]', { newDate });
      } else if (instance && instance.selectedDates && instance.selectedDates.length > 0) {
        newDate = formatLocalDate(instance.selectedDates[0]);
        console.log('[TodoDuplicatePicker] Using instance.selectedDates[0] (fallback)', { newDate });
      }
      
      if (!newDate) {
        console.warn('[TodoDuplicatePicker] No date found in onChange');
        return;
      }
      
      if (newDate === lastSelectedDate) {
        console.log('[TodoDuplicatePicker] Date unchanged, ignoring', { newDate, lastSelectedDate });
        return;
      }
      
      lastSelectedDate = newDate;
      
      if (currentDuplicatingTodoId && currentSelectedDateForDuplicate && currentProfileForDuplicate && currentTimezoneForDuplicate && currentTodoForDuplicate) {
        console.log('[TodoDuplicatePicker] Duplicating todo', { todoId: currentDuplicatingTodoId, newDate, currentSelectedDate: currentSelectedDateForDuplicate });
        await duplicateTodo(currentDuplicatingTodoId, newDate, currentSelectedDateForDuplicate, currentProfileForDuplicate, currentTimezoneForDuplicate, currentTodoForDuplicate);
        closeOverlay();
      } else {
        console.warn('[TodoDuplicatePicker] onChange conditions not met', { 
          hasNewDate: !!newDate,
          hasTodoId: !!currentDuplicatingTodoId, 
          hasTodo: !!currentTodoForDuplicate,
          hasSelectedDate: !!currentSelectedDateForDuplicate, 
          hasProfile: !!currentProfileForDuplicate, 
          hasTimezone: !!currentTimezoneForDuplicate 
        });
      }
    },
  });
  
  // 이벤트 리스너는 한 번만 등록 (중복 방지)
  if (!todoDuplicatePickerInitialized) {
    const closeBtn = document.getElementById('todo-duplicate-close');
    const closeFooterBtn = document.getElementById('todo-duplicate-close-footer');
    const todayBtn = document.getElementById('todo-duplicate-today-modal');
    
    if (closeBtn) {
      closeBtn.onclick = closeOverlay;
    }
    if (closeFooterBtn) {
      closeFooterBtn.onclick = closeOverlay;
    }
    if (todayBtn) {
      todayBtn.onclick = async () => {
        if (currentDuplicatingTodoId && currentSelectedDateForDuplicate && currentProfileForDuplicate && currentTimezoneForDuplicate && currentTodoForDuplicate) {
          const today = getToday(currentTimezoneForDuplicate);
          await duplicateTodo(currentDuplicatingTodoId, today, currentSelectedDateForDuplicate, currentProfileForDuplicate, currentTimezoneForDuplicate, currentTodoForDuplicate);
          closeOverlay();
        }
      };
    }
    
    // 오버레이 배경 클릭 시 닫기
    if (overlay) {
      overlay.onclick = (e) => {
        if (e.target === overlay) {
          closeOverlay();
        }
      };
    }
    
    todoDuplicatePickerInitialized = true;
  }
  
  // 오버레이 표시
  overlay.classList.remove('hidden');
  overlay.style.display = 'flex';
  
  // Lucide 아이콘 업데이트
  if (window.lucide?.createIcons) {
    setTimeout(() => window.lucide.createIcons(), 10);
  }
}

async function duplicateTodo(todoId, newDate, currentSelectedDate, profile, timezone = 'Asia/Seoul', todo) {
  try {
    console.log('[duplicateTodo] Starting', { todoId, newDate, currentSelectedDate, todo });
    
    // 원본 할일의 정보를 복사하여 새 할일 생성
    const { error } = await supabase
      .from('todos')
      .insert({
        user_id: profile.id,
        date: newDate,
        category: todo.category,
        title: todo.title,
        memo: todo.memo || null,
        due_date: todo.due_date || null,
        priority: todo.priority || null,
        pinned: todo.pinned || false,
        is_done: false, // 복제된 할일은 미완료 상태로 시작
        done_at: null,
        display_order: null, // 순서는 자동으로 결정됨
        project_task_id: todo.project_task_id || null,  // 프로젝트 할일인 경우 동기화 유지
        recurring_task_id: todo.recurring_task_id || null  // 반복업무 할일인 경우 동기화 유지
      });

    if (error) throw error;

    console.log('[duplicateTodo] Success, reloading todos');
    // 현재 선택된 날짜의 할일 목록 새로고침
    await loadTodos(currentSelectedDate, profile, timezone);
  } catch (error) {
    console.error('Error duplicating todo:', error);
    alert('할일 복제 중 오류가 발생했습니다.');
  }
}
