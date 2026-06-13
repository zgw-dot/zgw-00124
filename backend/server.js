const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

const DATA_DIR = path.join(__dirname, 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const STORES_FILE = path.join(DATA_DIR, 'stores.json');
const ISSUES_FILE = path.join(DATA_DIR, 'issues.json');
const CONFIG_FILE = path.join(DATA_DIR, 'config.json');
const IMPORTS_FILE = path.join(DATA_DIR, 'imports.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function readJSON(filePath, defaultValue) {
  try {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(data);
    }
  } catch (e) {
    console.error(`读取文件失败 ${filePath}:`, e.message);
  }
  return defaultValue;
}

function writeJSON(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (e) {
    console.error(`写入文件失败 ${filePath}:`, e.message);
    return false;
  }
}

function initData() {
  ensureDataDir();

  if (!fs.existsSync(USERS_FILE)) {
    const users = [
      { id: 'u1', username: 'supervisor1', name: '张督导', role: 'supervisor', storeId: null },
      { id: 'u2', username: 'store1', name: '王店长', role: 'store', storeId: 's1' },
      { id: 'u3', username: 'store2', name: '李店长', role: 'store', storeId: 's2' },
      { id: 'u4', username: 'store3', name: '赵店长', role: 'store', storeId: 's3' }
    ];
    writeJSON(USERS_FILE, users);
  }

  if (!fs.existsSync(STORES_FILE)) {
    const stores = [
      { id: 's1', name: '朝阳路店', address: '北京市朝阳区朝阳路1号' },
      { id: 's2', name: '海淀店', address: '北京市海淀区中关村大街2号' },
      { id: 's3', name: '西城店', address: '北京市西城区金融街3号' }
    ];
    writeJSON(STORES_FILE, stores);
  }

  if (!fs.existsSync(CONFIG_FILE)) {
    const config = {
      overdueThresholdDays: 3,
      warningThresholdDays: 1
    };
    writeJSON(CONFIG_FILE, config);
  }

  if (!fs.existsSync(ISSUES_FILE)) {
    const now = Date.now();
    const issues = [
      {
        id: 'issue-001',
        title: '消防通道堆放杂物',
        description: '后门消防通道堆放纸箱和清洁工具，存在安全隐患',
        category: '安全',
        status: 'pending',
        storeId: 's1',
        creatorId: 'u1',
        creatorName: '张督导',
        responsibleId: 'u2',
        responsibleName: '王店长',
        deadline: now + 2 * 24 * 60 * 60 * 1000,
        createdAt: now - 1 * 24 * 60 * 60 * 1000,
        updatedAt: now - 1 * 24 * 60 * 60 * 1000,
        attachments: ['/mock/images/fire_exit.jpg'],
        timeline: [
          {
            id: 't1',
            action: 'created',
            actionName: '创建问题',
            userId: 'u1',
            userName: '张督导',
            time: now - 1 * 24 * 60 * 60 * 1000,
            remark: '巡查时发现消防通道有杂物堆积'
          }
        ],
        extensionHistory: [],
        importBatchId: '',
        importSource: 'manual'
      },
      {
        id: 'issue-002',
        title: '员工仪容仪表不规范',
        description: '部分员工未佩戴工牌，工作服不整洁',
        category: '服务',
        status: 'rectifying',
        storeId: 's2',
        creatorId: 'u1',
        creatorName: '张督导',
        responsibleId: 'u3',
        responsibleName: '李店长',
        deadline: now + 1 * 24 * 60 * 60 * 1000,
        createdAt: now - 2 * 24 * 60 * 60 * 1000,
        updatedAt: now - 12 * 60 * 60 * 1000,
        attachments: ['/mock/images/uniform.jpg'],
        rectifyContent: '',
        rectifyAttachments: [],
        timeline: [
          {
            id: 't1',
            action: 'created',
            actionName: '创建问题',
            userId: 'u1',
            userName: '张督导',
            time: now - 2 * 24 * 60 * 60 * 1000,
            remark: '早班检查发现仪容仪表问题'
          },
          {
            id: 't2',
            action: 'accepted',
            actionName: '门店接单',
            userId: 'u3',
            userName: '李店长',
            time: now - 12 * 60 * 60 * 1000,
            remark: '已收到，立即整改'
          }
        ],
        extensionHistory: [],
        importBatchId: '',
        importSource: 'manual'
      },
      {
        id: 'issue-003',
        title: '冷藏柜温度不达标',
        description: '生鲜区冷藏柜温度显示为8℃，要求为0-4℃',
        category: '质量',
        status: 'rechecking',
        storeId: 's3',
        creatorId: 'u1',
        creatorName: '张督导',
        responsibleId: 'u4',
        responsibleName: '赵店长',
        deadline: now - 1 * 24 * 60 * 60 * 1000,
        createdAt: now - 5 * 24 * 60 * 60 * 1000,
        updatedAt: now - 6 * 60 * 60 * 1000,
        attachments: ['/mock/images/fridge.jpg'],
        rectifyContent: '已联系维修人员上门检修，更换了温控器',
        rectifyAttachments: ['/mock/images/fridge_repaired.jpg'],
        timeline: [
          {
            id: 't1',
            action: 'created',
            actionName: '创建问题',
            userId: 'u1',
            userName: '张督导',
            time: now - 5 * 24 * 60 * 60 * 1000,
            remark: '温度检测超标'
          },
          {
            id: 't2',
            action: 'accepted',
            actionName: '门店接单',
            userId: 'u4',
            userName: '赵店长',
            time: now - 4 * 24 * 60 * 60 * 1000,
            remark: '已收到'
          },
          {
            id: 't3',
            action: 'extension_request',
            actionName: '申请延期',
            userId: 'u4',
            userName: '赵店长',
            time: now - 2 * 24 * 60 * 60 * 1000,
            remark: '维修配件需调货，申请延期2天',
            extensionDays: 2,
            extensionReason: '维修配件需从厂家调货'
          },
          {
            id: 't4',
            action: 'extension_approved',
            actionName: '延期批准',
            userId: 'u1',
            userName: '张督导',
            time: now - 2 * 24 * 60 * 60 * 1000 + 3600000,
            remark: '同意延期',
            extensionDays: 2
          },
          {
            id: 't5',
            action: 'rectified',
            actionName: '提交整改',
            userId: 'u4',
            userName: '赵店长',
            time: now - 6 * 60 * 60 * 1000,
            remark: '已完成维修'
          }
        ],
        extensionHistory: [
          {
            id: 'e1',
            requestDays: 2,
            reason: '维修配件需从厂家调货',
            status: 'approved',
            requestedAt: now - 2 * 24 * 60 * 60 * 1000,
            approvedAt: now - 2 * 24 * 60 * 60 * 1000 + 3600000,
            approverId: 'u1',
            approverName: '张督导'
          }
        ],
        importBatchId: '',
        importSource: 'manual'
      }
    ];
    writeJSON(ISSUES_FILE, issues);
  }

  if (!fs.existsSync(IMPORTS_FILE)) {
    writeJSON(IMPORTS_FILE, []);
  }
}

initData();

app.use('/mock', express.static(path.join(__dirname, 'mock')));

const FRONTEND_DIR = path.join(__dirname, '..', 'frontend');
app.use(express.static(FRONTEND_DIR));

app.get('/', (req, res) => {
  res.sendFile(path.join(FRONTEND_DIR, 'index.html'));
});

function generateId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function isOverdue(issue, config) {
  const now = Date.now();
  if (['closed', 'cancelled'].includes(issue.status)) {
    return false;
  }
  const thresholdDays = (config && config.overdueThresholdDays) || 0;
  const effectiveDeadline = issue.deadline + thresholdDays * 24 * 60 * 60 * 1000;
  return now > effectiveDeadline;
}

function addTimelineEntry(issue, action, actionName, userId, userName, remark, extra = {}) {
  const entry = {
    id: generateId('t'),
    action,
    actionName,
    userId,
    userName,
    time: Date.now(),
    remark,
    ...extra
  };
  issue.timeline.push(entry);
  issue.updatedAt = Date.now();
  return entry;
}

const STATUS_MAP = {
  pending: '待接单',
  rectifying: '整改中',
  rechecking: '待复验',
  closed: '已关闭',
  rejected: '复验不通过',
  cancelled: '已取消'
};

const ACTION_MAP = {
  created: '创建问题',
  accepted: '门店接单',
  rectified: '提交整改',
  recheck_pass: '复验通过',
  recheck_fail: '复验不通过',
  extension_request: '申请延期',
  extension_approved: '延期批准',
  extension_rejected: '延期驳回',
  closed: '关闭问题',
  reopened: '重新打开',
  imported: '批量导入'
};

app.get('/api/users', (req, res) => {
  const users = readJSON(USERS_FILE, []);
  const { role } = req.query;
  let result = users;
  if (role) {
    result = users.filter(u => u.role === role);
  }
  res.json({ code: 0, data: result });
});

app.get('/api/users/:id', (req, res) => {
  const users = readJSON(USERS_FILE, []);
  const user = users.find(u => u.id === req.params.id);
  if (!user) {
    return res.json({ code: 404, message: '用户不存在' });
  }
  res.json({ code: 0, data: user });
});

app.get('/api/stores', (req, res) => {
  const stores = readJSON(STORES_FILE, []);
  res.json({ code: 0, data: stores });
});

app.get('/api/config', (req, res) => {
  const config = readJSON(CONFIG_FILE, {});
  res.json({ code: 0, data: config });
});

app.put('/api/config', (req, res) => {
  const config = readJSON(CONFIG_FILE, {});
  const { overdueThresholdDays, warningThresholdDays } = req.body;
  
  if (overdueThresholdDays !== undefined) {
    config.overdueThresholdDays = overdueThresholdDays;
  }
  if (warningThresholdDays !== undefined) {
    config.warningThresholdDays = warningThresholdDays;
  }
  
  writeJSON(CONFIG_FILE, config);
  res.json({ code: 0, data: config, message: '配置已更新' });
});

app.get('/api/issues', (req, res) => {
  const issues = readJSON(ISSUES_FILE, []);
  const config = readJSON(CONFIG_FILE, { overdueThresholdDays: 3, warningThresholdDays: 1 });
  
  let { 
    storeId, status, overdue, keyword, 
    currentUserId, currentUserRole,
    page = 1, pageSize = 20,
    sortField = 'createdAt', sortOrder = 'desc'
  } = req.query;
  
  page = parseInt(page);
  pageSize = parseInt(pageSize);
  
  let filtered = [...issues];
  
  if (currentUserRole === 'store' && currentUserId) {
    const users = readJSON(USERS_FILE, []);
    const currentUser = users.find(u => u.id === currentUserId);
    if (currentUser && currentUser.storeId) {
      filtered = filtered.filter(i => i.storeId === currentUser.storeId);
    }
  }
  
  if (storeId && storeId !== 'all') {
    filtered = filtered.filter(i => i.storeId === storeId);
  }
  
  if (status && status !== 'all') {
    filtered = filtered.filter(i => i.status === status);
  }
  
  if (overdue === '1') {
    filtered = filtered.filter(i => isOverdue(i, config));
  } else if (overdue === '0') {
    filtered = filtered.filter(i => !isOverdue(i, config));
  }
  
  if (keyword) {
    const kw = keyword.toLowerCase();
    filtered = filtered.filter(i => 
      i.title.toLowerCase().includes(kw) || 
      i.description.toLowerCase().includes(kw)
    );
  }
  
  filtered.sort((a, b) => {
    let valA = a[sortField];
    let valB = b[sortField];
    if (sortField === 'deadline') {
      valA = a.deadline;
      valB = b.deadline;
    }
    if (sortOrder === 'asc') {
      return valA - valB;
    }
    return valB - valA;
  });
  
  const total = filtered.length;
  const start = (page - 1) * pageSize;
  const list = filtered.slice(start, start + pageSize);
  
  const resultList = list.map(issue => ({
    ...issue,
    isOverdue: isOverdue(issue, config),
    statusText: STATUS_MAP[issue.status] || issue.status
  }));
  
  res.json({ 
    code: 0, 
    data: { 
      list: resultList, 
      total,
      page,
      pageSize
    }
  });
});

app.get('/api/issues/:id', (req, res) => {
  const issues = readJSON(ISSUES_FILE, []);
  const config = readJSON(CONFIG_FILE, { overdueThresholdDays: 3, warningThresholdDays: 1 });
  const issue = issues.find(i => i.id === req.params.id);
  
  if (!issue) {
    return res.json({ code: 404, message: '问题不存在' });
  }
  
  const { currentUserId, currentUserRole } = req.query;
  if (currentUserRole === 'store' && currentUserId) {
    const users = readJSON(USERS_FILE, []);
    const currentUser = users.find(u => u.id === currentUserId);
    if (currentUser && currentUser.storeId && currentUser.storeId !== issue.storeId) {
      return res.json({ code: 403, message: '无权查看其他门店的问题' });
    }
  }
  
  res.json({ 
    code: 0, 
    data: {
      ...issue,
      isOverdue: isOverdue(issue, config),
      statusText: STATUS_MAP[issue.status] || issue.status
    }
  });
});

app.post('/api/issues', (req, res) => {
  const issues = readJSON(ISSUES_FILE, []);
  const users = readJSON(USERS_FILE, []);
  
  const { 
    title, description, category, storeId, 
    deadline, attachments, creatorId 
  } = req.body;
  
  if (!title || !storeId || !creatorId || !deadline) {
    return res.json({ code: 400, message: '必填项不能为空' });
  }
  
  const creator = users.find(u => u.id === creatorId);
  if (!creator || creator.role !== 'supervisor') {
    return res.json({ code: 403, message: '只有督导可以创建问题' });
  }
  
  const storeUser = users.find(u => u.storeId === storeId && u.role === 'store');
  if (!storeUser) {
    return res.json({ code: 400, message: '门店用户不存在' });
  }
  
  const now = Date.now();
  const newIssue = {
    id: generateId('issue'),
    title,
    description: description || '',
    category: category || '其他',
    status: 'pending',
    storeId,
    creatorId,
    creatorName: creator.name,
    responsibleId: storeUser.id,
    responsibleName: storeUser.name,
    deadline: new Date(deadline).getTime(),
    createdAt: now,
    updatedAt: now,
    attachments: attachments || [],
    rectifyContent: '',
    rectifyAttachments: [],
    timeline: [],
    extensionHistory: [],
    importBatchId: '',
    importSource: 'manual'
  };
  
  addTimelineEntry(
    newIssue,
    'created',
    '创建问题',
    creatorId,
    creator.name,
    description || ''
  );
  
  issues.unshift(newIssue);
  writeJSON(ISSUES_FILE, issues);
  
  res.json({ 
    code: 0, 
    data: {
      ...newIssue,
      isOverdue: false,
      statusText: STATUS_MAP[newIssue.status]
    },
    message: '问题创建成功'
  });
});

app.post('/api/issues/import', (req, res) => {
  const { creatorId, format, data } = req.body;

  if (!creatorId || !format || !data) {
    return res.json({ code: 400, message: '缺少必填参数' });
  }

  const users = readJSON(USERS_FILE, []);
  const creator = users.find(u => u.id === creatorId);
  if (!creator) {
    return res.json({ code: 400, message: '用户不存在' });
  }
  if (creator.role !== 'supervisor') {
    return res.status(403).json({ code: 403, message: '门店账号不能导入问题' });
  }

  let items;
  try {
    if (format === 'json') {
      items = JSON.parse(data);
      if (!Array.isArray(items)) {
        return res.json({ code: 400, message: 'JSON数据必须是数组' });
      }
    } else if (format === 'csv') {
      items = parseCSV(data);
    } else {
      return res.json({ code: 400, message: '不支持的格式' });
    }
  } catch (e) {
    return res.json({ code: 400, message: '数据解析失败: ' + e.message });
  }

  const FIELD_ALIASES = {
    '标题': 'title', 'title': 'title',
    '分类': 'category', 'category': 'category',
    '门店': 'storeId', '门店ID': 'storeId', 'storeId': 'storeId', 'store': 'storeId',
    '截止时间': 'deadline', '截止日期': 'deadline', 'deadline': 'deadline',
    '描述': 'description', 'description': 'description', '说明': 'description'
  };

  items = items.map(item => {
    const normalized = {};
    Object.keys(item).forEach(key => {
      const mapped = FIELD_ALIASES[key.trim().toLowerCase()] || FIELD_ALIASES[key.trim()] || key.trim();
      normalized[mapped] = item[key];
    });
    return normalized;
  });

  const stores = readJSON(STORES_FILE, []);
  const issues = readJSON(ISSUES_FILE, []);
  const batchId = `import-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const results = [];
  let successCount = 0;
  let failedCount = 0;
  let skippedCount = 0;

  items.forEach((item, index) => {
    if (!item.title || !item.storeId || !item.deadline) {
      failedCount++;
      results.push({ index, status: 'failed', reason: '缺少必填字段(title/storeId/deadline)' });
      return;
    }

    let resolvedStoreId = item.storeId;
    const storeById = stores.find(s => s.id === resolvedStoreId);
    if (!storeById) {
      const storeByName = stores.find(s => s.name === resolvedStoreId);
      if (storeByName) {
        resolvedStoreId = storeByName.id;
      } else {
        failedCount++;
        results.push({ index, status: 'failed', reason: '门店不存在' });
        return;
      }
    }

    const storeUser = users.find(u => u.storeId === resolvedStoreId && u.role === 'store');
    if (!storeUser) {
      failedCount++;
      results.push({ index, status: 'failed', reason: '门店用户不存在' });
      return;
    }

    let deadlineTimestamp;
    if (typeof item.deadline === 'number') {
      deadlineTimestamp = item.deadline;
    } else {
      deadlineTimestamp = new Date(item.deadline).getTime();
    }
    if (isNaN(deadlineTimestamp)) {
      failedCount++;
      results.push({ index, status: 'failed', reason: '截止时间格式无效' });
      return;
    }

    const deadlineDate = new Date(deadlineTimestamp);
    const deadlineStr = `${deadlineDate.getFullYear()}-${String(deadlineDate.getMonth() + 1).padStart(2, '0')}-${String(deadlineDate.getDate()).padStart(2, '0')}`;

    const conflict = issues.find(existing => {
      if (existing.title !== item.title || existing.storeId !== resolvedStoreId) return false;
      const existingDeadline = new Date(existing.deadline);
      const existingDeadlineStr = `${existingDeadline.getFullYear()}-${String(existingDeadline.getMonth() + 1).padStart(2, '0')}-${String(existingDeadline.getDate()).padStart(2, '0')}`;
      return existingDeadlineStr === deadlineStr;
    });

    if (conflict) {
      skippedCount++;
      results.push({ index, status: 'skipped', reason: '标题+门店+截止时间重复' });
      return;
    }

    const now = Date.now();
    const newIssue = {
      id: generateId('issue'),
      title: item.title,
      description: item.description || '',
      category: item.category || '其他',
      status: 'pending',
      storeId: resolvedStoreId,
      creatorId,
      creatorName: creator.name,
      responsibleId: storeUser.id,
      responsibleName: storeUser.name,
      deadline: deadlineTimestamp,
      createdAt: now,
      updatedAt: now,
      attachments: [],
      rectifyContent: '',
      rectifyAttachments: [],
      timeline: [],
      extensionHistory: [],
      importBatchId: batchId,
      importSource: 'batch_import'
    };

    addTimelineEntry(
      newIssue,
      'imported',
      '批量导入',
      creatorId,
      creator.name,
      '批量导入问题'
    );

    issues.unshift(newIssue);
    successCount++;
    results.push({ index, status: 'success', issueId: newIssue.id });
  });

  writeJSON(ISSUES_FILE, issues);

  const imports = readJSON(IMPORTS_FILE, []);
  const importRecord = {
    id: batchId,
    creatorId,
    creatorName: creator.name,
    format,
    totalCount: items.length,
    successCount,
    failedCount,
    skippedCount,
    results,
    createdAt: Date.now()
  };
  imports.push(importRecord);
  writeJSON(IMPORTS_FILE, imports);

  res.json({
    code: 0,
    data: {
      batchId,
      totalCount: items.length,
      successCount,
      failedCount,
      skippedCount,
      results
    }
  });
});

app.post('/api/issues/:id/accept', (req, res) => {
  const issues = readJSON(ISSUES_FILE, []);
  const users = readJSON(USERS_FILE, []);
  const config = readJSON(CONFIG_FILE, { overdueThresholdDays: 3, warningThresholdDays: 1 });
  const index = issues.findIndex(i => i.id === req.params.id);
  
  if (index === -1) {
    return res.json({ code: 404, message: '问题不存在' });
  }
  
  const issue = issues[index];
  const { userId, remark } = req.body;
  const user = users.find(u => u.id === userId);
  
  if (!user) {
    return res.json({ code: 400, message: '用户不存在' });
  }
  
  if (user.role !== 'store' || user.storeId !== issue.storeId) {
    return res.json({ code: 403, message: '只有对应门店可以接单' });
  }
  
  if (issue.status !== 'pending' && issue.status !== 'rejected') {
    return res.json({ code: 400, message: '当前状态不可接单' });
  }
  
  issue.status = 'rectifying';
  
  addTimelineEntry(
    issue,
    'accepted',
    '门店接单',
    userId,
    user.name,
    remark || '已接单，开始整改'
  );
  
  issues[index] = issue;
  writeJSON(ISSUES_FILE, issues);
  
  res.json({ 
    code: 0, 
    data: { ...issue, isOverdue: isOverdue(issue, config), statusText: STATUS_MAP[issue.status] },
    message: '接单成功'
  });
});

app.post('/api/issues/:id/rectify', (req, res) => {
  const issues = readJSON(ISSUES_FILE, []);
  const users = readJSON(USERS_FILE, []);
  const config = readJSON(CONFIG_FILE, { overdueThresholdDays: 3, warningThresholdDays: 1 });
  const index = issues.findIndex(i => i.id === req.params.id);
  
  if (index === -1) {
    return res.json({ code: 404, message: '问题不存在' });
  }
  
  const issue = issues[index];
  const { userId, content, attachments, remark } = req.body;
  const user = users.find(u => u.id === userId);
  
  if (!user) {
    return res.json({ code: 400, message: '用户不存在' });
  }
  
  if (user.role !== 'store' || user.storeId !== issue.storeId) {
    return res.json({ code: 403, message: '只有对应门店可以提交整改' });
  }
  
  if (issue.status !== 'rectifying') {
    return res.json({ code: 400, message: '当前状态不可提交整改' });
  }
  
  if (!content || !content.trim()) {
    return res.json({ code: 400, message: '整改内容不能为空' });
  }
  
  issue.status = 'rechecking';
  issue.rectifyContent = content;
  issue.rectifyAttachments = attachments || [];
  
  addTimelineEntry(
    issue,
    'rectified',
    '提交整改',
    userId,
    user.name,
    remark || content,
    { rectifyContent: content, rectifyAttachments: attachments || [] }
  );
  
  issues[index] = issue;
  writeJSON(ISSUES_FILE, issues);
  
  res.json({ 
    code: 0, 
    data: { ...issue, isOverdue: isOverdue(issue, config), statusText: STATUS_MAP[issue.status] },
    message: '整改提交成功，等待复验'
  });
});

app.post('/api/issues/:id/recheck', (req, res) => {
  const issues = readJSON(ISSUES_FILE, []);
  const users = readJSON(USERS_FILE, []);
  const config = readJSON(CONFIG_FILE, { overdueThresholdDays: 3, warningThresholdDays: 1 });
  const index = issues.findIndex(i => i.id === req.params.id);
  
  if (index === -1) {
    return res.json({ code: 404, message: '问题不存在' });
  }
  
  const issue = issues[index];
  const { userId, passed, remark } = req.body;
  const user = users.find(u => u.id === userId);
  
  if (!user) {
    return res.json({ code: 400, message: '用户不存在' });
  }
  
  if (user.role !== 'supervisor') {
    return res.json({ code: 403, message: '只有督导可以复验' });
  }
  
  if (issue.status !== 'rechecking') {
    return res.json({ code: 400, message: '当前状态不可复验' });
  }
  
  let message;
  if (passed) {
    issue.status = 'closed';
    addTimelineEntry(
      issue,
      'recheck_pass',
      '复验通过',
      userId,
      user.name,
      remark || '复验通过，问题关闭'
    );
    message = '复验通过，问题已关闭';
  } else {
    issue.status = 'rectifying';
    addTimelineEntry(
      issue,
      'recheck_fail',
      '复验不通过',
      userId,
      user.name,
      remark || '整改不达标，请重新整改'
    );
    message = '复验不通过，请重新整改';
  }
  
  issues[index] = issue;
  writeJSON(ISSUES_FILE, issues);
  
  res.json({ 
    code: 0, 
    data: { ...issue, isOverdue: isOverdue(issue, config), statusText: STATUS_MAP[issue.status] },
    message
  });
});

app.post('/api/issues/:id/extension', (req, res) => {
  const issues = readJSON(ISSUES_FILE, []);
  const users = readJSON(USERS_FILE, []);
  const config = readJSON(CONFIG_FILE, { overdueThresholdDays: 3, warningThresholdDays: 1 });
  const index = issues.findIndex(i => i.id === req.params.id);
  
  if (index === -1) {
    return res.json({ code: 404, message: '问题不存在' });
  }
  
  const issue = issues[index];
  const { userId, days, reason, remark } = req.body;
  const user = users.find(u => u.id === userId);
  
  if (!user) {
    return res.json({ code: 400, message: '用户不存在' });
  }
  
  if (user.role !== 'store' || user.storeId !== issue.storeId) {
    return res.json({ code: 403, message: '只有对应门店可以申请延期' });
  }
  
  if (!['pending', 'rectifying'].includes(issue.status)) {
    return res.json({ code: 400, message: '当前状态不可申请延期' });
  }
  
  if (!days || days <= 0) {
    return res.json({ code: 400, message: '延天天数必须大于0' });
  }
  
  if (!reason || !reason.trim()) {
    return res.json({ code: 400, message: '延期原因不能为空' });
  }
  
  const extensionRecord = {
    id: generateId('e'),
    requestDays: parseInt(days),
    reason,
    status: 'pending',
    requestedAt: Date.now(),
    requesterId: userId,
    requesterName: user.name
  };
  
  issue.extensionHistory.push(extensionRecord);
  
  addTimelineEntry(
    issue,
    'extension_request',
    '申请延期',
    userId,
    user.name,
    remark || reason,
    { extensionDays: parseInt(days), extensionReason: reason }
  );
  
  issues[index] = issue;
  writeJSON(ISSUES_FILE, issues);
  
  res.json({ 
    code: 0, 
    data: { ...issue, isOverdue: isOverdue(issue, config), statusText: STATUS_MAP[issue.status] },
    message: '延期申请已提交，等待审批'
  });
});

app.post('/api/issues/:id/extension/approve', (req, res) => {
  const issues = readJSON(ISSUES_FILE, []);
  const users = readJSON(USERS_FILE, []);
  const config = readJSON(CONFIG_FILE, { overdueThresholdDays: 3, warningThresholdDays: 1 });
  const index = issues.findIndex(i => i.id === req.params.id);
  
  if (index === -1) {
    return res.json({ code: 404, message: '问题不存在' });
  }
  
  const issue = issues[index];
  const { userId, extensionId, remark } = req.body;
  const user = users.find(u => u.id === userId);
  
  if (!user) {
    return res.json({ code: 400, message: '用户不存在' });
  }
  
  if (user.role !== 'supervisor') {
    return res.json({ code: 403, message: '只有督导可以审批延期' });
  }
  
  const extRecord = issue.extensionHistory.find(e => e.id === extensionId);
  if (!extRecord || extRecord.status !== 'pending') {
    return res.json({ code: 400, message: '延期申请不存在或已处理' });
  }
  
  extRecord.status = 'approved';
  extRecord.approvedAt = Date.now();
  extRecord.approverId = userId;
  extRecord.approverName = user.name;
  
  issue.deadline = issue.deadline + extRecord.requestDays * 24 * 60 * 60 * 1000;
  
  addTimelineEntry(
    issue,
    'extension_approved',
    '延期批准',
    userId,
    user.name,
    remark || `同意延期${extRecord.requestDays}天`,
    { extensionDays: extRecord.requestDays }
  );
  
  issues[index] = issue;
  writeJSON(ISSUES_FILE, issues);
  
  res.json({ 
    code: 0, 
    data: { ...issue, isOverdue: isOverdue(issue, config), statusText: STATUS_MAP[issue.status] },
    message: '延期已批准'
  });
});

app.post('/api/issues/:id/extension/reject', (req, res) => {
  const issues = readJSON(ISSUES_FILE, []);
  const users = readJSON(USERS_FILE, []);
  const config = readJSON(CONFIG_FILE, { overdueThresholdDays: 3, warningThresholdDays: 1 });
  const index = issues.findIndex(i => i.id === req.params.id);
  
  if (index === -1) {
    return res.json({ code: 404, message: '问题不存在' });
  }
  
  const issue = issues[index];
  const { userId, extensionId, remark } = req.body;
  const user = users.find(u => u.id === userId);
  
  if (!user) {
    return res.json({ code: 400, message: '用户不存在' });
  }
  
  if (user.role !== 'supervisor') {
    return res.json({ code: 403, message: '只有督导可以审批延期' });
  }
  
  const extRecord = issue.extensionHistory.find(e => e.id === extensionId);
  if (!extRecord || extRecord.status !== 'pending') {
    return res.json({ code: 400, message: '延期申请不存在或已处理' });
  }
  
  extRecord.status = 'rejected';
  extRecord.rejectedAt = Date.now();
  extRecord.rejectorId = userId;
  extRecord.rejectorName = user.name;
  
  addTimelineEntry(
    issue,
    'extension_rejected',
    '延期驳回',
    userId,
    user.name,
    remark || '延期申请未通过'
  );
  
  issues[index] = issue;
  writeJSON(ISSUES_FILE, issues);
  
  res.json({ 
    code: 0, 
    data: { ...issue, isOverdue: isOverdue(issue, config), statusText: STATUS_MAP[issue.status] },
    message: '延期已驳回'
  });
});

app.get('/api/dashboard/stats', (req, res) => {
  const issues = readJSON(ISSUES_FILE, []);
  const config = readJSON(CONFIG_FILE, { overdueThresholdDays: 3, warningThresholdDays: 1 });
  const stores = readJSON(STORES_FILE, []);
  
  const { currentUserId, currentUserRole } = req.query;
  
  let filtered = [...issues];
  
  if (currentUserRole === 'store' && currentUserId) {
    const users = readJSON(USERS_FILE, []);
    const currentUser = users.find(u => u.id === currentUserId);
    if (currentUser && currentUser.storeId) {
      filtered = filtered.filter(i => i.storeId === currentUser.storeId);
    }
  }
  
  const stats = {
    total: filtered.length,
    pending: filtered.filter(i => i.status === 'pending').length,
    rectifying: filtered.filter(i => i.status === 'rectifying').length,
    rechecking: filtered.filter(i => i.status === 'rechecking').length,
    closed: filtered.filter(i => i.status === 'closed').length,
    rejected: filtered.filter(i => i.status === 'rejected').length,
    overdue: filtered.filter(i => isOverdue(i, config)).length,
    overdueRatio: 0
  };
  
  if (filtered.length > 0) {
    stats.overdueRatio = Number(((stats.overdue / filtered.length) * 100).toFixed(1));
  }
  
  const storeStats = stores.map(store => {
    const storeIssues = filtered.filter(i => i.storeId === store.id);
    return {
      storeId: store.id,
      storeName: store.name,
      total: storeIssues.length,
      pending: storeIssues.filter(i => i.status === 'pending').length,
      rectifying: storeIssues.filter(i => i.status === 'rectifying').length,
      closed: storeIssues.filter(i => i.status === 'closed').length,
      overdue: storeIssues.filter(i => isOverdue(i, config)).length
    };
  });
  
  const categories = ['安全', '服务', '质量', '卫生', '其他'];
  const categoryStats = categories.map(cat => {
    const catIssues = filtered.filter(i => i.category === cat);
    return {
      category: cat,
      count: catIssues.length,
      closed: catIssues.filter(i => i.status === 'closed').length
    };
  });
  
  res.json({ 
    code: 0, 
    data: {
      summary: stats,
      byStore: storeStats,
      byCategory: categoryStats
    }
  });
});

app.get('/api/export/issues', (req, res) => {
  const issues = readJSON(ISSUES_FILE, []);
  const stores = readJSON(STORES_FILE, []);
  const users = readJSON(USERS_FILE, []);
  const config = readJSON(CONFIG_FILE, { overdueThresholdDays: 3, warningThresholdDays: 1 });
  
  let { 
    storeId, status, overdue, keyword, 
    currentUserId, currentUserRole
  } = req.query;
  
  let filtered = [...issues];
  
  if (currentUserRole === 'store' && currentUserId) {
    const currentUser = users.find(u => u.id === currentUserId);
    if (currentUser && currentUser.storeId) {
      filtered = filtered.filter(i => i.storeId === currentUser.storeId);
    }
  }
  
  if (storeId && storeId !== 'all') {
    filtered = filtered.filter(i => i.storeId === storeId);
  }
  
  if (status && status !== 'all') {
    filtered = filtered.filter(i => i.status === status);
  }
  
  if (overdue === '1') {
    filtered = filtered.filter(i => isOverdue(i, config));
  } else if (overdue === '0') {
    filtered = filtered.filter(i => !isOverdue(i, config));
  }
  
  if (keyword) {
    const kw = keyword.toLowerCase();
    filtered = filtered.filter(i => 
      i.title.toLowerCase().includes(kw) || 
      i.description.toLowerCase().includes(kw)
    );
  }
  
  const storeMap = {};
  stores.forEach(s => { storeMap[s.id] = s.name; });
  
  const csvHeader = [
    '问题ID', '标题', '分类', '状态', '是否逾期',
    '门店', '责任人', '创建人',
    '创建时间', '截止时间', '更新时间',
    '描述', '导入批次ID', '导入来源', '整改内容'
  ];
  
  const csvRows = filtered.map(issue => [
    issue.id,
    `"${(issue.title || '').replace(/"/g, '""')}"`,
    issue.category || '',
    STATUS_MAP[issue.status] || issue.status,
    isOverdue(issue, config) ? '是' : '否',
    storeMap[issue.storeId] || issue.storeId,
    issue.responsibleName || '',
    issue.creatorName || '',
    formatDate(issue.createdAt),
    formatDate(issue.deadline),
    formatDate(issue.updatedAt),
    `"${(issue.description || '').replace(/"/g, '""')}"`,
    issue.importBatchId || '',
    issue.importSource || '',
    `"${(issue.rectifyContent || '').replace(/"/g, '""')}"`
  ]);
  
  const csvContent = '\uFEFF' + [csvHeader.join(','), ...csvRows.map(r => r.join(','))].join('\n');
  
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="inspection_issues_${Date.now()}.csv"`);
  res.send(csvContent);
});

function formatDate(timestamp) {
  if (!timestamp) return '';
  const d = new Date(timestamp);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

function parseCSV(csvText) {
  let text = csvText.replace(/^\uFEFF/, '');
  const rows = [];
  let current = '';
  let inQuotes = false;
  let row = [];

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < text.length && text[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        row.push(current);
        current = '';
      } else if (ch === '\r') {
        if (i + 1 < text.length && text[i + 1] === '\n') {
          i++;
        }
        row.push(current);
        current = '';
        if (row.length > 0 && row.some(c => c !== '')) {
          rows.push(row);
        }
        row = [];
      } else if (ch === '\n') {
        row.push(current);
        current = '';
        if (row.length > 0 && row.some(c => c !== '')) {
          rows.push(row);
        }
        row = [];
      } else {
        current += ch;
      }
    }
  }

  row.push(current);
  if (row.length > 0 && row.some(c => c !== '')) {
    rows.push(row);
  }

  if (rows.length < 2) return [];

  const headers = rows[0].map(h => h.trim());
  const result = [];
  for (let r = 1; r < rows.length; r++) {
    const obj = {};
    for (let c = 0; c < headers.length; c++) {
      obj[headers[c]] = c < rows[r].length ? rows[r][c].trim() : '';
    }
    result.push(obj);
  }
  return result;
}

app.get('/api/imports', (req, res) => {
  const imports = readJSON(IMPORTS_FILE, []);
  let { page = 1, pageSize = 20 } = req.query;
  page = parseInt(page);
  pageSize = parseInt(pageSize);

  const sorted = [...imports].sort((a, b) => b.createdAt - a.createdAt);
  const total = sorted.length;
  const start = (page - 1) * pageSize;
  const list = sorted.slice(start, start + pageSize);

  res.json({
    code: 0,
    data: { list, total, page, pageSize }
  });
});

app.get('/api/imports/:id', (req, res) => {
  const imports = readJSON(IMPORTS_FILE, []);
  const record = imports.find(r => r.id === req.params.id);
  if (!record) {
    return res.json({ code: 404, message: '导入记录不存在' });
  }
  res.json({ code: 0, data: record });
});

app.get('/api/health', (req, res) => {
  res.json({ code: 0, message: '服务正常', timestamp: Date.now() });
});

app.listen(PORT, () => {
  console.log(`\n========================================`);
  console.log(`  巡店问题闭环看板服务已启动`);
  console.log(`  后端API: http://localhost:${PORT}`);
  console.log(`  数据目录: ${DATA_DIR}`);
  console.log(`========================================\n`);
});
