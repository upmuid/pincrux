/* contacts-store.js */
/* 담당자 스토리지 담당자 관련 저장 입력풋 */

(function (window) {
  const STORAGE_KEY = 'media_contacts_v1';

  // 시드 데이터 변경할 때마다 숫자 up (예: 1 -> 2 -> 3 ...)
  const SEED_VERSION_KEY = 'media_contacts_seed_version_v1';
  const SEED_VERSION = 1;

  function safeParse(json, fallback) {
    try {
      const v = JSON.parse(json);
      return Array.isArray(v) ? v : fallback;
    } catch {
      return fallback;
    }
  }

  function getAll() {
    const raw = localStorage.getItem(STORAGE_KEY);
    return safeParse(raw, []);
  }

  function setAll(list) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.isArray(list) ? list : []));
  }

  function uid() {
    return 'c_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
  }

  // 시드 데이터(사람 목록)
  function getSeedList() {
    return [
      // 여기서부터 인명 데이터
      {
        id: uid(),
        label: '정빈희 - bliss (운영)', // 셀렉트 박스에서 보여질 옵션 이름 / 실명 - 닉네임 (부서)
        name: '정빈희', // 계약서에서 보여질 이름 / 실명
        phone: '010-1234-5678', // 휴대폰 번호
        fax: '', // 팩스번호 없으면 공란
        email: 'bliss@pincrux.com' // 이메일 주소
      }, // 가장 밑에 리스트는 쉼표가 제거되어야함
      // 여기까지 복사 붙여넣기 사여서 사용
      {
        id: uid(),
        label: '고현복 - frank (운영)',
        name: '고현복',
        phone: '010-2814-1463',
        fax: '',
        email: 'frank@pincrux.com'
      },
      {
        id: uid(),
        label: '서정철 - law (경영지원)',
        name: '서정철',
        phone: '010-3824-6220',
        fax: '',
        email: 'law@pincrux.com'
      },
      {
        id: uid(),
        label: '채수범 - peter (운영)',
        name: '채수범',
        phone: '010-2168-1010',
        fax: '',
        email: 'peter@pincrux.com'
      }
    ];
  }

  /**
   * - localStorage가 비었으면 seed
   * - SEED_VERSION이 바뀌었으면 seed로 "덮어쓰기"
   */
  function seedIfEmptyOrVersionChanged() {
    const savedVer = Number(localStorage.getItem(SEED_VERSION_KEY) || 0);
    const cur = getAll();

    const needSeed = (cur.length === 0) || (savedVer !== SEED_VERSION);
    if (!needSeed) return;

    localStorage.setItem(SEED_VERSION_KEY, String(SEED_VERSION));
    setAll(getSeedList());
  }

  function add(contact) {
    const list = getAll();
    const newItem = {
      id: uid(),
      label: contact.label || `${contact.name || '이름없음'}`,
      name: contact.name || '',
      phone: contact.phone || '',
      fax: contact.fax || '',
      email: contact.email || ''
    };
    list.push(newItem);
    setAll(list);
    return newItem;
  }

  function update(id, patch) {
    const list = getAll();
    const idx = list.findIndex(x => x.id === id);
    if (idx === -1) return null;

    list[idx] = { ...list[idx], ...patch, label: patch.label ?? list[idx].label };
    setAll(list);
    return list[idx];
  }

  function remove(id) {
    setAll(getAll().filter(x => x.id !== id));
  }

  function clear() {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(SEED_VERSION_KEY);
  }

  window.MediaContactsStore = {
    STORAGE_KEY,
    SEED_VERSION,
    seedIfEmptyOrVersionChanged, // 버전 이걸 사용
    getAll,
    setAll,
    add,
    update,
    remove,
    clear
  };
})(window);