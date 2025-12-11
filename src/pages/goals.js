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

          // 1. monthly_plans 저장
          const { data: savedPlan, error: saveError } = await supabase
            .from('monthly_plans')
            .upsert({
              user_id: profile.id,
              month_start: currentMonth,
              source: 'manual',
              daily_routines: dailyRoutines,
              status: 'draft'
            }, {
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
    }
  };
}

