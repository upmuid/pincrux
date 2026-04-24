/* contacts-select.js */
/* 셀스토어에서 인명데이터 끌고 오기 */

(function (window) {
  function $(id) {
    return document.getElementById(id);
  }

  function setVal(el, value) {
    if (!el) return;
    el.value = value ?? '';
    // 혹시 다른 동기화 로직이 input 이벤트를 듣고 있으면 같이 발화
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }

  function buildOptions(selectEl, contacts) {
    selectEl.innerHTML = '';

    // 기본 옵션
    const opt0 = document.createElement('option');
    opt0.value = '';
    opt0.textContent = '담당자를 선택하세요';
    selectEl.appendChild(opt0);

    contacts.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.id;
      opt.textContent = c.label || c.name || '(이름없음)';
      selectEl.appendChild(opt);
    });
  }

  function applyContactToInputs(contact) {
    setVal($('mediaContactName'), contact?.name);
    setVal($('mediaContactPhone'), contact?.phone);
    setVal($('mediaContactFax'), contact?.fax);
    setVal($('mediaContactEmail'), contact?.email);
  }

  function initMediaContactsSelect() {
    const store = window.MediaContactsStore;
    if (!store) {
      console.error('MediaContactsStore가 없습니다. contacts.store.js를 먼저 로드하세요.');
      return;
    }

    store.seedIfEmptyOrVersionChanged();

    const selectEl = $('mediaContactSelect');
    if (!selectEl) return;

    const contacts = store.getAll();
    buildOptions(selectEl, contacts);

    // 마지막 선택 기억(원하면 제거 가능)
    const LAST_KEY = 'media_contacts_last_selected_v1';
    const last = localStorage.getItem(LAST_KEY);
    if (last && contacts.some(c => c.id === last)) {
      selectEl.value = last;
      applyContactToInputs(contacts.find(c => c.id === last));
    }

    selectEl.addEventListener('change', () => {
      const id = selectEl.value;
      localStorage.setItem(LAST_KEY, id);

      const picked = contacts.find(c => c.id === id);
      applyContactToInputs(picked || null);
    });
  }

  // DOM 로드 후 실행
  document.addEventListener('DOMContentLoaded', initMediaContactsSelect);
})(window);