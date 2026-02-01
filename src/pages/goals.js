import { supabase } from '../config/supabase.js';
import { getCurrentProfile } from '../utils/auth.js';
import { getToday } from '../utils/date.js';

// 피드백 적용 버튼 이벤트 핸들러 (중복 등록 방지를 위한 모듈 레벨 변수)
let applyFeedbackClickHandler = null;

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
          <div style="flex: 1;">
            <div style="display: flex; align-items: center; gap: 0.75rem;">
              <div class="card-title" style="color: #7c3aed; font-size: 1.5rem; margin: 0;">월간 데일리 루틴</div>
              <button id="toggle-routines" class="btn-icon" style="background: transparent; border: none; padding: 0.25rem; cursor: pointer;">
                <i data-lucide="chevron-down" style="width: 20px; height: 20px; color: #7c3aed;"></i>
              </button>
            </div>
            <p style="color: #6b7280; font-size: 1rem; margin: 0.25rem 0 0 0;" id="routine-month-label">12월 매일 실천할 루틴</p>
          </div>
        </div>
      </div>

      <div id="routines-content" style="display: block;">
      <!-- 보기 모드 -->
      <div id="routines-view-mode" style="display: none;">
        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 2rem; margin-bottom: 1.5rem;">
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

          <!-- 데이타임 루틴 표시 -->
          <div id="daytime-display-section">
            <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1rem;">
              <i data-lucide="cloud-sun" style="width: 20px; height: 20px; color: #06b6d4;"></i>
              <h4 style="color: #7c3aed; font-weight: 600; margin: 0;">데이타임 루틴</h4>
            </div>
            <div id="daytime-display-list" style="display: flex; flex-direction: column; gap: 0.5rem;"></div>
            <div id="daytime-empty" style="color: #9ca3af; font-size: 0.9rem; padding: 1rem 0; display: none;">
              등록된 데이타임 루틴이 없습니다
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
        <div style="display: flex; gap: 0.75rem;">
          <button id="copy-prev-month-routines-btn" class="btn btn-secondary" style="display: none;">
            <i data-lucide="copy" style="width: 16px; height: 16px; margin-right: 0.5rem;"></i>
            전월 루틴 복사
          </button>
          <button id="edit-routines-btn" class="btn btn-secondary">수정하기</button>
        </div>
      </div>

      <!-- 편집 모드 -->
      <div id="routines-edit-mode" style="display: none;">
        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 2rem; margin-bottom: 1.5rem;">
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

          <!-- 데이타임 루틴 입력 -->
          <div>
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem;">
              <div style="display: flex; align-items: center; gap: 0.5rem;">
                <i data-lucide="cloud-sun" style="width: 20px; height: 20px; color: #06b6d4;"></i>
                <h4 style="color: #7c3aed; font-weight: 600; margin: 0;">데이타임 루틴</h4>
              </div>
              <span style="font-size: 0.85rem; color: #9ca3af;" id="daytime-count">0/10</span>
            </div>
            <div id="daytime-routines-list" style="display: flex; flex-direction: column; gap: 0.75rem; margin-bottom: 0.75rem;"></div>
            <button id="add-daytime-routine-btn" class="btn btn-sm" style="background: white; color: #a78bfa; border: 2px dashed #a78bfa; width: 100%;">
              <i data-lucide="plus" style="width: 16px; height: 16px;"></i>
              데이타임 루틴 추가
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
          <button id="copy-prev-month-routines-edit-btn" class="btn btn-secondary" style="display: inline-flex;">
            <i data-lucide="copy" style="width: 16px; height: 16px; margin-right: 0.5rem;"></i>
            전월 루틴 복사
          </button>
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
    </div>

    <!-- 과거 루틴 선택 모달 -->
    <div id="past-routines-modal" class="modal-overlay" style="display: none;">
      <div class="modal-content" style="max-width: 700px; max-height: 85vh; overflow-y: auto;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
          <h3 style="margin: 0; font-size: 1.25rem; font-weight: 700; color: #1f2937;">
            <i data-lucide="calendar-clock" style="width: 20px; height: 20px; margin-right: 0.5rem; vertical-align: middle;"></i>
            과거 루틴 선택
          </h3>
          <button id="close-past-routines-modal" class="btn-icon" style="padding: 0.5rem;">
            <i data-lucide="x" style="width: 20px; height: 20px;"></i>
          </button>
        </div>
        
        <!-- 1단계: 월 목록 -->
        <div id="month-list-view" style="display: block;">
          <p style="color: #6b7280; font-size: 0.9rem; margin-bottom: 1rem;">
            복사할 루틴이 있는 월을 선택하세요
          </p>
          <div id="past-months-list" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 0.75rem;">
            <!-- 동적 생성: 월 카드들 -->
          </div>
        </div>
        
        <!-- 2단계: 선택한 월의 루틴 상세 -->
        <div id="routine-detail-view" style="display: none;">
          <button id="back-to-month-list" class="btn btn-secondary" style="margin-bottom: 1rem;">
            <i data-lucide="arrow-left" style="width: 16px; height: 16px; margin-right: 0.5rem;"></i>
            목록으로
          </button>
          
          <h4 id="selected-month-title" style="font-size: 1.1rem; font-weight: 600; color: #1f2937; margin-bottom: 1rem;">
            <!-- 동적: 2025년 12월 루틴 -->
          </h4>
          
          <div id="routine-detail-content">
            <!-- 모닝루틴 -->
            <div id="detail-morning-section" style="margin-bottom: 1.5rem;">
              <h5 style="font-size: 1rem; font-weight: 600; color: #f59e0b; margin-bottom: 0.75rem;">
                <i data-lucide="sunrise" style="width: 18px; height: 18px; margin-right: 0.5rem; vertical-align: middle;"></i>
                모닝루틴
              </h5>
              <ul id="detail-morning-list" style="list-style: none; padding: 0; margin: 0;">
                <!-- 동적 생성 -->
              </ul>
            </div>
            
            <!-- 데이타임루틴 -->
            <div id="detail-daytime-section" style="margin-bottom: 1.5rem;">
              <h5 style="font-size: 1rem; font-weight: 600; color: #22d3ee; margin-bottom: 0.75rem;">
                <i data-lucide="sun" style="width: 18px; height: 18px; margin-right: 0.5rem; vertical-align: middle;"></i>
                데이타임루틴
              </h5>
              <ul id="detail-daytime-list" style="list-style: none; padding: 0; margin: 0;">
                <!-- 동적 생성 -->
              </ul>
            </div>
            
            <!-- 나이트루틴 -->
            <div id="detail-night-section" style="margin-bottom: 1.5rem;">
              <h5 style="font-size: 1rem; font-weight: 600; color: #6366f1; margin-bottom: 0.75rem;">
                <i data-lucide="moon" style="width: 18px; height: 18px; margin-right: 0.5rem; vertical-align: middle;"></i>
                나이트루틴
              </h5>
              <ul id="detail-night-list" style="list-style: none; padding: 0; margin: 0;">
                <!-- 동적 생성 -->
              </ul>
            </div>
          </div>
          
          <div style="display: flex; gap: 0.75rem; justify-content: flex-end; margin-top: 1.5rem;">
            <button id="cancel-copy-routines" class="btn btn-secondary">취소</button>
            <button id="confirm-copy-routines" class="btn btn-primary">
              <i data-lucide="copy" style="width: 16px; height: 16px; margin-right: 0.5rem;"></i>
              이 루틴 복사하기
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 연간 목표 -->
    <div class="card" style="background: linear-gradient(135deg, #e0e7ff 0%, #f3e8ff 100%); border: 2px solid #6366f1; box-shadow: 0 8px 24px rgba(99, 102, 241, 0.15); margin-top: 1.5rem;">
      <div class="card-header" style="border-bottom: 2px solid rgba(99, 102, 241, 0.2); padding-bottom: 1rem; margin-bottom: 1.25rem;">
        <div style="display: flex; align-items: center; justify-content: space-between;">
          <div style="display: flex; align-items: center; gap: 0.75rem; flex: 1;">
            <div style="width: 40px; height: 40px; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); border-radius: 12px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);">
              <i data-lucide="target" style="width: 24px; height: 24px; color: white; stroke-width: 2.5;"></i>
            </div>
            <div style="flex: 1;">
              <div style="display: flex; align-items: center; gap: 0.75rem;">
                <div class="card-title" style="color: #4f46e5; font-size: 1.5rem; margin: 0;">연간 목표</div>
                <button id="toggle-yearly-goals" class="btn-icon" style="background: transparent; border: none; padding: 0.25rem; cursor: pointer;">
                  <i data-lucide="chevron-down" style="width: 20px; height: 20px; color: #4f46e5;"></i>
                </button>
              </div>
              <p style="color: #6b7280; font-size: 1rem; margin: 0.25rem 0 0 0;" id="yearly-goal-subtitle">2025년 연간 목표</p>
            </div>
          </div>
          <div style="display: flex; align-items: center; gap: 0.5rem;">
            <button id="yearly-goal-prev-btn" class="btn-icon" style="background: white; border: 1px solid #6366f1; color: #6366f1; padding: 0.25rem 0.5rem; border-radius: 6px; cursor: pointer;">
              <i data-lucide="chevron-left" style="width: 18px; height: 18px;"></i>
            </button>
            <span id="yearly-goal-year-label" style="font-size: 1rem; font-weight: 600; color: #4f46e5; min-width: 60px; text-align: center; cursor: pointer; padding: 0.25rem 0.5rem; border-radius: 6px; transition: background-color 0.2s;" onmouseover="this.style.backgroundColor='#f3f4f6'" onmouseout="this.style.backgroundColor='transparent'">2025년</span>
            <button id="yearly-goal-next-btn" class="btn-icon" style="background: white; border: 1px solid #6366f1; color: #6366f1; padding: 0.25rem 0.5rem; border-radius: 6px; cursor: pointer;">
              <i data-lucide="chevron-right" style="width: 18px; height: 18px;"></i>
            </button>
            <button id="yearly-goal-go-to-current-year-btn" class="btn-icon" style="background: #e0e7ff; border: 1px solid rgba(99, 102, 241, 0.2); color: #1f2937; padding: 0.375rem 0.875rem; border-radius: 6px; cursor: pointer; font-size: 0.875rem; font-weight: 500; display: none;">
              <i data-lucide="calendar" style="width: 16px; height: 16px; margin-right: 0.25rem;"></i>
              올해로
            </button>
          </div>
        </div>
      </div>

      <div id="yearly-goals-content" style="display: block;">
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
              <h4 style="color: #4f46e5; font-weight: 600; margin: 0; font-size: 1.1rem;">가족/관계</h4>
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
        <div style="display: flex; gap: 0.75rem; margin-top: 1.5rem;">
          <button id="copy-prev-year-goals-btn" class="btn btn-secondary" style="display: none;">
            <i data-lucide="copy" style="width: 16px; height: 16px; margin-right: 0.5rem;"></i>
            작년 목표 복사
          </button>
          <button id="edit-yearly-goals-btn" class="btn btn-secondary">수정하기</button>
        </div>
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
              <h4 style="color: #4f46e5; font-weight: 600; margin: 0; font-size: 1.1rem;">가족/관계</h4>
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
        <div style="display: flex; gap: 0.75rem; margin-top: 1.5rem; flex-wrap: wrap;">
          <button id="copy-prev-year-goals-edit-btn" class="btn btn-secondary" style="display: inline-flex;">
            <i data-lucide="copy" style="width: 16px; height: 16px; margin-right: 0.5rem;"></i>
            작년 목표 복사
          </button>
          <button id="ai-feedback-yearly-goals-btn" class="btn" style="background: linear-gradient(135deg, #a78bfa 0%, #c084fc 100%); color: white; border: none; box-shadow: 0 4px 12px rgba(167, 139, 250, 0.3);">
            <i data-lucide="sparkles" style="width: 16px; height: 16px; margin-right: 0.5rem;"></i>
            AI로 피드백받기
          </button>
          <button id="save-yearly-goals-btn" class="btn" style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; border: none; box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);">저장하기</button>
          <button id="cancel-yearly-goals-btn" class="btn btn-secondary">취소</button>
        </div>

        <!-- AI 피드백 표시 영역 -->
        <div id="yearly-goals-ai-feedback" style="display: none; margin-top: 1.5rem; padding: 1.5rem; background: linear-gradient(135deg, #f0e7ff 0%, #fce7f3 100%); border: 2px solid #a78bfa; border-radius: 12px;">
          <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1rem;">
            <i data-lucide="sparkles" style="width: 20px; height: 20px; color: #a78bfa;"></i>
            <h4 style="color: #7c3aed; font-weight: 600; margin: 0;">AI 피드백</h4>
          </div>
          <div style="display: flex; flex-direction: column; gap: 1rem;">
            <div>
              <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
                <i data-lucide="book-open" style="width: 16px; height: 16px; color: #6366f1;"></i>
                <h5 style="color: #4f46e5; font-weight: 600; margin: 0; font-size: 0.95rem;">자기계발</h5>
              </div>
              <div style="background: white; padding: 0.75rem; border-radius: 8px; margin-bottom: 0.5rem;">
                <div style="font-size: 0.85rem; color: #6b7280; margin-bottom: 0.25rem;">원본:</div>
                <div id="feedback-original-self-dev" style="color: #374151; white-space: pre-wrap;"></div>
              </div>
              <div style="background: #f0fdf4; padding: 0.75rem; border-radius: 8px; border: 1px solid #86efac;">
                <div style="font-size: 0.85rem; color: #16a34a; margin-bottom: 0.25rem; font-weight: 600;">개선 제안:</div>
                <div id="feedback-improved-self-dev" style="color: #166534; white-space: pre-wrap;"></div>
              </div>
              <button class="apply-feedback-btn" data-field="self_dev" style="margin-top: 0.5rem; padding: 0.375rem 0.75rem; background: #10b981; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 0.875rem;">적용하기</button>
            </div>

            <div>
              <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
                <i data-lucide="heart" style="width: 16px; height: 16px; color: #ec4899;"></i>
                <h5 style="color: #4f46e5; font-weight: 600; margin: 0; font-size: 0.95rem;">가족/관계</h5>
              </div>
              <div style="background: white; padding: 0.75rem; border-radius: 8px; margin-bottom: 0.5rem;">
                <div style="font-size: 0.85rem; color: #6b7280; margin-bottom: 0.25rem;">원본:</div>
                <div id="feedback-original-relationship" style="color: #374151; white-space: pre-wrap;"></div>
              </div>
              <div style="background: #f0fdf4; padding: 0.75rem; border-radius: 8px; border: 1px solid #86efac;">
                <div style="font-size: 0.85rem; color: #16a34a; margin-bottom: 0.25rem; font-weight: 600;">개선 제안:</div>
                <div id="feedback-improved-relationship" style="color: #166534; white-space: pre-wrap;"></div>
              </div>
              <button class="apply-feedback-btn" data-field="relationship" style="margin-top: 0.5rem; padding: 0.375rem 0.75rem; background: #10b981; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 0.875rem;">적용하기</button>
            </div>

            <div>
              <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
                <i data-lucide="briefcase" style="width: 16px; height: 16px; color: #10b981;"></i>
                <h5 style="color: #4f46e5; font-weight: 600; margin: 0; font-size: 0.95rem;">업무/재정</h5>
              </div>
              <div style="background: white; padding: 0.75rem; border-radius: 8px; margin-bottom: 0.5rem;">
                <div style="font-size: 0.85rem; color: #6b7280; margin-bottom: 0.25rem;">원본:</div>
                <div id="feedback-original-work-finance" style="color: #374151; white-space: pre-wrap;"></div>
              </div>
              <div style="background: #f0fdf4; padding: 0.75rem; border-radius: 8px; border: 1px solid #86efac;">
                <div style="font-size: 0.85rem; color: #16a34a; margin-bottom: 0.25rem; font-weight: 600;">개선 제안:</div>
                <div id="feedback-improved-work-finance" style="color: #166534; white-space: pre-wrap;"></div>
              </div>
              <button class="apply-feedback-btn" data-field="work_finance" style="margin-top: 0.5rem; padding: 0.375rem 0.75rem; background: #10b981; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 0.875rem;">적용하기</button>
            </div>
          </div>
          <button id="close-feedback-btn" style="margin-top: 1rem; padding: 0.5rem 1rem; background: #e5e7eb; color: #374151; border: none; border-radius: 6px; cursor: pointer; font-size: 0.875rem;">닫기</button>
        </div>
      </div>

      <!-- 로딩 상태 -->
      <div id="yearly-goals-loading" style="text-align: center; padding: 2rem; color: #9ca3af;">
        <i data-lucide="loader" class="spin" style="width: 24px; height: 24px;"></i>
        <p style="margin-top: 0.5rem;">로딩 중...</p>
      </div>
      </div>
    </div>

      <!-- 연도 선택 모달 -->
      <div id="yearly-goal-year-selector-overlay" style="position: fixed; inset: 0; background: rgba(15, 23, 42, 0.35); backdrop-filter: blur(6px); display: none; align-items: center; justify-content: center; z-index: 2000; padding: 1rem;">
        <div id="yearly-goal-year-selector-modal" style="background: #ffffff; border-radius: 1rem; box-shadow: 0 20px 40px rgba(0,0,0,0.18); width: min(360px, 90vw); padding: 1rem; display: flex; flex-direction: column; gap: 0.75rem; border: 1px solid #e5e7eb;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="font-weight: 700; color: #111827; font-size: 1rem;">연도 선택</span>
            <button 
              id="yearly-goal-year-selector-close"
              style="background: none; border: none; cursor: pointer; padding: 0.25rem; border-radius: 4px; display: flex; align-items: center; justify-content: center; transition: all 0.2s;"
              onmouseover="this.style.background='#f3f4f6';"
              onmouseout="this.style.background='none';"
            >
              <i data-lucide="x" style="width: 20px; height: 20px; color: #6b7280; stroke-width: 2.5;"></i>
            </button>
          </div>
          <div style="background: #f8fafc; border-radius: 0.75rem; padding: 0.5rem; border: 1px solid #e2e8f0; max-height: 300px; overflow-y: auto;">
            <div id="yearly-goal-year-selector-options" style="display: flex; flex-direction: column; gap: 0.25rem;">
              <!-- 연도 옵션은 JavaScript로 동적으로 생성됨 -->
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 월간 실천계획 -->
    <div class="card" style="background: linear-gradient(135deg, #e0f7f4 0%, #f0fdf4 100%); border: 2px solid #14b8a6; box-shadow: 0 8px 24px rgba(20, 184, 166, 0.15); margin-top: 1.5rem;">
      <div class="card-header" style="border-bottom: 2px solid rgba(20, 184, 166, 0.2); padding-bottom: 1rem; margin-bottom: 1.25rem;">
        <div style="display: flex; align-items: center; justify-content: space-between;">
          <div style="display: flex; align-items: center; gap: 0.75rem;">
            <div style="width: 40px; height: 40px; background: linear-gradient(135deg, #14b8a6 0%, #10b981 100%); border-radius: 12px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(20, 184, 166, 0.3);">
              <i data-lucide="calendar-check" style="width: 24px; height: 24px; color: white; stroke-width: 2.5;"></i>
            </div>
            <div style="flex: 1;">
              <div style="display: flex; align-items: center; gap: 0.75rem;">
                <div class="card-title" style="color: #0f766e; font-size: 1.5rem; margin: 0;">월간 실천계획</div>
                <button id="toggle-monthly-plans" class="btn-icon" style="background: transparent; border: none; padding: 0.25rem; cursor: pointer;">
                  <i data-lucide="chevron-down" style="width: 20px; height: 20px; color: #0f766e;"></i>
                </button>
              </div>
              <p style="color: #6b7280; font-size: 1rem; margin: 0.25rem 0 0 0;" id="monthly-plan-subtitle">2025년 12월 실천 계획 & 결과</p>
            </div>
          </div>
          <div style="display: flex; align-items: center; gap: 0.5rem;">
            <button id="monthly-plan-prev-btn" class="btn-icon" style="background: white; border: 1px solid #14b8a6; color: #14b8a6; padding: 0.25rem 0.5rem; border-radius: 6px; cursor: pointer;">
              <i data-lucide="chevron-left" style="width: 18px; height: 18px;"></i>
            </button>
            <span id="monthly-plan-month-label" style="font-size: 1rem; font-weight: 600; color: #0f766e; min-width: 80px; text-align: center; cursor: pointer; padding: 0.25rem 0.5rem; border-radius: 6px; transition: background-color 0.2s;" onmouseover="this.style.backgroundColor='#f3f4f6'" onmouseout="this.style.backgroundColor='transparent'">2025년 12월</span>
            <button id="monthly-plan-next-btn" class="btn-icon" style="background: white; border: 1px solid #14b8a6; color: #14b8a6; padding: 0.25rem 0.5rem; border-radius: 6px; cursor: pointer;">
              <i data-lucide="chevron-right" style="width: 18px; height: 18px;"></i>
            </button>
            <button id="monthly-plan-go-to-current-month-btn" class="btn-icon" style="background: #e0f7f4; border: 1px solid rgba(20, 184, 166, 0.2); color: #1f2937; padding: 0.375rem 0.875rem; border-radius: 6px; cursor: pointer; font-size: 0.875rem; font-weight: 500; display: none;">
              <i data-lucide="calendar" style="width: 16px; height: 16px; margin-right: 0.25rem;"></i>
              이번 달로
            </button>
          </div>
        </div>
      </div>

      <div id="monthly-plans-content" style="display: block;">
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
        <div style="display: flex; gap: 0.75rem; margin-top: 1.5rem;">
          <button id="copy-prev-month-plan-btn" class="btn btn-secondary" style="display: inline-flex;">
            <i data-lucide="copy" style="width: 16px; height: 16px; margin-right: 0.5rem;"></i>
            지난달 계획 복사
          </button>
          <button id="ai-suggest-monthly-plan-btn" class="btn" style="background: linear-gradient(135deg, #a78bfa 0%, #c084fc 100%); color: white; border: none; box-shadow: 0 4px 12px rgba(167, 139, 250, 0.3);">
            <i data-lucide="sparkles" style="width: 18px; height: 18px; margin-right: 0.5rem;"></i>
            AI로 제안받기
          </button>
          <button id="edit-monthly-plans-btn" class="btn btn-secondary">수정하기</button>
        </div>
      </div>

      <!-- 편집 모드 -->
      <div id="monthly-plans-edit-mode" style="display: none;">
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
          <button id="copy-prev-month-plan-edit-btn" class="btn btn-secondary" style="display: inline-flex;">
            <i data-lucide="copy" style="width: 16px; height: 16px; margin-right: 0.5rem;"></i>
            지난달 계획 복사
          </button>
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

      <!-- 월 선택 모달 -->
      <div id="monthly-plan-month-selector-overlay" style="position: fixed; inset: 0; background: rgba(15, 23, 42, 0.35); backdrop-filter: blur(6px); display: none; align-items: center; justify-content: center; z-index: 2000; padding: 1rem;">
        <div id="monthly-plan-month-selector-modal" style="background: #ffffff; border-radius: 1rem; box-shadow: 0 20px 40px rgba(0,0,0,0.18); width: min(360px, 90vw); padding: 1rem; display: flex; flex-direction: column; gap: 0.75rem; border: 1px solid #e5e7eb;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="font-weight: 700; color: #111827; font-size: 1rem;">월 선택</span>
            <button 
              id="monthly-plan-month-selector-close"
              style="background: none; border: none; cursor: pointer; padding: 0.25rem; border-radius: 4px; display: flex; align-items: center; justify-content: center; transition: all 0.2s;"
              onmouseover="this.style.background='#f3f4f6';"
              onmouseout="this.style.background='none';"
            >
              <i data-lucide="x" style="width: 20px; height: 20px; color: #6b7280; stroke-width: 2.5;"></i>
            </button>
          </div>
          <div style="background: #f8fafc; border-radius: 0.75rem; padding: 0.5rem; border: 1px solid #e2e8f0; max-height: 300px; overflow-y: auto;">
            <div id="monthly-plan-month-selector-options" style="display: flex; flex-direction: column; gap: 0.25rem;">
              <!-- 월 옵션은 JavaScript로 동적으로 생성됨 -->
            </div>
          </div>
        </div>
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
      let daytimeRoutines = [];
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
            daytimeRoutines = data.daily_routines.daytime || [];
            nightRoutines = data.daily_routines.night || [];
          }

          // 데이터가 있으면 보기 모드, 없으면 편집 모드
          if (morningRoutines.length > 0 || daytimeRoutines.length > 0 || nightRoutines.length > 0) {
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
        const daytimeList = document.getElementById('daytime-display-list');
        const nightList = document.getElementById('night-display-list');
        const morningEmpty = document.getElementById('morning-empty');
        const daytimeEmpty = document.getElementById('daytime-empty');
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

        // 데이타임 루틴 표시
        if (daytimeRoutines.length > 0) {
          daytimeList.innerHTML = daytimeRoutines.map((routine, idx) => `
            <div style="display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem; background: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
              <span style="background: #a78bfa; color: white; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.85rem; font-weight: 600; flex-shrink: 0;">
                ${idx + 1}
              </span>
              <span style="color: #374151; font-weight: 500;">${routine}</span>
            </div>
          `).join('');
          daytimeEmpty.style.display = 'none';
        } else {
          daytimeList.innerHTML = '';
          daytimeEmpty.style.display = 'block';
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
      async function switchToViewMode() {
        document.getElementById('routines-view-mode').style.display = 'block';
        document.getElementById('routines-edit-mode').style.display = 'none';
        document.getElementById('routines-loading').style.display = 'none';
        isEditMode = false;
        
        // "전월 루틴 복사" 버튼 표시 조건 확인
        await updateCopyButtonVisibility();
        
        if (window.lucide?.createIcons) window.lucide.createIcons();
      }
      
      /**
       * "전월 루틴 복사" 버튼 표시 여부 결정
       * 항상 표시: 루틴이 있을 때도 전월 루틴으로 교체 가능
       */
      async function updateCopyButtonVisibility() {
        const copyBtn = document.getElementById('copy-prev-month-routines-btn');
        if (!copyBtn) return;
        
        // 항상 버튼 표시 (루틴 있을 때도 전월 루틴으로 교체 가능)
        copyBtn.style.display = 'inline-flex';
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
        renderRoutineInputs('daytime', daytimeRoutines);
        renderRoutineInputs('night', nightRoutines);
      }

      function renderRoutineInputs(type, routines) {
        const container = document.getElementById(`${type}-routines-list`);
        const countEl = document.getElementById(`${type}-count`);
        
        // 컨테이너 초기화
        container.innerHTML = '';
        
        // 루틴이 있으면 표시
        if (routines.length > 0) {
          routines.forEach(routine => addRoutineInput(type, routine));
        }
        // 루틴이 없으면 빈 상태로 둠 (사용자가 "+ 루틴 추가" 버튼으로 추가)
        
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
        inputGroup.draggable = true;

        inputGroup.innerHTML = `
          <!-- 드래그 핸들 (PC 전용) -->
          <div class="drag-handle" style="cursor: grab; padding: 0.25rem; display: flex; align-items: center; flex-shrink: 0;">
            <i data-lucide="grip-vertical" style="width: 18px; height: 18px; color: #9ca3af;"></i>
          </div>
          
          <!-- 번호 -->
          <span class="routine-number" style="background: #a78bfa; color: white; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.9rem; font-weight: 600; flex-shrink: 0;">
            ${index + 1}
          </span>
          
          <!-- 입력 필드 -->
          <input 
            type="text" 
            class="input routine-input" 
            data-type="${type}"
            placeholder="${type === 'morning' ? '예: 아침 명상 10분' : '예: 감사 일기'}" 
            value="${value}"
            maxlength="50"
            style="flex: 1; border: 2px solid #d8b4fe; background: white;"
          />
          
          <!-- 순서 조정 버튼 (모바일 대응) -->
          <div class="order-controls" style="display: flex; flex-direction: column; gap: 0.1rem; flex-shrink: 0;">
            <button class="btn-icon move-routine-up" data-type="${type}" data-index="${index}" style="padding: 0.15rem; background: #e0e7ff; border: 1px solid #c7d2fe; cursor: pointer;">
              <i data-lucide="chevron-up" style="width: 14px; height: 14px; color: #6366f1;"></i>
            </button>
            <button class="btn-icon move-routine-down" data-type="${type}" data-index="${index}" style="padding: 0.15rem; background: #e0e7ff; border: 1px solid #c7d2fe; cursor: pointer;">
              <i data-lucide="chevron-down" style="width: 14px; height: 14px; color: #6366f1;"></i>
            </button>
          </div>
          
          <!-- 삭제 버튼 -->
          <button class="btn btn-sm remove-routine-btn" data-type="${type}" data-index="${index}" style="background: #fecaca; color: #991b1b; border: none; padding: 0.4rem; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
            <i data-lucide="trash-2" style="width: 16px; height: 16px;"></i>
          </button>
        `;

        container.appendChild(inputGroup);
        
        // 드래그 앤 드롭 설정 (PC 전용)
        setupRoutineDragAndDrop(inputGroup, type);
        
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
          const numberSpan = group.querySelector('.routine-number');
          const moveUpBtn = group.querySelector('.move-routine-up');
          const moveDownBtn = group.querySelector('.move-routine-down');
          const removeBtn = group.querySelector('.remove-routine-btn');
          
          numberSpan.textContent = idx + 1;
          group.dataset.index = idx;
          if (moveUpBtn) moveUpBtn.dataset.index = idx;
          if (moveDownBtn) moveDownBtn.dataset.index = idx;
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
      // 순서 조정 (드래그 앤 드롭 + 위/아래 버튼)
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      
      // 드래그 상태 저장
      let draggedRoutineElement = null;
      let draggedOverRoutineElement = null;
      
      function setupRoutineDragAndDrop(inputGroup, type) {
        // PC 전용: 터치 디바이스에서는 드래그 비활성화
        const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        const isSmallScreen = window.innerWidth <= 768;
        
        if (isTouchDevice || isSmallScreen) {
          inputGroup.draggable = false;
          const dragHandle = inputGroup.querySelector('.drag-handle');
          if (dragHandle) dragHandle.style.display = 'none';
          return;
        }
        
        inputGroup.addEventListener('dragstart', (e) => {
          draggedRoutineElement = inputGroup;
          inputGroup.style.opacity = '0.4';
          e.dataTransfer.effectAllowed = 'move';
        });
        
        inputGroup.addEventListener('dragend', (e) => {
          inputGroup.style.opacity = '1';
          draggedRoutineElement = null;
          draggedOverRoutineElement = null;
          
          // 모든 드래그 오버 스타일 제거
          const container = document.getElementById(`${type}-routines-list`);
          const groups = container.querySelectorAll('.routine-input-group');
          groups.forEach(g => {
            g.style.borderTop = '';
            g.style.borderBottom = '';
          });
        });
        
        inputGroup.addEventListener('dragover', (e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
          
          if (draggedRoutineElement === inputGroup) return;
          
          draggedOverRoutineElement = inputGroup;
          
          // 시각적 피드백
          const rect = inputGroup.getBoundingClientRect();
          const midpoint = rect.top + rect.height / 2;
          
          if (e.clientY < midpoint) {
            inputGroup.style.borderTop = '2px solid #6366f1';
            inputGroup.style.borderBottom = '';
          } else {
            inputGroup.style.borderTop = '';
            inputGroup.style.borderBottom = '2px solid #6366f1';
          }
        });
        
        inputGroup.addEventListener('dragleave', (e) => {
          inputGroup.style.borderTop = '';
          inputGroup.style.borderBottom = '';
        });
        
        inputGroup.addEventListener('drop', (e) => {
          e.preventDefault();
          
          if (!draggedRoutineElement || draggedRoutineElement === inputGroup) return;
          
          const container = document.getElementById(`${type}-routines-list`);
          const rect = inputGroup.getBoundingClientRect();
          const midpoint = rect.top + rect.height / 2;
          
          if (e.clientY < midpoint) {
            container.insertBefore(draggedRoutineElement, inputGroup);
          } else {
            container.insertBefore(draggedRoutineElement, inputGroup.nextSibling);
          }
          
          renumberRoutines(type);
          
          // 스타일 초기화
          inputGroup.style.borderTop = '';
          inputGroup.style.borderBottom = '';
        });
      }
      
      function moveRoutineUp(type, index) {
        const container = document.getElementById(`${type}-routines-list`);
        const groups = Array.from(container.querySelectorAll('.routine-input-group'));
        
        if (index === 0) return; // 이미 맨 위
        
        const currentGroup = groups[index];
        const prevGroup = groups[index - 1];
        
        container.insertBefore(currentGroup, prevGroup);
        renumberRoutines(type);
      }
      
      function moveRoutineDown(type, index) {
        const container = document.getElementById(`${type}-routines-list`);
        const groups = Array.from(container.querySelectorAll('.routine-input-group'));
        
        if (index === groups.length - 1) return; // 이미 맨 아래
        
        const currentGroup = groups[index];
        const nextGroup = groups[index + 1];
        
        container.insertBefore(nextGroup, currentGroup);
        renumberRoutines(type);
      }

      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      // 저장
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      async function saveRoutines() {
        const morningInputs = document.querySelectorAll('#morning-routines-list .routine-input');
        const daytimeInputs = document.querySelectorAll('#daytime-routines-list .routine-input');
        const nightInputs = document.querySelectorAll('#night-routines-list .routine-input');

        const newMorningRoutines = Array.from(morningInputs)
          .map(input => input.value.trim())
          .filter(v => v.length > 0);

        const newDaytimeRoutines = Array.from(daytimeInputs)
          .map(input => input.value.trim())
          .filter(v => v.length > 0);

        const newNightRoutines = Array.from(nightInputs)
          .map(input => input.value.trim())
          .filter(v => v.length > 0);

        // 유효성 검사
        if (newMorningRoutines.length === 0 && newDaytimeRoutines.length === 0 && newNightRoutines.length === 0) {
          alert('최소 1개의 루틴을 입력해주세요.');
          return;
        }

        const dailyRoutines = {
          morning: newMorningRoutines,
          daytime: newDaytimeRoutines,
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
          daytimeRoutines = newDaytimeRoutines;
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
        const { morning = [], daytime = [], night = [] } = dailyRoutines;

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

          // B. 새 루틴 생성 또는 재활성화 (오늘부터 적용되도록 active_from_date 설정)
          // 중복 방지: 기존에 동일한 제목의 루틴이 있으면 재활성화, 없으면 새로 생성
          
          // 먼저 기존 비활성 루틴 중 동일 제목이 있는지 확인
          const { data: allRoutines, error: allRoutinesError } = await supabase
            .from('routines')
            .select('id, title, schedule, is_active, deleted_at')
            .eq('user_id', userId)
            .eq('schedule->>type', 'monthly')
            .eq('schedule->>month', monthStart);
          
          if (allRoutinesError) {
            console.error('[Sync Error] Failed to fetch all routines:', allRoutinesError);
            throw new Error('기존 루틴 조회 실패: ' + allRoutinesError.message);
          }
          
          const routinesToInsert = [];
          const routinesToReactivate = [];
          
          // 모닝루틴 처리
          morning.forEach((title, index) => {
            const trimmedTitle = title.trim();
            const existingRoutine = allRoutines?.find(r => 
              r.title === trimmedTitle && 
              r.schedule?.category === 'morning'
            );
            
            if (existingRoutine && !existingRoutine.is_active) {
              // 비활성 루틴이 있으면 재활성화 (active_from_date는 기존 값 유지)
              routinesToReactivate.push({
                id: existingRoutine.id,
                schedule: {
                  ...existingRoutine.schedule,
                  order: index
                  // active_from_date는 기존 값 유지하여 과거 기록 보존
                }
              });
            } else if (existingRoutine && existingRoutine.is_active) {
              // 이미 활성인 루틴은 그대로 유지 (아무것도 안함)
              console.log(`[Sync] ℹ️ Routine already active: ${trimmedTitle}`);
            } else if (!existingRoutine) {
              // 루틴이 없으면 새로 생성
              routinesToInsert.push({
                user_id: userId,
                title: trimmedTitle,
                schedule: {
                  type: 'monthly',
                  month: monthStart,
                  source: 'monthly_goal',
                  category: 'morning',
                  order: index,
                  active_from_date: activeFromDate
                },
                is_active: true
              });
            }
          });
          
          // 나이트루틴 처리
          night.forEach((title, index) => {
            const trimmedTitle = title.trim();
            const existingRoutine = allRoutines?.find(r => 
              r.title === trimmedTitle && 
              r.schedule?.category === 'night'
            );
            
            if (existingRoutine && !existingRoutine.is_active) {
              // 비활성 루틴이 있으면 재활성화 (active_from_date는 기존 값 유지)
              routinesToReactivate.push({
                id: existingRoutine.id,
                schedule: {
                  ...existingRoutine.schedule,
                  order: index
                  // active_from_date는 기존 값 유지하여 과거 기록 보존
                }
              });
            } else if (existingRoutine && existingRoutine.is_active) {
              // 이미 활성인 루틴은 그대로 유지 (아무것도 안함)
              console.log(`[Sync] ℹ️ Routine already active: ${trimmedTitle}`);
            } else if (!existingRoutine) {
              // 루틴이 없으면 새로 생성
              routinesToInsert.push({
                user_id: userId,
                title: trimmedTitle,
                schedule: {
                  type: 'monthly',
                  month: monthStart,
                  source: 'monthly_goal',
                  category: 'night',
                  order: index,
                  active_from_date: activeFromDate
                },
                is_active: true
              });
            }
          });
          
          // 데이타임 루틴 처리
          daytime.forEach((title, index) => {
            const trimmedTitle = title.trim();
            const existingRoutine = allRoutines?.find(r => 
              r.title === trimmedTitle && 
              r.schedule?.category === 'daytime'
            );
            
            if (existingRoutine && !existingRoutine.is_active) {
              // 비활성 루틴이 있으면 재활성화 (active_from_date는 기존 값 유지)
              routinesToReactivate.push({
                id: existingRoutine.id,
                schedule: {
                  ...existingRoutine.schedule,
                  order: index
                  // active_from_date는 기존 값 유지하여 과거 기록 보존
                }
              });
            } else if (existingRoutine && existingRoutine.is_active) {
              // 이미 활성인 루틴은 그대로 유지 (아무것도 안함)
              console.log(`[Sync] ℹ️ Routine already active: ${trimmedTitle}`);
            } else if (!existingRoutine) {
              // 루틴이 없으면 새로 생성
              routinesToInsert.push({
                user_id: userId,
                title: trimmedTitle,
                schedule: {
                  type: 'monthly',
                  month: monthStart,
                  source: 'monthly_goal',
                  category: 'daytime',
                  order: index,
                  active_from_date: activeFromDate
                },
                is_active: true
              });
            }
          });
          
          // 재활성화할 루틴이 있으면 업데이트
          if (routinesToReactivate.length > 0) {
            console.log(`[Sync] 🔄 Reactivating ${routinesToReactivate.length} existing routines`);
            
            for (const routine of routinesToReactivate) {
              const { error: updateError } = await supabase
                .from('routines')
                .update({
                  is_active: true,
                  deleted_at: null,
                  schedule: routine.schedule
                })
                .eq('id', routine.id);
              
              if (updateError) {
                console.error('[Sync Error] Failed to reactivate routine:', updateError);
                throw new Error('루틴 재활성화 실패: ' + updateError.message);
              }
            }
            
            console.log(`[Sync] ✅ Successfully reactivated ${routinesToReactivate.length} routines`);
          }
          
          // 새로 생성할 루틴이 있으면 INSERT
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
      // 전월 루틴 조회 및 복사
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      
      /**
       * 전월 루틴 조회
       * @param {string} userId - 사용자 ID
       * @param {string} currentMonth - 현재 월 (YYYY-MM-01)
       * @returns {Promise<Object>} { morning: [], night: [] }
       */
      async function fetchPreviousMonthRoutines(userId, currentMonth) {
        try {
          // 전월 계산 (JavaScript Date 사용)
          const currentDate = new Date(currentMonth);
          currentDate.setMonth(currentDate.getMonth() - 1);
          const year = currentDate.getFullYear();
          const month = String(currentDate.getMonth() + 1).padStart(2, '0');
          const prevMonthStr = `${year}-${month}-01`;
          
          console.log(`[Copy] Fetching routines from previous month: ${prevMonthStr}`);
          
          // 전월의 monthly_plans 조회
          const { data: prevPlan, error } = await supabase
            .from('monthly_plans')
            .select('daily_routines')
            .eq('user_id', userId)
            .eq('month_start', prevMonthStr)
            .eq('source', 'manual')
            .maybeSingle();
          
          if (error) {
            console.error('[Copy Error] Failed to fetch previous month routines:', error);
            return { morning: [], daytime: [], night: [] };
          }
          
          if (!prevPlan || !prevPlan.daily_routines) {
            console.log('[Copy] No routines found in previous month');
            return { morning: [], daytime: [], night: [] };
          }
          
          const { morning = [], daytime = [], night = [] } = prevPlan.daily_routines;
          console.log(`[Copy] Found ${morning.length} morning + ${daytime.length} daytime + ${night.length} night routines`);
          
          return { morning, daytime, night };
        } catch (error) {
          console.error('[Copy Error]', error);
          return { morning: [], daytime: [], night: [] };
        }
      }
      
      /**
       * 과거 모든 루틴 월 목록 조회
       */
      async function fetchAllPastRoutineMonths(userId, currentMonth) {
        try {
          const { data: plans, error } = await supabase
            .from('monthly_plans')
            .select('month_start, daily_routines')
            .eq('user_id', userId)
            .eq('source', 'manual')
            .lt('month_start', currentMonth)  // 현재 월보다 이전
            .not('daily_routines', 'is', null)  // 루틴이 있는 월만
            .order('month_start', { ascending: false });  // 최신순
          
          if (error) throw error;
          
          // 루틴이 실제로 있는 월만 필터링
          const validPlans = plans.filter(plan => {
            const routines = plan.daily_routines;
            return routines && (
              (routines.morning && routines.morning.length > 0) ||
              (routines.daytime && routines.daytime.length > 0) ||
              (routines.night && routines.night.length > 0)
            );
          });
          
          return validPlans;
          
        } catch (err) {
          console.error('[Fetch Past Routines Error]', err);
          throw err;
        }
      }

      /**
       * 과거 루틴 모달 표시 (1단계: 월 목록)
       */
      async function showPastRoutinesModal() {
        try {
          // 과거 루틴 월 목록 조회
          const pastPlans = await fetchAllPastRoutineMonths(profile.id, currentMonth);
          
          if (pastPlans.length === 0) {
            alert('과거 루틴이 없습니다.\n루틴을 최소 한 달 이상 사용해야 합니다.');
            return;
          }
          
          // 월 목록 렌더링
          const monthsList = document.getElementById('past-months-list');
          monthsList.innerHTML = '';
          
          pastPlans.forEach(plan => {
            const date = new Date(plan.month_start);
            const year = date.getFullYear();
            const month = date.getMonth() + 1;
            
            const routines = plan.daily_routines;
            const totalCount = 
              (routines.morning?.length || 0) + 
              (routines.daytime?.length || 0) + 
              (routines.night?.length || 0);
            
            const card = document.createElement('div');
            card.className = 'past-month-card';
            card.dataset.monthStart = plan.month_start;
            card.innerHTML = `
              <h4>${year}년 ${month}월</h4>
              <p>루틴 ${totalCount}개</p>
            `;
            
            card.addEventListener('click', () => showRoutineDetail(plan));
            
            monthsList.appendChild(card);
          });
          
          // 1단계 표시
          document.getElementById('month-list-view').style.display = 'block';
          document.getElementById('routine-detail-view').style.display = 'none';
          
          // 모달 열기
          document.getElementById('past-routines-modal').style.display = 'flex';
          
          // Lucide 아이콘 렌더링
          if (window.lucide?.createIcons) window.lucide.createIcons();
          
        } catch (err) {
          console.error('[Show Modal Error]', err);
          alert('과거 루틴 조회 실패: ' + err.message);
        }
      }

      /**
       * 선택한 월의 루틴 상세 표시 (2단계)
       */
      function showRoutineDetail(plan) {
        const date = new Date(plan.month_start);
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        
        // 제목 업데이트
        document.getElementById('selected-month-title').textContent = `${year}년 ${month}월 루틴`;
        
        const routines = plan.daily_routines;
        
        // 모닝루틴
        const morningList = document.getElementById('detail-morning-list');
        morningList.innerHTML = '';
        if (routines.morning && routines.morning.length > 0) {
          routines.morning.forEach((routine, index) => {
            const li = document.createElement('li');
            li.textContent = `${index + 1}. ${routine}`;
            morningList.appendChild(li);
          });
          document.getElementById('detail-morning-section').style.display = 'block';
        } else {
          document.getElementById('detail-morning-section').style.display = 'none';
        }
        
        // 데이타임루틴
        const daytimeList = document.getElementById('detail-daytime-list');
        daytimeList.innerHTML = '';
        if (routines.daytime && routines.daytime.length > 0) {
          routines.daytime.forEach((routine, index) => {
            const li = document.createElement('li');
            li.textContent = `${index + 1}. ${routine}`;
            daytimeList.appendChild(li);
          });
          document.getElementById('detail-daytime-section').style.display = 'block';
        } else {
          document.getElementById('detail-daytime-section').style.display = 'none';
        }
        
        // 나이트루틴
        const nightList = document.getElementById('detail-night-list');
        nightList.innerHTML = '';
        if (routines.night && routines.night.length > 0) {
          routines.night.forEach((routine, index) => {
            const li = document.createElement('li');
            li.textContent = `${index + 1}. ${routine}`;
            nightList.appendChild(li);
          });
          document.getElementById('detail-night-section').style.display = 'block';
        } else {
          document.getElementById('detail-night-section').style.display = 'none';
        }
        
        // 선택한 루틴 데이터 저장 (복사 시 사용)
        window._selectedRoutinesToCopy = {
          month_start: plan.month_start,
          routines: routines,
          year: year,
          month: month
        };
        
        // 2단계로 전환
        document.getElementById('month-list-view').style.display = 'none';
        document.getElementById('routine-detail-view').style.display = 'block';
        
        // Lucide 아이콘 렌더링
        if (window.lucide?.createIcons) window.lucide.createIcons();
      }

      /**
       * 목록으로 돌아가기
       */
      function backToMonthList() {
        document.getElementById('month-list-view').style.display = 'block';
        document.getElementById('routine-detail-view').style.display = 'none';
        window._selectedRoutinesToCopy = null;
      }

      /**
       * 선택한 루틴 복사 실행
       */
      async function executeCopySelectedRoutines() {
        try {
          const selected = window._selectedRoutinesToCopy;
          
          if (!selected) {
            alert('선택한 루틴이 없습니다.');
            return;
          }
          
          const routines = selected.routines;
          const totalRoutines = 
            (routines.morning?.length || 0) + 
            (routines.daytime?.length || 0) + 
            (routines.night?.length || 0);
          
          // 모달 닫기
          document.getElementById('past-routines-modal').style.display = 'none';
          
          // 현재 월 루틴이 있는지 확인
          if (morningRoutines.length > 0 || daytimeRoutines.length > 0 || nightRoutines.length > 0) {
            const totalCurrent = morningRoutines.length + daytimeRoutines.length + nightRoutines.length;
            
            const confirmed = confirm(
              `⚠️ 이미 이번 달 루틴이 ${totalCurrent}개 있습니다.\n\n` +
              `기존 루틴을 삭제하고 ${selected.year}년 ${selected.month}월 루틴 ${totalRoutines}개를 복사하시겠습니까?\n\n` +
              `(오늘부터 적용됩니다)`
            );
            
            if (!confirmed) {
              // 모달 다시 열기
              document.getElementById('past-routines-modal').style.display = 'flex';
              return;
            }
          } else {
            const confirmed = confirm(
              `${selected.year}년 ${selected.month}월 루틴 ${totalRoutines}개를 현재 월에 복사하시겠습니까?\n\n` +
              `⚠️ 오늘부터 적용됩니다.`
            );
            
            if (!confirmed) {
              // 모달 다시 열기
              document.getElementById('past-routines-modal').style.display = 'flex';
              return;
            }
          }
          
          // monthly_plans에 저장
          const { data: existingPlan } = await supabase
            .from('monthly_plans')
            .select('content_md, linked_year')
            .eq('user_id', profile.id)
            .eq('month_start', currentMonth)
            .eq('source', 'manual')
            .maybeSingle();
          
          const updateData = {
            user_id: profile.id,
            month_start: currentMonth,
            source: 'manual',
            daily_routines: routines,
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
            console.error('[Copy Error]', saveError);
            throw new Error('루틴 복사 실패: ' + saveError.message);
          }
          
          // routines 테이블 동기화
          await syncMonthlyRoutines(profile.id, currentMonth, savedPlan.daily_routines, today);
          
          // 상태 업데이트
          morningRoutines = routines.morning || [];
          daytimeRoutines = routines.daytime || [];
          nightRoutines = routines.night || [];
          
          alert(`✅ ${selected.year}년 ${selected.month}월 루틴이 복사되었습니다!`);
          
          displayRoutines();
          
          // 전역 변수 초기화
          window._selectedRoutinesToCopy = null;
          
        } catch (err) {
          console.error('[Execute Copy Error]', err);
          alert('루틴 복사 실패: ' + err.message);
        }
      }

      /**
       * 모달 닫기
       */
      function closePastRoutinesModal() {
        document.getElementById('past-routines-modal').style.display = 'none';
        window._selectedRoutinesToCopy = null;
      }

      /**
       * 전월 루틴 복사 (새 기능: 과거 루틴 선택 모달 표시)
       */
      async function copyPreviousMonthRoutines() {
        await showPastRoutinesModal();
      }

      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      // 이벤트 리스너 (중복 방지)
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      const handleEditRoutines = () => switchToEditMode();
      const handleCancelEdit = () => {
        // 루틴 있든 없든 보기 모드로 전환 (빈 상태 표시)
        displayRoutines();
      };
      const handleSaveRoutines = () => saveRoutines();
      const handleAddMorningRoutine = () => addRoutineInput('morning');
      const handleAddDaytimeRoutine = () => addRoutineInput('daytime');
      const handleAddNightRoutine = () => addRoutineInput('night');
      const handleCopyPrevMonthRoutines = () => copyPreviousMonthRoutines();
      
      const editBtn = document.getElementById('edit-routines-btn');
      const copyBtn = document.getElementById('copy-prev-month-routines-btn');
      const copyEditBtn = document.getElementById('copy-prev-month-routines-edit-btn');
      const cancelBtn = document.getElementById('cancel-edit-btn');
      const saveBtn = document.getElementById('save-routines-btn');
      const addMorningBtn = document.getElementById('add-morning-routine-btn');
      const addDaytimeBtn = document.getElementById('add-daytime-routine-btn');
      const addNightBtn = document.getElementById('add-night-routine-btn');
      
      if (editBtn) {
        editBtn.removeEventListener('click', handleEditRoutines);
        editBtn.addEventListener('click', handleEditRoutines);
      }
      
      if (copyBtn) {
        copyBtn.removeEventListener('click', handleCopyPrevMonthRoutines);
        copyBtn.addEventListener('click', handleCopyPrevMonthRoutines);
      }
      
      if (copyEditBtn) {
        copyEditBtn.removeEventListener('click', handleCopyPrevMonthRoutines);
        copyEditBtn.addEventListener('click', handleCopyPrevMonthRoutines);
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
      
      if (addDaytimeBtn) {
        addDaytimeBtn.removeEventListener('click', handleAddDaytimeRoutine);
        addDaytimeBtn.addEventListener('click', handleAddDaytimeRoutine);
      }
      
      if (addNightBtn) {
        addNightBtn.removeEventListener('click', handleAddNightRoutine);
        addNightBtn.addEventListener('click', handleAddNightRoutine);
      }

      // 삭제 버튼 및 순서 조정 버튼 (이벤트 위임)
      document.getElementById('morning-routines-list')?.addEventListener('click', (e) => {
        const removeBtn = e.target.closest('.remove-routine-btn');
        const moveUpBtn = e.target.closest('.move-routine-up');
        const moveDownBtn = e.target.closest('.move-routine-down');
        
        if (removeBtn && removeBtn.dataset.type === 'morning') {
          const index = parseInt(removeBtn.dataset.index);
          removeRoutineInput('morning', index);
        } else if (moveUpBtn && moveUpBtn.dataset.type === 'morning') {
          const index = parseInt(moveUpBtn.dataset.index);
          moveRoutineUp('morning', index);
        } else if (moveDownBtn && moveDownBtn.dataset.type === 'morning') {
          const index = parseInt(moveDownBtn.dataset.index);
          moveRoutineDown('morning', index);
        }
      });

      document.getElementById('night-routines-list')?.addEventListener('click', (e) => {
        const removeBtn = e.target.closest('.remove-routine-btn');
        const moveUpBtn = e.target.closest('.move-routine-up');
        const moveDownBtn = e.target.closest('.move-routine-down');
        
        if (removeBtn && removeBtn.dataset.type === 'night') {
          const index = parseInt(removeBtn.dataset.index);
          removeRoutineInput('night', index);
        } else if (moveUpBtn && moveUpBtn.dataset.type === 'night') {
          const index = parseInt(moveUpBtn.dataset.index);
          moveRoutineUp('night', index);
        } else if (moveDownBtn && moveDownBtn.dataset.type === 'night') {
          const index = parseInt(moveDownBtn.dataset.index);
          moveRoutineDown('night', index);
        }
      });

      document.getElementById('daytime-routines-list')?.addEventListener('click', (e) => {
        const removeBtn = e.target.closest('.remove-routine-btn');
        const moveUpBtn = e.target.closest('.move-routine-up');
        const moveDownBtn = e.target.closest('.move-routine-down');
        
        if (removeBtn && removeBtn.dataset.type === 'daytime') {
          const index = parseInt(removeBtn.dataset.index);
          removeRoutineInput('daytime', index);
        } else if (moveUpBtn && moveUpBtn.dataset.type === 'daytime') {
          const index = parseInt(moveUpBtn.dataset.index);
          moveRoutineUp('daytime', index);
        } else if (moveDownBtn && moveDownBtn.dataset.type === 'daytime') {
          const index = parseInt(moveDownBtn.dataset.index);
          moveRoutineDown('daytime', index);
        }
      });

      // 과거 루틴 모달 이벤트 리스너
      const closePastModalBtn = document.getElementById('close-past-routines-modal');
      const backToListBtn = document.getElementById('back-to-month-list');
      const cancelCopyBtn = document.getElementById('cancel-copy-routines');
      const confirmCopyBtn = document.getElementById('confirm-copy-routines');

      if (closePastModalBtn) {
        closePastModalBtn.removeEventListener('click', closePastRoutinesModal);
        closePastModalBtn.addEventListener('click', closePastRoutinesModal);
      }

      if (backToListBtn) {
        backToListBtn.removeEventListener('click', backToMonthList);
        backToListBtn.addEventListener('click', backToMonthList);
      }

      if (cancelCopyBtn) {
        cancelCopyBtn.removeEventListener('click', closePastRoutinesModal);
        cancelCopyBtn.addEventListener('click', closePastRoutinesModal);
      }

      if (confirmCopyBtn) {
        confirmCopyBtn.removeEventListener('click', executeCopySelectedRoutines);
        confirmCopyBtn.addEventListener('click', executeCopySelectedRoutines);
      }

      // 모달 배경 클릭 시 닫기
      const pastModal = document.getElementById('past-routines-modal');
      if (pastModal) {
        const handleModalBackgroundClick = (e) => {
          if (e.target.id === 'past-routines-modal') {
            closePastRoutinesModal();
          }
        };
        pastModal.removeEventListener('click', handleModalBackgroundClick);
        pastModal.addEventListener('click', handleModalBackgroundClick);
      }

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

        // 부제목 업데이트
        const subtitle = document.getElementById('yearly-goal-subtitle');
        if (subtitle) {
          subtitle.textContent = `${selectedYear}년 연간 목표`;
        }

        // "올해로" 버튼 표시/숨김 제어
        const goToCurrentYearBtn = document.getElementById('yearly-goal-go-to-current-year-btn');
        if (goToCurrentYearBtn) {
          if (selectedYear !== currentYear) {
            goToCurrentYearBtn.style.display = 'inline-flex';
          } else {
            goToCurrentYearBtn.style.display = 'none';
          }
        }
      }

      // 연도 선택 모달에 표시할 연도 목록 생성
      async function generateYearOptions() {
        // DB에서 저장된 연간목표가 있는 연도들 조회
        const { data: existingYears } = await supabase
          .from('yearly_goals')
          .select('year')
          .eq('user_id', profile.id)
          .order('year', { ascending: false });

        const existingYearSet = new Set(existingYears?.map(item => item.year) || []);
        
        // 현재 연도 기준 앞뒤 5년 + 저장된 연도들
        const years = new Set();
        for (let i = -5; i <= 5; i++) {
          years.add(currentYear + i);
        }
        existingYears?.forEach(item => years.add(item.year));
        
        // 연도 정렬 (내림차순)
        const sortedYears = Array.from(years).sort((a, b) => b - a);
        
        const optionsContainer = document.getElementById('yearly-goal-year-selector-options');
        if (!optionsContainer) return;
        
        const optionsHtml = sortedYears.map(year => {
          const isSelected = year === selectedYear;
          const isCurrentYear = year === currentYear;
          const selectedStyle = isSelected 
            ? 'background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white;'
            : 'background: white; color: #111827;';
          
          let label = `${year}년`;
          if (isCurrentYear) {
            label = `올해 (${year}년)`;
          }
          
          return `
            <button 
              class="yearly-goal-year-option-btn"
              data-year="${year}"
              style="${selectedStyle} padding: 0.75rem 1rem; border: 1px solid ${isSelected ? '#6366f1' : '#e5e7eb'}; border-radius: 8px; cursor: pointer; text-align: left; font-size: 0.875rem; font-weight: ${isSelected ? '600' : '500'}; transition: all 0.2s; width: 100%; display: flex; align-items: center; justify-content: space-between;"
              onmouseover="if (!this.dataset.selected) { this.style.background='#f3f4f6'; this.style.borderColor='#d1d5db'; }"
              onmouseout="if (!this.dataset.selected) { this.style.background='${isSelected ? 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' : 'white'}'; this.style.borderColor='${isSelected ? '#6366f1' : '#e5e7eb'}'; }"
              ${isSelected ? 'data-selected="true"' : ''}
            >
              <span>${label}</span>
              ${isSelected ? '<i data-lucide="check" style="width: 16px; height: 16px; stroke-width: 2.5;"></i>' : ''}
            </button>
          `;
        }).join('');
        
        optionsContainer.innerHTML = optionsHtml;
        
        // Lucide 아이콘 렌더링
        if (window.lucide) {
          setTimeout(() => {
            window.lucide.createIcons();
          }, 100);
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
        
        // 버튼 표시/숨김 제어
        updateCopyYearlyGoalsButtonVisibility();
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

      /**
       * 작년 목표 조회
       */
      async function fetchPreviousYearGoals(userId, currentYear) {
        try {
          const previousYear = currentYear - 1;
          
          console.log(`[Copy] Fetching yearly goals from previous year: ${previousYear}`);
          
          // 작년 연간 목표 조회
          const { data: prevGoals, error } = await supabase
            .from('yearly_goals')
            .select('*')
            .eq('user_id', userId)
            .eq('year', previousYear)
            .maybeSingle();
          
          if (error) {
            console.error('[Copy Error] Failed to fetch previous year goals:', error);
            return null;
          }
          
          if (!prevGoals) {
            console.log('[Copy] No goals found in previous year');
            return null;
          }
          
          console.log(`[Copy] Found previous year goals`);
          
          return {
            self_dev: prevGoals.self_dev || null,
            relationship: prevGoals.relationship || null,
            work_finance: prevGoals.work_finance || null
          };
        } catch (error) {
          console.error('[Copy Error]', error);
          return null;
        }
      }
      
      /**
       * 작년 목표 복사
       */
      async function copyPreviousYearGoals() {
        try {
          // 작년 목표 조회
          const prevGoals = await fetchPreviousYearGoals(profile.id, selectedYear);
          
          if (!prevGoals) {
            alert(`${selectedYear - 1}년 목표가 없습니다.`);
            return;
          }
          
          // 작년 목표가 모두 비어있는지 확인
          if (!prevGoals.self_dev && !prevGoals.relationship && !prevGoals.work_finance) {
            alert(`${selectedYear - 1}년 목표가 비어있습니다.`);
            return;
          }
          
          // 현재 연도 목표가 있는지 확인
          const hasCurrentGoals = yearlyGoals.self_dev || yearlyGoals.relationship || yearlyGoals.work_finance;
          
          if (hasCurrentGoals) {
            const goalCount = [prevGoals.self_dev, prevGoals.relationship, prevGoals.work_finance].filter(Boolean).length;
            
            const confirmed = confirm(
              `⚠️ ${selectedYear}년 목표가 이미 있습니다.\n\n` +
              `${selectedYear - 1}년 목표 ${goalCount}개 영역으로 덮어쓰시겠습니까?\n\n` +
              `⚠️ 기존 목표는 복구할 수 없습니다.`
            );
            
            if (!confirmed) return;
          } else {
            const goalCount = [prevGoals.self_dev, prevGoals.relationship, prevGoals.work_finance].filter(Boolean).length;
            
            const confirmed = confirm(
              `${selectedYear - 1}년 목표 ${goalCount}개 영역을 ${selectedYear}년으로 복사하시겠습니까?\n\n` +
              `복사 후 바로 수정할 수 있습니다.`
            );
            
            if (!confirmed) return;
          }
          
          // yearly_goals에 저장 (upsert)
          const { data, error } = await supabase
            .from('yearly_goals')
            .upsert({
              user_id: profile.id,
              year: selectedYear,
              self_dev: prevGoals.self_dev,
              relationship: prevGoals.relationship,
              work_finance: prevGoals.work_finance
            }, {
              onConflict: 'user_id,year'
            })
            .select()
            .single();
          
          if (error) {
            console.error('[Copy Error]', error);
            throw new Error('목표 복사 실패: ' + error.message);
          }
          
          // 상태 업데이트
          yearlyGoals = {
            self_dev: data.self_dev,
            relationship: data.relationship,
            work_finance: data.work_finance
          };
          
          alert(
            `✅ ${selectedYear - 1}년 목표가 ${selectedYear}년으로 복사되었습니다!\n\n` +
            `이제 수정할 수 있습니다.`
          );
          
          // 편집 모드로 자동 전환
          switchToYearlyGoalsEditMode();
          
        } catch (error) {
          console.error('[Copy Failed]', error);
          alert(`복사 중 오류가 발생했습니다.\n\n${error.message}\n\n다시 시도해주세요.`);
        }
      }
      
      /**
       * "작년 목표 복사" 버튼 표시/숨김 제어
       * 개발 모드: 항상 표시 (테스트용)
       */
      async function updateCopyYearlyGoalsButtonVisibility() {
        const copyBtn = document.getElementById('copy-prev-year-goals-btn');
        if (!copyBtn) return;
        
        // 개발 모드: 항상 버튼 표시 (작년 목표 없어도 테스트 가능)
        copyBtn.style.display = 'inline-flex';
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
      const handleGoToCurrentYear = () => {
        selectedYear = currentYear;
        updateYearLabel();
        loadYearlyGoals();
      };
      // 연도 선택 모달 열기
      const openYearSelectorModal = async () => {
        const overlay = document.getElementById('yearly-goal-year-selector-overlay');
        if (!overlay) return;
        
        await generateYearOptions();
        overlay.style.display = 'flex';
      };

      // 연도 선택 모달 닫기
      const closeYearSelectorModal = () => {
        const overlay = document.getElementById('yearly-goal-year-selector-overlay');
        if (overlay) {
          overlay.style.display = 'none';
        }
      };

      const handleYearLabelClick = () => {
        openYearSelectorModal();
      };
      const handleEditYearlyGoals = () => switchToYearlyGoalsEditMode();
      const handleCancelYearlyGoals = () => {
        // 피드백 영역 숨기기
        document.getElementById('yearly-goals-ai-feedback')?.style.setProperty('display', 'none');
        if (yearlyGoals.self_dev || yearlyGoals.relationship || yearlyGoals.work_finance) {
          displayYearlyGoals();
        } else {
          loadYearlyGoals();
        }
      };
      const handleSaveYearlyGoals = () => saveYearlyGoals();

      // AI 피드백 생성
      async function generateAIYearlyGoalFeedback() {
        const selfDev = document.getElementById('yearly-goal-self-dev-input')?.value.trim() || '';
        const relationship = document.getElementById('yearly-goal-relationship-input')?.value.trim() || '';
        const workFinance = document.getElementById('yearly-goal-work-finance-input')?.value.trim() || '';

        // 최소 1개 영역에 내용이 있어야 함
        if (!selfDev && !relationship && !workFinance) {
          alert('피드백을 받으려면 최소 1개 영역에 목표를 입력해주세요.');
          return;
        }

        // 확인 메시지
        const confirmGenerate = confirm(`AI가 ${selectedYear}년 연간 목표에 대한 SMART 기준 피드백을 제공합니다.\n\n입력하신 목표를 더 구체적이고 측정 가능하게 개선하는 제안을 드립니다.\n\n계속하시겠습니까?`);
        if (!confirmGenerate) return;

        // 버튼 참조 및 원본 HTML 저장
        const feedbackBtn = document.getElementById('ai-feedback-yearly-goals-btn');
        // 원본 HTML: Lucide 아이콘과 텍스트 (기본값 제공)
        const originalBtnHTML = feedbackBtn?.innerHTML || '<i data-lucide="sparkles" style="width: 16px; height: 16px; margin-right: 0.5rem;"></i> AI로 피드백받기';

        try {
          // 로딩 표시
          const feedbackArea = document.getElementById('yearly-goals-ai-feedback');
          if (feedbackArea) {
            feedbackArea.style.display = 'none';
          }

          // 버튼 비활성화 및 로딩 텍스트
          if (feedbackBtn) {
            feedbackBtn.disabled = true;
            feedbackBtn.innerHTML = '<i data-lucide="loader" class="spin" style="width: 16px; height: 16px; margin-right: 0.5rem;"></i> 피드백 생성 중...';
            if (window.lucide?.createIcons) window.lucide.createIcons();
          }

          // Edge Function 호출
          const session = await supabase.auth.getSession();
          if (!session.data.session) {
            alert('로그인이 필요합니다.');
            return;
          }

          const supabaseUrl = window.SUPABASE_CONFIG?.url || supabase.supabaseUrl;
          const supabaseKey = window.SUPABASE_CONFIG?.anonKey || supabase.supabaseKey;

          const response = await fetch(`${supabaseUrl}/functions/v1/ai-yearly-goal-feedback`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.data.session.access_token}`,
              'apikey': supabaseKey,
            },
            body: JSON.stringify({
              year: selectedYear,
              self_dev: selfDev,
              relationship: relationship,
              work_finance: workFinance,
            }),
          });

          const result = await response.json();

          if (!response.ok) {
            if (response.status === 429) {
              alert(`레이트리밋에 도달했습니다.\n\n${result.error}\n\n다음 달에 다시 시도해주세요.`);
            } else {
              alert(`피드백 생성 중 오류가 발생했습니다.\n\n${result.error || '알 수 없는 오류'}`);
            }
            return;
          }

          if (result.success && result.feedback) {
            // 피드백 표시
            displayYearlyGoalFeedback({
              original: { self_dev: selfDev, relationship: relationship, work_finance: workFinance },
              improved: result.feedback,
            });
          } else {
            alert('피드백 생성에 실패했습니다. 다시 시도해주세요.');
          }
        } catch (error) {
          console.error('[AI Yearly Goal Feedback Generation Failed]', error);
          alert(`피드백 생성 중 오류가 발생했습니다.\n\n${error.message}\n\n다시 시도해주세요.`);
        } finally {
          // 버튼 복원 (DOM에서 다시 찾아서 안전하게 복원)
          const btn = document.getElementById('ai-feedback-yearly-goals-btn');
          if (btn) {
            btn.disabled = false;
            btn.innerHTML = originalBtnHTML;
            if (window.lucide?.createIcons) window.lucide.createIcons();
          }
        }
      }

      // 피드백 표시
      function displayYearlyGoalFeedback(data) {
        const feedbackArea = document.getElementById('yearly-goals-ai-feedback');
        if (!feedbackArea) return;

        // 원본 표시
        document.getElementById('feedback-original-self-dev').textContent = data.original.self_dev || '(작성되지 않음)';
        document.getElementById('feedback-original-relationship').textContent = data.original.relationship || '(작성되지 않음)';
        document.getElementById('feedback-original-work-finance').textContent = data.original.work_finance || '(작성되지 않음)';

        // 개선 제안 표시
        document.getElementById('feedback-improved-self-dev').textContent = data.improved.self_dev || data.original.self_dev || '';
        document.getElementById('feedback-improved-relationship').textContent = data.improved.relationship || data.original.relationship || '';
        document.getElementById('feedback-improved-work-finance').textContent = data.improved.work_finance || data.original.work_finance || '';

        // 빈 항목 처리 (개선 제안이 없는 경우 버튼 숨김)
        const selfDevBtn = document.querySelector('.apply-feedback-btn[data-field="self_dev"]');
        const relationshipBtn = document.querySelector('.apply-feedback-btn[data-field="relationship"]');
        const workFinanceBtn = document.querySelector('.apply-feedback-btn[data-field="work_finance"]');

        if (selfDevBtn) {
          selfDevBtn.style.display = data.improved.self_dev ? 'inline-block' : 'none';
        }
        if (relationshipBtn) {
          relationshipBtn.style.display = data.improved.relationship ? 'inline-block' : 'none';
        }
        if (workFinanceBtn) {
          workFinanceBtn.style.display = data.improved.work_finance ? 'inline-block' : 'none';
        }

        // 피드백 영역 표시
        feedbackArea.style.display = 'block';
        
        // 아이콘 렌더링
        if (window.lucide?.createIcons) window.lucide.createIcons();
      }

      // 피드백 적용
      function applyFeedback(field) {
        // field 이름을 HTML ID 형식으로 변환 (언더스코어 → 하이픈)
        const feedbackId = `feedback-improved-${field.replace(/_/g, '-')}`;
        const improvedText = document.getElementById(feedbackId)?.textContent || '';
        
        // 해당 필드에 적용
        if (field === 'self_dev') {
          document.getElementById('yearly-goal-self-dev-input').value = improvedText;
        } else if (field === 'relationship') {
          document.getElementById('yearly-goal-relationship-input').value = improvedText;
        } else if (field === 'work_finance') {
          document.getElementById('yearly-goal-work-finance-input').value = improvedText;
        }

        alert('피드백이 적용되었습니다.');
      }

      const handleAIFeedbackYearlyGoals = () => generateAIYearlyGoalFeedback();
      const handleCloseFeedback = () => {
        document.getElementById('yearly-goals-ai-feedback')?.style.setProperty('display', 'none');
      };

      const handleCopyPrevYearGoals = () => copyPreviousYearGoals();
      
      document.getElementById('yearly-goal-prev-btn')?.addEventListener('click', handleYearlyGoalPrev);
      document.getElementById('yearly-goal-next-btn')?.addEventListener('click', handleYearlyGoalNext);
      document.getElementById('yearly-goal-go-to-current-year-btn')?.addEventListener('click', handleGoToCurrentYear);
      document.getElementById('yearly-goal-year-label')?.addEventListener('click', handleYearLabelClick);
      document.getElementById('edit-yearly-goals-btn')?.addEventListener('click', handleEditYearlyGoals);
      document.getElementById('cancel-yearly-goals-btn')?.addEventListener('click', handleCancelYearlyGoals);
      
      // 작년 목표 복사 버튼 (중복 등록 방지를 위한 cloneNode 패턴)
      const copyPrevYearGoalsBtn = document.getElementById('copy-prev-year-goals-btn');
      if (copyPrevYearGoalsBtn) {
        const newCopyBtn = copyPrevYearGoalsBtn.cloneNode(true);
        copyPrevYearGoalsBtn.parentNode?.replaceChild(newCopyBtn, copyPrevYearGoalsBtn);
        newCopyBtn.addEventListener('click', handleCopyPrevYearGoals);
      }
      
      // 작년 목표 복사 버튼 (편집 모드) (중복 등록 방지를 위한 cloneNode 패턴)
      const copyPrevYearGoalsEditBtn = document.getElementById('copy-prev-year-goals-edit-btn');
      if (copyPrevYearGoalsEditBtn) {
        const newCopyEditBtn = copyPrevYearGoalsEditBtn.cloneNode(true);
        copyPrevYearGoalsEditBtn.parentNode?.replaceChild(newCopyEditBtn, copyPrevYearGoalsEditBtn);
        newCopyEditBtn.addEventListener('click', handleCopyPrevYearGoals);
      }
      
      // 저장 버튼 (중복 등록 방지를 위한 cloneNode 패턴)
      const saveYearlyGoalsBtn = document.getElementById('save-yearly-goals-btn');
      if (saveYearlyGoalsBtn) {
        const newSaveBtn = saveYearlyGoalsBtn.cloneNode(true);
        saveYearlyGoalsBtn.parentNode?.replaceChild(newSaveBtn, saveYearlyGoalsBtn);
        newSaveBtn.addEventListener('click', handleSaveYearlyGoals);
      }
      
      // AI 피드백 버튼 (중복 등록 방지를 위한 cloneNode 패턴)
      const aiFeedbackYearlyGoalsBtn = document.getElementById('ai-feedback-yearly-goals-btn');
      if (aiFeedbackYearlyGoalsBtn) {
        const newAiFeedbackBtn = aiFeedbackYearlyGoalsBtn.cloneNode(true);
        aiFeedbackYearlyGoalsBtn.parentNode?.replaceChild(newAiFeedbackBtn, aiFeedbackYearlyGoalsBtn);
        newAiFeedbackBtn.addEventListener('click', handleAIFeedbackYearlyGoals);
      }
      
      document.getElementById('close-feedback-btn')?.addEventListener('click', handleCloseFeedback);
      
      // 피드백 적용 버튼들 (동적으로 생성되므로 이벤트 위임 사용)
      // 중복 등록 방지: 기존 핸들러 제거 후 새로 등록
      if (applyFeedbackClickHandler) {
        document.removeEventListener('click', applyFeedbackClickHandler);
      }
      
      applyFeedbackClickHandler = (e) => {
        const target = e.target;
        if (target && target.classList && target.classList.contains('apply-feedback-btn')) {
          const field = target.getAttribute('data-field');
          if (field) applyFeedback(field);
        }
      };
      
      document.addEventListener('click', applyFeedbackClickHandler);

      // 연도 선택 모달 이벤트
      const yearSelectorOverlay = document.getElementById('yearly-goal-year-selector-overlay');
      const yearSelectorModal = document.getElementById('yearly-goal-year-selector-modal');
      const yearSelectorClose = document.getElementById('yearly-goal-year-selector-close');
      const yearSelectorOptions = document.getElementById('yearly-goal-year-selector-options');

      // 닫기 버튼
      if (yearSelectorClose) {
        yearSelectorClose.addEventListener('click', (e) => {
          e.stopPropagation();
          closeYearSelectorModal();
        });
      }

      // 오버레이 클릭으로 모달 닫기
      if (yearSelectorOverlay) {
        yearSelectorOverlay.addEventListener('click', (e) => {
          if (e.target === yearSelectorOverlay) {
            closeYearSelectorModal();
          }
        });
      }

      // 모달 내부 클릭은 전파 방지
      if (yearSelectorModal) {
        yearSelectorModal.addEventListener('click', (e) => {
          e.stopPropagation();
        });
      }

      // 연도 옵션 클릭 (이벤트 위임)
      if (yearSelectorOptions) {
        yearSelectorOptions.addEventListener('click', (e) => {
          const btn = e.target.closest('.yearly-goal-year-option-btn');
          if (btn) {
            e.stopPropagation();
            const year = parseInt(btn.dataset.year);
            if (!isNaN(year)) {
              selectedYear = year;
              closeYearSelectorModal();
              updateYearLabel();
              loadYearlyGoals();
            }
          }
        });
      }

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
        daily_routines: { morning: [], night: [] },
        source: 'manual'
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

        // 부제목 업데이트
        const subtitle = document.getElementById('monthly-plan-subtitle');
        if (subtitle) {
          const [year, month] = selectedMonthStart.split('-');
          const monthNum = parseInt(month);
          subtitle.textContent = `${year}년 ${monthNum}월 실천 계획 & 결과`;
        }

        // "이번 달로" 버튼 표시/숨김 제어
        const goToCurrentMonthBtn = document.getElementById('monthly-plan-go-to-current-month-btn');
        if (goToCurrentMonthBtn) {
          if (selectedMonthStart !== currentMonth) {
            goToCurrentMonthBtn.style.display = 'inline-flex';
          } else {
            goToCurrentMonthBtn.style.display = 'none';
          }
        }
      }

      // 월 레이블 클릭 핸들러
      const handleMonthLabelClick = () => {
        openMonthSelectorModal();
      };

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
      // manual 우선, 없으면 ai_suggested 조회
      async function loadMonthlyPlan() {
        try {
          document.getElementById('monthly-plans-loading').style.display = 'block';
          document.getElementById('monthly-plans-view-mode').style.display = 'none';
          document.getElementById('monthly-plans-edit-mode').style.display = 'none';

          // manual 우선 조회
          let { data, error } = await supabase
            .from('monthly_plans')
            .select('*')
            .eq('user_id', profile.id)
            .eq('month_start', selectedMonthStart)
            .eq('source', 'manual')
            .maybeSingle();

          if (error) {
            console.error('[Monthly Plan Load Error (manual)]', error);
            throw error;
          }

          // manual이 없으면 ai_suggested 조회
          if (!data) {
            const { data: aiData, error: aiError } = await supabase
              .from('monthly_plans')
              .select('*')
              .eq('user_id', profile.id)
              .eq('month_start', selectedMonthStart)
              .eq('source', 'ai_suggested')
              .maybeSingle();

            if (aiError && aiError.code !== 'PGRST116') {
              console.error('[Monthly Plan Load Error (ai_suggested)]', aiError);
              throw aiError;
            }

            data = aiData;
          }

          // 선택된 월의 연도 자동 계산
          const selectedYear = parseInt(selectedMonthStart.split('-')[0]);

          if (data) {
            // linked_year가 없으면 선택된 월의 연도로 자동 설정
            const linkedYear = data.linked_year || selectedYear;
            monthlyPlan = {
              linked_year: linkedYear,
              content_md: data.content_md || null,
              plan_content: data.plan_content || { self_dev: '', relationship: '', work_finance: '' },
              results_content: data.results_content || { self_dev: '', relationship: '', work_finance: '' },
              daily_routines: data.daily_routines || { morning: [], night: [] },
              source: data.source || 'manual'
            };

            // linked_year로 연간 목표 로드
            await loadLinkedYearlyGoals(linkedYear);

            displayMonthlyPlan();
          } else {
            // 데이터가 없으면 선택된 월의 연도로 자동 연결
            monthlyPlan = {
              linked_year: selectedYear,
              content_md: null,
              plan_content: { self_dev: '', relationship: '', work_finance: '' },
              results_content: { self_dev: '', relationship: '', work_finance: '' },
              daily_routines: { morning: [], night: [] },
              source: 'manual'
            };
            await loadLinkedYearlyGoals(selectedYear);
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

      // 월 선택 모달에 표시할 월 목록 생성 (1~12월)
      function generateMonthOptions() {
        // 선택된 연도는 monthlyPlan.linked_year 또는 선택된 월의 연도
        const targetYear = monthlyPlan.linked_year || parseInt(selectedMonthStart.split('-')[0]);
        const [currentYear, currentMonth] = selectedMonthStart.split('-').map(Number);
        const currentMonthStart = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`;
        
        const monthNames = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];
        const today = new Date();
        const isCurrentYear = targetYear === today.getFullYear();
        const currentMonthNum = today.getMonth() + 1;
        
        const optionsContainer = document.getElementById('monthly-plan-month-selector-options');
        if (!optionsContainer) return;
        
        const optionsHtml = monthNames.map((monthName, index) => {
          const monthNum = index + 1;
          const monthStart = `${targetYear}-${String(monthNum).padStart(2, '0')}-01`;
          const isSelected = monthStart === selectedMonthStart;
          const isCurrentMonth = isCurrentYear && monthNum === currentMonthNum;
          
          const selectedStyle = isSelected 
            ? 'background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white;'
            : 'background: white; color: #111827;';
          
          let label = `${targetYear}년 ${monthName}`;
          if (isCurrentMonth) {
            label = `이번 달 (${targetYear}년 ${monthName})`;
          }
          
          return `
            <button 
              class="monthly-plan-month-option-btn"
              data-month-start="${monthStart}"
              style="${selectedStyle} padding: 0.75rem 1rem; border: 1px solid ${isSelected ? '#6366f1' : '#e5e7eb'}; border-radius: 8px; cursor: pointer; text-align: left; font-size: 0.875rem; font-weight: ${isSelected ? '600' : '500'}; transition: all 0.2s; width: 100%; display: flex; align-items: center; justify-content: space-between;"
              onmouseover="if (!this.dataset.selected) { this.style.background='#f3f4f6'; this.style.borderColor='#d1d5db'; }"
              onmouseout="if (!this.dataset.selected) { this.style.background='${isSelected ? 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' : 'white'}'; this.style.borderColor='${isSelected ? '#6366f1' : '#e5e7eb'}'; }"
              ${isSelected ? 'data-selected="true"' : ''}
            >
              <span>${label}</span>
              ${isSelected ? '<i data-lucide="check" style="width: 16px; height: 16px; stroke-width: 2.5;"></i>' : ''}
            </button>
          `;
        }).join('');
        
        optionsContainer.innerHTML = optionsHtml;
        
        // Lucide 아이콘 렌더링
        if (window.lucide) {
          setTimeout(() => {
            window.lucide.createIcons();
          }, 100);
        }
      }

      // 월 선택 모달 열기
      const openMonthSelectorModal = () => {
        const overlay = document.getElementById('monthly-plan-month-selector-overlay');
        if (!overlay) return;
        
        generateMonthOptions();
        overlay.style.display = 'flex';
      };

      // 월 선택 모달 닫기
      const closeMonthSelectorModal = () => {
        const overlay = document.getElementById('monthly-plan-month-selector-overlay');
        if (overlay) {
          overlay.style.display = 'none';
        }
      };

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

      // 연간목표 텍스트 포맷팅 함수 (목표 사이에 빈 줄 추가)
      function formatYearlyGoalText(text) {
        if (!text) return '';
        // "1. A\n2. B" → "1. A\n\n2. B"
        return text.replace(/\n(\d+\.)/g, '\n\n$1').trim();
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
                <div style="background: white; padding: 0.75rem; border-radius: 8px; min-height: 60px; color: #374151; line-height: 1.6; white-space: pre-wrap; font-size: 0.9rem;">${formatYearlyGoalText(linkedYearlyGoals.self_dev) || '목표를 입력해주세요'}</div>
              </div>
              <div>
                <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
                  <i data-lucide="heart" style="width: 16px; height: 16px; color: #ec4899;"></i>
                  <h5 style="color: #4f46e5; font-weight: 600; margin: 0; font-size: 0.95rem;">가족/관계</h5>
                </div>
                <div style="background: white; padding: 0.75rem; border-radius: 8px; min-height: 60px; color: #374151; line-height: 1.6; white-space: pre-wrap; font-size: 0.9rem;">${formatYearlyGoalText(linkedYearlyGoals.relationship) || '목표를 입력해주세요'}</div>
              </div>
              <div>
                <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
                  <i data-lucide="briefcase" style="width: 16px; height: 16px; color: #10b981;"></i>
                  <h5 style="color: #4f46e5; font-weight: 600; margin: 0; font-size: 0.95rem;">업무/재정</h5>
                </div>
                <div style="background: white; padding: 0.75rem; border-radius: 8px; min-height: 60px; color: #374151; line-height: 1.6; white-space: pre-wrap; font-size: 0.9rem;">${formatYearlyGoalText(linkedYearlyGoals.work_finance) || '목표를 입력해주세요'}</div>
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
                <h5 style="color: #0f766e; font-weight: 600; margin: 0; font-size: 0.95rem;">가족/관계</h5>
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
                <h5 style="color: #0f766e; font-weight: 600; margin: 0; font-size: 0.95rem;">가족/관계</h5>
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

      // 텍스트 영역 자동 높이 조절 함수
      function autoResizeTextarea(textarea) {
        if (!textarea) return;
        
        // 높이를 초기화하여 정확한 scrollHeight 계산
        textarea.style.height = 'auto';
        
        // 내용에 맞춰 높이 조절 (최소 80px, 최대 500px)
        const newHeight = Math.max(80, Math.min(textarea.scrollHeight + 2, 500));
        textarea.style.height = newHeight + 'px';
      }

      // 텍스트 영역 초기 높이 설정 및 이벤트 리스너 등록
      function setupTextareaAutoResize(textareaId) {
        const textarea = document.getElementById(textareaId);
        if (!textarea) return;
        
        // 초기 높이 조절
        autoResizeTextarea(textarea);
        
        // input 이벤트: 내용 변경 시 자동 조절
        // innerHTML로 매번 새로 생성되므로 중복 걱정 없음
        textarea.addEventListener('input', function() {
          autoResizeTextarea(this);
        });
      }

      async function switchToMonthlyPlanEditMode() {
        document.getElementById('monthly-plans-view-mode').style.display = 'none';
        document.getElementById('monthly-plans-edit-mode').style.display = 'block';
        document.getElementById('monthly-plans-loading').style.display = 'none';
        isMonthlyPlanEditMode = true;

        // 선택된 월의 연도로 자동 연결 (linked_year가 없으면)
        if (!monthlyPlan.linked_year) {
          const selectedYear = parseInt(selectedMonthStart.split('-')[0]);
          monthlyPlan.linked_year = selectedYear;
        }

        // 연간 목표 로드
        if (monthlyPlan.linked_year) {
          await loadLinkedYearlyGoals(monthlyPlan.linked_year);
        }

        // 편집 모드 렌더링
        renderYearlyGoalsInEditMode();
        renderPlanContentInEditMode();
        renderResultsContentInEditMode();

        if (window.lucide?.createIcons) window.lucide.createIcons();

        // 텍스트 영역 자동 높이 조절 적용 (DOM 렌더링 후 실행)
        // requestAnimationFrame으로 더 안정적인 타이밍 보장
        requestAnimationFrame(() => {
          // 월실천계획 textarea
          setupTextareaAutoResize('plan-content-self-dev-input');
          setupTextareaAutoResize('plan-content-relationship-input');
          setupTextareaAutoResize('plan-content-work-finance-input');
          
          // 월말 결과 textarea
          setupTextareaAutoResize('results-content-self-dev-input');
          setupTextareaAutoResize('results-content-relationship-input');
          setupTextareaAutoResize('results-content-work-finance-input');
        });
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
              <div style="background: #f3f4f6; padding: 0.75rem; border-radius: 8px; min-height: 80px; color: #374151; line-height: 1.6; white-space: pre-wrap; font-size: 0.9rem; border: 1px solid #d1d5db;">${formatYearlyGoalText(linkedYearlyGoals.self_dev) || '목표를 입력해주세요'}</div>
            </div>
            <div>
              <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
                <i data-lucide="heart" style="width: 16px; height: 16px; color: #ec4899;"></i>
                <h5 style="color: #4f46e5; font-weight: 600; margin: 0; font-size: 0.95rem;">가족/관계</h5>
              </div>
              <div style="background: #f3f4f6; padding: 0.75rem; border-radius: 8px; min-height: 80px; color: #374151; line-height: 1.6; white-space: pre-wrap; font-size: 0.9rem; border: 1px solid #d1d5db;">${formatYearlyGoalText(linkedYearlyGoals.relationship) || '목표를 입력해주세요'}</div>
            </div>
            <div>
              <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
                <i data-lucide="briefcase" style="width: 16px; height: 16px; color: #10b981;"></i>
                <h5 style="color: #4f46e5; font-weight: 600; margin: 0; font-size: 0.95rem;">업무/재정</h5>
              </div>
              <div style="background: #f3f4f6; padding: 0.75rem; border-radius: 8px; min-height: 80px; color: #374151; line-height: 1.6; white-space: pre-wrap; font-size: 0.9rem; border: 1px solid #d1d5db;">${formatYearlyGoalText(linkedYearlyGoals.work_finance) || '목표를 입력해주세요'}</div>
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
              <h5 style="color: #0f766e; font-weight: 600; margin: 0; font-size: 0.95rem;">가족/관계</h5>
            </div>
            <textarea id="plan-content-relationship-input" placeholder="이번 달 가족/관계 실천계획을 입력하세요..." style="width: 100%; min-height: 80px; padding: 0.75rem; border: 2px solid #14b8a6; border-radius: 8px; font-size: 0.9rem; font-family: inherit; resize: vertical; background: white; line-height: 1.6;">${monthlyPlan.plan_content?.relationship || ''}</textarea>
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

        // 기본 템플릿 텍스트
        const defaultResultsTemplate = `[성취한 것]
-
-
-

[아쉬운 점]
-
-
-`;

        container.innerHTML = `
          <div>
            <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
              <i data-lucide="book-open" style="width: 16px; height: 16px; color: #6366f1;"></i>
              <h5 style="color: #0f766e; font-weight: 600; margin: 0; font-size: 0.95rem;">자기계발</h5>
            </div>
            <textarea id="results-content-self-dev-input" placeholder="월말 자기계발 결과를 입력하세요..." style="width: 100%; min-height: 80px; padding: 0.75rem; border: 2px solid #14b8a6; border-radius: 8px; font-size: 0.9rem; font-family: inherit; resize: vertical; background: white; line-height: 1.6;">${monthlyPlan.results_content?.self_dev || defaultResultsTemplate}</textarea>
          </div>
          <div>
            <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
              <i data-lucide="heart" style="width: 16px; height: 16px; color: #ec4899;"></i>
              <h5 style="color: #0f766e; font-weight: 600; margin: 0; font-size: 0.95rem;">가족/관계</h5>
            </div>
            <textarea id="results-content-relationship-input" placeholder="월말 가족/관계 결과를 입력하세요..." style="width: 100%; min-height: 80px; padding: 0.75rem; border: 2px solid #14b8a6; border-radius: 8px; font-size: 0.9rem; font-family: inherit; resize: vertical; background: white; line-height: 1.6;">${monthlyPlan.results_content?.relationship || defaultResultsTemplate}</textarea>
          </div>
          <div>
            <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
              <i data-lucide="briefcase" style="width: 16px; height: 16px; color: #10b981;"></i>
              <h5 style="color: #0f766e; font-weight: 600; margin: 0; font-size: 0.95rem;">업무/재정</h5>
            </div>
            <textarea id="results-content-work-finance-input" placeholder="월말 업무/재정 결과를 입력하세요..." style="width: 100%; min-height: 80px; padding: 0.75rem; border: 2px solid #14b8a6; border-radius: 8px; font-size: 0.9rem; font-family: inherit; resize: vertical; background: white; line-height: 1.6;">${monthlyPlan.results_content?.work_finance || defaultResultsTemplate}</textarea>
          </div>
        `;
      }

      // 지난달 계획 조회
      async function fetchPreviousMonthPlan() {
        try {
          const [year, month] = selectedMonthStart.split('-').map(Number);
          let prevYear = year;
          let prevMonth = month - 1;
          
          if (prevMonth < 1) {
            prevMonth = 12;
            prevYear--;
          }
          
          const prevMonthStart = `${prevYear}-${String(prevMonth).padStart(2, '0')}-01`;
          
          const { data, error } = await supabase
            .from('monthly_plans')
            .select('plan_content')
            .eq('user_id', profile.id)
            .eq('month_start', prevMonthStart)
            .eq('source', 'manual')
            .maybeSingle();
          
          if (error && error.code !== 'PGRST116') {
            console.error('[Previous Month Plan Load Error]', error);
            return null;
          }
          
          return data?.plan_content || null;
        } catch (error) {
          console.error('[Previous Month Plan Fetch Failed]', error);
          return null;
        }
      }

      // 지난달 계획 복사
      async function copyPreviousMonthPlan() {
        try {
          const prevPlanContent = await fetchPreviousMonthPlan();
          
          if (!prevPlanContent || 
              (!prevPlanContent.self_dev && !prevPlanContent.relationship && !prevPlanContent.work_finance)) {
            alert('지난달 계획이 없습니다.');
            return;
          }
          
          // 지난달과 현재 월 표시용
          const [currYear, currMonth] = selectedMonthStart.split('-').map(Number);
          let prevYear = currYear;
          let prevMonth = currMonth - 1;
          
          if (prevMonth < 1) {
            prevMonth = 12;
            prevYear--;
          }
          
          // 복사 확인
          if (!confirm(`${prevYear}년 ${prevMonth}월 계획을 ${currYear}년 ${currMonth}월로 복사하시겠습니까?`)) {
            return;
          }
          
          // 편집 모드로 전환 (아직 편집 모드가 아니라면)
          const editMode = document.getElementById('monthly-plans-edit-mode');
          if (editMode.style.display === 'none') {
            switchToMonthlyPlanEditMode();
            // DOM 업데이트를 위해 잠시 대기
            await new Promise(resolve => setTimeout(resolve, 100));
          }
          
          // 현재 입력된 내용이 있는지 확인
          const currentSelfDev = document.getElementById('plan-content-self-dev-input')?.value.trim() || '';
          const currentRelationship = document.getElementById('plan-content-relationship-input')?.value.trim() || '';
          const currentWorkFinance = document.getElementById('plan-content-work-finance-input')?.value.trim() || '';
          
          if (currentSelfDev || currentRelationship || currentWorkFinance) {
            if (!confirm('현재 입력된 계획이 있습니다. 덮어쓰시겠습니까?')) {
              return;
            }
          }
          
          // 입력 필드에 복사
          const selfDevInput = document.getElementById('plan-content-self-dev-input');
          const relationshipInput = document.getElementById('plan-content-relationship-input');
          const workFinanceInput = document.getElementById('plan-content-work-finance-input');
          
          if (selfDevInput) selfDevInput.value = prevPlanContent.self_dev || '';
          if (relationshipInput) relationshipInput.value = prevPlanContent.relationship || '';
          if (workFinanceInput) workFinanceInput.value = prevPlanContent.work_finance || '';
          
          alert('지난달 계획을 복사했습니다. 수정 후 저장해주세요.');
          
        } catch (error) {
          console.error('[Copy Previous Month Plan Failed]', error);
          alert(`지난달 계획 복사 중 오류가 발생했습니다:\n\n${error.message}`);
        }
      }

      // 월실천계획 제안 레이트리밋 조회
      // AI 월실천계획 제안 생성
      async function generateAIMonthlyPlan() {
        try {
          // 선택된 월의 연도로 자동 연결
          const selectedYear = parseInt(selectedMonthStart.split('-')[0]);
          const linkedYear = monthlyPlan.linked_year || selectedYear;

          // 연간목표가 없는 경우 로드 시도
          if (!linkedYearlyGoals && linkedYear) {
            await loadLinkedYearlyGoals(linkedYear);
          }

          // 확인 메시지
          const confirmGenerate = confirm(`AI가 ${selectedMonthStart.substring(0, 4)}년 ${parseInt(selectedMonthStart.substring(5, 7))}월의 월간 실천계획을 제안해드립니다.\n\n연간목표와 최근 활동을 분석하여 구체적인 실천계획을 생성합니다.\n\n계속하시겠습니까?`);
          if (!confirmGenerate) return;

          // 로딩 표시
          document.getElementById('monthly-plans-loading').style.display = 'block';
          document.getElementById('monthly-plans-view-mode').style.display = 'none';
          document.getElementById('monthly-plans-edit-mode').style.display = 'none';

          // Edge Function 호출
          const session = await supabase.auth.getSession();
          if (!session.data.session) {
            throw new Error('로그인이 필요합니다.');
          }

          const supabaseUrl = window.SUPABASE_CONFIG?.url || supabase.supabaseUrl;
          const supabaseKey = window.SUPABASE_CONFIG?.anonKey || supabase.supabaseKey;

          const response = await fetch(
            `${supabaseUrl}/functions/v1/ai-monthly-plan`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.data.session.access_token}`,
                'apikey': supabaseKey,
              },
              body: JSON.stringify({
                month_start: selectedMonthStart,
                linked_year: linkedYear,
              }),
            }
          );

          const responseData = await response.json();

          if (!response.ok) {
            console.error('Edge Function error response:', responseData);
            const errorMessage = responseData.details || responseData.message || responseData.error || 'AI 제안 생성에 실패했습니다.';
            throw new Error(errorMessage);
          }

          if (!responseData.plan_content) {
            throw new Error('AI 제안 생성 결과가 없습니다.');
          }

          // 생성된 plan_content를 monthlyPlan에 반영
          monthlyPlan.plan_content = responseData.plan_content;
          monthlyPlan.linked_year = responseData.linked_year;
          monthlyPlan.source = 'ai_suggested';

          // linked_year가 있으면 연간 목표 로드
          if (responseData.linked_year) {
            await loadLinkedYearlyGoals(responseData.linked_year);
          }

          // 편집 모드로 전환하여 AI 제안 결과 표시
          alert('AI 제안이 생성되었습니다! 내용을 확인하고 편집한 후 저장해주세요.');
          switchToMonthlyPlanEditMode();

        } catch (error) {
          console.error('[AI Monthly Plan Generation Failed]', error);
          alert(`AI 제안 생성 중 오류가 발생했습니다:\n\n${error.message}\n\n다시 시도해주세요.`);
          document.getElementById('monthly-plans-loading').style.display = 'none';
        }
      }

      // 월간 실천계획 저장 (daily_routines, plan_content, results_content 포함)
      async function saveMonthlyPlan() {
        // 선택된 월의 연도로 자동 연결 (linked_year가 없으면)
        const selectedYear = parseInt(selectedMonthStart.split('-')[0]);
        const linkedYear = monthlyPlan.linked_year || selectedYear;
        
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
            linked_year: linkedYear,
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

          // linked_year로 연간 목표 다시 로드
          await loadLinkedYearlyGoals(data.linked_year);

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
      const handleGoToCurrentMonth = () => {
        selectedMonthStart = currentMonth;
        updateMonthLabel();
        loadMonthlyPlan();
      };
      const handleEditMonthlyPlan = () => switchToMonthlyPlanEditMode();
      const handleCopyPrevMonthPlan = () => copyPreviousMonthPlan();
      const handleAISuggestMonthlyPlan = () => generateAIMonthlyPlan();
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
      document.getElementById('monthly-plan-go-to-current-month-btn')?.addEventListener('click', handleGoToCurrentMonth);
      document.getElementById('monthly-plan-month-label')?.addEventListener('click', handleMonthLabelClick);
      document.getElementById('edit-monthly-plans-btn')?.addEventListener('click', handleEditMonthlyPlan);

      // 월 선택 모달 이벤트
      const monthSelectorOverlay = document.getElementById('monthly-plan-month-selector-overlay');
      const monthSelectorModal = document.getElementById('monthly-plan-month-selector-modal');
      const monthSelectorClose = document.getElementById('monthly-plan-month-selector-close');
      const monthSelectorOptions = document.getElementById('monthly-plan-month-selector-options');

      // 닫기 버튼
      if (monthSelectorClose) {
        monthSelectorClose.addEventListener('click', (e) => {
          e.stopPropagation();
          closeMonthSelectorModal();
        });
      }

      // 오버레이 클릭으로 모달 닫기
      if (monthSelectorOverlay) {
        monthSelectorOverlay.addEventListener('click', (e) => {
          if (e.target === monthSelectorOverlay) {
            closeMonthSelectorModal();
          }
        });
      }

      // 모달 내부 클릭은 전파 방지
      if (monthSelectorModal) {
        monthSelectorModal.addEventListener('click', (e) => {
          e.stopPropagation();
        });
      }

      // 월 옵션 클릭 (이벤트 위임)
      if (monthSelectorOptions) {
        monthSelectorOptions.addEventListener('click', (e) => {
          const btn = e.target.closest('.monthly-plan-month-option-btn');
          if (btn) {
            e.stopPropagation();
            const monthStart = btn.dataset.monthStart;
            if (monthStart) {
              selectedMonthStart = monthStart;
              closeMonthSelectorModal();
              updateMonthLabel();
              loadMonthlyPlan();
            }
          }
        });
      }
      
      // 지난달 계획 복사 버튼 (보기 모드) (중복 등록 방지를 위한 cloneNode 패턴)
      const copyPrevMonthPlanBtn = document.getElementById('copy-prev-month-plan-btn');
      if (copyPrevMonthPlanBtn) {
        const newCopyBtn = copyPrevMonthPlanBtn.cloneNode(true);
        copyPrevMonthPlanBtn.parentNode?.replaceChild(newCopyBtn, copyPrevMonthPlanBtn);
        newCopyBtn.addEventListener('click', handleCopyPrevMonthPlan);
      }
      
      // 지난달 계획 복사 버튼 (편집 모드) (중복 등록 방지를 위한 cloneNode 패턴)
      const copyPrevMonthPlanEditBtn = document.getElementById('copy-prev-month-plan-edit-btn');
      if (copyPrevMonthPlanEditBtn) {
        const newCopyEditBtn = copyPrevMonthPlanEditBtn.cloneNode(true);
        copyPrevMonthPlanEditBtn.parentNode?.replaceChild(newCopyEditBtn, copyPrevMonthPlanEditBtn);
        newCopyEditBtn.addEventListener('click', handleCopyPrevMonthPlan);
      }
      
      // AI 제안받기 버튼 (중복 등록 방지를 위한 cloneNode 패턴)
      const aiSuggestMonthlyPlanBtn = document.getElementById('ai-suggest-monthly-plan-btn');
      if (aiSuggestMonthlyPlanBtn) {
        const newAiSuggestBtn = aiSuggestMonthlyPlanBtn.cloneNode(true);
        aiSuggestMonthlyPlanBtn.parentNode?.replaceChild(newAiSuggestBtn, aiSuggestMonthlyPlanBtn);
        newAiSuggestBtn.addEventListener('click', handleAISuggestMonthlyPlan);
        // Lucide 아이콘 다시 렌더링
        if (window.lucide) {
          window.lucide.createIcons();
        }
      }
      
      // 취소 버튼 (중복 등록 방지를 위한 cloneNode 패턴)
      const cancelMonthlyPlanBtn = document.getElementById('cancel-monthly-plans-btn');
      if (cancelMonthlyPlanBtn) {
        const newCancelBtn = cancelMonthlyPlanBtn.cloneNode(true);
        cancelMonthlyPlanBtn.parentNode?.replaceChild(newCancelBtn, cancelMonthlyPlanBtn);
        newCancelBtn.addEventListener('click', handleCancelMonthlyPlan);
      }
      
      // 저장 버튼 (중복 등록 방지를 위한 cloneNode 패턴)
      const saveMonthlyPlanBtn = document.getElementById('save-monthly-plans-btn');
      if (saveMonthlyPlanBtn) {
        const newSaveBtn = saveMonthlyPlanBtn.cloneNode(true);
        saveMonthlyPlanBtn.parentNode?.replaceChild(newSaveBtn, saveMonthlyPlanBtn);
        newSaveBtn.addEventListener('click', handleSaveMonthlyPlan);
      }

      // 월 레이블 초기화 및 초기 로드
      updateMonthLabel();
      await loadMonthlyPlan();

      // 토글 기능 설정
      const setupToggle = (buttonId, contentId) => {
        const button = document.getElementById(buttonId);
        if (!button) return;
        
        // 기존 이벤트 리스너 제거를 위한 클론
        const newButton = button.cloneNode(true);
        button.parentNode?.replaceChild(newButton, button);
        
        newButton.addEventListener('click', () => {
          const content = document.getElementById(contentId);
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

      // 월간 데일리 루틴 토글
      setupToggle('toggle-routines', 'routines-content');
      
      // 연간 목표 토글
      setupToggle('toggle-yearly-goals', 'yearly-goals-content');
      
      // 월간 실천계획 토글
      setupToggle('toggle-monthly-plans', 'monthly-plans-content');
    }
  };
}

