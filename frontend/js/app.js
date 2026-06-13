const STORAGE_KEY = 'inspection_dashboard_state';

const ROLE_MAP = {
  supervisor: { userId: 'u1', name: '张督导', role: 'supervisor', roleName: '督导' },
  store1: { userId: 'u2', name: '王店长', role: 'store', roleName: '朝阳路店店长', storeId: 's1' },
  store2: { userId: 'u3', name: '李店长', role: 'store', roleName: '海淀店店长', storeId: 's2' },
  store3: { userId: 'u4', name: '赵店长', role: 'store', roleName: '西城店店长', storeId: 's3' }
};

let appState = {
  currentRoleKey: 'supervisor',
  currentPage: 'dashboard',
  filters: {
    storeId: 'all',
    status: 'all',
    overdue: 'all',
    keyword: ''
  },
  issuesPage: 1,
  issuesPageSize: 10
};

let stores = [];

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
}

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      appState = { ...appState, ...JSON.parse(saved) };
    } catch (e) {
      console.error('加载状态失败:', e);
    }
  }
}

function getCurrentUser() {
  return ROLE_MAP[appState.currentRoleKey];
}

function showToast(message, type = 'info') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = `toast ${type}`;
  toast.style.display = 'block';
  setTimeout(() => {
    toast.style.display = 'none';
  }, 3000);
}

function formatDate(timestamp) {
  if (!timestamp) return '-';
  const d = new Date(timestamp);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

function formatDateShort(timestamp) {
  if (!timestamp) return '-';
  const d = new Date(timestamp);
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${month}-${day} ${hours}:${minutes}`;
}

function getDaysLeft(deadline) {
  const now = Date.now();
  const diff = deadline - now;
  return Math.ceil(diff / (24 * 60 * 60 * 1000));
}

function initNavigation() {
  const navBtns = document.querySelectorAll('.nav-btn');
  navBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const page = btn.dataset.page;
      switchPage(page);
    });
  });

  document.querySelectorAll('[data-page]').forEach(el => {
    if (!el.classList.contains('nav-btn') && !el.classList.contains('btn-link')) {
      el.addEventListener('click', () => {
        const page = el.dataset.page;
        if (page) switchPage(page);
      });
    }
  });

  document.querySelectorAll('.btn-link[data-page]').forEach(el => {
    el.addEventListener('click', () => {
      const page = el.dataset.page;
      if (page) switchPage(page);
    });
  });
}

function switchPage(page) {
  appState.currentPage = page;
  saveState();

  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.page === page);
  });

  document.querySelectorAll('.page').forEach(p => {
    p.classList.remove('active');
  });
  document.getElementById(`page-${page}`).classList.add('active');

  if (page === 'dashboard') {
    loadDashboard();
  } else if (page === 'issues') {
    loadIssues();
  } else if (page === 'config') {
    loadConfig();
  }
}

function initRoleSwitcher() {
  const roleSelect = document.getElementById('roleSelect');
  roleSelect.value = appState.currentRoleKey;
  
  roleSelect.addEventListener('change', () => {
    appState.currentRoleKey = roleSelect.value;
    appState.issuesPage = 1;
    saveState();
    updateUserDisplay();
    refreshCurrentPage();
    showToast(`已切换为${getCurrentUser().roleName}角色`, 'success');
  });
}

function updateUserDisplay() {
  const user = getCurrentUser();
  document.getElementById('userAvatar').textContent = user.name.charAt(0);
  document.getElementById('userName').textContent = user.name;
  document.getElementById('userRole').textContent = user.roleName;
  
  const createBtns = document.querySelectorAll('.btn-create');
  const isSupervisor = user.role === 'supervisor';
  createBtns.forEach(btn => {
    btn.style.display = isSupervisor ? 'inline-flex' : 'none';
  });

  const importBtns = document.querySelectorAll('.btn-import');
  importBtns.forEach(btn => {
    btn.style.display = isSupervisor ? 'inline-flex' : 'none';
  });
}

function refreshCurrentPage() {
  if (appState.currentPage === 'dashboard') {
    loadDashboard();
  } else if (appState.currentPage === 'issues') {
    loadIssues();
  }
}

async function loadStores() {
  const res = await api.getStores();
  if (res.code === 0) {
    stores = res.data;
    populateStoreFilters();
  }
}

function populateStoreFilters() {
  const filterStore = document.getElementById('filterStore');
  if (filterStore) {
    const currentValue = appState.filters.storeId;
    filterStore.innerHTML = '<option value="all">全部门店</option>';
    stores.forEach(store => {
      const option = document.createElement('option');
      option.value = store.id;
      option.textContent = store.name;
      filterStore.appendChild(option);
    });
    filterStore.value = currentValue;
  }
}

function getStoreName(storeId) {
  const store = stores.find(s => s.id === storeId);
  return store ? store.name : storeId;
}

async function loadDashboard() {
  const user = getCurrentUser();
  const res = await api.getDashboardStats(user.userId, user.role);
  
  if (res.code !== 0) {
    showToast(res.message || '加载数据失败', 'error');
    return;
  }

  const { summary, byStore, byCategory } = res.data;

  document.getElementById('statTotal').textContent = summary.total;
  document.getElementById('statPending').textContent = summary.pending;
  document.getElementById('statRectifying').textContent = summary.rectifying;
  document.getElementById('statRechecking').textContent = summary.rechecking;
  document.getElementById('statClosed').textContent = summary.closed;
  document.getElementById('statOverdue').textContent = summary.overdue;
  document.getElementById('statOverdueRatio').textContent = `${summary.overdueRatio}%`;

  const storeStatsEl = document.getElementById('storeStats');
  storeStatsEl.innerHTML = byStore.map(store => `
    <div class="store-stat-item">
      <div class="store-stat-name">${store.storeName} (${store.total})</div>
      <div class="store-stat-bar">
        <div class="store-stat-segment" style="background:#f59e0b;flex:${store.pending};"></div>
        <div class="store-stat-segment" style="background:#3b82f6;flex:${store.rectifying};"></div>
        <div class="store-stat-segment" style="background:#10b981;flex:${store.closed};"></div>
      </div>
      <div class="store-stat-legend">
        <span class="store-stat-legend-item">
          <span class="store-stat-legend-dot" style="background:#f59e0b;"></span>
          待处理 ${store.pending}
        </span>
        <span class="store-stat-legend-item">
          <span class="store-stat-legend-dot" style="background:#3b82f6;"></span>
          整改中 ${store.rectifying}
        </span>
        <span class="store-stat-legend-item">
          <span class="store-stat-legend-dot" style="background:#10b981;"></span>
          已关闭 ${store.closed}
        </span>
        ${store.overdue > 0 ? `<span class="store-stat-legend-item">
          <span class="store-stat-legend-dot" style="background:#ef4444;"></span>
          逾期 ${store.overdue}
        </span>` : ''}
      </div>
    </div>
  `).join('');

  const maxCount = Math.max(...byCategory.map(c => c.count), 1);
  const categoryStatsEl = document.getElementById('categoryStats');
  categoryStatsEl.innerHTML = byCategory.map(cat => `
    <div class="category-stat-item">
      <span class="category-name">${cat.category}</span>
      <div class="category-bar">
        <div class="category-bar-fill" style="width:${(cat.count / maxCount * 100).toFixed(1)}%"></div>
      </div>
      <span class="category-count">${cat.count}</span>
    </div>
  `).join('');

  loadRecentIssues();
}

async function loadRecentIssues() {
  const user = getCurrentUser();
  const res = await api.getIssues({
    currentUserId: user.userId,
    currentUserRole: user.role,
    page: 1,
    pageSize: 5,
    sortField: 'createdAt',
    sortOrder: 'desc'
  });

  const recentIssuesEl = document.getElementById('recentIssues');
  
  if (res.code !== 0 || !res.data.list.length) {
    recentIssuesEl.innerHTML = '<p style="color:#9ca3af;text-align:center;padding:20px;">暂无问题</p>';
    return;
  }

  recentIssuesEl.innerHTML = res.data.list.map(issue => `
    <div class="issue-item-mini" onclick="openIssueDetail('${issue.id}')">
      <div class="issue-mini-title">${issue.title}</div>
      <div class="issue-mini-meta">
        <span>${getStoreName(issue.storeId)}</span>
        <span>责任人: ${issue.responsibleName}</span>
        <span>${formatDateShort(issue.createdAt)}</span>
        <span class="status-badge status-${issue.status}">${issue.statusText}</span>
      </div>
    </div>
  `).join('');
}

async function loadIssues() {
  const user = getCurrentUser();
  const res = await api.getIssues({
    storeId: appState.filters.storeId === 'all' ? '' : appState.filters.storeId,
    status: appState.filters.status === 'all' ? '' : appState.filters.status,
    overdue: appState.filters.overdue === 'all' ? '' : appState.filters.overdue,
    keyword: appState.filters.keyword,
    currentUserId: user.userId,
    currentUserRole: user.role,
    page: appState.issuesPage,
    pageSize: appState.issuesPageSize,
    sortField: 'createdAt',
    sortOrder: 'desc'
  });

  if (res.code !== 0) {
    showToast(res.message || '加载数据失败', 'error');
    return;
  }

  const { list, total, page, pageSize } = res.data;
  const tbody = document.getElementById('issuesTableBody');
  const emptyState = document.getElementById('emptyState');

  if (!list.length) {
    tbody.innerHTML = '';
    emptyState.style.display = 'block';
  } else {
    emptyState.style.display = 'none';
    tbody.innerHTML = list.map(issue => renderIssueRow(issue)).join('');
  }

  renderPagination(total, page, pageSize);
}

function renderIssueRow(issue) {
  const user = getCurrentUser();
  const actionBtns = getIssueActions(issue, user);
  
  return `
    <tr>
      <td>
        <div class="issue-title-cell" onclick="openIssueDetail('${issue.id}')">
          ${issue.title}
        </div>
        ${issue.isOverdue ? '<span class="overdue-badge">已逾期</span>' : ''}
      </td>
      <td class="hide-mobile">${issue.category || '-'}</td>
      <td class="hide-mobile">${getStoreName(issue.storeId)}</td>
      <td>${issue.responsibleName}</td>
      <td><span class="status-badge status-${issue.status}">${issue.statusText}</span></td>
      <td class="hide-mobile">${formatDate(issue.deadline)}</td>
      <td class="hide-mobile">${formatDate(issue.createdAt)}</td>
      <td>
        <div class="action-btns">
          <button class="btn btn-sm btn-secondary" onclick="openIssueDetail('${issue.id}')">查看</button>
          ${actionBtns}
        </div>
      </td>
    </tr>
  `;
}

function getIssueActions(issue, user) {
  let btns = '';
  
  if (user.role === 'store' && user.storeId === issue.storeId) {
    if (issue.status === 'pending' || issue.status === 'rejected') {
      btns += `<button class="btn btn-sm btn-primary" onclick="handleAccept('${issue.id}')">接单</button>`;
    }
    if (issue.status === 'rectifying') {
      btns += `<button class="btn btn-sm btn-success" onclick="openRectifyModal('${issue.id}')">提交整改</button>`;
      btns += `<button class="btn btn-sm btn-warning" onclick="openExtensionModal('${issue.id}')">申请延期</button>`;
    }
  }
  
  if (user.role === 'supervisor') {
    if (issue.status === 'rechecking') {
      btns += `<button class="btn btn-sm btn-success" onclick="openRecheckModal('${issue.id}')">复验</button>`;
    }
  }
  
  return btns;
}

function renderPagination(total, currentPage, pageSize) {
  const totalPages = Math.ceil(total / pageSize);
  const paginationEl = document.getElementById('pagination');
  
  if (totalPages <= 1) {
    paginationEl.innerHTML = '';
    return;
  }

  let html = '';
  
  html += `<button class="page-btn" ${currentPage <= 1 ? 'disabled' : ''} onclick="goToPage(${currentPage - 1})">上一页</button>`;
  
  const maxVisible = 5;
  let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
  let endPage = Math.min(totalPages, startPage + maxVisible - 1);
  
  if (endPage - startPage + 1 < maxVisible) {
    startPage = Math.max(1, endPage - maxVisible + 1);
  }
  
  if (startPage > 1) {
    html += `<button class="page-btn" onclick="goToPage(1)">1</button>`;
    if (startPage > 2) {
      html += `<span class="page-ellipsis">...</span>`;
    }
  }
  
  for (let i = startPage; i <= endPage; i++) {
    html += `<button class="page-btn ${i === currentPage ? 'active' : ''}" onclick="goToPage(${i})">${i}</button>`;
  }
  
  if (endPage < totalPages) {
    if (endPage < totalPages - 1) {
      html += `<span class="page-ellipsis">...</span>`;
    }
    html += `<button class="page-btn" onclick="goToPage(${totalPages})">${totalPages}</button>`;
  }
  
  html += `<button class="page-btn" ${currentPage >= totalPages ? 'disabled' : ''} onclick="goToPage(${currentPage + 1})">下一页</button>`;
  
  paginationEl.innerHTML = html;
}

function goToPage(page) {
  appState.issuesPage = page;
  saveState();
  loadIssues();
}

function initFilters() {
  const filterStore = document.getElementById('filterStore');
  const filterStatus = document.getElementById('filterStatus');
  const filterOverdue = document.getElementById('filterOverdue');
  const filterKeyword = document.getElementById('filterKeyword');
  const btnReset = document.getElementById('btnResetFilter');
  const btnExport = document.getElementById('btnExport');

  filterStore.value = appState.filters.storeId;
  filterStatus.value = appState.filters.status;
  filterOverdue.value = appState.filters.overdue;
  filterKeyword.value = appState.filters.keyword;

  filterStore.addEventListener('change', () => {
    appState.filters.storeId = filterStore.value;
    appState.issuesPage = 1;
    saveState();
    loadIssues();
  });

  filterStatus.addEventListener('change', () => {
    appState.filters.status = filterStatus.value;
    appState.issuesPage = 1;
    saveState();
    loadIssues();
  });

  filterOverdue.addEventListener('change', () => {
    appState.filters.overdue = filterOverdue.value;
    appState.issuesPage = 1;
    saveState();
    loadIssues();
  });

  let keywordTimer;
  filterKeyword.addEventListener('input', () => {
    clearTimeout(keywordTimer);
    keywordTimer = setTimeout(() => {
      appState.filters.keyword = filterKeyword.value;
      appState.issuesPage = 1;
      saveState();
      loadIssues();
    }, 300);
  });

  btnReset.addEventListener('click', () => {
    appState.filters = {
      storeId: 'all',
      status: 'all',
      overdue: 'all',
      keyword: ''
    };
    appState.issuesPage = 1;
    saveState();
    filterStore.value = 'all';
    filterStatus.value = 'all';
    filterOverdue.value = 'all';
    filterKeyword.value = '';
    loadIssues();
    showToast('筛选条件已重置', 'success');
  });

  btnExport.addEventListener('click', handleExport);
}

function handleExport() {
  const user = getCurrentUser();
  const params = {
    storeId: appState.filters.storeId === 'all' ? '' : appState.filters.storeId,
    status: appState.filters.status === 'all' ? '' : appState.filters.status,
    overdue: appState.filters.overdue === 'all' ? '' : appState.filters.overdue,
    keyword: appState.filters.keyword,
    currentUserId: user.userId,
    currentUserRole: user.role
  };
  
  const url = api.getExportUrl(params);
  window.open(url, '_blank');
  showToast('导出已开始', 'success');
}

function initCreateButtons() {
  const btns = document.querySelectorAll('.btn-create');
  btns.forEach(btn => {
    btn.addEventListener('click', openCreateModal);
  });

  const importBtns = document.querySelectorAll('.btn-import');
  importBtns.forEach(btn => {
    btn.addEventListener('click', openImportModal);
  });
}

async function handleAccept(issueId) {
  const user = getCurrentUser();
  if (!confirm('确定要接单吗？')) return;
  
  const res = await api.acceptIssue(issueId, user.userId, '');
  if (res.code === 0) {
    showToast('接单成功', 'success');
    refreshCurrentPage();
  } else {
    showToast(res.message || '接单失败', 'error');
  }
}

async function loadConfig() {
  const res = await api.getConfig();
  if (res.code === 0) {
    document.getElementById('overdueThresholdDays').value = res.data.overdueThresholdDays;
    document.getElementById('warningThresholdDays').value = res.data.warningThresholdDays;
  }
}

function initConfigForm() {
  const form = document.getElementById('configForm');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const overdueThresholdDays = parseInt(document.getElementById('overdueThresholdDays').value);
    const warningThresholdDays = parseInt(document.getElementById('warningThresholdDays').value);
    
    const res = await api.updateConfig({ overdueThresholdDays, warningThresholdDays });
    if (res.code === 0) {
      showToast('配置已保存', 'success');
    } else {
      showToast(res.message || '保存失败', 'error');
    }
  });
}

async function init() {
  loadState();
  initNavigation();
  initRoleSwitcher();
  updateUserDisplay();
  await loadStores();
  initFilters();
  initCreateButtons();
  initConfigForm();
  initModalClose();
  switchPage(appState.currentPage);
}

document.addEventListener('DOMContentLoaded', init);
