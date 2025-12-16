import { supabase } from '../config/supabase.js';
import { getCurrentProfile } from '../utils/auth.js';
import { getToday } from '../utils/date.js';

// 동기화 플래그 (무한 루프 방지)
let syncingTodo = false;
let syncingProjectTask = false;

// 이벤트 리스너 중복 등록 방지 플래그
let projectEventsBound = false;

// 수정 모드 관리
let editingProjectTaskId = null;

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
            <div style="display: flex; align-items: center; gap: 0.75rem;">
              <div class="card-title" style="color: #1e40af; font-size: 1.5rem; margin: 0;">프로젝트</div>
              <button id="toggle-projects" class="btn-icon" style="background: transparent; border: none; padding: 0.25rem; cursor: pointer;">
                <i data-lucide="chevron-down" style="width: 20px; height: 20px; color: #1e40af;"></i>
              </button>
            </div>
            <p style="color: #6b7280; font-size: 1rem; margin: 0.25rem 0 0 0;">프로젝트를 관리하고 할일을 등록하세요</p>
          </div>
        </div>
      </div>

      <div id="projects-content" style="display: block;">
        <div id="projects-list" style="display: flex; flex-direction: column; gap: 1.5rem;"></div>
        <div id="projects-empty" style="text-align: center; padding: 3rem 1rem; color: #9ca3af; display: none;">
          <i data-lucide="folder-x" style="width: 48px; height: 48px; margin: 0 auto 1rem; opacity: 0.5;"></i>
          <p style="font-size: 1.1rem; margin-bottom: 0.5rem;">등록된 프로젝트가 없습니다</p>
          <p style="font-size: 0.9rem;">새 프로젝트를 추가하여 시작하세요</p>
        </div>
        <button id="add-project-btn" class="btn btn-primary" style="margin-top: 1.5rem; width: 100%;">
          <i data-lucide="plus" style="width: 18px; height: 18px;"></i>
          프로젝트 추가
        </button>
      </div>
    </div>

    <!-- 프로젝트 추가/수정 모달 -->
    <div id="project-modal" class="modal-overlay" style="display: none;">
      <div class="modal-content" style="max-width: 500px;">
        <div class="modal-header">
          <h3 id="project-modal-title">프로젝트 추가</h3>
          <button id="project-modal-close" class="btn-icon" style="background: transparent; border: none; padding: 0.25rem; cursor: pointer;">
            <i data-lucide="x" style="width: 20px; height: 20px;"></i>
          </button>
        </div>
        <div class="modal-body">
          <div style="margin-bottom: 1rem;">
            <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: #374151;">프로젝트 이름</label>
            <input type="text" id="project-name-input" placeholder="프로젝트 이름을 입력하세요" style="width: 100%; padding: 0.75rem; border: 2px solid #d1d5db; border-radius: 8px; font-size: 1rem;">
          </div>
          <div style="margin-bottom: 1rem;">
            <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: #374151;">프로젝트 종류</label>
            <select id="project-category-input" style="width: 100%; padding: 0.75rem; border: 2px solid #d1d5db; border-radius: 8px; font-size: 1rem;">
              <option value="self_dev">자기계발</option>
              <option value="relationship">가족/관계</option>
              <option value="work_finance">업무/재정</option>
            </select>
          </div>
        </div>
        <div class="modal-footer">
          <button id="project-modal-cancel" class="btn btn-secondary">취소</button>
          <button id="project-modal-save" class="btn btn-primary">저장</button>
        </div>
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
      await loadProjects(profile);
      setupEventHandlers(profile);
    }
  };
}

async function loadProjects(profile) {
  try {
    const { data: projects, error } = await supabase
      .from('projects')
      .select('*')
      .eq('user_id', profile.id)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const projectsList = document.getElementById('projects-list');
    const projectsEmpty = document.getElementById('projects-empty');

    if (!projects || projects.length === 0) {
      if (projectsList) projectsList.style.display = 'none';
      if (projectsEmpty) projectsEmpty.style.display = 'block';
      if (window.lucide?.createIcons) window.lucide.createIcons();
      return;
    }

    if (projectsList) projectsList.style.display = 'flex';
    if (projectsEmpty) projectsEmpty.style.display = 'none';

    const projectsHtml = await Promise.all(
      projects.map(project => renderProjectCard(project, profile))
    );
    
    if (projectsList) {
      projectsList.innerHTML = projectsHtml.join('');
    }

    if (window.lucide?.createIcons) window.lucide.createIcons();

    // 수정 모드 입력 필드에 Enter/Escape 키 이벤트 바인딩
    document.querySelectorAll('.project-task-edit-input').forEach(input => {
      // 기존 이벤트 리스너 제거 (중복 방지)
      const newInput = input.cloneNode(true);
      input.parentNode.replaceChild(newInput, input);
      
      // 새 이벤트 리스너 등록
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
      
      // 포커스 및 선택
      setTimeout(() => {
        newInput.focus();
        newInput.select();
      }, 10);
    });

    // 할일 추가 입력 필드에 Enter 키 이벤트 바인딩
    document.querySelectorAll('[id^="project-task-input-"]').forEach(input => {
      const newInput = input.cloneNode(true);
      input.parentNode.replaceChild(newInput, input);
      
      newInput.addEventListener('keypress', async (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          e.stopPropagation();
          const projectId = newInput.id.replace('project-task-input-', '');
          if (newInput.value.trim()) {
            await addProjectTask(projectId, newInput.value.trim(), profile);
            // addProjectTask 내부에서 입력 필드 초기화 및 포커스 처리
          }
        }
      });
    });
  } catch (error) {
    console.error('Error loading projects:', error);
    alert('프로젝트를 불러오는 중 오류가 발생했습니다.');
  }
}

async function renderProjectCard(project, profile) {
  try {
    const { data: tasks, error } = await supabase
      .from('project_tasks')
      .select('*')
      .eq('project_id', project.id)
      .is('deleted_at', null)
      .order('is_done', { ascending: true })
      .order('display_order', { ascending: true, nullsFirst: false })
      .order('due_date', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error loading project tasks:', error);
      return '';
    }

    const categoryLabels = {
      self_dev: '자기계발',
      relationship: '가족/관계',
      work_finance: '업무/재정'
    };

    const categoryColors = {
      self_dev: { bg: '#f4e9ff', border: '#d8c7ff', gradient: 'linear-gradient(135deg, #a78bfa 0%, #8b5cf6 100%)' },
      relationship: { bg: '#ffe9f0', border: '#f8c7d6', gradient: 'linear-gradient(135deg, #f472b6 0%, #ec4899 100%)' },
      work_finance: { bg: '#fff7e6', border: '#f5d38f', gradient: 'linear-gradient(135deg, #fb923c 0%, #f59e0b 100%)' }
    };

    const colors = categoryColors[project.category] || categoryColors.self_dev;
    const tasksList = tasks || [];
    const completedCount = tasksList.filter(t => t.is_done).length;
    const totalCount = tasksList.length;
    const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

    return `
      <div class="project-card" data-project-id="${project.id}" style="background: ${colors.bg}; border: 2px solid ${colors.border}; border-radius: 12px; padding: 1.5rem; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);">
        <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 1rem;">
          <div style="flex: 1;">
            <h3 style="color: #1f2937; font-size: 1.25rem; font-weight: 700; margin: 0 0 0.5rem 0;">${project.name}</h3>
            <span style="display: inline-block; padding: 0.25rem 0.75rem; background: ${colors.gradient}; color: white; border-radius: 999px; font-size: 0.875rem; font-weight: 600;">${categoryLabels[project.category]}</span>
          </div>
          <div style="display: flex; gap: 0.5rem;">
            <button class="edit-project-btn" data-project-id="${project.id}" style="background: transparent; border: none; color: #6b7280; cursor: pointer; padding: 0.25rem;">
              <i data-lucide="pencil" style="width: 18px; height: 18px;"></i>
            </button>
            <button class="delete-project-btn" data-project-id="${project.id}" style="background: transparent; border: none; color: #ef4444; cursor: pointer; padding: 0.25rem;">
              <i data-lucide="trash-2" style="width: 18px; height: 18px;"></i>
            </button>
          </div>
        </div>

        <div style="margin-bottom: 1rem;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
            <span style="font-size: 0.875rem; color: #6b7280;">진행률</span>
            <span style="font-size: 0.875rem; font-weight: 600; color: #1f2937;">${completedCount} / ${totalCount} (${progress}%)</span>
          </div>
          <div style="width: 100%; height: 8px; background: #e5e7eb; border-radius: 999px; overflow: hidden;">
            <div style="width: ${progress}%; height: 100%; background: ${colors.gradient}; transition: width 0.3s;"></div>
          </div>
        </div>

        <div id="project-tasks-${project.id}" style="margin-bottom: 1rem;">
          ${tasksList.map(task => renderProjectTask(task, project.category)).join('')}
          <div id="project-tasks-empty-${project.id}" style="text-align: center; padding: 1rem; color: #9ca3af; font-size: 0.9rem; display: ${tasksList.length === 0 ? 'block' : 'none'};">
            등록된 할일이 없습니다
          </div>
        </div>

        <div style="display: flex; gap: 0.5rem; margin-bottom: 1rem;">
          <input type="text" id="project-task-input-${project.id}" placeholder="할일을 입력하세요..." style="flex: 1; padding: 0.625rem; border: 2px solid ${colors.border}; border-radius: 8px; font-size: 0.95rem;">
          <button class="add-project-task-btn" data-project-id="${project.id}" style="padding: 0.625rem 1rem; background: ${colors.gradient}; color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer;">
            <i data-lucide="plus" style="width: 16px; height: 16px;"></i>
          </button>
        </div>

        <button class="register-todos-btn" data-project-id="${project.id}" style="width: 100%; padding: 0.75rem; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; box-shadow: 0 2px 8px rgba(99, 102, 241, 0.3);">
          <i data-lucide="calendar-check" style="width: 18px; height: 18px; margin-right: 0.5rem;"></i>
          오늘 할일 등록하기
        </button>
      </div>
    `;
  } catch (error) {
    console.error('Error rendering project card:', error);
    return '';
  }
}

function renderProjectTask(task, projectCategory) {
  const isEditing = editingProjectTaskId === task.id;
  
  return `
    <div class="project-task-item" data-task-id="${task.id}" style="background: white; border-radius: 8px; padding: 0.75rem; margin-bottom: 0.5rem; display: flex; align-items: center; gap: 0.75rem; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
      <input type="checkbox" ${task.is_done ? 'checked' : ''} class="project-task-checkbox" data-task-id="${task.id}" style="width: 20px; height: 20px; cursor: pointer;" ${isEditing ? 'disabled' : ''}>
      ${isEditing ? `
        <input type="text" class="project-task-edit-input" value="${task.title.replace(/"/g, '&quot;')}" style="flex: 1; padding: 0.5rem; border: 2px solid #6366f1; border-radius: 4px; font-size: 1rem;">
      ` : `
        <span class="project-task-title" data-task-id="${task.id}" style="flex: 1; ${task.is_done ? 'text-decoration: line-through; color: #9ca3af;' : 'color: #1f2937; cursor: pointer;'}">${task.title}</span>
      `}
      ${task.due_date ? `<span style="font-size: 0.75rem; color: #6b7280;">📅 ${task.due_date}</span>` : ''}
      ${!isEditing ? `
        <button class="project-task-date-btn" data-task-id="${task.id}" style="background: transparent; border: none; color: #6366f1; cursor: pointer; padding: 0.25rem;" title="마감날짜 설정">
          <i data-lucide="calendar" style="width: 18px; height: 18px;"></i>
        </button>
        <button class="project-task-edit-btn" data-task-id="${task.id}" style="background: transparent; border: none; color: #10b981; cursor: pointer; padding: 0.25rem;" title="수정">
          <i data-lucide="pencil" style="width: 16px; height: 16px;"></i>
        </button>
      ` : `
        <button class="project-task-save-btn" data-task-id="${task.id}" style="background: transparent; border: none; color: #10b981; cursor: pointer; padding: 0.25rem;">
          <i data-lucide="check" style="width: 18px; height: 18px;"></i>
        </button>
        <button class="project-task-cancel-btn" data-task-id="${task.id}" style="background: transparent; border: none; color: #ef4444; cursor: pointer; padding: 0.25rem;">
          <i data-lucide="x" style="width: 18px; height: 18px;"></i>
        </button>
      `}
      <button class="project-task-delete-btn" data-task-id="${task.id}" style="background: transparent; border: none; color: #ef4444; cursor: pointer; padding: 0.25rem;" title="삭제" ${isEditing ? 'disabled' : ''}>
        <i data-lucide="trash-2" style="width: 16px; height: 16px;"></i>
      </button>
    </div>
  `;
}

function setupEventHandlers(profile) {
  // 토글 버튼
  const toggleBtn = document.getElementById('toggle-projects');
  if (toggleBtn) {
    const newToggleBtn = toggleBtn.cloneNode(true);
    toggleBtn.parentNode.replaceChild(newToggleBtn, toggleBtn);
    newToggleBtn.addEventListener('click', () => {
      const content = document.getElementById('projects-content');
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

  // 프로젝트 추가 버튼
  const addProjectBtn = document.getElementById('add-project-btn');
  if (addProjectBtn) {
    const newAddBtn = addProjectBtn.cloneNode(true);
    addProjectBtn.parentNode.replaceChild(newAddBtn, addProjectBtn);
    newAddBtn.addEventListener('click', () => openProjectModal(null, profile));
  }

  // 이벤트 위임: 프로젝트 카드 내부 버튼들 (한 번만 등록)
  if (projectEventsBound) return;
  projectEventsBound = true;

  document.addEventListener('click', async (e) => {
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

    // 프로젝트 할일 날짜 버튼
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
  });

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

  if (saveBtn) {
    saveBtn.onclick = async () => {
      if (!nameInput || !nameInput.value.trim()) {
        alert('프로젝트 이름을 입력해주세요.');
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

    // 동기화: 연결된 todos도 업데이트
    if (!syncingTodo) {
      syncingTodo = true;
      try {
        const { error: todoError } = await supabase
          .from('todos')
          .update({
            is_done: isDone,
            done_at: isDone ? new Date().toISOString() : null
          })
          .eq('project_task_id', taskId);

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

async function deleteProjectTask(taskId, profile) {
  try {
    // 연결된 todos의 project_task_id를 NULL로 설정 (동기화 해제)
    await supabase
      .from('todos')
      .update({ project_task_id: null })
      .eq('project_task_id', taskId);

    // 프로젝트 할일 soft delete
    const { error } = await supabase
      .from('project_tasks')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', taskId);

    if (error) throw error;
    await loadProjects(profile);
  } catch (error) {
    console.error('Error deleting project task:', error);
    alert('할일 삭제 중 오류가 발생했습니다.');
  }
}

async function deleteProject(projectId, profile) {
  try {
    // 연결된 todos의 project_task_id를 NULL로 설정
    const { data: tasks } = await supabase
      .from('project_tasks')
      .select('id')
      .eq('project_id', projectId)
      .is('deleted_at', null);

    if (tasks && tasks.length > 0) {
      const taskIds = tasks.map(t => t.id);
      await supabase
        .from('todos')
        .update({ project_task_id: null })
        .in('project_task_id', taskIds);
    }

    // 프로젝트 soft delete (CASCADE로 project_tasks도 함께 처리됨)
    const { error } = await supabase
      .from('projects')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', projectId);

    if (error) throw error;

    await loadProjects(profile);
  } catch (error) {
    console.error('Error deleting project:', error);
    alert('프로젝트 삭제 중 오류가 발생했습니다.');
  }
}

async function registerProjectTasksToTodos(projectId, profile) {
  try {
    const today = getToday(profile.timezone || 'Asia/Seoul');

    // 프로젝트 정보 조회
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();

    if (projectError) throw projectError;

    // 프로젝트 할일 조회 (미완료 + due_date가 설정된 것만, NULL은 제외)
    const { data: tasks, error: tasksError } = await supabase
      .from('project_tasks')
      .select('*')
      .eq('project_id', projectId)
      .eq('is_done', false)
      .is('deleted_at', null)
      .not('due_date', 'is', null);

    if (tasksError) throw tasksError;

    if (!tasks || tasks.length === 0) {
      alert('등록할 할일이 없습니다. 마감날짜를 설정한 미완료 할일만 등록됩니다.');
      return;
    }

    // 카테고리 매핑
    const categoryMap = {
      self_dev: 'self_dev',
      relationship: 'personal',
      work_finance: 'work'
    };
    const todoCategory = categoryMap[project.category] || 'work';

    // todos에 등록 (이미 등록된 것은 제외)
    const todosToInsert = [];
    for (const task of tasks) {
      // 이미 등록된 할일인지 확인
      const targetDate = task.due_date || today;
      const { data: existingTodo } = await supabase
        .from('todos')
        .select('id')
        .eq('project_task_id', task.id)
        .eq('date', targetDate)
        .is('deleted_at', null)
        .maybeSingle();

      if (!existingTodo) {
        todosToInsert.push({
          user_id: profile.id,
          date: targetDate,
          category: todoCategory,
          title: task.title,
          project_task_id: task.id,
          is_done: false
        });
      }
    }

    if (todosToInsert.length === 0) {
      alert('이미 등록된 할일만 있습니다.');
      return;
    }

    const { error: insertError } = await supabase
      .from('todos')
      .insert(todosToInsert);

    if (insertError) throw insertError;

    alert(`${todosToInsert.length}개의 할일이 오늘 할일로 등록되었습니다.`);
    await loadProjects(profile);
  } catch (error) {
    console.error('Error registering project tasks:', error);
    alert('할일 등록 중 오류가 발생했습니다.');
  }
}

