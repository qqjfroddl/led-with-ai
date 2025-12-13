import { supabase } from '../config/supabase.js';
import { getCurrentProfile } from '../utils/auth.js';
import { getToday } from '../utils/date.js';

export async function renderGoals() {
  const html = `
    <div class="card">
      <div class="card-header">
        <div class="card-title">목표 관리</div>
      </div>
      <p style="color: var(--text-secondary); margin-bottom: 1.5rem;">
        연간 목표 및 월간 실천계획을 관리합니다.
      </p>
    </div>

    <!-- 월간 데일리 루틴 -->
    <div class="card" style="background: linear-gradient(135deg, #f0e7ff 0%, #fce7f3 100%); border: 2px solid #a78bfa; box-shadow: 0 8px 24px rgba(167, 139, 250, 0.15);">
      <div class="card-header" style="border-bottom: 2px solid rgba(167, 139, 250, 0.2); padding-bottom: 1rem; margin-bottom: 1.25rem;">
        <div style="display: flex; align-items: center; gap: 0.75rem;">
          <div style="width: 40px; height: 40px; background: linear-gradient(135deg, #a78bfa 0%, #c084fc 100%); border-radius: 12px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(167, 139, 250, 0.3);">
            <i data-lucide="repeat" style="width: 24px; height: 24px; color: white; stroke-width: 2.5;"></i>
          </div>
          <div>
            <div class="card-title" style="color: #7c3aed; font-size: 1.5rem; margin: 0;">월간 데일리 루틴</div>
            <p style="color: #6b7280; font-size: 0.9rem; margin: 0.25rem 0 0 0;" id="routine-month-label">12월 매일 실천할 루틴</p>
          </div>
        </div>
      </div>

      <!-- 보기 모드 -->
      <div id="routines-view-mode" style="display: none;">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; margin-bottom: 1.5rem;">
          <!-- 모닝루틴 표시 -->
          <div id="morning-display-section">
            <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1rem;">
              <i data-lucide="sunrise" style="width: 20px; height: 20px; color: #f59e0b;"></i>
              <h4 style="color: #7c3aed; font-weight: 600; margin: 0;">모닝루틴</h4>
            </div>
            <div id="morning-display-list" style="display: flex; flex-direction: column; gap: 0.5rem;"></div>
            <div id="morning-empty" style="color: #9ca3af; font-size: 0.9rem; padding: 1rem 0; display: none;">
              등록된 모닝루틴이 없습니다
            </div>
          </div>

          <!-- 나이트루틴 표시 -->
          <div id="night-display-section">
            <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1rem;">
              <i data-lucide="moon" style="width: 20px; height: 20px; color: #6366f1;"></i>
              <h4 style="color: #7c3aed; font-weight: 600; margin: 0;">나이트루틴</h4>
            </div>
            <div id="night-display-list" style="display: flex; flex-direction: column; gap: 0.5rem;"></div>
            <div id="night-empty" style="color: #9ca3af; font-size: 0.9rem; padding: 1rem 0; display: none;">
              등록된 나이트루틴이 없습니다
            </div>
          </div>
        </div>
        <button id="edit-routines-btn" class="btn btn-secondary">수정하기</button>
      </div>

      <!-- 편집 모드 -->
      <div id="routines-edit-mode" style="display: none;">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; margin-bottom: 1.5rem;">
          <!-- 모닝루틴 입력 -->
          <div>
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem;">
              <div style="display: flex; align-items: center; gap: 0.5rem;">
                <i data-lucide="sunrise" style="width: 20px; height: 20px; color: #f59e0b;"></i>
                <h4 style="color: #7c3aed; font-weight: 600; margin: 0;">모닝루틴</h4>
              </div>
              <span style="font-size: 0.85rem; color: #9ca3af;" id="morning-count">0/10</span>
            </div>
            <div id="morning-routines-list" style="display: flex; flex-direction: column; gap: 0.75rem; margin-bottom: 0.75rem;"></div>
            <button id="add-morning-routine-btn" class="btn btn-sm" style="background: white; color: #a78bfa; border: 2px dashed #a78bfa; width: 100%;">
              <i data-lucide="plus" style="width: 16px; height: 16px;"></i>
              모닝루틴 추가
            </button>
          </div>

          <!-- 나이트루틴 입력 -->
          <div>
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem;">
              <div style="display: flex; align-items: center; gap: 0.5rem;">
                <i data-lucide="moon" style="width: 20px; height: 20px; color: #6366f1;"></i>
                <h4 style="color: #7c3aed; font-weight: 600; margin: 0;">나이트루틴</h4>
              </div>
              <span style="font-size: 0.85rem; color: #9ca3af;" id="night-count">0/10</span>
            </div>
            <div id="night-routines-list" style="display: flex; flex-direction: column; gap: 0.75rem; margin-bottom: 0.75rem;"></div>
            <button id="add-night-routine-btn" class="btn btn-sm" style="background: white; color: #a78bfa; border: 2px dashed #a78bfa; width: 100%;">
              <i data-lucide="plus" style="width: 16px; height: 16px;"></i>
              나이트루틴 추가
            </button>
          </div>
        </div>
        <div style="display: flex; gap: 0.75rem;">
          <button id="save-routines-btn" class="btn" style="background: linear-gradient(135deg, #a78bfa 0%, #c084fc 100%); color: white; border: none; box-shadow: 0 4px 12px rgba(167, 139, 250, 0.3);">저장하기</button>
          <button id="cancel-edit-btn" class="btn btn-secondary">취소</button>
        </div>
      </div>

      <!-- 로딩 상태 -->
      <div id="routines-loading" style="text-align: center; padding: 2rem; color: #9ca3af;">
        <i data-lucide="loader" class="spin" style="width: 24px; height: 24px;"></i>
        <p style="margin-top: 0.5rem;">로딩 중...</p>
      </div>
    </div>

    <!-- 연간 목표 -->
    <div class="card" style="background: linear-gradient(135deg, #e0e7ff 0%, #f3e8ff 100%); border: 2px solid #6366f1; box-shadow: 0 8px 24px rgba(99, 102, 241, 0.15); margin-top: 1.5rem;">
      <div class="card-header" style="border-bottom: 2px solid rgba(99, 102, 241, 0.2); padding-bottom: 1rem; margin-bottom: 1.25rem;">
        <div style="display: flex; align-items: center; gap: 0.75rem;">
          <div style="width: 40px; height: 40px; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); border-radius: 12px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);">
            <i data-lucide="target" style="width: 24px; height: 24px; color: white; stroke-width: 2.5;"></i>
          </div>
          <div style="flex: 1;">
            <div class="card-title" style="color: #4f46e5; font-size: 1.5rem; margin: 0;">연간 목표</div>
          </div>
          <div style="display: flex; align-items: center; gap: 0.5rem;">
            <button id="yearly-goal-prev-btn" class="btn-icon" style="background: white; border: 1px solid #6366f1; color: #6366f1; padding: 0.25rem 0.5rem; border-radius: 6px; cursor: pointer;">
              <i data-lucide="chevron-left" style="width: 18px; height: 18px;"></i>
            </button>
            <span id="yearly-goal-year-label" style="font-size: 1rem; font-weight: 600; color: #4f46e5; min-width: 60px; text-align: center;">2025년</span>
            <button id="yearly-goal-next-btn" class="btn-icon" style="background: white; border: 1px solid #6366f1; color: #6366f1; padding: 0.25rem 0.5rem; border-radius: 6px; cursor: pointer;">
              <i data-lucide="chevron-right" style="width: 18px; height: 18px;"></i>
            </button>
          </div>
        </div>
      </div>

      <!-- 보기 모드 -->
      <div id="yearly-goals-view-mode" style="display: none;">
        <div style="display: flex; flex-direction: column; gap: 1.5rem;">
          <div>
            <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.75rem;">
              <i data-lucide="book-open" style="width: 18px; height: 18px; color: #6366f1;"></i>
              <h4 style="color: #4f46e5; font-weight: 600; margin: 0; font-size: 1.1rem;">자기계발</h4>
            </div>
            <div id="yearly-goal-self-dev-display" style="background: white; padding: 1rem; border-radius: 8px; min-height: 60px; color: #374151; line-height: 1.6; white-space: pre-wrap;"></div>
            <div id="yearly-goal-self-dev-empty" style="background: white; padding: 1rem; border-radius: 8px; color: #9ca3af; font-size: 0.9rem; display: none; text-align: center;">
              목표를 입력해주세요
            </div>
          </div>

          <div>
            <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.75rem;">
              <i data-lucide="heart" style="width: 18px; height: 18px; color: #ec4899;"></i>
              <h4 style="color: #4f46e5; font-weight: 600; margin: 0; font-size: 1.1rem;">관계</h4>
            </div>
            <div id="yearly-goal-relationship-display" style="background: white; padding: 1rem; border-radius: 8px; min-height: 60px; color: #374151; line-height: 1.6; white-space: pre-wrap;"></div>
            <div id="yearly-goal-relationship-empty" style="background: white; padding: 1rem; border-radius: 8px; color: #9ca3af; font-size: 0.9rem; display: none; text-align: center;">
              목표를 입력해주세요
            </div>
          </div>

          <div>
            <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.75rem;">
              <i data-lucide="briefcase" style="width: 18px; height: 18px; color: #10b981;"></i>
              <h4 style="color: #4f46e5; font-weight: 600; margin: 0; font-size: 1.1rem;">업무/재정</h4>
            </div>
            <div id="yearly-goal-work-finance-display" style="background: white; padding: 1rem; border-radius: 8px; min-height: 60px; color: #374151; line-height: 1.6; white-space: pre-wrap;"></div>
            <div id="yearly-goal-work-finance-empty" style="background: white; padding: 1rem; border-radius: 8px; color: #9ca3af; font-size: 0.9rem; display: none; text-align: center;">
              목표를 입력해주세요
            </div>
          </div>
        </div>
        <button id="edit-yearly-goals-btn" class="btn btn-secondary" style="margin-top: 1.5rem;">수정하기</button>
      </div>

      <!-- 편집 모드 -->
      <div id="yearly-goals-edit-mode" style="display: none;">
        <div style="display: flex; flex-direction: column; gap: 1.5rem;">
          <div>
            <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.75rem;">
              <i data-lucide="book-open" style="width: 18px; height: 18px; color: #6366f1;"></i>
              <h4 style="color: #4f46e5; font-weight: 600; margin: 0; font-size: 1.1rem;">자기계발</h4>
            </div>
            <textarea id="yearly-goal-self-dev-input" placeholder="예: 매일 30분 독서하기, 새로운 언어 배우기..." style="width: 100%; min-height: 100px; padding: 1rem; border: 2px solid #6366f1; border-radius: 8px; font-size: 1rem; font-family: inherit; resize: vertical; background: white;"></textarea>
          </div>

          <div>
            <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.75rem;">
              <i data-lucide="heart" style="width: 18px; height: 18px; color: #ec4899;"></i>
              <h4 style="color: #4f46e5; font-weight: 600; margin: 0; font-size: 1.1rem;">관계</h4>
            </div>
            <textarea id="yearly-goal-relationship-input" placeholder="예: 가족과 더 많은 시간 보내기, 새로운 인연 만들기..." style="width: 100%; min-height: 100px; padding: 1rem; border: 2px solid #6366f1; border-radius: 8px; font-size: 1rem; font-family: inherit; resize: vertical; background: white;"></textarea>
          </div>

          <div>
            <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.75rem;">
              <i data-lucide="briefcase" style="width: 18px; height: 18px; color: #10b981;"></i>
              <h4 style="color: #4f46e5; font-weight: 600; margin: 0; font-size: 1.1rem;">업무/재정</h4>
            </div>
            <textarea id="yearly-goal-work-finance-input" placeholder="예: 연봉 증가 목표, 부업 시작하기..." style="width: 100%; min-height: 100px; padding: 1rem; border: 2px solid #6366f1; border-radius: 8px; font-size: 1rem; font-family: inherit; resize: vertical; background: white;"></textarea>
          </div>
        </div>
        <div style="display: flex; gap: 0.75rem; margin-top: 1.5rem;">
          <button id="save-yearly-goals-btn" class="btn" style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; border: none; box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);">저장하기</button>
          <button id="cancel-yearly-goals-btn" class="btn btn-secondary">취소</button>
        </div>
      </div>

      <!-- 로딩 상태 -->
      <div id="yearly-goals-loading" style="text-align: center; padding: 2rem; color: #9ca3af;">
        <i data-lucide="loader" class="spin" style="width: 24px; height: 24px;"></i>
        <p style="margin-top: 0.5rem;">로딩 중...</p>
      </div>
    </div>

    <!-- 월간 실천계획 -->
    <div class="card" style="background: linear-gradient(135deg, #e0f7f4 0%, #f0fdf4 100%); border: 2px solid #14b8a6; box-shadow: 0 8px 24px rgba(20, 184, 166, 0.15); margin-top: 1.5rem;">
      <div class="card-header" style="border-bottom: 2px solid rgba(20, 184, 166, 0.2); padding-bottom: 1rem; margin-bottom: 1.25rem;">
        <div style="display: flex; align-items: center; gap: 0.75rem;">
          <div style="width: 40px; height: 40px; background: linear-gradient(135deg, #14b8a6 0%, #10b981 100%); border-radius: 12px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(20, 184, 166, 0.3);">
            <i data-lucide="calendar-check" style="width: 24px; height: 24px; color: white; stroke-width: 2.5;"></i>
          </div>
          <div style="flex: 1;">
            <div class="card-title" style="color: #0f766e; font-size: 1.5rem; margin: 0;">월간 실천계획</div>
          </div>
          <div style="display: flex; align-items: center; gap: 0.5rem;">
            <button id="monthly-plan-prev-btn" class="btn-icon" style="background: white; border: 1px solid #14b8a6; color: #14b8a6; padding: 0.25rem 0.5rem; border-radius: 6px; cursor: pointer;">
              <i data-lucide="chevron-left" style="width: 18px; height: 18px;"></i>
            </button>
            <span id="monthly-plan-month-label" style="font-size: 1rem; font-weight: 600; color: #0f766e; min-width: 80px; text-align: center;">2025년 12월</span>
            <button id="monthly-plan-next-btn" class="btn-icon" style="background: white; border: 1px solid #14b8a6; color: #14b8a6; padding: 0.25rem 0.5rem; border-radius: 6px; cursor: pointer;">
              <i data-lucide="chevron-right" style="width: 18px; height: 18px;"></i>
            </button>
          </div>
        </div>
      </div>

      <!-- 보기 모드 -->
      <div id="monthly-plans-view-mode" style="display: none;">
        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 1.5rem; margin-bottom: 1.5rem;">
          <!-- 왼쪽: 연간목표 표시 -->
          <div style="padding-right: 1.5rem; border-right: 1.4px dashed #80E2E2;">
            <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.75rem;">
              <i data-lucide="target" style="width: 18px; height: 18px; color: #6366f1;"></i>
              <h4 style="color: #0f766e; font-weight: 600; margin: 0; font-size: 1.1rem;">연간목표</h4>
            </div>
            <div id="monthly-plan-yearly-goals-container" style="display: flex; flex-direction: column; gap: 1rem;">
              <!-- 연간목표는 JavaScript로 동적으로 채워짐 -->
            </div>
          </div>

          <!-- 가운데: 월실천계획 표시 -->
          <div style="padding-right: 1.5rem; border-right: 1.4px dashed #80E2E2;">
            <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.75rem;">
              <i data-lucide="calendar-check" style="width: 18px; height: 18px; color: #14b8a6;"></i>
              <h4 style="color: #0f766e; font-weight: 600; margin: 0; font-size: 1.1rem;">월실천계획</h4>
            </div>
            <div id="monthly-plan-plan-content-container" style="display: flex; flex-direction: column; gap: 1rem;">
              <!-- 월실천계획은 JavaScript로 동적으로 채워짐 -->
            </div>
          </div>

          <!-- 오른쪽: 월말 결과 표시 -->
          <div>
            <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.75rem;">
              <i data-lucide="check-circle" style="width: 18px; height: 18px; color: #10b981;"></i>
              <h4 style="color: #0f766e; font-weight: 600; margin: 0; font-size: 1.1rem;">월말 결과</h4>
            </div>
            <div id="monthly-plan-results-content-container" style="display: flex; flex-direction: column; gap: 1rem;">
              <!-- 월말 결과는 JavaScript로 동적으로 채워짐 -->
            </div>
          </div>
        </div>
        <button id="edit-monthly-plans-btn" class="btn btn-secondary" style="margin-top: 1.5rem;">수정하기</button>
      </div>

      <!-- 편집 모드 -->
      <div id="monthly-plans-edit-mode" style="display: none;">
        <div style="margin-bottom: 1.5rem;">
          <label style="display: block; color: #0f766e; font-weight: 600; margin-bottom: 0.5rem; font-size: 0.95rem;">연간목표 연결</label>
          <select id="monthly-plan-linked-year-select" style="width: 100%; padding: 0.75rem; border: 2px solid #14b8a6; border-radius: 8px; font-size: 1rem; background: white; cursor: pointer;">
            <option value="">연결하지 않음</option>
          </select>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 1.5rem; margin-bottom: 1.5rem;">
          <!-- 왼쪽: 연간목표 표시 (읽기 전용) -->
          <div style="padding-right: 1.5rem; border-right: 1.4px dashed #80E2E2;">
            <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.75rem;">
              <i data-lucide="target" style="width: 18px; height: 18px; color: #6366f1;"></i>
              <h4 style="color: #0f766e; font-weight: 600; margin: 0; font-size: 1.1rem;">연간목표</h4>
            </div>
            <div id="monthly-plan-yearly-goals-edit-container" style="display: flex; flex-direction: column; gap: 1rem;">
              <!-- 연간목표는 JavaScript로 동적으로 채워짐 -->
            </div>
          </div>

          <!-- 가운데: 월실천계획 입력 -->
          <div style="padding-right: 1.5rem; border-right: 1.4px dashed #80E2E2;">
            <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.75rem;">
              <i data-lucide="calendar-check" style="width: 18px; height: 18px; color: #14b8a6;"></i>
              <h4 style="color: #0f766e; font-weight: 600; margin: 0; font-size: 1.1rem;">월실천계획</h4>
            </div>
            <div id="monthly-plan-plan-content-edit-container" style="display: flex; flex-direction: column; gap: 1rem;">
              <!-- 월실천계획 입력 필드는 JavaScript로 동적으로 생성됨 -->
            </div>
          </div>

          <!-- 오른쪽: 월말 결과 입력 -->
          <div>
            <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.75rem;">
              <i data-lucide="check-circle" style="width: 18px; height: 18px; color: #10b981;"></i>
              <h4 style="color: #0f766e; font-weight: 600; margin: 0; font-size: 1.1rem;">월말 결과</h4>
            </div>
            <div id="monthly-plan-results-content-edit-container" style="display: flex; flex-direction: column; gap: 1rem;">
              <!-- 월말 결과 입력 필드는 JavaScript로 동적으로 생성됨 -->
            </div>
          </div>
        </div>
        <div style="display: flex; gap: 0.75rem;">
          <button id="save-monthly-plans-btn" class="btn" style="background: linear-gradient(135deg, #14b8a6 0%, #10b981 100%); color: white; border: none; box-shadow: 0 4px 12px rgba(20, 184, 166, 0.3);">저장하기</button>
          <button id="cancel-monthly-plans-btn" class="btn btn-secondary">취소</button>
        </div>
      </div>

      <!-- 로딩 상태 -->
      <div id="monthly-plans-loading" style="text-align: center; padding: 2rem; color: #9ca3af;">
        <i data-lucide="loader" class="spin" style="width: 24px; height: 24px;"></i>
        <p style="margin-top: 0.5rem;">로딩 중...</p>
      </div>
    </div>
  `;

  return {
    html,
    onMount: async () => {
      const profile = await getCurrentProfile();
      if (!profile) {
        console.error('No profile found');
        return;
      }

      let timezone = profile?.timezone || 'Asia/Seoul';
      const today = getToday(timezone);
      const currentMonth = today.substring(0, 7) + '-01'; // YYYY-MM-01

      // 월 레이블 업데이트
      const monthLabel = document.getElementById('routine-month-label');
      if (monthLabel) {
        const monthNum = parseInt(today.substring(5, 7));
        monthLabel.textContent = `${monthNum}월 매일 실천할 루틴`;
      }

      let morningRoutines = [];
      let nightRoutines = [];
      let isEditMode = false;

      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      // 조회
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      async function loadRoutines() {
        try {
          const { data, error } = await supabase
            .from('monthly_plans')
            .select('daily_routines')
            .eq('user_id', profile.id)
            .eq('month_start', currentMonth)
            .eq('source', 'manual')
            .maybeSingle();

          if (error) {
            console.error('[Load Error]', error);
            throw error;
          }

          if (data && data.daily_routines) {
            morningRoutines = data.daily_routines.morning || [];
            nightRoutines = data.daily_routines.night || [];
          }

          // 데이터가 있으면 보기 모드, 없으면 편집 모드
          if (morningRoutines.length > 0 || nightRoutines.length > 0) {
            displayRoutines();
          } else {
            switchToEditMode();
          }
        } catch (error) {
          console.error('[Load Failed]', error);
          alert('루틴을 불러오는 중 오류가 발생했습니다.');
          switchToEditMode(); // 오류 시 편집 모드로
        } finally {
          document.getElementById('routines-loading').style.display = 'none';
        }
      }

      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      // 보기 모드 표시
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      function displayRoutines() {
        const morningList = document.getElementById('morning-display-list');
        const nightList = document.getElementById('night-display-list');
        const morningEmpty = document.getElementById('morning-empty');
        const nightEmpty = document.getElementById('night-empty');

        // 모닝루틴 표시
        if (morningRoutines.length > 0) {
          morningList.innerHTML = morningRoutines.map((routine, idx) => `
            <div style="display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem; background: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
              <span style="background: #a78bfa; color: white; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.85rem; font-weight: 600; flex-shrink: 0;">
                ${idx + 1}
              </span>
              <span style="color: #374151; font-weight: 500;">${routine}</span>
            </div>
          `).join('');
          morningEmpty.style.display = 'none';
        } else {
          morningList.innerHTML = '';
          morningEmpty.style.display = 'block';
        }

        // 나이트루틴 표시
        if (nightRoutines.length > 0) {
          nightList.innerHTML = nightRoutines.map((routine, idx) => `
            <div style="display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem; background: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
              <span style="background: #a78bfa; color: white; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.85rem; font-weight: 600; flex-shrink: 0;">
                ${idx + 1}
              </span>
              <span style="color: #374151; font-weight: 500;">${routine}</span>
            </div>
          `).join('');
          nightEmpty.style.display = 'none';
        } else {
          nightList.innerHTML = '';
          nightEmpty.style.display = 'block';
        }

        switchToViewMode();
      }

      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      // 모드 전환
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      function switchToViewMode() {
        document.getElementById('routines-view-mode').style.display = 'block';
        document.getElementById('routines-edit-mode').style.display = 'none';
        document.getElementById('routines-loading').style.display = 'none';
        isEditMode = false;
        if (window.lucide?.createIcons) window.lucide.createIcons();
      }

      function switchToEditMode() {
        document.getElementById('routines-view-mode').style.display = 'none';
        document.getElementById('routines-edit-mode').style.display = 'block';
        document.getElementById('routines-loading').style.display = 'none';
        isEditMode = true;
        renderEditInputs();
        if (window.lucide?.createIcons) window.lucide.createIcons();
      }

      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      // 편집 모드 입력 필드 렌더링
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      function renderEditInputs() {
        renderRoutineInputs('morning', morningRoutines);
        renderRoutineInputs('night', nightRoutines);
      }

      function renderRoutineInputs(type, routines) {
        const container = document.getElementById(`${type}-routines-list`);
        const countEl = document.getElementById(`${type}-count`);
        
        if (routines.length === 0) {
          // 최소 1개 필드
          addRoutineInput(type);
        } else {
          container.innerHTML = '';
          routines.forEach(routine => addRoutineInput(type, routine));
        }
        
        updateCount(type);
      }

      function addRoutineInput(type, value = '') {
        const container = document.getElementById(`${type}-routines-list`);
        const currentCount = container.children.length;
        
        if (currentCount >= 10) {
          alert(`${type === 'morning' ? '모닝' : '나이트'}루틴은 최대 10개까지 가능합니다.`);
          return;
        }

        const index = currentCount;
        const inputGroup = document.createElement('div');
        inputGroup.className = 'routine-input-group';
        inputGroup.style.cssText = 'display: flex; gap: 0.5rem; align-items: center;';
        inputGroup.dataset.type = type;
        inputGroup.dataset.index = index;

        inputGroup.innerHTML = `
          <span style="background: #a78bfa; color: white; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.9rem; font-weight: 600; flex-shrink: 0;">
            ${index + 1}
          </span>
          <input 
            type="text" 
            class="input routine-input" 
            data-type="${type}"
            placeholder="${type === 'morning' ? '예: 아침 명상 10분' : '예: 감사 일기'}" 
            value="${value}"
            maxlength="50"
            style="flex: 1; border: 2px solid #d8b4fe; background: white;"
          />
          <button class="btn btn-sm remove-routine-btn" data-type="${type}" data-index="${index}" style="background: #fecaca; color: #991b1b; border: none; padding: 0.4rem; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
            <i data-lucide="trash-2" style="width: 16px; height: 16px;"></i>
          </button>
        `;

        container.appendChild(inputGroup);
        
        // Enter 키로 다음 필드 추가
        const input = inputGroup.querySelector('.routine-input');
        input.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            const currentValue = input.value.trim();
            
            // 값이 있고 최대 개수가 아닐 때만 새 필드 추가
            if (currentValue && container.children.length < 10) {
              addRoutineInput(type);
              
              // 새로 추가된 필드에 포커스
              setTimeout(() => {
                const newInputs = container.querySelectorAll('.routine-input');
                const lastInput = newInputs[newInputs.length - 1];
                if (lastInput) lastInput.focus();
              }, 10);
            } else if (!currentValue) {
              // 빈 값이면 아무것도 하지 않음
            } else if (container.children.length >= 10) {
              alert(`${type === 'morning' ? '모닝' : '나이트'}루틴은 최대 10개까지 가능합니다.`);
            }
          }
        });
        
        updateCount(type);
        
        if (window.lucide?.createIcons) window.lucide.createIcons();
      }

      function removeRoutineInput(type, index) {
        const container = document.getElementById(`${type}-routines-list`);
        const groups = Array.from(container.querySelectorAll('.routine-input-group'));
        
        if (groups[index]) {
          groups[index].remove();
          renumberRoutines(type);
          updateCount(type);
        }
      }

      function renumberRoutines(type) {
        const container = document.getElementById(`${type}-routines-list`);
        const groups = container.querySelectorAll('.routine-input-group');
        
        groups.forEach((group, idx) => {
          const numberSpan = group.querySelector('span:first-child');
          const removeBtn = group.querySelector('.remove-routine-btn');
          
          numberSpan.textContent = idx + 1;
          group.dataset.index = idx;
          removeBtn.dataset.index = idx;
        });
      }

      function updateCount(type) {
        const container = document.getElementById(`${type}-routines-list`);
        const count = container.children.length;
        const countEl = document.getElementById(`${type}-count`);
        
        if (countEl) {
          countEl.textContent = `${count}/10`;
          countEl.style.color = count >= 10 ? '#dc2626' : '#9ca3af';
        }
      }

      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      // 저장
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      async function saveRoutines() {
        const morningInputs = document.querySelectorAll('#morning-routines-list .routine-input');
        const nightInputs = document.querySelectorAll('#night-routines-list .routine-input');

        const newMorningRoutines = Array.from(morningInputs)
          .map(input => input.value.trim())
          .filter(v => v.length > 0);

        const newNightRoutines = Array.from(nightInputs)
          .map(input => input.value.trim())
          .filter(v => v.length > 0);

        // 유효성 검사
        if (newMorningRoutines.length === 0 && newNightRoutines.length === 0) {
          alert('최소 1개의 루틴을 입력해주세요.');
          return;
        }

        const dailyRoutines = {
          morning: newMorningRoutines,
          night: newNightRoutines
        };

        try {
          console.log('[Saving]', dailyRoutines);

          // 기존 레코드 조회 (content_md, linked_year 유지용)
          const { data: existingPlan } = await supabase
            .from('monthly_plans')
            .select('content_md, linked_year')
            .eq('user_id', profile.id)
            .eq('month_start', currentMonth)
            .eq('source', 'manual')
            .maybeSingle();

          // 1. monthly_plans 저장 (기존 content_md, linked_year 유지)
          const updateData = {
            user_id: profile.id,
            month_start: currentMonth,
            source: 'manual',
            daily_routines: dailyRoutines,
            status: 'draft'
          };

          // 기존 content_md와 linked_year가 있으면 유지
          if (existingPlan) {
            if (existingPlan.content_md) {
              updateData.content_md = existingPlan.content_md;
            }
            if (existingPlan.linked_year) {
              updateData.linked_year = existingPlan.linked_year;
            }
          }

          const { data: savedPlan, error: saveError } = await supabase
            .from('monthly_plans')
            .upsert(updateData, {
              onConflict: 'user_id,month_start,source'
            })
            .select()
            .single();

          if (saveError) {
            console.error('[Save Error]', saveError);
            throw new Error('루틴 저장 실패: ' + saveError.message);
          }

          console.log('[Saved]', savedPlan);

          // 2. routines 테이블 동기화 (오늘 날짜 전달)
          await syncMonthlyRoutines(profile.id, currentMonth, savedPlan.daily_routines, today);

          // 3. 상태 업데이트
          morningRoutines = newMorningRoutines;
          nightRoutines = newNightRoutines;

          alert('저장되었습니다!');
          displayRoutines();

        } catch (error) {
          console.error('[Save Failed]', error);
          alert(`저장 중 오류가 발생했습니다.\n\n${error.message}\n\n다시 시도해주세요.`);
        }
      }

      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      // routines 테이블 동기화
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      async function syncMonthlyRoutines(userId, monthStart, dailyRoutines, activeFromDate) {
        const { morning = [], night = [] } = dailyRoutines;

        try {
          // A. 기존 월간 루틴 비활성화 (Soft Delete - 과거 기록 보존)
          // 해당 월의 모든 활성 월간 루틴을 비활성화하여 오늘부터 새 루틴이 적용되도록 함
          console.log('[Sync] 🔍 Deactivating existing monthly routines for', monthStart);

          const { data: existingRoutines, error: fetchError } = await supabase
            .from('routines')
            .select('id')
            .eq('user_id', userId)
            .eq('schedule->>type', 'monthly')
            .eq('schedule->>month', monthStart)
            .eq('is_active', true)
            .is('deleted_at', null);
          
          if (fetchError) {
            console.error('[Sync Error] Failed to fetch existing routines:', fetchError);
            throw new Error('기존 루틴 조회 실패: ' + fetchError.message);
          }
          
          if (existingRoutines && existingRoutines.length > 0) {
            // 해당 월의 모든 활성 월간 루틴 비활성화
            const idsToDeactivate = existingRoutines.map(r => r.id);

            console.log(`[Sync] 🗑️ Found ${idsToDeactivate.length} active routines to deactivate`);
            
            const { error: updateError } = await supabase
              .from('routines')
              .update({ 
                is_active: false, 
                deleted_at: new Date().toISOString() 
              })
              .in('id', idsToDeactivate);
            
            if (updateError) {
              console.error('[Sync Error] Failed to deactivate old routines:', updateError);
              throw new Error('기존 루틴 비활성화 실패: ' + updateError.message);
            }
            
            console.log(`[Sync] ✅ Successfully deactivated ${idsToDeactivate.length} old routines (past records preserved)`);
          } else {
            console.log('[Sync] ℹ️ No existing active routines to deactivate');
          }

          // B. 새 루틴 생성 (오늘부터 적용되도록 active_from_date 설정)
          const routinesToInsert = [];

          morning.forEach((title, index) => {
            routinesToInsert.push({
              user_id: userId,
              title: title.trim(),
              schedule: {
                type: 'monthly',
                month: monthStart,
                source: 'monthly_goal',
                category: 'morning',
                order: index,
                active_from_date: activeFromDate  // 오늘부터 적용
              },
              is_active: true
            });
          });

          night.forEach((title, index) => {
            routinesToInsert.push({
              user_id: userId,
              title: title.trim(),
              schedule: {
                type: 'monthly',
                month: monthStart,
                source: 'monthly_goal',
                category: 'night',
                order: index,
                active_from_date: activeFromDate  // 오늘부터 적용
              },
              is_active: true
            });
          });

          if (routinesToInsert.length > 0) {
            const { error: insertError } = await supabase
              .from('routines')
              .insert(routinesToInsert);

            if (insertError) {
              console.error('[Insert Error]', insertError);
              throw new Error('루틴 동기화 실패: ' + insertError.message);
            }

            console.log(`[Synced] ${routinesToInsert.length} routines`);
          }

        } catch (error) {
          console.error('[Sync Error]', error);
          throw error;
        }
      }

      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      // 이벤트 리스너 (중복 방지)
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      const handleEditRoutines = () => switchToEditMode();
      const handleCancelEdit = () => {
        if (morningRoutines.length > 0 || nightRoutines.length > 0) {
          displayRoutines();
        } else {
          loadRoutines();
        }
      };
      const handleSaveRoutines = () => saveRoutines();
      const handleAddMorningRoutine = () => addRoutineInput('morning');
      const handleAddNightRoutine = () => addRoutineInput('night');
      
      const editBtn = document.getElementById('edit-routines-btn');
      const cancelBtn = document.getElementById('cancel-edit-btn');
      const saveBtn = document.getElementById('save-routines-btn');
      const addMorningBtn = document.getElementById('add-morning-routine-btn');
      const addNightBtn = document.getElementById('add-night-routine-btn');
      
      if (editBtn) {
        editBtn.removeEventListener('click', handleEditRoutines);
        editBtn.addEventListener('click', handleEditRoutines);
      }
      
      if (cancelBtn) {
        cancelBtn.removeEventListener('click', handleCancelEdit);
        cancelBtn.addEventListener('click', handleCancelEdit);
      }
      
      if (saveBtn) {
        saveBtn.removeEventListener('click', handleSaveRoutines);
        saveBtn.addEventListener('click', handleSaveRoutines);
      }
      
      if (addMorningBtn) {
        addMorningBtn.removeEventListener('click', handleAddMorningRoutine);
        addMorningBtn.addEventListener('click', handleAddMorningRoutine);
      }
      
      if (addNightBtn) {
        addNightBtn.removeEventListener('click', handleAddNightRoutine);
        addNightBtn.addEventListener('click', handleAddNightRoutine);
      }

      // 삭제 버튼 (이벤트 위임)
      document.getElementById('morning-routines-list')?.addEventListener('click', (e) => {
        const removeBtn = e.target.closest('.remove-routine-btn');
        if (removeBtn && removeBtn.dataset.type === 'morning') {
          const index = parseInt(removeBtn.dataset.index);
          removeRoutineInput('morning', index);
        }
      });

      document.getElementById('night-routines-list')?.addEventListener('click', (e) => {
        const removeBtn = e.target.closest('.remove-routine-btn');
        if (removeBtn && removeBtn.dataset.type === 'night') {
          const index = parseInt(removeBtn.dataset.index);
          removeRoutineInput('night', index);
        }
      });

      // 초기 로드
      await loadRoutines();

      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      // 연간 목표 관련 변수 및 함수
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      const currentYear = new Date().getFullYear();
      let selectedYear = currentYear;
      let yearlyGoals = {
        self_dev: null,
        relationship: null,
        work_finance: null
      };
      let isYearlyGoalsEditMode = false;

      // 연도 레이블 업데이트
      function updateYearLabel() {
        const yearLabel = document.getElementById('yearly-goal-year-label');
        if (yearLabel) {
          yearLabel.textContent = `${selectedYear}년`;
        }
      }

      // 연간 목표 조회
      async function loadYearlyGoals() {
        try {
          document.getElementById('yearly-goals-loading').style.display = 'block';
          document.getElementById('yearly-goals-view-mode').style.display = 'none';
          document.getElementById('yearly-goals-edit-mode').style.display = 'none';

          const { data, error } = await supabase
            .from('yearly_goals')
            .select('*')
            .eq('user_id', profile.id)
            .eq('year', selectedYear)
            .maybeSingle();

          if (error) {
            console.error('[Yearly Goals Load Error]', error);
            throw error;
          }

          if (data) {
            yearlyGoals = {
              self_dev: data.self_dev || null,
              relationship: data.relationship || null,
              work_finance: data.work_finance || null
            };
            displayYearlyGoals();
          } else {
            // 데이터가 없으면 편집 모드로
            yearlyGoals = {
              self_dev: null,
              relationship: null,
              work_finance: null
            };
            switchToYearlyGoalsEditMode();
          }
        } catch (error) {
          console.error('[Yearly Goals Load Failed]', error);
          alert('연간 목표를 불러오는 중 오류가 발생했습니다.');
          switchToYearlyGoalsEditMode();
        } finally {
          document.getElementById('yearly-goals-loading').style.display = 'none';
        }
      }

      // 연간 목표 표시
      function displayYearlyGoals() {
        const selfDevDisplay = document.getElementById('yearly-goal-self-dev-display');
        const selfDevEmpty = document.getElementById('yearly-goal-self-dev-empty');
        const relationshipDisplay = document.getElementById('yearly-goal-relationship-display');
        const relationshipEmpty = document.getElementById('yearly-goal-relationship-empty');
        const workFinanceDisplay = document.getElementById('yearly-goal-work-finance-display');
        const workFinanceEmpty = document.getElementById('yearly-goal-work-finance-empty');

        if (yearlyGoals.self_dev) {
          selfDevDisplay.textContent = yearlyGoals.self_dev;
          selfDevDisplay.style.display = 'block';
          selfDevEmpty.style.display = 'none';
        } else {
          selfDevDisplay.style.display = 'none';
          selfDevEmpty.style.display = 'block';
        }

        if (yearlyGoals.relationship) {
          relationshipDisplay.textContent = yearlyGoals.relationship;
          relationshipDisplay.style.display = 'block';
          relationshipEmpty.style.display = 'none';
        } else {
          relationshipDisplay.style.display = 'none';
          relationshipEmpty.style.display = 'block';
        }

        if (yearlyGoals.work_finance) {
          workFinanceDisplay.textContent = yearlyGoals.work_finance;
          workFinanceDisplay.style.display = 'block';
          workFinanceEmpty.style.display = 'none';
        } else {
          workFinanceDisplay.style.display = 'none';
          workFinanceEmpty.style.display = 'block';
        }

        switchToYearlyGoalsViewMode();
      }

      // 연간 목표 모드 전환
      function switchToYearlyGoalsViewMode() {
        document.getElementById('yearly-goals-view-mode').style.display = 'block';
        document.getElementById('yearly-goals-edit-mode').style.display = 'none';
        document.getElementById('yearly-goals-loading').style.display = 'none';
        isYearlyGoalsEditMode = false;
        if (window.lucide?.createIcons) window.lucide.createIcons();
      }

      function switchToYearlyGoalsEditMode() {
        document.getElementById('yearly-goals-view-mode').style.display = 'none';
        document.getElementById('yearly-goals-edit-mode').style.display = 'block';
        document.getElementById('yearly-goals-loading').style.display = 'none';
        isYearlyGoalsEditMode = true;

        // 입력 필드에 현재 값 설정
        document.getElementById('yearly-goal-self-dev-input').value = yearlyGoals.self_dev || '';
        document.getElementById('yearly-goal-relationship-input').value = yearlyGoals.relationship || '';
        document.getElementById('yearly-goal-work-finance-input').value = yearlyGoals.work_finance || '';

        if (window.lucide?.createIcons) window.lucide.createIcons();
      }

      // 연간 목표 저장
      async function saveYearlyGoals() {
        const selfDev = document.getElementById('yearly-goal-self-dev-input').value.trim();
        const relationship = document.getElementById('yearly-goal-relationship-input').value.trim();
        const workFinance = document.getElementById('yearly-goal-work-finance-input').value.trim();

        try {
          const { data, error } = await supabase
            .from('yearly_goals')
            .upsert({
              user_id: profile.id,
              year: selectedYear,
              self_dev: selfDev || null,
              relationship: relationship || null,
              work_finance: workFinance || null
            }, {
              onConflict: 'user_id,year'
            })
            .select()
            .single();

          if (error) {
            console.error('[Yearly Goals Save Error]', error);
            throw error;
          }

          yearlyGoals = {
            self_dev: data.self_dev,
            relationship: data.relationship,
            work_finance: data.work_finance
          };

          alert('저장되었습니다!');
          displayYearlyGoals();
        } catch (error) {
          console.error('[Yearly Goals Save Failed]', error);
          alert(`저장 중 오류가 발생했습니다.\n\n${error.message}\n\n다시 시도해주세요.`);
        }
      }

      // 연간 목표 이벤트 리스너
      const handleYearlyGoalPrev = () => {
        selectedYear--;
        updateYearLabel();
        loadYearlyGoals();
      };
      const handleYearlyGoalNext = () => {
        selectedYear++;
        updateYearLabel();
        loadYearlyGoals();
      };
      const handleEditYearlyGoals = () => switchToYearlyGoalsEditMode();
      const handleCancelYearlyGoals = () => {
        if (yearlyGoals.self_dev || yearlyGoals.relationship || yearlyGoals.work_finance) {
          displayYearlyGoals();
        } else {
          loadYearlyGoals();
        }
      };
      const handleSaveYearlyGoals = () => saveYearlyGoals();

      document.getElementById('yearly-goal-prev-btn')?.addEventListener('click', handleYearlyGoalPrev);
      document.getElementById('yearly-goal-next-btn')?.addEventListener('click', handleYearlyGoalNext);
      document.getElementById('edit-yearly-goals-btn')?.addEventListener('click', handleEditYearlyGoals);
      document.getElementById('cancel-yearly-goals-btn')?.addEventListener('click', handleCancelYearlyGoals);
      document.getElementById('save-yearly-goals-btn')?.addEventListener('click', handleSaveYearlyGoals);

      // 연도 레이블 초기화 및 초기 로드
      updateYearLabel();
      await loadYearlyGoals();

      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      // 월간 실천계획 관련 변수 및 함수
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      let selectedMonthStart = currentMonth; // YYYY-MM-01 형식
      let monthlyPlan = {
        linked_year: null,
        content_md: null,
        plan_content: { self_dev: '', relationship: '', work_finance: '' },
        results_content: { self_dev: '', relationship: '', work_finance: '' },
        daily_routines: { morning: [], night: [] }
      };
      let linkedYearlyGoals = null; // linked_year에 해당하는 연간 목표
      let isMonthlyPlanEditMode = false;

      // 월 레이블 업데이트
      function updateMonthLabel() {
        const monthLabel = document.getElementById('monthly-plan-month-label');
        if (monthLabel) {
          const [year, month] = selectedMonthStart.split('-');
          const monthNum = parseInt(month);
          monthLabel.textContent = `${year}년 ${monthNum}월`;
        }
      }

      // 월 이동 (이전/다음)
      function shiftMonth(direction) {
        const [year, month] = selectedMonthStart.split('-').map(Number);
        let newYear = year;
        let newMonth = month + direction;
        
        if (newMonth > 12) {
          newMonth = 1;
          newYear++;
        } else if (newMonth < 1) {
          newMonth = 12;
          newYear--;
        }
        
        selectedMonthStart = `${newYear}-${String(newMonth).padStart(2, '0')}-01`;
        updateMonthLabel();
        loadMonthlyPlan();
      }

      // 월간 실천계획 조회 (daily_routines 포함하여 전체 레코드 로드)
      async function loadMonthlyPlan() {
        try {
          document.getElementById('monthly-plans-loading').style.display = 'block';
          document.getElementById('monthly-plans-view-mode').style.display = 'none';
          document.getElementById('monthly-plans-edit-mode').style.display = 'none';

          const { data, error } = await supabase
            .from('monthly_plans')
            .select('*')
            .eq('user_id', profile.id)
            .eq('month_start', selectedMonthStart)
            .eq('source', 'manual')
            .maybeSingle();

          if (error) {
            console.error('[Monthly Plan Load Error]', error);
            throw error;
          }

          if (data) {
            monthlyPlan = {
              linked_year: data.linked_year,
              content_md: data.content_md || null,
              plan_content: data.plan_content || { self_dev: '', relationship: '', work_finance: '' },
              results_content: data.results_content || { self_dev: '', relationship: '', work_finance: '' },
              daily_routines: data.daily_routines || { morning: [], night: [] }
            };

            // linked_year가 있으면 연간 목표 로드
            if (data.linked_year) {
              await loadLinkedYearlyGoals(data.linked_year);
            } else {
              linkedYearlyGoals = null;
            }

            displayMonthlyPlan();
          } else {
            // 데이터가 없으면 편집 모드로
            monthlyPlan = {
              linked_year: null,
              content_md: null,
              plan_content: { self_dev: '', relationship: '', work_finance: '' },
              results_content: { self_dev: '', relationship: '', work_finance: '' },
              daily_routines: { morning: [], night: [] }
            };
            linkedYearlyGoals = null;
            switchToMonthlyPlanEditMode();
          }
        } catch (error) {
          console.error('[Monthly Plan Load Failed]', error);
          alert('월간 실천계획을 불러오는 중 오류가 발생했습니다.');
          switchToMonthlyPlanEditMode();
        } finally {
          document.getElementById('monthly-plans-loading').style.display = 'none';
        }
      }

      // linked_year에 해당하는 연간 목표 로드
      async function loadLinkedYearlyGoals(year) {
        try {
          const { data, error } = await supabase
            .from('yearly_goals')
            .select('*')
            .eq('user_id', profile.id)
            .eq('year', year)
            .maybeSingle();

          if (error) {
            console.error('[Linked Yearly Goals Load Error]', error);
            linkedYearlyGoals = null;
            return;
          }

          linkedYearlyGoals = data || null;
        } catch (error) {
          console.error('[Linked Yearly Goals Load Failed]', error);
          linkedYearlyGoals = null;
        }
      }

      // 연간 목표 목록 로드 (드롭다운용)
      async function loadYearlyGoalsForDropdown() {
        try {
          const { data, error } = await supabase
            .from('yearly_goals')
            .select('year')
            .eq('user_id', profile.id)
            .order('year', { ascending: false });

          if (error) {
            console.error('[Yearly Goals Dropdown Load Error]', error);
            return;
          }

          const select = document.getElementById('monthly-plan-linked-year-select');
          if (!select) return;

          // 기존 옵션 유지 (첫 번째 "연결하지 않음" 옵션)
          const currentValue = select.value;
          select.innerHTML = '<option value="">연결하지 않음</option>';

          if (data && data.length > 0) {
            data.forEach(item => {
              const option = document.createElement('option');
              option.value = item.year;
              option.textContent = `${item.year}년 목표`;
              select.appendChild(option);
            });
          }

          // 기존 값 복원
          if (currentValue) {
            select.value = currentValue;
          }
        } catch (error) {
          console.error('[Yearly Goals Dropdown Load Failed]', error);
        }
      }

      // 월간 실천계획 표시 (3컬럼 레이아웃)
      function displayMonthlyPlan() {
        // 왼쪽: 연간목표 표시
        const yearlyGoalsContainer = document.getElementById('monthly-plan-yearly-goals-container');
        if (yearlyGoalsContainer) {
          if (linkedYearlyGoals) {
            yearlyGoalsContainer.innerHTML = `
              <div>
                <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
                  <i data-lucide="book-open" style="width: 16px; height: 16px; color: #6366f1;"></i>
                  <h5 style="color: #4f46e5; font-weight: 600; margin: 0; font-size: 0.95rem;">자기계발</h5>
                </div>
                <div style="background: white; padding: 0.75rem; border-radius: 8px; min-height: 60px; color: #374151; line-height: 1.6; white-space: pre-wrap; font-size: 0.9rem;">${linkedYearlyGoals.self_dev || '목표를 입력해주세요'}</div>
              </div>
              <div>
                <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
                  <i data-lucide="heart" style="width: 16px; height: 16px; color: #ec4899;"></i>
                  <h5 style="color: #4f46e5; font-weight: 600; margin: 0; font-size: 0.95rem;">관계</h5>
                </div>
                <div style="background: white; padding: 0.75rem; border-radius: 8px; min-height: 60px; color: #374151; line-height: 1.6; white-space: pre-wrap; font-size: 0.9rem;">${linkedYearlyGoals.relationship || '목표를 입력해주세요'}</div>
              </div>
              <div>
                <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
                  <i data-lucide="briefcase" style="width: 16px; height: 16px; color: #10b981;"></i>
                  <h5 style="color: #4f46e5; font-weight: 600; margin: 0; font-size: 0.95rem;">업무/재정</h5>
                </div>
                <div style="background: white; padding: 0.75rem; border-radius: 8px; min-height: 60px; color: #374151; line-height: 1.6; white-space: pre-wrap; font-size: 0.9rem;">${linkedYearlyGoals.work_finance || '목표를 입력해주세요'}</div>
              </div>
            `;
          } else {
            yearlyGoalsContainer.innerHTML = '<div style="background: white; padding: 1rem; border-radius: 8px; color: #9ca3af; font-size: 0.9rem; text-align: center;">연결된 연간목표가 없습니다</div>';
          }
        }

        // 가운데: 월실천계획 표시
        const planContainer = document.getElementById('monthly-plan-plan-content-container');
        if (planContainer) {
          planContainer.innerHTML = `
            <div>
              <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
                <i data-lucide="book-open" style="width: 16px; height: 16px; color: #6366f1;"></i>
                <h5 style="color: #0f766e; font-weight: 600; margin: 0; font-size: 0.95rem;">자기계발</h5>
              </div>
              <div style="background: white; padding: 0.75rem; border-radius: 8px; min-height: 60px; color: #374151; line-height: 1.6; white-space: pre-wrap; font-size: 0.9rem;">${monthlyPlan.plan_content?.self_dev || '실천계획을 입력해주세요'}</div>
            </div>
            <div>
              <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
                <i data-lucide="heart" style="width: 16px; height: 16px; color: #ec4899;"></i>
                <h5 style="color: #0f766e; font-weight: 600; margin: 0; font-size: 0.95rem;">관계</h5>
              </div>
              <div style="background: white; padding: 0.75rem; border-radius: 8px; min-height: 60px; color: #374151; line-height: 1.6; white-space: pre-wrap; font-size: 0.9rem;">${monthlyPlan.plan_content?.relationship || '실천계획을 입력해주세요'}</div>
            </div>
            <div>
              <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
                <i data-lucide="briefcase" style="width: 16px; height: 16px; color: #10b981;"></i>
                <h5 style="color: #0f766e; font-weight: 600; margin: 0; font-size: 0.95rem;">업무/재정</h5>
              </div>
              <div style="background: white; padding: 0.75rem; border-radius: 8px; min-height: 60px; color: #374151; line-height: 1.6; white-space: pre-wrap; font-size: 0.9rem;">${monthlyPlan.plan_content?.work_finance || '실천계획을 입력해주세요'}</div>
            </div>
          `;
        }

        // 오른쪽: 월말 결과 표시
        const resultsContainer = document.getElementById('monthly-plan-results-content-container');
        if (resultsContainer) {
          resultsContainer.innerHTML = `
            <div>
              <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
                <i data-lucide="book-open" style="width: 16px; height: 16px; color: #6366f1;"></i>
                <h5 style="color: #0f766e; font-weight: 600; margin: 0; font-size: 0.95rem;">자기계발</h5>
              </div>
              <div style="background: white; padding: 0.75rem; border-radius: 8px; min-height: 60px; color: #374151; line-height: 1.6; white-space: pre-wrap; font-size: 0.9rem;">${monthlyPlan.results_content?.self_dev || '결과를 입력해주세요'}</div>
            </div>
            <div>
              <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
                <i data-lucide="heart" style="width: 16px; height: 16px; color: #ec4899;"></i>
                <h5 style="color: #0f766e; font-weight: 600; margin: 0; font-size: 0.95rem;">관계</h5>
              </div>
              <div style="background: white; padding: 0.75rem; border-radius: 8px; min-height: 60px; color: #374151; line-height: 1.6; white-space: pre-wrap; font-size: 0.9rem;">${monthlyPlan.results_content?.relationship || '결과를 입력해주세요'}</div>
            </div>
            <div>
              <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
                <i data-lucide="briefcase" style="width: 16px; height: 16px; color: #10b981;"></i>
                <h5 style="color: #0f766e; font-weight: 600; margin: 0; font-size: 0.95rem;">업무/재정</h5>
              </div>
              <div style="background: white; padding: 0.75rem; border-radius: 8px; min-height: 60px; color: #374151; line-height: 1.6; white-space: pre-wrap; font-size: 0.9rem;">${monthlyPlan.results_content?.work_finance || '결과를 입력해주세요'}</div>
            </div>
          `;
        }

        switchToMonthlyPlanViewMode();
      }

      // 월간 실천계획 모드 전환
      function switchToMonthlyPlanViewMode() {
        document.getElementById('monthly-plans-view-mode').style.display = 'block';
        document.getElementById('monthly-plans-edit-mode').style.display = 'none';
        document.getElementById('monthly-plans-loading').style.display = 'none';
        isMonthlyPlanEditMode = false;
        if (window.lucide?.createIcons) window.lucide.createIcons();
      }

      async function switchToMonthlyPlanEditMode() {
        document.getElementById('monthly-plans-view-mode').style.display = 'none';
        document.getElementById('monthly-plans-edit-mode').style.display = 'block';
        document.getElementById('monthly-plans-loading').style.display = 'none';
        isMonthlyPlanEditMode = true;

        // 드롭다운 로드
        await loadYearlyGoalsForDropdown();

        // linked_year 선택 시 연간 목표 로드
        const linkedYearSelect = document.getElementById('monthly-plan-linked-year-select');
        if (linkedYearSelect) {
          linkedYearSelect.value = monthlyPlan.linked_year || '';
          
          // change 이벤트 리스너 추가 (연도 선택 시 연간 목표 로드)
          linkedYearSelect.onchange = async () => {
            const selectedYear = linkedYearSelect.value;
            if (selectedYear) {
              await loadLinkedYearlyGoals(parseInt(selectedYear));
              renderYearlyGoalsInEditMode();
            } else {
              linkedYearlyGoals = null;
              renderYearlyGoalsInEditMode();
            }
          };

          // 초기 연간 목표 로드
          if (monthlyPlan.linked_year) {
            await loadLinkedYearlyGoals(monthlyPlan.linked_year);
          }
        }

        // 편집 모드 렌더링
        renderYearlyGoalsInEditMode();
        renderPlanContentInEditMode();
        renderResultsContentInEditMode();

        if (window.lucide?.createIcons) window.lucide.createIcons();
      }

      // 편집 모드: 연간목표 표시 (읽기 전용)
      function renderYearlyGoalsInEditMode() {
        const container = document.getElementById('monthly-plan-yearly-goals-edit-container');
        if (!container) return;

        if (linkedYearlyGoals) {
          container.innerHTML = `
            <div>
              <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
                <i data-lucide="book-open" style="width: 16px; height: 16px; color: #6366f1;"></i>
                <h5 style="color: #4f46e5; font-weight: 600; margin: 0; font-size: 0.95rem;">자기계발</h5>
              </div>
              <div style="background: #f3f4f6; padding: 0.75rem; border-radius: 8px; min-height: 80px; color: #374151; line-height: 1.6; white-space: pre-wrap; font-size: 0.9rem; border: 1px solid #d1d5db;">${linkedYearlyGoals.self_dev || '목표를 입력해주세요'}</div>
            </div>
            <div>
              <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
                <i data-lucide="heart" style="width: 16px; height: 16px; color: #ec4899;"></i>
                <h5 style="color: #4f46e5; font-weight: 600; margin: 0; font-size: 0.95rem;">관계</h5>
              </div>
              <div style="background: #f3f4f6; padding: 0.75rem; border-radius: 8px; min-height: 80px; color: #374151; line-height: 1.6; white-space: pre-wrap; font-size: 0.9rem; border: 1px solid #d1d5db;">${linkedYearlyGoals.relationship || '목표를 입력해주세요'}</div>
            </div>
            <div>
              <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
                <i data-lucide="briefcase" style="width: 16px; height: 16px; color: #10b981;"></i>
                <h5 style="color: #4f46e5; font-weight: 600; margin: 0; font-size: 0.95rem;">업무/재정</h5>
              </div>
              <div style="background: #f3f4f6; padding: 0.75rem; border-radius: 8px; min-height: 80px; color: #374151; line-height: 1.6; white-space: pre-wrap; font-size: 0.9rem; border: 1px solid #d1d5db;">${linkedYearlyGoals.work_finance || '목표를 입력해주세요'}</div>
            </div>
          `;
        } else {
          container.innerHTML = '<div style="background: #f3f4f6; padding: 1rem; border-radius: 8px; color: #9ca3af; font-size: 0.9rem; text-align: center; border: 1px solid #d1d5db;">연결된 연간목표가 없습니다</div>';
        }
      }

      // 편집 모드: 월실천계획 입력 필드
      function renderPlanContentInEditMode() {
        const container = document.getElementById('monthly-plan-plan-content-edit-container');
        if (!container) return;

        container.innerHTML = `
          <div>
            <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
              <i data-lucide="book-open" style="width: 16px; height: 16px; color: #6366f1;"></i>
              <h5 style="color: #0f766e; font-weight: 600; margin: 0; font-size: 0.95rem;">자기계발</h5>
            </div>
            <textarea id="plan-content-self-dev-input" placeholder="이번 달 자기계발 실천계획을 입력하세요..." style="width: 100%; min-height: 80px; padding: 0.75rem; border: 2px solid #14b8a6; border-radius: 8px; font-size: 0.9rem; font-family: inherit; resize: vertical; background: white; line-height: 1.6;">${monthlyPlan.plan_content?.self_dev || ''}</textarea>
          </div>
          <div>
            <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
              <i data-lucide="heart" style="width: 16px; height: 16px; color: #ec4899;"></i>
              <h5 style="color: #0f766e; font-weight: 600; margin: 0; font-size: 0.95rem;">관계</h5>
            </div>
            <textarea id="plan-content-relationship-input" placeholder="이번 달 관계 실천계획을 입력하세요..." style="width: 100%; min-height: 80px; padding: 0.75rem; border: 2px solid #14b8a6; border-radius: 8px; font-size: 0.9rem; font-family: inherit; resize: vertical; background: white; line-height: 1.6;">${monthlyPlan.plan_content?.relationship || ''}</textarea>
          </div>
          <div>
            <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
              <i data-lucide="briefcase" style="width: 16px; height: 16px; color: #10b981;"></i>
              <h5 style="color: #0f766e; font-weight: 600; margin: 0; font-size: 0.95rem;">업무/재정</h5>
            </div>
            <textarea id="plan-content-work-finance-input" placeholder="이번 달 업무/재정 실천계획을 입력하세요..." style="width: 100%; min-height: 80px; padding: 0.75rem; border: 2px solid #14b8a6; border-radius: 8px; font-size: 0.9rem; font-family: inherit; resize: vertical; background: white; line-height: 1.6;">${monthlyPlan.plan_content?.work_finance || ''}</textarea>
          </div>
        `;
      }

      // 편집 모드: 월말 결과 입력 필드
      function renderResultsContentInEditMode() {
        const container = document.getElementById('monthly-plan-results-content-edit-container');
        if (!container) return;

        container.innerHTML = `
          <div>
            <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
              <i data-lucide="book-open" style="width: 16px; height: 16px; color: #6366f1;"></i>
              <h5 style="color: #0f766e; font-weight: 600; margin: 0; font-size: 0.95rem;">자기계발</h5>
            </div>
            <textarea id="results-content-self-dev-input" placeholder="월말 자기계발 결과를 입력하세요..." style="width: 100%; min-height: 80px; padding: 0.75rem; border: 2px solid #14b8a6; border-radius: 8px; font-size: 0.9rem; font-family: inherit; resize: vertical; background: white; line-height: 1.6;">${monthlyPlan.results_content?.self_dev || ''}</textarea>
          </div>
          <div>
            <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
              <i data-lucide="heart" style="width: 16px; height: 16px; color: #ec4899;"></i>
              <h5 style="color: #0f766e; font-weight: 600; margin: 0; font-size: 0.95rem;">관계</h5>
            </div>
            <textarea id="results-content-relationship-input" placeholder="월말 관계 결과를 입력하세요..." style="width: 100%; min-height: 80px; padding: 0.75rem; border: 2px solid #14b8a6; border-radius: 8px; font-size: 0.9rem; font-family: inherit; resize: vertical; background: white; line-height: 1.6;">${monthlyPlan.results_content?.relationship || ''}</textarea>
          </div>
          <div>
            <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
              <i data-lucide="briefcase" style="width: 16px; height: 16px; color: #10b981;"></i>
              <h5 style="color: #0f766e; font-weight: 600; margin: 0; font-size: 0.95rem;">업무/재정</h5>
            </div>
            <textarea id="results-content-work-finance-input" placeholder="월말 업무/재정 결과를 입력하세요..." style="width: 100%; min-height: 80px; padding: 0.75rem; border: 2px solid #14b8a6; border-radius: 8px; font-size: 0.9rem; font-family: inherit; resize: vertical; background: white; line-height: 1.6;">${monthlyPlan.results_content?.work_finance || ''}</textarea>
          </div>
        `;
      }

      // 월간 실천계획 저장 (daily_routines, plan_content, results_content 포함)
      async function saveMonthlyPlan() {
        const linkedYear = document.getElementById('monthly-plan-linked-year-select').value;
        
        // plan_content 입력값 수집
        const planContent = {
          self_dev: document.getElementById('plan-content-self-dev-input')?.value.trim() || '',
          relationship: document.getElementById('plan-content-relationship-input')?.value.trim() || '',
          work_finance: document.getElementById('plan-content-work-finance-input')?.value.trim() || ''
        };

        // results_content 입력값 수집
        const resultsContent = {
          self_dev: document.getElementById('results-content-self-dev-input')?.value.trim() || '',
          relationship: document.getElementById('results-content-relationship-input')?.value.trim() || '',
          work_finance: document.getElementById('results-content-work-finance-input')?.value.trim() || ''
        };

        try {
          // 기존 레코드 조회 (daily_routines, content_md 유지용)
          const { data: existingPlan } = await supabase
            .from('monthly_plans')
            .select('daily_routines, content_md')
            .eq('user_id', profile.id)
            .eq('month_start', selectedMonthStart)
            .eq('source', 'manual')
            .maybeSingle();

          const updateData = {
            user_id: profile.id,
            month_start: selectedMonthStart,
            source: 'manual',
            linked_year: linkedYear ? parseInt(linkedYear) : null,
            plan_content: planContent,
            results_content: resultsContent,
            status: 'draft'
          };

          // 기존 daily_routines와 content_md 유지
          if (existingPlan) {
            if (existingPlan.daily_routines) {
              updateData.daily_routines = existingPlan.daily_routines;
            }
            if (existingPlan.content_md) {
              updateData.content_md = existingPlan.content_md;
            }
          } else {
            // 없으면 기본값
            updateData.daily_routines = { morning: [], night: [] };
          }

          const { data, error } = await supabase
            .from('monthly_plans')
            .upsert(updateData, {
              onConflict: 'user_id,month_start,source'
            })
            .select()
            .single();

          if (error) {
            console.error('[Monthly Plan Save Error]', error);
            throw error;
          }

          monthlyPlan = {
            linked_year: data.linked_year,
            content_md: data.content_md || null,
            plan_content: data.plan_content || { self_dev: '', relationship: '', work_finance: '' },
            results_content: data.results_content || { self_dev: '', relationship: '', work_finance: '' },
            daily_routines: data.daily_routines || { morning: [], night: [] }
          };

          // linked_year가 변경되었거나 새로 설정된 경우 연간 목표 다시 로드
          if (data.linked_year) {
            await loadLinkedYearlyGoals(data.linked_year);
          } else {
            linkedYearlyGoals = null;
          }

          alert('저장되었습니다!');
          displayMonthlyPlan();
        } catch (error) {
          console.error('[Monthly Plan Save Failed]', error);
          alert(`저장 중 오류가 발생했습니다.\n\n${error.message}\n\n다시 시도해주세요.`);
        }
      }

      // 월간 실천계획 이벤트 리스너
      const handleMonthlyPlanPrev = () => shiftMonth(-1);
      const handleMonthlyPlanNext = () => shiftMonth(1);
      const handleEditMonthlyPlan = () => switchToMonthlyPlanEditMode();
      const handleCancelMonthlyPlan = () => {
        // 데이터가 있으면 보기 모드로, 없으면 다시 로드
        if (monthlyPlan.plan_content?.self_dev || monthlyPlan.plan_content?.relationship || monthlyPlan.plan_content?.work_finance || 
            monthlyPlan.results_content?.self_dev || monthlyPlan.results_content?.relationship || monthlyPlan.results_content?.work_finance) {
          displayMonthlyPlan();
        } else {
          loadMonthlyPlan();
        }
      };
      const handleSaveMonthlyPlan = () => saveMonthlyPlan();

      document.getElementById('monthly-plan-prev-btn')?.addEventListener('click', handleMonthlyPlanPrev);
      document.getElementById('monthly-plan-next-btn')?.addEventListener('click', handleMonthlyPlanNext);
      document.getElementById('edit-monthly-plans-btn')?.addEventListener('click', handleEditMonthlyPlan);
      document.getElementById('cancel-monthly-plans-btn')?.addEventListener('click', handleCancelMonthlyPlan);
      document.getElementById('save-monthly-plans-btn')?.addEventListener('click', handleSaveMonthlyPlan);

      // 월 레이블 초기화 및 초기 로드
      updateMonthLabel();
      await loadMonthlyPlan();
    }
  };
}

