/*
 * 주간 업무 보고 렌더러
 * 각 주차 HTML 파일은 <script>const DATA = {...}; renderReport(DATA);</script> 형태로
 * 이 스크립트를 사용합니다. JSON(DATA)이 유일한 데이터 소스이며, 이 파일이 화면을 그립니다.
 * fetch를 쓰지 않으므로 file:// 프로토콜에서도 동일하게 동작합니다.
 */

const BADGE_CLASS = {
  '완료': 'badge-done',
  '이슈': 'badge-issue',
  '신규': 'badge-new',
  '일정변경': 'badge-change',
  '펜딩': 'badge-pending',
};

const STATUS_CLASS = {
  '할 일': 'st-todo',
  '기획': 'st-plan',
  '기획 완료': 'st-plan-done',
  '디자인': 'st-design',
  '디자인 완료': 'st-design-done',
  '개발': 'st-dev',
  '개발 완료': 'st-dev-done',
};

// reward_app 하위 키 -> 표시 라벨. 목록에 없는 새 키가 나오면 키 이름을 그대로 라벨로 사용.
const REWARD_APP_LABELS = {
  geomsa: '겸사겸사',
  samproCash: '삼프로캐시',
  lim_hanae: '임한애',
  parpuuri: '파뿌리',
};

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function renderItemList(container, items) {
  if (!items || items.length === 0) {
    container.appendChild(el('p', 'item', '특이사항 없음'));
    return;
  }
  items.forEach(text => container.appendChild(el('p', 'item', text)));
}

function renderHighlights(root, highlights) {
  if (!highlights || highlights.length === 0) {
    root.appendChild(el('div', 'hl-row', null)).appendChild(el('span', null, '특이사항 없음'));
    return;
  }
  highlights.forEach(h => {
    const row = el('div', 'hl-row');
    const badge = el('span', 'badge ' + (BADGE_CLASS[h.badge] || 'badge-pending'), h.badge);
    const content = el('span', null, h.content);
    row.appendChild(badge);
    row.appendChild(content);
    root.appendChild(row);
  });
}

function renderShoppingPlus(root, sp) {
  if (!sp) return;
  if (sp.advertisers && sp.advertisers.length > 0) {
    root.appendChild(el('div', 'sub-label', '쇼핑플러스 광고주'));
    const block = el('div', 'text-block');
    renderItemList(block, sp.advertisers);
    root.appendChild(block);
  }
  if (sp.media && sp.media.length > 0) {
    root.appendChild(el('div', 'sub-label', '매체'));
    const block = el('div', 'text-block');
    renderItemList(block, sp.media);
    root.appendChild(block);
  }
  if (sp.pipeline) {
    const tag = el('div', 'tag-line');
    const parts = [];
    if (sp.pipeline.waiting) parts.push(`<strong>연동 대기:</strong> ${sp.pipeline.waiting}`);
    if (sp.pipeline.discussing) parts.push(`<strong>협의 중:</strong> ${sp.pipeline.discussing}`);
    if (sp.pipeline.pending_reply) parts.push(`<strong>회신 대기:</strong> ${sp.pipeline.pending_reply}`);
    tag.innerHTML = parts.join(' &nbsp;|&nbsp; ');
    root.appendChild(tag);
  }
}

function renderRewardApp(root, rewardApp) {
  if (!rewardApp) return;
  Object.keys(rewardApp).forEach(key => {
    const items = rewardApp[key];
    if (!items || items.length === 0) return;
    root.appendChild(el('div', 'sub-label', REWARD_APP_LABELS[key] || key));
    const block = el('div', 'text-block');
    renderItemList(block, items);
    root.appendChild(block);
  });
}

function renderNextWeekTable(tbody, rows) {
  (rows || []).forEach(r => {
    const tr = document.createElement('tr');
    [r.item, r.date, r.owner].forEach(v => {
      const td = document.createElement('td');
      td.textContent = v;
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
}

function renderJiraTable(tbody, items) {
  (items || []).forEach(it => {
    const tr = document.createElement('tr');

    const catTd = el('td', 'jira-cat', it.category);
    const nameTd = el('td', 'jira-name', it.name);
    const statusTd = document.createElement('td');
    statusTd.appendChild(el('span', 'st ' + (STATUS_CLASS[it.status] || 'st-todo'), it.status));
    const ownerTd = el('td', 'jira-owner', it.owner);
    const noteTd = el('td', null, it.note || '');

    tr.appendChild(catTd);
    tr.appendChild(nameTd);
    tr.appendChild(statusTd);
    tr.appendChild(ownerTd);
    tr.appendChild(noteTd);
    tbody.appendChild(tr);
  });
}

function renderReport(data) {
  document.title = data.subject;
  document.querySelector('.report-title').textContent = data.subject;
  document.querySelector('.report-meta').textContent =
    `${data.period}  ·  To: ${data.to}  ·  CC: ${data.cc}`;

  renderHighlights(document.getElementById('section-highlights'), data.highlights);

  renderShoppingPlus(document.getElementById('section-shopping-plus'), data.sections.shopping_plus);

  renderRewardApp(document.getElementById('section-reward-app'), data.sections.reward_app);

  renderItemList(document.getElementById('section-shopping-live-cps'), data.sections.shopping_live_cps);

  renderItemList(document.getElementById('section-ad-platform'), data.sections.ad_platform);

  renderNextWeekTable(document.getElementById('section-next-week-body'), data.sections.next_week);

  document.getElementById('jira-summary').textContent = data.jira_pipeline.summary;
  renderJiraTable(document.getElementById('jira-table-body'), data.jira_pipeline.items);
}
