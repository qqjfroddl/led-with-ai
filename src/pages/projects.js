import { supabase } from '../config/supabase.js';
import { getCurrentProfile } from '../utils/auth.js';
import { getToday } from '../utils/date.js';

// 동기화 플래그 (무한 루프 방지)
let syncingTodo = false;
let syncingProjectTask = false;

// 할일 등록 중 플래그 (동시 실행 방지)
let registeringProjectTasks = false;

// 이벤트 리스너 중복 등록 방지 플래그
let projectEventsBound = false;
let projectEventHandler = null; // 이벤트 핸들러 참조 저장

// 수정 모드 관리
let editingProjectTaskId = null;

// 현재 활성 탭 (in_progress / completed)
let activeProjectTab = 'in_progress';

// 현재 펼쳐진 프로젝트 ID
let expandedProjectId = null;

export async function renderProjects() {
  const profile = await getCurrentProfile();
  if (!profile) {
    return '<div class="error">로그인이 필요합니다.</div>';
  }

  const html = `
    <div class="card" style="background: linear-gradient(135deg, #e0f2fe 0%, #dbeafe 100%); border: 2px solid #3b82f6; box-shadow: 0 8px 24px rgba(59, 130, 246, 0.15);">
      <div class="card-header" style="border-bottom: 2px solid rgba(59, 130, 246, 0.2); padding-bottom: 1rem; margin-bottom: 1.25rem;">
        <div style="display: flex; align-items: center; gap: 0.75rem;">
          <div style="width: 40px; height: 40px; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); border-radius: 12px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);">
            <i data-lucide="folder-kanban" style="width: 24px; height: 24px; color: white; stroke-width: 2.5;"></i>
          </div>
          <div style="flex: 1;">
            <div class="card-title" style="color: #1e40af; font-size: 1.5rem; margin: 0;">프로젝트</div>
            <p style="color: #6b7280; font-size: 1rem; margin: 0.25rem 0 0 0;">프로젝트를 관리하고 할일을 등록하세요</p>
          </div>
          <button id="add-project-btn" class="btn btn-primary" style="padding: 0.5rem 1rem; font-size: 0.9rem;">
            <i data-lucide="plus" style="width: 16px; height: 16px;"></i>
            추가
          </button>
        </div>
      </div>

      <div id="projects-content" style="display: block;">
        <!-- 탭 영역 -->
        <div id="projects-tabs" style="display: flex; gap: 0.5rem; margin-bottom: 1.25rem;">
          <button id="tab-in-progress" class="project-tab active" data-tab="in_progress" style="flex: 1; padding: 0.75rem; border: 2px solid #3b82f6; border-radius: 8px; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; font-weight: 600; cursor: pointer; transition: all 0.2s;">
            <i data-lucide="loader" style="width: 16px; height: 16px; margin-right: 0.5rem;"></i>
            진행중 (<span id="in-progress-count">0</span>)
          </button>
          <button id="tab-completed" class="project-tab" data-tab="completed" style="flex: 1; padding: 0.75rem; border: 2px solid #d1d5db; border-radius: 8px; background: #f3f4f6; color: #6b7280; font-weight: 600; cursor: pointer; transition: all 0.2s;">
            <i data-lucide="check-circle" style="width: 16px; height: 16px; margin-right: 0.5rem;"></i>
            완료 (<span id="completed-count">0</span>)
          </button>
        </div>

        <!-- 카드 그리드 -->
        <div id="projects-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1rem; margin-bottom: 1rem;"></div>
        
        <!-- 빈 상태 -->
        <div id="projects-empty" style="text-align: center; padding: 3rem 1rem; color: #9ca3af; display: none;">
          <i data-lucide="folder-x" style="width: 48px; height: 48px; margin: 0 auto 1rem; opacity: 0.5;"></i>
          <p id="projects-empty-title" style="font-size: 1.1rem; margin-bottom: 0.5rem;">진행중인 프로젝트가 없습니다</p>
          <p id="projects-empty-desc" style="font-size: 0.9rem;">새 프로젝트를 추가하여 시작하세요</p>
        </div>

        <!-- 펼쳐진 프로젝트 상세 영역 -->
        <div id="project-detail" style="display: none; margin-top: 1rem;"></div>
      </div>
    </div>

    <!-- 프로젝트 추가/수정 모달 (심플 버전) -->
    <div id="project-modal" style="display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, 0.5); z-index: 1000; display: none; align-items: center; justify-content: center;">
      <div style="background: white; border-radius: 16px; padding: 1.5rem; width: 90%; max-width: 520px; box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.25rem;">
          <h3 id="project-modal-title" style="margin: 0; font-size: 1.25rem; font-weight: 700; color: #1f2937;">프로젝트 추가</h3>
          <button id="project-modal-close" style="background: transparent; border: none; padding: 0.25rem; cursor: pointer; color: #9ca3af; transition: color 0.2s;">
            <i data-lucide="x" style="width: 24px; height: 24px;"></i>
          </button>
        </div>
        
        <div style="display: flex; gap: 0.75rem; align-items: center; flex-wrap: wrap;">
          <input type="text" id="project-name-input" placeholder="프로젝트 이름" style="flex: 1; min-width: 180px; padding: 0.75rem 1rem; border: 2px solid #e5e7eb; border-radius: 10px; font-size: 1rem; transition: border-color 0.2s; outline: none;" onfocus="this.style.borderColor='#6366f1'" onblur="this.style.borderColor='#e5e7eb'">
          <select id="project-category-input" style="padding: 0.75rem 1rem; border: 2px solid #e5e7eb; border-radius: 10px; font-size: 0.95rem; background: white; cursor: pointer; min-width: 120px;">
            <option value="self_dev">자기계발</option>
            <option value="relationship">가족/관계</option>
            <option value="work_finance">업무/재정</option>
          </select>
          <button id="project-modal-save" style="padding: 0.75rem 1.5rem; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; border: none; border-radius: 10px; font-size: 1rem; font-weight: 600; cursor: pointer; white-space: nowrap; box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3); transition: transform 0.2s, box-shadow 0.2s;" onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 16px rgba(99, 102, 241, 0.4)'" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 12px rgba(99, 102, 241, 0.3)'">
            <i data-lucide="check" style="width: 18px; height: 18px; margin-right: 0.25rem; vertical-align: -3px;"></i>
            저장
          </button>
        </div>
        <button id="project-modal-cancel" style="display: none;"></button>
      </div>
    </div>

    <!-- 프로젝트 할일 날짜 선택 모달 -->
    <div id="project-task-date-overlay" class="date-overlay hidden">
      <div id="project-task-date-modal" class="date-modal">
        <div class="date-modal-header">
          <span>마감날짜 선택</span>
          <button id="project-task-date-close" class="date-close-btn">
            <i data-lucide="x"></i>
          </button>
        </div>
        <div class="date-modal-body">
          <input type="text" id="project-task-date-calendar-input" readonly />
        </div>
        <div class="date-modal-footer">
          <button id="project-task-date-today-modal" class="btn btn-secondary">
            <i data-lucide="sun"></i>
            오늘
          </button>
          <button id="project-task-date-close-footer" class="btn btn-primary">닫기</button>
        </div>
      </div>
    </div>
  `;

  return {
    html,
    onMount: async () => {
      // 이벤트 바인딩 플래그 초기화 (페이지가 다시 렌더링될 때마다)
      projectEventsBound = false;
      await loadProjects(profile);
      setupEventHandlers(profile);
    }
  };
}

async function loadProjects(profile) {
  try {
    // 모든 프로젝트 조회
    const { data: projects, error } = await supabase
      .from('projects')
      .select('*')
      .eq('user_id', profile.id)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // 각 프로젝트의 할일 통계 조회
    const projectsWithStats = await Promise.all(
      (projects || []).map(async (project) => {
        const { data: tasks } = await supabase
          .from('project_tasks')
          .select('id, is_done, due_date')
          .eq('project_id', project.id)
          .is('deleted_at', null);

        const tasksList = tasks || [];
        const totalCount = tasksList.length;
        const completedCount = tasksList.filter(t => t.is_done).length;
        const isCompleted = totalCount > 0 && completedCount === totalCount;

        return {
          ...project,
          totalCount,
          completedCount,
          isCompleted
        };
      })
    );

    // 진행중/완료 분류
    const inProgressProjects = projectsWithStats.filter(p => !p.isCompleted);
    const completedProjects = projectsWithStats.filter(p => p.isCompleted);

    // 카운트 업데이트
    const inProgressCountEl = document.getElementById('in-progress-count');
    const completedCountEl = document.getElementById('completed-count');
    if (inProgressCountEl) inProgressCountEl.textContent = inProgressProjects.length;
    if (completedCountEl) completedCountEl.textContent = completedProjects.length;

    // 현재 탭에 따라 표시할 프로젝트 결정
    const projectsToShow = activeProjectTab === 'in_progress' ? inProgressProjects : completedProjects;

    const projectsGrid = document.getElementById('projects-grid');
    const projectsEmpty = document.getElementById('projects-empty');
    const emptyTitle = document.getElementById('projects-empty-title');
    const emptyDesc = document.getElementById('projects-empty-desc');

    if (projectsToShow.length === 0) {
      if (projectsGrid) projectsGrid.style.display = 'none';
      if (projectsEmpty) projectsEmpty.style.display = 'block';
      if (emptyTitle) {
        emptyTitle.textContent = activeProjectTab === 'in_progress' 
          ? '진행중인 프로젝트가 없습니다' 
          : '완료된 프로젝트가 없습니다';
      }
      if (emptyDesc) {
        emptyDesc.textContent = activeProjectTab === 'in_progress'
          ? '새 프로젝트를 추가하여 시작하세요'
          : '프로젝트를 완료하면 여기에 표시됩니다';
      }
      // 상세 영역 숨김
      const projectDetail = document.getElementById('project-detail');
      if (projectDetail) projectDetail.style.display = 'none';
      expandedProjectId = null;
      if (window.lucide?.createIcons) window.lucide.createIcons();
      return;
    }

    if (projectsGrid) projectsGrid.style.display = 'grid';
    if (projectsEmpty) projectsEmpty.style.display = 'none';

    // 카드 그리드 렌더링
    const cardsHtml = projectsToShow.map(project => renderProjectCardCompact(project)).join('');
    if (projectsGrid) {
      projectsGrid.innerHTML = cardsHtml;
    }

    // 펼쳐진 프로젝트가 있으면 상세 영역 렌더링
    if (expandedProjectId) {
      const expandedProject = projectsToShow.find(p => p.id === expandedProjectId);
      if (expandedProject) {
        await renderProjectDetail(expandedProject, profile);
      } else {
        // 현재 탭에 해당 프로젝트가 없으면 접기
        expandedProjectId = null;
        const projectDetail = document.getElementById('project-detail');
        if (projectDetail) projectDetail.style.display = 'none';
      }
    }

    if (window.lucide?.createIcons) window.lucide.createIcons();

  } catch (error) {
    console.error('Error loading projects:', error);
    alert('프로젝트를 불러오는 중 오류가 발생했습니다.');
  }
}

// 카드 그리드용 컴팩트 카드 렌더링
function renderProjectCardCompact(project) {
  const categoryLabels = {
    self_dev: '자기계발',
    relationship: '가족/관계',
    work_finance: '업무/재정'
  };

  const categoryIcons = {
    self_dev: 'book-open',
    relationship: 'heart',
    work_finance: 'briefcase'
  };

  const categoryColors = {
    self_dev: { bg: '#f4e9ff', border: '#d8c7ff', gradient: 'linear-gradient(135deg, #a78bfa 0%, #8b5cf6 100%)', shadow: 'rgba(167, 139, 250, 0.3)' },
    relationship: { bg: '#ffe9f0', border: '#f8c7d6', gradient: 'linear-gradient(135deg, #f472b6 0%, #ec4899 100%)', shadow: 'rgba(244, 114, 182, 0.3)' },
    work_finance: { bg: '#fff7e6', border: '#f5d38f', gradient: 'linear-gradient(135deg, #fb923c 0%, #f59e0b 100%)', shadow: 'rgba(251, 146, 60, 0.3)' }
  };

  const colors = categoryColors[project.category] || categoryColors.self_dev;
  const icon = categoryIcons[project.category] || 'folder';
  const progress = project.totalCount > 0 ? Math.round((project.completedCount / project.totalCount) * 100) : 0;
  const isExpanded = expandedProjectId === project.id;

  return `
    <div class="project-card-compact ${isExpanded ? 'expanded' : ''}" data-project-id="${project.id}" 
         style="background: ${project.isCompleted ? '#f3f4f6' : colors.bg}; 
                border: 2px solid ${project.isCompleted ? '#d1d5db' : colors.border}; 
                border-radius: 12px; 
                padding: 1rem; 
                cursor: pointer; 
                transition: all 0.2s;
                box-shadow: ${isExpanded ? `0 8px 24px ${colors.shadow}` : '0 2px 8px rgba(0, 0, 0, 0.08)'};
                ${isExpanded ? `transform: scale(1.02);` : ''}
                ${project.isCompleted ? 'opacity: 0.8;' : ''}">
      <div style="display: flex; align-items: start; gap: 0.75rem;">
        <div style="width: 36px; height: 36px; background: ${project.isCompleted ? '#9ca3af' : colors.gradient}; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
          <i data-lucide="${project.isCompleted ? 'check-circle' : icon}" style="width: 20px; height: 20px; color: white;"></i>
        </div>
        <div style="flex: 1; min-width: 0;">
          <h4 style="color: ${project.isCompleted ? '#6b7280' : '#1f2937'}; font-size: 1rem; font-weight: 600; margin: 0 0 0.25rem 0; word-break: break-word; overflow-wrap: break-word; line-height: 1.3;">${project.name}</h4>
          <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
            <span style="font-size: 0.75rem; padding: 0.125rem 0.5rem; background: ${project.isCompleted ? '#e5e7eb' : colors.gradient}; color: white; border-radius: 999px; font-weight: 500;">${categoryLabels[project.category]}</span>
          </div>
        </div>
        <i data-lucide="${isExpanded ? 'chevron-up' : 'chevron-down'}" style="width: 18px; height: 18px; color: #9ca3af; flex-shrink: 0;"></i>
      </div>
      
      <div style="margin-top: 0.75rem;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.25rem;">
          <span style="font-size: 0.75rem; color: #6b7280;">${project.completedCount} / ${project.totalCount}</span>
          <span style="font-size: 0.75rem; font-weight: 600; color: ${project.isCompleted ? '#10b981' : '#1f2937'};">${progress}%</span>
        </div>
        <div style="width: 100%; height: 6px; background: #e5e7eb; border-radius: 999px; overflow: hidden;">
          <div style="width: ${progress}%; height: 100%; background: ${project.isCompleted ? '#10b981' : colors.gradient}; transition: width 0.3s;"></div>
        </div>
      </div>
    </div>
  `;
}

// 프로젝트 상세 영역 렌더링
async function renderProjectDetail(project, profile) {
  const projectDetail = document.getElementById('project-detail');
  if (!projectDetail) return;

  // 할일 목록 조회
  const { data: tasks, error } = await supabase
    .from('project_tasks')
    .select('*')
    .eq('project_id', project.id)
    .is('deleted_at', null)
    .order('is_done', { ascending: true })
    .order('start_date', { ascending: true, nullsFirst: false })
    .order('display_order', { ascending: true, nullsFirst: false })
    .order('due_date', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error loading project tasks:', error);
    return;
  }

  const categoryColors = {
    self_dev: { bg: '#f4e9ff', border: '#d8c7ff', gradient: 'linear-gradient(135deg, #a78bfa 0%, #8b5cf6 100%)' },
    relationship: { bg: '#ffe9f0', border: '#f8c7d6', gradient: 'linear-gradient(135deg, #f472b6 0%, #ec4899 100%)' },
    work_finance: { bg: '#fff7e6', border: '#f5d38f', gradient: 'linear-gradient(135deg, #fb923c 0%, #f59e0b 100%)' }
  };

  const colors = categoryColors[project.category] || categoryColors.self_dev;
  const tasksList = tasks || [];

  projectDetail.innerHTML = `
    <div style="background: ${project.isCompleted ? '#f9fafb' : colors.bg}; border: 2px solid ${project.isCompleted ? '#e5e7eb' : colors.border}; border-radius: 12px; padding: 1.25rem; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; padding-bottom: 0.75rem; border-bottom: 1px dashed ${project.isCompleted ? '#d1d5db' : colors.border};">
        <h3 style="color: #1f2937; font-size: 1.1rem; font-weight: 700; margin: 0; word-break: break-word; overflow-wrap: break-word; line-height: 1.4;">
          <i data-lucide="list-checks" style="width: 18px; height: 18px; margin-right: 0.5rem; vertical-align: -3px;"></i>
          ${project.name} 할일 목록
        </h3>
        <div style="display: flex; gap: 0.5rem;">
          ${project.isCompleted ? `
            <button class="reopen-project-btn" data-project-id="${project.id}" style="padding: 0.375rem 0.75rem; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; border: none; border-radius: 6px; font-size: 0.8rem; font-weight: 600; cursor: pointer;">
              <i data-lucide="rotate-ccw" style="width: 14px; height: 14px; margin-right: 0.25rem;"></i>
              다시 진행
            </button>
          ` : ''}
          <button class="edit-project-btn" data-project-id="${project.id}" style="background: transparent; border: none; color: #6b7280; cursor: pointer; padding: 0.25rem;">
            <i data-lucide="pencil" style="width: 16px; height: 16px;"></i>
          </button>
          <button class="delete-project-btn" data-project-id="${project.id}" style="background: transparent; border: none; color: #ef4444; cursor: pointer; padding: 0.25rem;">
            <i data-lucide="trash-2" style="width: 16px; height: 16px;"></i>
          </button>
        </div>
      </div>

      <div id="project-tasks-${project.id}" style="margin-bottom: 1rem; max-height: 400px; overflow-y: auto;">
        ${tasksList.map(task => renderProjectTask(task, project.category)).join('')}
        ${tasksList.length === 0 ? `
          <div style="text-align: center; padding: 2rem 1rem; color: #9ca3af;">
            <i data-lucide="clipboard-list" style="width: 32px; height: 32px; margin: 0 auto 0.5rem; opacity: 0.5;"></i>
            <p style="font-size: 0.9rem; margin: 0;">등록된 할일이 없습니다</p>
          </div>
        ` : ''}
      </div>

      ${!project.isCompleted ? `
        <div style="display: flex; gap: 0.5rem; margin-bottom: 1rem;">
          <input type="text" id="project-task-input-${project.id}" placeholder="할일을 입력하세요... (Enter로 추가)" style="flex: 1; padding: 0.625rem; border: 2px solid ${colors.border}; border-radius: 8px; font-size: 0.95rem; background: white;">
          <button class="add-project-task-btn" data-project-id="${project.id}" style="padding: 0.625rem 1rem; background: ${colors.gradient}; color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer;">
            <i data-lucide="plus" style="width: 16px; height: 16px;"></i>
          </button>
        </div>

        <button class="register-todos-btn" data-project-id="${project.id}" style="width: 100%; padding: 0.75rem; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; box-shadow: 0 2px 8px rgba(99, 102, 241, 0.3);">
          <i data-lucide="calendar-check" style="width: 18px; height: 18px; margin-right: 0.5rem;"></i>
          오늘 할일 등록하기
        </button>
      ` : ''}
    </div>
  `;

  projectDetail.style.display = 'block';

  if (window.lucide?.createIcons) window.lucide.createIcons();

  // 수정 모드 입력 필드에 Enter/Escape 키 이벤트 바인딩
  document.querySelectorAll('.project-task-edit-input').forEach(input => {
    const newInput = input.cloneNode(true);
    input.parentNode.replaceChild(newInput, input);
    
    newInput.addEventListener('keydown', async (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        const taskId = newInput.closest('.project-task-item')?.dataset?.taskId;
        if (taskId) {
          await saveProjectTaskEdit(taskId, newInput.value.trim(), profile);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        editingProjectTaskId = null;
        await loadProjects(profile);
      }
    });
    
    setTimeout(() => {
      newInput.focus();
      newInput.select();
    }, 10);
  });

  // 할일 추가 입력 필드에 Enter 키 이벤트 바인딩
  const taskInput = document.getElementById(`project-task-input-${project.id}`);
  if (taskInput) {
    const newInput = taskInput.cloneNode(true);
    taskInput.parentNode.replaceChild(newInput, taskInput);
    
    newInput.addEventListener('keypress', async (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        if (newInput.value.trim()) {
          await addProjectTask(project.id, newInput.value.trim(), profile);
        }
      }
    });
  }
}

function renderProjectTask(task, projectCategory) {
  const isEditing = editingProjectTaskId === task.id;
  
  // 날짜 표시 로직 개선
  let dateDisplay = '';
  let dateText = ''; // PC용 텍스트만 추출
  if (task.start_date && task.end_date) {
    dateDisplay = `<span style="font-size: 0.75rem; color: #6b7280;">📅 ${task.start_date} ~ ${task.end_date}</span>`;
    dateText = `📅 ${task.start_date} ~ ${task.end_date}`;
  } else if (task.start_date) {
    dateDisplay = `<span style="font-size: 0.75rem; color: #6b7280;">📅 ${task.start_date}</span>`;
    dateText = `📅 ${task.start_date}`;
  } else if (task.due_date) {
    dateDisplay = `<span style="font-size: 0.75rem; color: #9ca3af;">📅 ${task.due_date} (구)</span>`;
    dateText = `📅 ${task.due_date} (구)`;
  }
  
  return `
    <div class="project-task-item" data-task-id="${task.id}" style="background: white; border-radius: 8px; padding: 0.75rem; margin-bottom: 0.5rem; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
      <!-- 첫 번째 줄: 체크박스 + 제목 + 날짜(PC용) + 버튼들 -->
      <div class="project-task-row" style="display: flex; align-items: center; gap: 0.75rem; min-width: 0;">
        <input type="checkbox" ${task.is_done ? 'checked' : ''} class="project-task-checkbox" data-task-id="${task.id}" style="width: 20px; height: 20px; cursor: pointer; flex-shrink: 0;" ${isEditing ? 'disabled' : ''}>
        ${isEditing ? `
          <input type="text" class="project-task-edit-input" value="${task.title.replace(/"/g, '&quot;')}" style="flex: 1; min-width: 0; padding: 0.5rem; border: 2px solid #6366f1; border-radius: 4px; font-size: 1rem;">
        ` : `
          <span class="project-task-title" data-task-id="${task.id}" style="flex: 1; min-width: 0; word-break: break-word; overflow-wrap: break-word; ${task.is_done ? 'text-decoration: line-through; color: #9ca3af;' : 'color: #1f2937; cursor: pointer;'}">${task.title}</span>
          ${dateText ? `<span class="project-task-date-pc" style="font-size: 0.75rem; color: #6b7280; white-space: nowrap; flex-shrink: 0; margin-left: 0.5rem;">${dateText}</span>` : ''}
        `}
        ${!isEditing ? `
          <button class="project-task-dates-btn" data-task-id="${task.id}" style="background: transparent; border: none; color: #6366f1; cursor: pointer; padding: 0.25rem; flex-shrink: 0;" title="시작일/종료일 설정">
            <i data-lucide="calendar-range" style="width: 18px; height: 18px;"></i>
          </button>
          <button class="project-task-edit-btn" data-task-id="${task.id}" style="background: transparent; border: none; color: #10b981; cursor: pointer; padding: 0.25rem; flex-shrink: 0;" title="수정">
            <i data-lucide="pencil" style="width: 16px; height: 16px;"></i>
          </button>
        ` : `
          <button class="project-task-save-btn" data-task-id="${task.id}" style="background: transparent; border: none; color: #10b981; cursor: pointer; padding: 0.25rem; flex-shrink: 0;">
            <i data-lucide="check" style="width: 18px; height: 18px;"></i>
          </button>
          <button class="project-task-cancel-btn" data-task-id="${task.id}" style="background: transparent; border: none; color: #ef4444; cursor: pointer; padding: 0.25rem; flex-shrink: 0;">
            <i data-lucide="x" style="width: 18px; height: 18px;"></i>
          </button>
        `}
        <button class="project-task-delete-btn" data-task-id="${task.id}" style="background: transparent; border: none; color: #ef4444; cursor: pointer; padding: 0.25rem; flex-shrink: 0;" title="삭제" ${isEditing ? 'disabled' : ''}>
          <i data-lucide="trash-2" style="width: 16px; height: 16px;"></i>
        </button>
      </div>
      
      <!-- 두 번째 줄: 날짜 표시 (모바일용) -->
      ${dateDisplay ? `
        <div class="project-task-date-mobile" style="margin-top: 0.5rem; padding-left: 2.45rem;">
          ${dateDisplay}
        </div>
      ` : ''}
    </div>
  `;
}

function setupEventHandlers(profile) {
  // 프로젝트 추가 버튼
  const addProjectBtn = document.getElementById('add-project-btn');
  if (addProjectBtn) {
    const newAddBtn = addProjectBtn.cloneNode(true);
    addProjectBtn.parentNode.replaceChild(newAddBtn, addProjectBtn);
    newAddBtn.addEventListener('click', () => openProjectModal(null, profile));
  }

  // 탭 전환 버튼
  const tabInProgress = document.getElementById('tab-in-progress');
  const tabCompleted = document.getElementById('tab-completed');
  
  if (tabInProgress) {
    const newTab = tabInProgress.cloneNode(true);
    tabInProgress.parentNode.replaceChild(newTab, tabInProgress);
    newTab.addEventListener('click', async () => {
      activeProjectTab = 'in_progress';
      expandedProjectId = null;
      updateTabStyles();
      await loadProjects(profile);
    });
  }
  
  if (tabCompleted) {
    const newTab = tabCompleted.cloneNode(true);
    tabCompleted.parentNode.replaceChild(newTab, tabCompleted);
    newTab.addEventListener('click', async () => {
      activeProjectTab = 'completed';
      expandedProjectId = null;
      updateTabStyles();
      await loadProjects(profile);
    });
  }

  // 이벤트 위임: 프로젝트 카드 내부 버튼들
  // 기존 이벤트 리스너 제거 (중복 방지)
  if (projectEventHandler) {
    document.removeEventListener('click', projectEventHandler);
    projectEventHandler = null;
  }
  
  projectEventsBound = true;

  // 이벤트 핸들러 함수 정의
  projectEventHandler = async (e) => {
    // 프로젝트 추가 버튼
    if (e.target.closest('#add-project-btn')) {
      openProjectModal(null, profile);
      return;
    }

    // 프로젝트 카드 클릭 (펼치기/접기)
    const cardCompact = e.target.closest('.project-card-compact');
    if (cardCompact && !e.target.closest('button') && !e.target.closest('input') && !e.target.closest('.project-task-checkbox')) {
      const projectId = cardCompact.dataset.projectId;
      if (expandedProjectId === projectId) {
        // 이미 펼쳐진 카드 클릭 시 접기
        expandedProjectId = null;
        const projectDetail = document.getElementById('project-detail');
        if (projectDetail) projectDetail.style.display = 'none';
      } else {
        // 다른 카드 클릭 시 펼치기
        expandedProjectId = projectId;
      }
      await loadProjects(profile);
      return;
    }

    // 다시 진행하기 버튼
    if (e.target.closest('.reopen-project-btn')) {
      const btn = e.target.closest('.reopen-project-btn');
      const projectId = btn.dataset.projectId;
      await reopenProject(projectId, profile);
      return;
    }

    // 프로젝트 할일 추가
    if (e.target.closest('.add-project-task-btn')) {
      const btn = e.target.closest('.add-project-task-btn');
      const projectId = btn.dataset.projectId;
      const input = document.getElementById(`project-task-input-${projectId}`);
      if (input && input.value.trim()) {
        await addProjectTask(projectId, input.value.trim(), profile);
        input.value = '';
      }
    }

    // 프로젝트 할일 체크박스
    if (e.target.classList.contains('project-task-checkbox')) {
      const taskId = e.target.dataset.taskId;
      const checked = e.target.checked;
      await toggleProjectTask(taskId, checked, profile);
    }

    // 프로젝트 할일 제목 클릭 (수정 모드 진입)
    if (e.target.classList.contains('project-task-title')) {
      const taskId = e.target.dataset.taskId;
      editingProjectTaskId = taskId;
      await loadProjects(profile);
    }

    // 프로젝트 할일 날짜 범위 버튼
    if (e.target.closest('.project-task-dates-btn')) {
      const btn = e.target.closest('.project-task-dates-btn');
      const taskId = btn.dataset.taskId;
      openProjectTaskDateRangePicker(taskId, profile);
    }

    // (구) 단일 날짜 버튼 (하위 호환성)
    if (e.target.closest('.project-task-date-btn')) {
      const btn = e.target.closest('.project-task-date-btn');
      const taskId = btn.dataset.taskId;
      openProjectTaskDatePicker(taskId, profile);
    }

    // 프로젝트 할일 수정 버튼 (수정 모드 진입)
    if (e.target.closest('.project-task-edit-btn')) {
      const btn = e.target.closest('.project-task-edit-btn');
      const taskId = btn.dataset.taskId;
      editingProjectTaskId = taskId;
      await loadProjects(profile);
    }

    // 프로젝트 할일 저장 버튼
    if (e.target.closest('.project-task-save-btn')) {
      const btn = e.target.closest('.project-task-save-btn');
      const taskId = btn.dataset.taskId;
      const taskItem = btn.closest('.project-task-item');
      const input = taskItem.querySelector('.project-task-edit-input');
      if (input) {
        await saveProjectTaskEdit(taskId, input.value.trim(), profile);
      }
    }

    // 프로젝트 할일 취소 버튼
    if (e.target.closest('.project-task-cancel-btn')) {
      editingProjectTaskId = null;
      await loadProjects(profile);
    }

    // 프로젝트 할일 삭제 버튼
    if (e.target.closest('.project-task-delete-btn')) {
      const btn = e.target.closest('.project-task-delete-btn');
      const taskId = btn.dataset.taskId;
      if (confirm('이 할일을 삭제하시겠습니까?')) {
        await deleteProjectTask(taskId, profile);
      }
    }

    // 프로젝트 수정 버튼
    if (e.target.closest('.edit-project-btn')) {
      const btn = e.target.closest('.edit-project-btn');
      const projectId = btn.dataset.projectId;
      await openProjectModal(projectId, profile);
    }

    // 프로젝트 삭제 버튼
    if (e.target.closest('.delete-project-btn')) {
      const btn = e.target.closest('.delete-project-btn');
      const projectId = btn.dataset.projectId;
      if (confirm('이 프로젝트를 삭제하시겠습니까? 연결된 할일도 함께 삭제됩니다.')) {
        await deleteProject(projectId, profile);
      }
    }

    // 오늘 할일 등록 버튼
    if (e.target.closest('.register-todos-btn')) {
      const btn = e.target.closest('.register-todos-btn');
      const projectId = btn.dataset.projectId;
      await registerProjectTasksToTodos(projectId, profile);
    }
  };
  
  // 이벤트 리스너 등록
  document.addEventListener('click', projectEventHandler);

  // 프로젝트 모달 이벤트
  setupProjectModalEvents(profile);
}

function setupProjectModalEvents(profile) {
  const modal = document.getElementById('project-modal');
  const closeBtn = document.getElementById('project-modal-close');
  const cancelBtn = document.getElementById('project-modal-cancel');
  const saveBtn = document.getElementById('project-modal-save');
  const nameInput = document.getElementById('project-name-input');
  const categoryInput = document.getElementById('project-category-input');

  let currentProjectId = null;

  const closeModal = () => {
    if (modal) modal.style.display = 'none';
    currentProjectId = null;
    if (nameInput) nameInput.value = '';
    if (categoryInput) categoryInput.value = 'self_dev';
  };

  if (closeBtn) closeBtn.onclick = closeModal;
  if (cancelBtn) cancelBtn.onclick = closeModal;
  
  // 모달 배경 클릭 시 닫기
  if (modal) {
    modal.onclick = (e) => {
      if (e.target === modal) closeModal();
    };
  }

  // Enter 키로 저장
  if (nameInput) {
    nameInput.onkeypress = (e) => {
      if (e.key === 'Enter' && saveBtn) {
        e.preventDefault();
        saveBtn.click();
      }
    };
  }

  if (saveBtn) {
    saveBtn.onclick = async () => {
      if (!nameInput || !nameInput.value.trim()) {
        alert('프로젝트 이름을 입력해주세요.');
        nameInput?.focus();
        return;
      }

      try {
        if (currentProjectId) {
          // 수정
          const { error } = await supabase
            .from('projects')
            .update({
              name: nameInput.value.trim(),
              category: categoryInput.value
            })
            .eq('id', currentProjectId);

          if (error) throw error;
        } else {
          // 추가
          const { error } = await supabase
            .from('projects')
            .insert({
              user_id: profile.id,
              name: nameInput.value.trim(),
              category: categoryInput.value
            });

          if (error) throw error;
        }

        closeModal();
        await loadProjects(profile);
      } catch (error) {
        console.error('Error saving project:', error);
        alert('프로젝트 저장 중 오류가 발생했습니다.');
      }
    };
  }

  window.openProjectModal = (projectId, prof) => {
    currentProjectId = projectId;
    if (modal) modal.style.display = 'flex';

    if (projectId) {
      // 수정 모드
      const titleEl = document.getElementById('project-modal-title');
      if (titleEl) titleEl.textContent = '프로젝트 수정';
      supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single()
        .then(({ data, error }) => {
          if (!error && data) {
            if (nameInput) nameInput.value = data.name;
            if (categoryInput) categoryInput.value = data.category;
          }
        });
    } else {
      // 추가 모드
      const titleEl = document.getElementById('project-modal-title');
      if (titleEl) titleEl.textContent = '프로젝트 추가';
      if (nameInput) nameInput.value = '';
      if (categoryInput) categoryInput.value = 'self_dev';
    }

    if (window.lucide?.createIcons) window.lucide.createIcons();
    
    // 입력 필드에 포커스
    setTimeout(() => nameInput?.focus(), 100);
  };
}

let addingProjectTask = false; // 중복 실행 방지 플래그

async function addProjectTask(projectId, title, profile) {
  // 중복 실행 방지
  if (addingProjectTask) return;
  
  const input = document.getElementById(`project-task-input-${projectId}`);
  
  try {
    addingProjectTask = true;
    if (input) input.disabled = true;
    
    const { error } = await supabase
      .from('project_tasks')
      .insert({
        project_id: projectId,
        user_id: profile.id,
        title: title.trim()
      });

    if (error) throw error;
    
    // 입력 필드 초기화
    if (input) input.value = '';
    
    await loadProjects(profile);
    
    // 입력 필드에 포커스 유지
    setTimeout(() => {
      const newInput = document.getElementById(`project-task-input-${projectId}`);
      if (newInput) {
        newInput.focus();
      }
    }, 100);
  } catch (error) {
    console.error('Error adding project task:', error);
    alert('할일 추가 중 오류가 발생했습니다.');
  } finally {
    addingProjectTask = false;
    if (input) input.disabled = false;
  }
}

async function toggleProjectTask(taskId, isDone, profile) {
  if (syncingProjectTask) return;
  syncingProjectTask = true;

  try {
    // 프로젝트 할일 업데이트
    const { error: taskError } = await supabase
      .from('project_tasks')
      .update({
        is_done: isDone,
        done_at: isDone ? new Date().toISOString() : null
      })
      .eq('id', taskId);

    if (taskError) throw taskError;

    // 양방향 동기화: 연결된 todos도 모두 업데이트
    if (!syncingTodo) {
      syncingTodo = true;
      try {
        const { error: todoError } = await supabase
          .from('todos')
          .update({
            is_done: isDone,
            done_at: isDone ? new Date().toISOString() : null
          })
          .eq('project_task_id', taskId)
          .is('deleted_at', null)
          .is('carried_over_at', null)  // 이월된 원본은 제외
          .is('skipped_at', null);      // 포기된 원본은 제외

        if (todoError) throw todoError;
      } finally {
        syncingTodo = false;
      }
    }

    await loadProjects(profile);
  } catch (error) {
    console.error('Error toggling project task:', error);
    alert('할일 상태 변경 중 오류가 발생했습니다.');
  } finally {
    syncingProjectTask = false;
  }
}

async function saveProjectTaskEdit(taskId, newTitle, profile) {
  if (!newTitle.trim()) {
    alert('할일을 입력해주세요.');
    editingProjectTaskId = null;
    await loadProjects(profile);
    return;
  }

  try {
    // 프로젝트 할일 업데이트
    const { error: taskError } = await supabase
      .from('project_tasks')
      .update({ title: newTitle.trim() })
      .eq('id', taskId);

    if (taskError) throw taskError;

    // 동기화: 연결된 todos도 업데이트
    if (!syncingTodo) {
      syncingTodo = true;
      try {
        const { error: todoError } = await supabase
          .from('todos')
          .update({ title: newTitle.trim() })
          .eq('project_task_id', taskId);

        if (todoError) throw todoError;
      } finally {
        syncingTodo = false;
      }
    }

    editingProjectTaskId = null;
    await loadProjects(profile);
  } catch (error) {
    console.error('Error saving project task:', error);
    alert('할일 수정 중 오류가 발생했습니다.');
  }
}

function openProjectTaskDatePicker(taskId, profile) {
  const overlay = document.getElementById('project-task-date-overlay');
  const calendarInput = document.getElementById('project-task-date-calendar-input');

  if (!overlay || !calendarInput || !window.flatpickr) return;

  let currentTaskId = taskId;

  const closeOverlay = () => {
    if (overlay) {
      overlay.classList.add('hidden');
      overlay.style.display = 'none';
    }
    currentTaskId = null;
  };

  if (calendarInput._fp) {
    calendarInput._fp.destroy();
    calendarInput._fp = null;
  }

  calendarInput._fp = window.flatpickr(calendarInput, {
    inline: true,
    locale: window.flatpickr.l10ns?.ko,
    onChange: async (dates, dateStr) => {
      if (dateStr && currentTaskId) {
        await updateProjectTaskDate(currentTaskId, dateStr, profile);
        closeOverlay();
      }
    }
  });

  const closeBtn = document.getElementById('project-task-date-close');
  const closeFooterBtn = document.getElementById('project-task-date-close-footer');
  const todayBtn = document.getElementById('project-task-date-today-modal');

  if (closeBtn) closeBtn.onclick = closeOverlay;
  if (closeFooterBtn) closeFooterBtn.onclick = closeOverlay;
  if (todayBtn) {
    todayBtn.onclick = async () => {
      const today = getToday(profile.timezone || 'Asia/Seoul');
      await updateProjectTaskDate(currentTaskId, today, profile);
      closeOverlay();
    };
  }

  overlay.classList.remove('hidden');
  overlay.style.display = 'flex';
  if (window.lucide?.createIcons) window.lucide.createIcons();
}

async function updateProjectTaskDate(taskId, dueDate, profile) {
  try {
    const { error } = await supabase
      .from('project_tasks')
      .update({ due_date: dueDate })
      .eq('id', taskId);

    if (error) throw error;
    await loadProjects(profile);
  } catch (error) {
    console.error('Error updating project task date:', error);
    alert('마감날짜 설정 중 오류가 발생했습니다.');
  }
}

// 시작일/종료일 범위 선택 모달
function openProjectTaskDateRangePicker(taskId, profile) {
  // 모달 HTML 생성 (처음 호출 시만)
  if (!document.getElementById('project-task-daterange-overlay')) {
    const modalHTML = `
      <div id="project-task-daterange-overlay" class="hidden" style="display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 999; align-items: center; justify-content: center;">
        <div style="background: white; border-radius: 12px; padding: 1.5rem; max-width: 500px; width: 90%; max-height: 80vh; overflow-y: auto; box-shadow: 0 8px 16px rgba(0,0,0,0.1), 0 20px 48px rgba(0,0,0,0.15);">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem; padding-bottom: 0.75rem; border-bottom: 2px solid #e5e7eb;">
            <h3 style="font-size: 1.25rem; font-weight: 700; color: #1f2937; margin: 0;">시작일/종료일 설정</h3>
            <button id="project-task-daterange-close" style="background: transparent; border: none; cursor: pointer; padding: 0.25rem;" title="닫기">
              <i data-lucide="x" style="width: 24px; height: 24px; color: #6b7280;"></i>
            </button>
          </div>
          
          <div style="margin-bottom: 1rem;">
            <label style="display: block; font-weight: 600; color: #374151; margin-bottom: 0.5rem;">시작일</label>
            <input type="text" id="project-task-startdate-input" readonly placeholder="시작일 선택..." style="width: 100%; padding: 0.75rem; border: 2px solid #d1d5db; border-radius: 8px; font-size: 1rem; cursor: pointer;">
          </div>
          
          <div style="margin-bottom: 1rem;">
            <label style="display: block; font-weight: 600; color: #374151; margin-bottom: 0.5rem;">종료일</label>
            <input type="text" id="project-task-enddate-input" readonly placeholder="종료일 선택..." style="width: 100%; padding: 0.75rem; border: 2px solid #d1d5db; border-radius: 8px; font-size: 1rem; cursor: pointer;">
          </div>
          
          <div style="display: flex; gap: 0.75rem; margin-top: 1.5rem;">
            <button id="project-task-daterange-save" class="btn btn-primary" style="flex: 1; padding: 0.75rem; border-radius: 8px; font-size: 1rem; font-weight: 600;">저장</button>
            <button id="project-task-daterange-clear" class="btn btn-secondary" style="flex: 1; padding: 0.75rem; border-radius: 8px; font-size: 1rem; font-weight: 600;">날짜 지우기</button>
          </div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
  }

  const overlay = document.getElementById('project-task-daterange-overlay');
  const startDateInput = document.getElementById('project-task-startdate-input');
  const endDateInput = document.getElementById('project-task-enddate-input');

  if (!overlay || !startDateInput || !endDateInput || !window.flatpickr) return;

  let currentTaskId = taskId;
  let selectedStartDate = null;
  let selectedEndDate = null;

  const closeOverlay = () => {
    if (overlay) {
      overlay.classList.add('hidden');
      overlay.style.display = 'none';
    }
    if (startDateInput._fp) {
      startDateInput._fp.destroy();
      startDateInput._fp = null;
    }
    if (endDateInput._fp) {
      endDateInput._fp.destroy();
      endDateInput._fp = null;
    }
    currentTaskId = null;
    selectedStartDate = null;
    selectedEndDate = null;
  };

  // 기존 flatpickr 인스턴스 제거
  if (startDateInput._fp) {
    startDateInput._fp.destroy();
    startDateInput._fp = null;
  }
  if (endDateInput._fp) {
    endDateInput._fp.destroy();
    endDateInput._fp = null;
  }

  // 시작일 선택
  startDateInput._fp = window.flatpickr(startDateInput, {
    locale: window.flatpickr.l10ns?.ko,
    dateFormat: 'Y-m-d',
    onChange: (dates, dateStr) => {
      selectedStartDate = dateStr;
      
      // 종료일이 비어있으면 시작일과 같은 날짜로 자동 설정 (UX 개선)
      if (!selectedEndDate) {
        selectedEndDate = dateStr;
        endDateInput.value = dateStr;
        if (endDateInput._fp) {
          endDateInput._fp.setDate(dateStr);
        }
      }
      
      // 종료일이 시작일보다 이전이면 초기화
      if (selectedEndDate && selectedEndDate < selectedStartDate) {
        selectedEndDate = null;
        endDateInput.value = '';
      }
    }
  });

  // 종료일 선택
  endDateInput._fp = window.flatpickr(endDateInput, {
    locale: window.flatpickr.l10ns?.ko,
    dateFormat: 'Y-m-d',
    onChange: (dates, dateStr) => {
      selectedEndDate = dateStr;
    }
  });

  // 저장 버튼
  const saveBtn = document.getElementById('project-task-daterange-save');
  if (saveBtn) {
    const newBtn = saveBtn.cloneNode(true);
    saveBtn.parentNode.replaceChild(newBtn, saveBtn);
    newBtn.onclick = async () => {
      if (!selectedStartDate) {
        alert('시작일을 선택해주세요.');
        return;
      }
      if (!selectedEndDate) {
        alert('종료일을 선택해주세요.');
        return;
      }
      if (selectedEndDate < selectedStartDate) {
        alert('종료일은 시작일보다 이후여야 합니다.');
        return;
      }
      await updateProjectTaskDateRange(currentTaskId, selectedStartDate, selectedEndDate, profile);
      closeOverlay();
    };
  }

  // 날짜 지우기 버튼
  const clearBtn = document.getElementById('project-task-daterange-clear');
  if (clearBtn) {
    const newBtn = clearBtn.cloneNode(true);
    clearBtn.parentNode.replaceChild(newBtn, clearBtn);
    newBtn.onclick = async () => {
      if (confirm('시작일/종료일을 지우시겠습니까?')) {
        await updateProjectTaskDateRange(currentTaskId, null, null, profile);
        closeOverlay();
      }
    };
  }

  // 닫기 버튼
  const closeBtn = document.getElementById('project-task-daterange-close');
  if (closeBtn) {
    const newBtn = closeBtn.cloneNode(true);
    closeBtn.parentNode.replaceChild(newBtn, closeBtn);
    newBtn.onclick = closeOverlay;
  }

  overlay.classList.remove('hidden');
  overlay.style.display = 'flex';
  if (window.lucide?.createIcons) window.lucide.createIcons();
}

async function updateProjectTaskDateRange(taskId, startDate, endDate, profile) {
  try {
    const { error } = await supabase
      .from('project_tasks')
      .update({ 
        start_date: startDate,
        end_date: endDate
      })
      .eq('id', taskId);

    if (error) throw error;
    await loadProjects(profile);
  } catch (error) {
    console.error('Error updating project task date range:', error);
    alert('시작일/종료일 설정 중 오류가 발생했습니다.');
  }
}

async function deleteProjectTask(taskId, profile) {
  try {
    console.log('[DeleteProjectTask] Starting deletion for task:', taskId);
    
    // 연결된 todos를 soft delete (반복업무와 동일하게)
    const { data: deletedTodos, error: todosError } = await supabase
      .from('todos')
      .update({ deleted_at: new Date().toISOString() })
      .eq('project_task_id', taskId)
      .is('deleted_at', null)
      .select('id');
    
    if (todosError) {
      console.error('[DeleteProjectTask] Error deleting todos:', todosError);
      // 에러가 발생해도 프로젝트 할일 삭제는 계속 진행
      console.warn('[DeleteProjectTask] Continuing with task deletion despite todos error');
    } else {
      console.log('[DeleteProjectTask] Deleted todos count:', deletedTodos?.length || 0);
      if (deletedTodos && deletedTodos.length > 0) {
        console.log('[DeleteProjectTask] Successfully deleted todos:', deletedTodos.map(t => t.id));
      }
    }

    // 프로젝트 할일 soft delete
    const { error } = await supabase
      .from('project_tasks')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', taskId);

    if (error) throw error;
    
    console.log('[DeleteProjectTask] Task deleted successfully');
    await loadProjects(profile);
    
    // 오늘 탭이 열려있으면 자동 새로고침 (프로젝트 전체 삭제와 동일하게)
    const currentHash = location.hash;
    if (currentHash === '#/today' || currentHash === '' || currentHash === '#/') {
      console.log('[DeleteProjectTask] Refreshing today page...');
      const { router } = await import('../router.js');
      if (router) {
        router.handleRoute();
      }
    }
  } catch (error) {
    console.error('[DeleteProjectTask] Error deleting project task:', error);
    console.error('[DeleteProjectTask] Error details:', JSON.stringify(error, null, 2));
    alert('할일 삭제 중 오류가 발생했습니다: ' + (error.message || '알 수 없는 오류'));
  }
}

async function deleteProject(projectId, profile) {
  try {
    console.log('[DeleteProject] Starting deletion for project:', projectId);
    
    // 연결된 project_tasks 조회 (프로젝트 삭제 전에 조회해야 함)
    const { data: tasks, error: tasksError } = await supabase
      .from('project_tasks')
      .select('id')
      .eq('project_id', projectId)
      .is('deleted_at', null);

    if (tasksError) {
      console.error('[DeleteProject] Error fetching project tasks:', tasksError);
      // 에러가 발생해도 todos 삭제는 시도
    }

    console.log('[DeleteProject] Found project tasks:', tasks?.length || 0);

    // project_tasks가 있으면 해당 taskIds로 todos 삭제 (반복업무와 동일한 패턴)
    if (tasks && tasks.length > 0) {
      const taskIds = tasks.map(t => t.id);
      console.log('[DeleteProject] Deleting todos for taskIds:', taskIds);
      
      // 연결된 todos를 soft delete (반복업무와 동일하게)
      const { data: deletedTodos, error: todosError } = await supabase
        .from('todos')
        .update({ deleted_at: new Date().toISOString() })
        .in('project_task_id', taskIds)
        .is('deleted_at', null)
        .select('id');
      
      if (todosError) {
        console.error('[DeleteProject] Error deleting todos:', todosError);
        console.error('[DeleteProject] Todos error details:', JSON.stringify(todosError, null, 2));
        // 에러가 발생해도 프로젝트 삭제는 계속 진행 (사용자 경험을 위해)
        console.warn('[DeleteProject] Continuing with project deletion despite todos error');
      } else {
        console.log('[DeleteProject] Deleted todos count:', deletedTodos?.length || 0);
        if (!deletedTodos || deletedTodos.length === 0) {
          console.warn('[DeleteProject] No todos were deleted. This might indicate a problem.');
          console.warn('[DeleteProject] TaskIds used:', taskIds);
        } else {
          console.log('[DeleteProject] Successfully deleted todos:', deletedTodos.map(t => t.id));
        }
      }
    } else {
      console.log('[DeleteProject] No project tasks found, skipping todos deletion');
    }

    // 프로젝트 soft delete
    const { error } = await supabase
      .from('projects')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', projectId);

    if (error) {
      console.error('[DeleteProject] Error deleting project:', error);
      throw error;
    }

    console.log('[DeleteProject] Project deleted successfully');

    await loadProjects(profile);
    
    // 오늘 탭이 열려있으면 자동 새로고침 (반복업무처럼 router를 통해)
    const currentHash = location.hash;
    if (currentHash === '#/today' || currentHash === '' || currentHash === '#/') {
      console.log('[DeleteProject] Refreshing today page...');
      const { router } = await import('../router.js');
      if (router) {
        router.handleRoute();
      }
    }
  } catch (error) {
    console.error('[DeleteProject] Error deleting project:', error);
    console.error('[DeleteProject] Error details:', JSON.stringify(error, null, 2));
    alert('프로젝트 삭제 중 오류가 발생했습니다: ' + (error.message || '알 수 없는 오류'));
  }
}

// 날짜 범위 내의 모든 날짜를 순회하는 함수 (recurring.js와 동일)
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

async function registerProjectTasksToTodos(projectId, profile) {
  // 동시 실행 방지
  if (registeringProjectTasks) {
    console.log('이미 등록 중입니다. 잠시 후 다시 시도해주세요.');
    return;
  }
  
  registeringProjectTasks = true;
  
  // UI 피드백: 버튼 비활성화 및 텍스트 변경
  const button = document.querySelector(`.btn-register-project-tasks[data-project-id="${projectId}"]`);
  const originalText = button ? button.textContent : '';
  if (button) {
    button.disabled = true;
    button.textContent = '등록 중...';
  }
  
  try {
    // 프로젝트 정보 조회 (카테고리 매핑용)
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('category')
      .eq('id', projectId)
      .single();

    if (projectError) throw projectError;

    // 카테고리 매핑 (프로젝트 → 할일)
    const categoryMap = {
      'self_dev': 'self_dev',      // Growth → Growth
      'relationship': 'personal',   // 관계 → Personal
      'work_finance': 'work'        // 업무/재정 → Work
    };
    const todoCategory = categoryMap[project.category] || 'work';

    // 프로젝트의 미완료 할일만 조회
    const { data: tasks, error: tasksError } = await supabase
      .from('project_tasks')
      .select('*')
      .eq('project_id', projectId)
      .is('deleted_at', null)
      .eq('is_done', false)  // 미완료 할일만 필터링
      .order('start_date', { ascending: true, nullsFirst: false })
      .order('display_order', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: true });

    if (tasksError) throw tasksError;

    if (!tasks || tasks.length === 0) {
      alert('등록할 할일이 없습니다.');
      return;
    }

    // 등록할 날짜들을 모두 수집 (start_date ~ end_date 범위)
    const datesToCheck = [];
    const taskDateMap = new Map(); // { date: [taskIds] }
    
    for (const task of tasks) {
      // start_date와 end_date가 있으면 그 범위의 모든 날짜
      if (task.start_date && task.end_date) {
        for (const date of iterateDates(task.start_date, task.end_date)) {
          datesToCheck.push(date);
          if (!taskDateMap.has(date)) {
            taskDateMap.set(date, []);
          }
          taskDateMap.get(date).push(task.id);
        }
      }
      // start_date만 있으면 그 날짜만
      else if (task.start_date) {
        datesToCheck.push(task.start_date);
        if (!taskDateMap.has(task.start_date)) {
          taskDateMap.set(task.start_date, []);
        }
        taskDateMap.get(task.start_date).push(task.id);
      }
      // due_date가 있으면 그 날짜만 (하위 호환성)
      else if (task.due_date) {
        datesToCheck.push(task.due_date);
        if (!taskDateMap.has(task.due_date)) {
          taskDateMap.set(task.due_date, []);
        }
        taskDateMap.get(task.due_date).push(task.id);
      }
    }

    if (datesToCheck.length === 0) {
      alert('시작일 또는 종료일이 설정된 할일이 없습니다.');
      return;
    }

    // 중복 제거
    const uniqueDates = [...new Set(datesToCheck)];

    // 이미 등록된 할일 조회 (한 번의 쿼리로 모든 날짜와 task_id 조합 체크)
    const taskIds = tasks.map(t => t.id);
    const { data: existingTodos, error: existingError } = await supabase
      .from('todos')
      .select('date, project_task_id')
      .in('project_task_id', taskIds)
      .in('date', uniqueDates)
      .is('deleted_at', null)
      .is('carried_over_at', null)  // 이월된 원본 할일 제외
      .is('skipped_at', null);      // 포기된 원본 할일 제외

    if (existingError) throw existingError;

    // 이미 등록된 (날짜, task_id) 조합을 Set으로 저장
    const existingSet = new Set();
    if (existingTodos && existingTodos.length > 0) {
      existingTodos.forEach(todo => {
        existingSet.add(`${todo.date}:${todo.project_task_id}`);
      });
    }

    // 새로 등록할 할일들 수집
    const todosToInsert = [];
    for (const [date, taskIdsForDate] of taskDateMap.entries()) {
      for (const taskId of taskIdsForDate) {
        const key = `${date}:${taskId}`;
        if (!existingSet.has(key)) {
          const task = tasks.find(t => t.id === taskId);
          if (task) {
            todosToInsert.push({
              user_id: profile.id,
              date: date,
              category: todoCategory,
              title: task.title,
              project_task_id: task.id,
              is_done: false
            });
          }
        }
      }
    }

    // 새로 등록할 할일이 있으면 일괄 삽입
    if (todosToInsert.length > 0) {
      const { error: insertError } = await supabase
        .from('todos')
        .insert(todosToInsert);

      if (insertError) throw insertError;

      alert(`${todosToInsert.length}개의 할일이 등록되었습니다.`);
    } else {
      alert('모든 할일이 이미 등록되어 있습니다.');
    }

    await loadProjects(profile);
  } catch (error) {
    console.error('Error registering project tasks:', error);
    alert('할일 등록 중 오류가 발생했습니다.');
  } finally {
    registeringProjectTasks = false;
    // UI 피드백: 버튼 복구
    if (button) {
      button.disabled = false;
      button.textContent = originalText;
    }
  }
}

// 탭 스타일 업데이트
function updateTabStyles() {
  const tabInProgress = document.getElementById('tab-in-progress');
  const tabCompleted = document.getElementById('tab-completed');
  
  if (tabInProgress) {
    if (activeProjectTab === 'in_progress') {
      tabInProgress.style.background = 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)';
      tabInProgress.style.borderColor = '#3b82f6';
      tabInProgress.style.color = 'white';
    } else {
      tabInProgress.style.background = '#f3f4f6';
      tabInProgress.style.borderColor = '#d1d5db';
      tabInProgress.style.color = '#6b7280';
    }
  }
  
  if (tabCompleted) {
    if (activeProjectTab === 'completed') {
      tabCompleted.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
      tabCompleted.style.borderColor = '#10b981';
      tabCompleted.style.color = 'white';
    } else {
      tabCompleted.style.background = '#f3f4f6';
      tabCompleted.style.borderColor = '#d1d5db';
      tabCompleted.style.color = '#6b7280';
    }
  }
  
  if (window.lucide?.createIcons) window.lucide.createIcons();
}

// 프로젝트 다시 진행하기 (완료 → 진행중)
async function reopenProject(projectId, profile) {
  try {
    // 첫 번째 미완료 할일 찾기 또는 마지막 할일을 미완료로 변경
    const { data: tasks, error: tasksError } = await supabase
      .from('project_tasks')
      .select('id')
      .eq('project_id', projectId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(1);

    if (tasksError) throw tasksError;

    if (tasks && tasks.length > 0) {
      // 마지막 할일을 미완료로 변경
      const { error: updateError } = await supabase
        .from('project_tasks')
        .update({ is_done: false, done_at: null })
        .eq('id', tasks[0].id);

      if (updateError) throw updateError;

      // 연결된 todos도 미완료로 변경
      await supabase
        .from('todos')
        .update({ is_done: false, done_at: null })
        .eq('project_task_id', tasks[0].id);
    }

    // 진행중 탭으로 전환
    activeProjectTab = 'in_progress';
    expandedProjectId = projectId;
    updateTabStyles();
    await loadProjects(profile);
  } catch (error) {
    console.error('Error reopening project:', error);
    alert('프로젝트 다시 진행 중 오류가 발생했습니다.');
  }
}

