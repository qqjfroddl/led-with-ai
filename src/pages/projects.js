import { toast } from '../utils/toast.js';
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
    <div class="card bg-accent-soft bd-2px-solid-accent sh-0-8px-24px-rgba42_38_34_0_07">
      <div class="card-header bdb-2px-solid-accent-line pb-1rem mb-1_25rem">
        <div class="d-flex ai-center gap-0_75rem">
          <div class="w-40px h-40px bg-accent br-12px d-flex ai-center jc-center sh-0-4px-12px-rgba42_38_34_0_15">
            <i class="w-24px h-24px c-white sw-2_5" data-lucide="folder-kanban"></i>
          </div>
          <div class="fx-1">
            <div class="card-title c-accent fz-1_5rem m-0">프로젝트</div>
            <p class="c-muted fz-1rem m-0_25rem-0-0-0">프로젝트를 관리하고 할일을 등록하세요</p>
          </div>
          <button id="add-project-btn" class="btn btn-primary p-0_5rem-1rem fz-0_9rem">
            <i class="w-16px h-16px" data-lucide="plus"></i>
            추가
          </button>
        </div>
      </div>

      <div class="d-block" id="projects-content">
        <!-- 탭 영역 -->
        <div class="d-flex gap-0_5rem mb-1_25rem" id="projects-tabs">
          <button id="tab-in-progress" class="project-tab active fx-1 p-0_75rem bd-2px-solid-accent br-8px bg-accent c-white fwt-600 cur-pointer tr-all-0_2s" data-tab="in_progress">
            <i class="w-16px h-16px mr-0_5rem" data-lucide="loader"></i>
            진행중 (<span id="in-progress-count">0</span>)
          </button>
          <button id="tab-completed" class="project-tab fx-1 p-0_75rem bd-2px-solid-line2 br-8px bg-bg2 c-muted fwt-600 cur-pointer tr-all-0_2s" data-tab="completed">
            <i class="w-16px h-16px mr-0_5rem" data-lucide="check-circle"></i>
            완료 (<span id="completed-count">0</span>)
          </button>
        </div>

        <!-- 카드 그리드 -->
        <div class="d-grid gtc-repeatauto-fill_minmax280px_1fr gap-1rem mb-1rem" id="projects-grid"></div>
        
        <!-- 빈 상태 -->
        <div class="ta-center p-3rem-1rem c-muted2 d-none" id="projects-empty">
          <i class="w-48px h-48px m-0-auto-1rem op-0_5" data-lucide="folder-x"></i>
          <p class="fz-1_1rem mb-0_5rem" id="projects-empty-title">진행중인 프로젝트가 없습니다</p>
          <p class="fz-0_9rem" id="projects-empty-desc">새 프로젝트를 추가하여 시작하세요</p>
        </div>

        <!-- 펼쳐진 프로젝트 상세 영역 -->
        <div class="d-none mt-1rem" id="project-detail"></div>
      </div>
    </div>

    <!-- 프로젝트 추가/수정 모달 (심플 버전) -->
    <div class="pos-fixed t-0 l-0 r-0 b-0 bg-rgba42_38_34_0_5 z-1000 d-none ai-center jc-center" id="project-modal">
      <div class="bg-surface br-16px p-1_5rem w-90pct maxw-520px sh-0-20px-60px-rgba42_38_34_0_3">
        <div class="d-flex ai-center jc-space-between mb-1_25rem">
          <h3 class="m-0 fz-1_25rem fwt-700 c-text" id="project-modal-title">프로젝트 추가</h3>
          <button class="bg-transparent bd-none p-0_25rem cur-pointer c-muted2 tr-color-0_2s" id="project-modal-close">
            <i class="w-24px h-24px" data-lucide="x"></i>
          </button>
        </div>
        
        <div class="d-flex gap-0_75rem ai-center fwrap-wrap">
          <input class="fx-1 minw-180px p-0_75rem-1rem bd-2px-solid-line br-10px fz-1rem tr-border-color-0_2s ol-none" type="text" id="project-name-input" placeholder="프로젝트 이름" onfocus="this.style.borderColor='var(--t-accent)'" onblur="this.style.borderColor='var(--t-line)'">
          <select class="p-0_75rem-1rem bd-2px-solid-line br-10px fz-0_95rem bg-surface cur-pointer minw-120px" id="project-category-input">
            <option value="self_dev">자기계발</option>
            <option value="relationship">가족/관계</option>
            <option value="work_finance">업무/재정</option>
          </select>
          <button class="p-0_75rem-1_5rem bg-accent c-white bd-none br-10px fz-1rem fwt-600 cur-pointer ws-nowrap sh-0-4px-12px-rgba42_38_34_0_15 tr-transform-0_2s_box-shadow-0_2s" id="project-modal-save" onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 16px rgba(42,38,34, 0.18)'" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 12px rgba(42,38,34, 0.15)'">
            <i class="w-18px h-18px mr-0_25rem va--3px" data-lucide="check"></i>
            저장
          </button>
        </div>
        <button class="d-none" id="project-modal-cancel"></button>
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
    toast('프로젝트를 불러오는 중 오류가 발생했습니다.');
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
    self_dev: { bg: 'var(--t-accent2-soft)', border: 'var(--t-accent2-line)', gradient: 'var(--t-accent2)', shadow: 'rgba(42,38,34, 0.15)' },
    relationship: { bg: 'var(--t-cat-personal-soft)', border: 'var(--t-cat-personal-line)', gradient: 'var(--t-cat-personal)', shadow: 'rgba(42,38,34, 0.15)' },
    work_finance: { bg: 'var(--t-cat-work-soft)', border: 'var(--t-cat-work-line)', gradient: 'var(--t-cat-work)', shadow: 'rgba(42,38,34, 0.15)' }
  };

  const colors = categoryColors[project.category] || categoryColors.self_dev;
  const icon = categoryIcons[project.category] || 'folder';
  const progress = project.totalCount > 0 ? Math.round((project.completedCount / project.totalCount) * 100) : 0;
  const isExpanded = expandedProjectId === project.id;

  return `
    <div class="project-card-compact ${isExpanded ? 'expanded' : ''} br-12px p-1rem cur-pointer tr-all-0_2s" data-project-id="${project.id}" style="background: ${project.isCompleted ? 'var(--t-bg2)' : colors.bg}; border: 2px solid ${project.isCompleted ? 'var(--t-line2)' : colors.border}; box-shadow: ${isExpanded ? `0 8px 24px ${colors.shadow}` : '0 2px 8px rgba(42,38,34, 0.08)'}; ${isExpanded ? `transform: scale(1.02);` : ''}
                ${project.isCompleted ? 'opacity: 0.8;' : ''}">
      <div class="d-flex ai-start gap-0_75rem">
        <div class="w-36px h-36px br-10px d-flex ai-center jc-center fs-0" style="background: ${project.isCompleted ? 'var(--t-muted2)' : colors.gradient};">
          <i class="w-20px h-20px c-white" data-lucide="${project.isCompleted ? 'check-circle' : icon}"></i>
        </div>
        <div class="fx-1 minw-0">
          <h4 class="fz-1rem fwt-600 m-0-0-0_25rem-0 wb-break-word ow-break-word lh-1_3" style="color: ${project.isCompleted ? 'var(--t-muted)' : 'var(--t-text)'};">${project.name}</h4>
          <div class="d-flex ai-center gap-0_5rem fwrap-wrap">
            <span class="fz-0_75rem p-0_125rem-0_5rem c-white br-999px fwt-500" style="background: ${project.isCompleted ? 'var(--t-line)' : colors.gradient};">${categoryLabels[project.category]}</span>
          </div>
        </div>
        <i class="w-18px h-18px c-muted2 fs-0" data-lucide="${isExpanded ? 'chevron-up' : 'chevron-down'}"></i>
      </div>
      
      <div class="mt-0_75rem">
        <div class="d-flex jc-space-between ai-center mb-0_25rem">
          <span class="fz-0_75rem c-muted">${project.completedCount} / ${project.totalCount}</span>
          <span class="fz-0_75rem fwt-600" style="color: ${project.isCompleted ? 'var(--t-success)' : 'var(--t-text)'};">${progress}%</span>
        </div>
        <div class="w-100pct h-6px bg-line br-999px ov-hidden">
          <div class="h-100pct tr-width-0_3s" style="width: ${progress}%; background: ${project.isCompleted ? 'var(--t-success)' : colors.gradient};"></div>
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
    self_dev: { bg: 'var(--t-accent2-soft)', border: 'var(--t-accent2-line)', gradient: 'var(--t-accent2)' },
    relationship: { bg: 'var(--t-cat-personal-soft)', border: 'var(--t-cat-personal-line)', gradient: 'var(--t-cat-personal)' },
    work_finance: { bg: 'var(--t-cat-work-soft)', border: 'var(--t-cat-work-line)', gradient: 'var(--t-cat-work)' }
  };

  const colors = categoryColors[project.category] || categoryColors.self_dev;
  const tasksList = tasks || [];

  projectDetail.innerHTML = `
    <div class="br-12px p-1_25rem sh-0-4px-12px-rgba42_38_34_0_1" style="background: ${project.isCompleted ? 'var(--t-bg)' : colors.bg}; border: 2px solid ${project.isCompleted ? 'var(--t-line)' : colors.border};">
      <div class="d-flex jc-space-between ai-center mb-1rem pb-0_75rem" style="border-bottom: 1px dashed ${project.isCompleted ? 'var(--t-line2)' : colors.border};">
        <h3 class="c-text fz-1_1rem fwt-700 m-0 wb-break-word ow-break-word lh-1_4">
          <i class="w-18px h-18px mr-0_5rem va--3px" data-lucide="list-checks"></i>
          ${project.name} 할일 목록
        </h3>
        <div class="d-flex gap-0_5rem">
          ${project.isCompleted ? `
            <button class="reopen-project-btn p-0_375rem-0_75rem bg-success c-white bd-none br-6px fz-0_8rem fwt-600 cur-pointer" data-project-id="${project.id}">
              <i class="w-14px h-14px mr-0_25rem" data-lucide="rotate-ccw"></i>
              다시 진행
            </button>
          ` : ''}
          <button class="edit-project-btn bg-transparent bd-none c-muted cur-pointer p-0_25rem" data-project-id="${project.id}">
            <i class="w-16px h-16px" data-lucide="pencil"></i>
          </button>
          <button class="delete-project-btn bg-transparent bd-none c-danger cur-pointer p-0_25rem" data-project-id="${project.id}">
            <i class="w-16px h-16px" data-lucide="trash-2"></i>
          </button>
        </div>
      </div>

      <div class="mb-1rem maxh-400px ovy-auto" id="project-tasks-${project.id}">
        ${tasksList.map(task => renderProjectTask(task, project.category)).join('')}
        ${tasksList.length === 0 ? `
          <div class="ta-center p-2rem-1rem c-muted2">
            <i class="w-32px h-32px m-0-auto-0_5rem op-0_5" data-lucide="clipboard-list"></i>
            <p class="fz-0_9rem m-0">등록된 할일이 없습니다</p>
          </div>
        ` : ''}
      </div>

      ${!project.isCompleted ? `
        <div class="d-flex gap-0_5rem mb-1rem">
          <input class="fx-1 p-0_625rem br-8px fz-0_95rem bg-surface" type="text" id="project-task-input-${project.id}" placeholder="할일을 입력하세요... (Enter로 추가)" style="border: 2px solid ${colors.border};">
          <button class="add-project-task-btn p-0_625rem-1rem c-white bd-none br-8px fwt-600 cur-pointer" data-project-id="${project.id}" style="background: ${colors.gradient};">
            <i class="w-16px h-16px" data-lucide="plus"></i>
          </button>
        </div>

        <button class="register-todos-btn w-100pct p-0_75rem bg-accent c-white bd-none br-8px fwt-600 cur-pointer sh-0-2px-8px-rgba42_38_34_0_15" data-project-id="${project.id}">
          <i class="w-18px h-18px mr-0_5rem" data-lucide="calendar-check"></i>
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
    dateDisplay = `<span class="fz-0_75rem c-muted">📅 ${task.start_date} ~ ${task.end_date}</span>`;
    dateText = `📅 ${task.start_date} ~ ${task.end_date}`;
  } else if (task.start_date) {
    dateDisplay = `<span class="fz-0_75rem c-muted">📅 ${task.start_date}</span>`;
    dateText = `📅 ${task.start_date}`;
  } else if (task.due_date) {
    dateDisplay = `<span class="fz-0_75rem c-muted2">📅 ${task.due_date} (구)</span>`;
    dateText = `📅 ${task.due_date} (구)`;
  }
  
  return `
    <div class="project-task-item bg-surface br-8px p-0_75rem mb-0_5rem sh-0-2px-4px-rgba42_38_34_0_05" data-task-id="${task.id}">
      <!-- 첫 번째 줄: 체크박스 + 제목 + 날짜(PC용) + 버튼들 -->
      <div class="project-task-row d-flex ai-center gap-0_75rem minw-0">
        <input type="checkbox" ${task.is_done ? 'checked' : ''} class="project-task-checkbox w-20px h-20px cur-pointer fs-0" data-task-id="${task.id}"  ${isEditing ? 'disabled' : ''}>
        ${isEditing ? `
          <input type="text" class="project-task-edit-input" value="${task.title.replace(/"/g, '&quot;')}">
        ` : `
          <span class="project-task-title fx-1 minw-0 wb-break-word ow-break-word ${task.is_done ? 'td-line-through c-muted2' : 'c-text cur-pointer'}" data-task-id="${task.id}">${task.title}</span>
          ${dateText ? `<span class="project-task-date-pc fz-0_75rem c-muted ws-nowrap fs-0 ml-0_5rem">${dateText}</span>` : ''}
        `}
        ${!isEditing ? `
          <button class="project-task-dates-btn bg-transparent bd-none c-accent cur-pointer p-0_25rem fs-0" data-task-id="${task.id}" title="시작일/종료일 설정">
            <i class="w-18px h-18px" data-lucide="calendar-range"></i>
          </button>
          <button class="project-task-edit-btn bg-transparent bd-none c-success cur-pointer p-0_25rem fs-0" data-task-id="${task.id}" title="수정">
            <i class="w-16px h-16px" data-lucide="pencil"></i>
          </button>
        ` : `
          <button class="project-task-save-btn bg-transparent bd-none c-success cur-pointer p-0_25rem fs-0" data-task-id="${task.id}">
            <i class="w-18px h-18px" data-lucide="check"></i>
          </button>
          <button class="project-task-cancel-btn bg-transparent bd-none c-danger cur-pointer p-0_25rem fs-0" data-task-id="${task.id}">
            <i class="w-18px h-18px" data-lucide="x"></i>
          </button>
        `}
        <button class="project-task-delete-btn bg-transparent bd-none c-danger cur-pointer p-0_25rem fs-0" data-task-id="${task.id}" title="삭제" ${isEditing ? 'disabled' : ''}>
          <i class="w-16px h-16px" data-lucide="trash-2"></i>
        </button>
      </div>
      
      <!-- 두 번째 줄: 날짜 표시 (모바일용) -->
      ${dateDisplay ? `
        <div class="project-task-date-mobile mt-0_5rem pl-2_45rem">
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
        toast('프로젝트 이름을 입력해주세요.');
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
        toast('프로젝트 저장 중 오류가 발생했습니다.');
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
    toast('할일 추가 중 오류가 발생했습니다.');
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
    toast('할일 상태 변경 중 오류가 발생했습니다.');
  } finally {
    syncingProjectTask = false;
  }
}

async function saveProjectTaskEdit(taskId, newTitle, profile) {
  if (!newTitle.trim()) {
    toast('할일을 입력해주세요.');
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
    toast('할일 수정 중 오류가 발생했습니다.');
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
    toast('마감날짜 설정 중 오류가 발생했습니다.');
  }
}

// 시작일/종료일 범위 선택 모달
function openProjectTaskDateRangePicker(taskId, profile) {
  // 모달 HTML 생성 (처음 호출 시만)
  if (!document.getElementById('project-task-daterange-overlay')) {
    const modalHTML = `
      <div id="project-task-daterange-overlay" class="hidden d-none pos-fixed ins-0 bg-rgba42_38_34_0_5 z-999 ai-center jc-center">
        <div class="bg-surface br-12px p-1_5rem maxw-500px w-90pct maxh-80vh ovy-auto sh-0-8px-16px-rgba42_38_34_0_1_0-20px-48-ee337">
          <div class="d-flex ai-center jc-space-between mb-1rem pb-0_75rem bdb-2px-solid-line">
            <h3 class="fz-1_25rem fwt-700 c-text m-0">시작일/종료일 설정</h3>
            <button class="bg-transparent bd-none cur-pointer p-0_25rem" id="project-task-daterange-close" title="닫기">
              <i class="w-24px h-24px c-muted" data-lucide="x"></i>
            </button>
          </div>
          
          <div class="mb-1rem">
            <label class="d-block fwt-600 c-text2 mb-0_5rem">시작일</label>
            <input class="w-100pct p-0_75rem bd-2px-solid-line2 br-8px fz-1rem cur-pointer" type="text" id="project-task-startdate-input" readonly placeholder="시작일 선택...">
          </div>
          
          <div class="mb-1rem">
            <label class="d-block fwt-600 c-text2 mb-0_5rem">종료일</label>
            <input class="w-100pct p-0_75rem bd-2px-solid-line2 br-8px fz-1rem cur-pointer" type="text" id="project-task-enddate-input" readonly placeholder="종료일 선택...">
          </div>
          
          <div class="d-flex gap-0_75rem mt-1_5rem">
            <button id="project-task-daterange-save" class="btn btn-primary fx-1 p-0_75rem br-8px fz-1rem fwt-600">저장</button>
            <button id="project-task-daterange-clear" class="btn btn-secondary fx-1 p-0_75rem br-8px fz-1rem fwt-600">날짜 지우기</button>
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
        toast('시작일을 선택해주세요.');
        return;
      }
      if (!selectedEndDate) {
        toast('종료일을 선택해주세요.');
        return;
      }
      if (selectedEndDate < selectedStartDate) {
        toast('종료일은 시작일보다 이후여야 합니다.');
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
    toast('시작일/종료일 설정 중 오류가 발생했습니다.');
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
    toast('할일 삭제 중 오류가 발생했습니다: ' + (error.message || '알 수 없는 오류'));
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
    toast('프로젝트 삭제 중 오류가 발생했습니다: ' + (error.message || '알 수 없는 오류'));
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
      toast('등록할 할일이 없습니다.');
      return;
    }

    // 등록할 날짜들을 모두 수집 (오늘 이후 날짜만)
    const datesToCheck = [];
    const taskDateMap = new Map(); // { date: [taskIds] }
    
    // 오늘 날짜 계산 (타임존 고려) - CDN Luxon 사용
    const timezone = profile.timezone || 'Asia/Seoul';
    const today = window.luxon.DateTime.now().setZone(timezone).toISODate(); // YYYY-MM-DD
    
    for (const task of tasks) {
      // start_date와 end_date가 있으면 그 범위의 모든 날짜 (오늘 이후만)
      if (task.start_date && task.end_date) {
        for (const date of iterateDates(task.start_date, task.end_date)) {
          // 오늘 이후 날짜만 등록 (오늘 포함)
          if (date >= today) {
            datesToCheck.push(date);
            if (!taskDateMap.has(date)) {
              taskDateMap.set(date, []);
            }
            taskDateMap.get(date).push(task.id);
          }
        }
      }
      // start_date만 있으면 그 날짜만 (오늘 이후만)
      else if (task.start_date) {
        if (task.start_date >= today) {
          datesToCheck.push(task.start_date);
          if (!taskDateMap.has(task.start_date)) {
            taskDateMap.set(task.start_date, []);
          }
          taskDateMap.get(task.start_date).push(task.id);
        }
      }
      // due_date가 있으면 그 날짜만 (하위 호환성, 오늘 이후만)
      else if (task.due_date) {
        if (task.due_date >= today) {
          datesToCheck.push(task.due_date);
          if (!taskDateMap.has(task.due_date)) {
            taskDateMap.set(task.due_date, []);
          }
          taskDateMap.get(task.due_date).push(task.id);
        }
      }
    }

    if (datesToCheck.length === 0) {
      toast('오늘 이후 등록할 할일이 없습니다.');
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

      toast(`${todosToInsert.length}개의 할일이 등록되었습니다.`);
    } else {
      toast('모든 할일이 이미 등록되어 있습니다.');
    }

    await loadProjects(profile);
  } catch (error) {
    console.error('Error registering project tasks:', error);
    toast('할일 등록 중 오류가 발생했습니다.');
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
      tabInProgress.style.background = 'var(--t-accent)';
      tabInProgress.style.borderColor = 'var(--t-accent)';
      tabInProgress.style.color = 'white';
    } else {
      tabInProgress.style.background = 'var(--t-bg2)';
      tabInProgress.style.borderColor = 'var(--t-line2)';
      tabInProgress.style.color = 'var(--t-muted)';
    }
  }
  
  if (tabCompleted) {
    if (activeProjectTab === 'completed') {
      tabCompleted.style.background = 'var(--t-success)';
      tabCompleted.style.borderColor = 'var(--t-success)';
      tabCompleted.style.color = 'white';
    } else {
      tabCompleted.style.background = 'var(--t-bg2)';
      tabCompleted.style.borderColor = 'var(--t-line2)';
      tabCompleted.style.color = 'var(--t-muted)';
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
    toast('프로젝트 다시 진행 중 오류가 발생했습니다.');
  }
}

