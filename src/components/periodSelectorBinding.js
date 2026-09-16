// 기간 선택기(주·월·연) 공용 이벤트 연결
// 2026-09-17 WeekSelector·MonthSelector·YearSelector에 한 벌씩 있던 연결 코드를 합쳤다.
// 날짜 계산(이전·다음·현재 값)은 각 선택기가 하고, 여기서는 버튼·모달·옵션 클릭만 잇는다.

/**
 * 버튼을 복제해 바꿔 끼운 뒤 클릭 핸들러를 단다 — 다시 그릴 때 리스너가 중복되지 않게
 */
function rebind(el, handler) {
  if (!el) return null;
  const fresh = el.cloneNode(true);
  el.parentNode.replaceChild(fresh, el);
  fresh.addEventListener('click', handler);
  return fresh;
}

/**
 * @param {object} opts
 * @param {string} opts.prefix - 요소 id 접두사 ('week' | 'month' | 'year')
 * @param {string} opts.optionClass - 모달 안 옵션 버튼 클래스 ('week-option-btn' 등)
 * @param {(btn: HTMLElement) => any} opts.readOption - 옵션 버튼에서 값을 읽는다. 거짓 값이면 무시
 * @param {*} opts.prev - 이전 버튼 값
 * @param {*} opts.next - 다음 버튼 값
 * @param {*} opts.current - 이번 주/달/올해 버튼 값
 * @param {Function} opts.onChange - 값 변경 콜백
 */
export function bindPeriodSelector({ prefix, optionClass, readOption, prev, next, current, onChange }) {
  const byId = (suffix) => document.getElementById(`${prefix}-${suffix}`);
  const emit = (value) => { if (onChange) onChange(value); };

  rebind(byId('prev-btn'), () => emit(prev));
  rebind(byId('next-btn'), () => emit(next));
  rebind(byId('current-btn'), () => emit(current));

  const selectorBtn = byId('selector-btn');
  const overlay = byId('selector-overlay');
  const modal = byId('selector-modal');
  const closeBtn = byId('selector-close');

  if (selectorBtn && overlay) {
    const setOpen = (open) => {
      overlay.classList.toggle('hidden', !open);
      overlay.style.display = open ? 'flex' : 'none';
      // 화살표는 선택 버튼 안에 있어 rebind 때 복제된다. 미리 잡아 두면 화면에서 빠진 옛 요소를 돌리게 된다(옛 코드가 그래서 한 번도 안 돌았다) — 매번 찾는다
      const chevron = byId('selector-chevron');
      if (chevron) chevron.style.transform = open ? 'rotate(180deg)' : 'rotate(0deg)';
    };
    // 모달은 기본적으로 닫힌 상태
    setOpen(false);

    rebind(selectorBtn, (e) => { e.stopPropagation(); setOpen(true); });
    rebind(closeBtn, (e) => { e.stopPropagation(); setOpen(false); });

    // 오버레이 바깥 클릭으로 닫기 (오버레이는 복제하지 않는다 — 안의 옵션이 함께 바뀌므로)
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) setOpen(false);
    });
    if (modal) modal.addEventListener('click', (e) => e.stopPropagation());

    // 옵션 버튼 (이벤트 위임)
    const options = byId('selector-options');
    if (options) {
      options.addEventListener('click', (e) => {
        const btn = e.target.closest(`.${optionClass}`);
        if (!btn) return;
        e.stopPropagation();
        const value = readOption(btn);
        if (value && onChange) {
          setOpen(false);
          onChange(value);
        }
      });
    }
  }

  // Lucide 아이콘 렌더링
  if (window.lucide) {
    setTimeout(() => window.lucide.createIcons(), 100);
  }
}
