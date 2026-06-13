const assert = require('assert');

const { parseCSV, parseJSON, parseByFormat } = require('../csvParser');
const { normalizeFieldKey, normalizeItem, normalizeItems } = require('../fieldNormalizer');
const { resolveStoreId, findStoreUser } = require('../storeResolver');
const { validateRequiredFields, parseDeadline, toDateString } = require('../validator');
const { checkConflict } = require('../conflictDetector');
const { buildImportRecord, buildIssue, buildTimelineEntry, processImport, listImportRecords, getImportRecordDetail } = require('../importService');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✅  ${name}`);
    passed++;
  } catch (e) {
    console.log(`  ❌  ${name}  ${e.message}`);
    failed++;
  }
}

function section(title, fn) {
  console.log(`\n──────── ${title} ────────`);
  fn();
}

console.log('导入链路重构单元测试');

// ================================================================
// 1. csvParser - CSV/JSON 解析
// ================================================================
section('csvParser：CSV 解析', () => {
  test('解析基本 CSV', () => {
    const csv = `标题,分类,门店,截止时间,描述
货架标签缺失,卫生,朝阳路店,2026-07-01,价签缺失
收银台排队,服务,海淀店,2026-07-15,排队过长`;
    const result = parseCSV(csv);
    assert.strictEqual(result.length, 2, '应有 2 条数据');
    assert.strictEqual(result[0]['标题'], '货架标签缺失');
    assert.strictEqual(result[0]['门店'], '朝阳路店');
    assert.strictEqual(result[1]['分类'], '服务');
  });

  test('CSV 带 BOM 头正常解析', () => {
    const csvWithBOM = '\uFEFF标题,门店\nA,s1\nB,s2';
    const result = parseCSV(csvWithBOM);
    assert.strictEqual(result.length, 2);
    assert.strictEqual(result[0]['标题'], 'A');
  });

  test('CSV 带引号字段解析', () => {
    const csv = `标题,描述
"问题,带逗号","描述,有逗号"`;
    const result = parseCSV(csv);
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0]['标题'], '问题,带逗号');
    assert.strictEqual(result[0]['描述'], '描述,有逗号');
  });

  test('空 CSV 返回空数组', () => {
    assert.deepStrictEqual(parseCSV(''), []);
    assert.deepStrictEqual(parseCSV('只有表头'), []);
  });
});

section('csvParser：JSON 解析', () => {
  test('解析 JSON 数组', () => {
    const jsonStr = JSON.stringify([
      { title: 'A', storeId: 's1' },
      { title: 'B', storeId: 's2' }
    ]);
    const result = parseJSON(jsonStr);
    assert.strictEqual(result.length, 2);
    assert.strictEqual(result[0].title, 'A');
  });

  test('非数组 JSON 抛错', () => {
    assert.throws(() => parseJSON('{"a":1}'), /JSON数据必须是数组/);
  });
});

section('csvParser：按格式解析 parseByFormat', () => {
  test('csv 格式调用 parseCSV', () => {
    const csv = `标题,门店\nA,s1\nB,s2`;
    const r = parseByFormat('csv', csv);
    assert.strictEqual(r.length, 2);
  });

  test('json 格式调用 parseJSON', () => {
    const r = parseByFormat('json', '[{"a":1}]');
    assert.strictEqual(r.length, 1);
  });

  test('未知格式抛错', () => {
    assert.throws(() => parseByFormat('xml', ''), /不支持的格式/);
  });
});

// ================================================================
// 2. fieldNormalizer - 字段归一
// ================================================================
section('fieldNormalizer：字段归一化', () => {
  test('中文标题映射到 title', () => {
    assert.strictEqual(normalizeFieldKey('标题'), 'title');
  });

  test('英文 title 映射到 title', () => {
    assert.strictEqual(normalizeFieldKey('title'), 'title');
  });

  test('门店名称映射到 storeId', () => {
    assert.strictEqual(normalizeFieldKey('门店'), 'storeId');
  });

  test('storeId 原样保留', () => {
    assert.strictEqual(normalizeFieldKey('storeId'), 'storeId');
  });

  test('未知字段原样返回', () => {
    assert.strictEqual(normalizeFieldKey('自定义字段'), '自定义字段');
  });

  test('normalizeItem 转换整条记录', () => {
    const item = { '标题': 'A', '门店': 's1', '截止时间': '2026-01-01' };
    const normalized = normalizeItem(item);
    assert.strictEqual(normalized.title, 'A');
    assert.strictEqual(normalized.storeId, 's1');
    assert.strictEqual(normalized.deadline, '2026-01-01');
  });

  test('normalizeItems 批量转换', () => {
    const items = [
      { '标题': 'A' },
      { '标题': 'B' }
    ];
    const result = normalizeItems(items);
    assert.strictEqual(result[0].title, 'A');
    assert.strictEqual(result[1].title, 'B');
  });
});

// ================================================================
// 3. storeResolver - 门店解析
// ================================================================
const mockStores = [
  { id: 's1', name: '朝阳路店' },
  { id: 's2', name: '海淀店' },
  { id: 's3', name: '西城店' }
];
const mockUsers = [
  { id: 'u1', username: 'supervisor1', role: 'supervisor' },
  { id: 'u2', username: 'store1', role: 'store', storeId: 's1', name: '王店长' },
  { id: 'u3', username: 'store2', role: 'store', storeId: 's2', name: '李店长' }
];

section('storeResolver：门店解析', () => {
  test('通过门店 ID 解析成功', () => {
    const r = resolveStoreId('s1', mockStores);
    assert.strictEqual(r.resolved, true);
    assert.strictEqual(r.storeId, 's1');
  });

  test('通过门店名称解析成功', () => {
    const r = resolveStoreId('朝阳路店', mockStores);
    assert.strictEqual(r.resolved, true);
    assert.strictEqual(r.storeId, 's1');
  });

  test('空门店ID解析失败', () => {
    const r = resolveStoreId('', mockStores);
    assert.strictEqual(r.resolved, false);
    assert.ok(/缺少/.test(r.reason));
  });

  test('不存在的门店解析失败', () => {
    const r = resolveStoreId('不存在的店', mockStores);
    assert.strictEqual(r.resolved, false);
    assert.ok(/不存在/.test(r.reason));
  });

  test('查找门店用户成功', () => {
    const r = findStoreUser('s1', mockUsers);
    assert.strictEqual(r.found, true);
    assert.strictEqual(r.user.id, 'u2');
  });

  test('查找不存在门店的用户失败', () => {
    const r = findStoreUser('s99', mockUsers);
    assert.strictEqual(r.found, false);
    assert.ok(/不存在/.test(r.reason));
  });

  test('无门店用户的门店查找失败', () => {
    const r = findStoreUser('s3', mockUsers);
    assert.strictEqual(r.found, false);
  });
});

// ================================================================
// 4. validator - 单行校验
// ================================================================
section('validator：字段校验', () => {
  test('必填字段全部满足', () => {
    const r = validateRequiredFields({ title: 'A', storeId: 's1', deadline: '2026-01-01' });
    assert.strictEqual(r.valid, true);
  });

  test('缺 title 校验失败', () => {
    const r = validateRequiredFields({ storeId: 's1', deadline: '2026-01-01' });
    assert.strictEqual(r.valid, false);
    assert.ok(/title/.test(r.reason));
  });

  test('缺 storeId 校验失败', () => {
    const r = validateRequiredFields({ title: 'A', deadline: '2026-01-01' });
    assert.strictEqual(r.valid, false);
    assert.ok(/storeId/.test(r.reason));
  });

  test('缺 deadline 校验失败', () => {
    const r = validateRequiredFields({ title: 'A', storeId: 's1' });
    assert.strictEqual(r.valid, false);
    assert.ok(/deadline/.test(r.reason));
  });
});

section('validator：截止时间解析', () => {
  test('字符串日期解析成功', () => {
    const r = parseDeadline('2026-07-01');
    assert.strictEqual(r.valid, true);
    assert.strictEqual(typeof r.timestamp, 'number');
    assert.ok(r.timestamp > 0);
  });

  test('时间戳数字直接使用', () => {
    const ts = 1800000000000;
    const r = parseDeadline(ts);
    assert.strictEqual(r.valid, true);
    assert.strictEqual(r.timestamp, ts);
  });

  test('无效日期字符串解析失败', () => {
    const r = parseDeadline('not-a-date');
    assert.strictEqual(r.valid, false);
    assert.ok(/无效/.test(r.reason));
  });

  test('toDateString 格式化日期', () => {
    const d = new Date('2026-07-15T00:00:00').getTime();
    const s = toDateString(d);
    assert.strictEqual(s, '2026-07-15');
  });
});

// ================================================================
// 5. conflictDetector - 冲突判断
// ================================================================
const tsA = new Date('2026-08-15').getTime();
const tsB = new Date('2026-08-16').getTime();
const mockExistingIssues = [
  { title: '问题1', storeId: 's1', deadline: tsA },
  { title: '问题2', storeId: 's2', deadline: tsA }
];

section('conflictDetector：冲突判断', () => {
  test('标题+门店+截止时间 完全相同 → 冲突', () => {
    const item = { title: '问题1' };
    const r = checkConflict(item, 's1', tsA, mockExistingIssues);
    assert.strictEqual(r.conflict, true);
    assert.ok(/重复/.test(r.reason));
  });

  test('标题相同但门店不同 → 不冲突', () => {
    const item = { title: '问题1' };
    const r = checkConflict(item, 's2', tsA, mockExistingIssues);
    assert.strictEqual(r.conflict, false);
  });

  test('标题相同但截止日期不同 → 不冲突', () => {
    const item = { title: '问题1' };
    const r = checkConflict(item, 's1', tsB, mockExistingIssues);
    assert.strictEqual(r.conflict, false);
  });

  test('完全新的记录 → 不冲突', () => {
    const item = { title: '全新问题' };
    const r = checkConflict(item, 's1', tsA, mockExistingIssues);
    assert.strictEqual(r.conflict, false);
  });
});

// ================================================================
// 6. importService - 构造函数与主流程
// ================================================================
const mockCreator = { id: 'u1', name: '张督导', role: 'supervisor' };
const mockStoreUser = { id: 'u2', name: '王店长', role: 'store', storeId: 's1' };

section('importService：数据构造函数', () => {
  test('buildIssue 构造正确的问题对象', () => {
    const item = { title: '测试问题', description: '描述', category: '安全' };
    const issue = buildIssue(item, 's1', tsA, mockCreator, mockStoreUser, 'batch-1');
    assert.ok(issue.id && issue.id.startsWith('issue-'));
    assert.strictEqual(issue.title, '测试问题');
    assert.strictEqual(issue.storeId, 's1');
    assert.strictEqual(issue.creatorId, 'u1');
    assert.strictEqual(issue.responsibleId, 'u2');
    assert.strictEqual(issue.status, 'pending');
    assert.strictEqual(issue.category, '安全');
    assert.strictEqual(issue.importBatchId, 'batch-1');
    assert.strictEqual(issue.importSource, 'batch_import');
    assert.ok(Array.isArray(issue.timeline));
  });

  test('buildIssue 使用默认分类', () => {
    const item = { title: '无分类问题' };
    const issue = buildIssue(item, 's1', tsA, mockCreator, mockStoreUser, 'batch-1');
    assert.strictEqual(issue.category, '其他');
  });

  test('buildTimelineEntry 添加 imported 时间线', () => {
    const issue = { timeline: [], updatedAt: 0 };
    const entry = buildTimelineEntry(issue, mockCreator);
    assert.strictEqual(entry.action, 'imported');
    assert.strictEqual(entry.actionName, '批量导入');
    assert.strictEqual(entry.userId, 'u1');
    assert.strictEqual(issue.timeline.length, 1);
    assert.ok(issue.updatedAt > 0);
  });

  test('buildImportRecord 统计正确', () => {
    const results = [
      { index: 0, status: 'success' },
      { index: 1, status: 'success' },
      { index: 2, status: 'failed', reason: 'xxx' },
      { index: 3, status: 'skipped', reason: '重复' }
    ];
    const record = buildImportRecord('batch-1', mockCreator, 'csv', [1, 2, 3, 4], results);
    assert.strictEqual(record.id, 'batch-1');
    assert.strictEqual(record.totalCount, 4);
    assert.strictEqual(record.successCount, 2);
    assert.strictEqual(record.failedCount, 1);
    assert.strictEqual(record.skippedCount, 1);
    assert.strictEqual(record.creatorName, '张督导');
    assert.strictEqual(record.format, 'csv');
    assert.ok(record.createdAt > 0);
  });
});

section('importService：主流程 processImport', () => {
  test('JSON 格式：2条全部成功导入', () => {
    const importData = JSON.stringify([
      { title: '单元测试-问题A', storeId: 's1', deadline: '2026-12-01', category: '安全', description: '描述A' },
      { title: '单元测试-问题B', storeId: 's2', deadline: '2026-12-02', category: '服务', description: '描述B' }
    ]);
    const r = processImport({
      format: 'json',
      data: importData,
      creator: mockCreator,
      stores: mockStores,
      users: mockUsers,
      existingIssues: []
    });
    assert.ok(r.batchId && r.batchId.startsWith('import-'));
    assert.strictEqual(r.newIssues.length, 2);
    assert.strictEqual(r.resultSummary.successCount, 2);
    assert.strictEqual(r.resultSummary.failedCount, 0);
    assert.strictEqual(r.resultSummary.skippedCount, 0);
    assert.strictEqual(r.importRecord.totalCount, 2);
    assert.strictEqual(r.newIssues[0].storeId, 's1');
    assert.strictEqual(r.newIssues[1].storeId, 's2');
  });

  test('CSV 格式：通过门店名解析，全部成功', () => {
    const csvData = `标题,分类,门店,截止时间,描述
CSV测试1,卫生,朝阳路店,2026-12-03,CSV描述1
CSV测试2,质量,海淀店,2026-12-04,CSV描述2`;
    const r = processImport({
      format: 'csv',
      data: csvData,
      creator: mockCreator,
      stores: mockStores,
      users: mockUsers,
      existingIssues: []
    });
    assert.strictEqual(r.resultSummary.successCount, 2);
    assert.strictEqual(r.newIssues[0].storeId, 's1');
    assert.strictEqual(r.newIssues[0].category, '卫生');
    assert.strictEqual(r.newIssues[1].storeId, 's2');
  });

  test('混合数据：1成功 2失败 1跳过', () => {
    const existingIssues = [
      { title: '已存在问题', storeId: 's1', deadline: new Date('2026-12-10').getTime() }
    ];
    const importData = JSON.stringify([
      { title: '新问题', storeId: 's1', deadline: '2026-12-11' },
      { title: '', storeId: 's1', deadline: '2026-12-11' },
      { title: '已存在问题', storeId: 's1', deadline: '2026-12-10' },
      { title: '无效门店', storeId: '不存在的店', deadline: '2026-12-11' }
    ]);
    const r = processImport({
      format: 'json',
      data: importData,
      creator: mockCreator,
      stores: mockStores,
      users: mockUsers,
      existingIssues
    });
    assert.strictEqual(r.resultSummary.successCount, 1);
    assert.strictEqual(r.resultSummary.skippedCount, 1);
    assert.strictEqual(r.resultSummary.failedCount, 2);
    assert.strictEqual(r.resultSummary.totalCount, 4);
  });

  test('门店账号不存在 → 失败', () => {
    const importData = JSON.stringify([
      { title: '问题', storeId: 's3', deadline: '2026-12-20' }
    ]);
    const r = processImport({
      format: 'json',
      data: importData,
      creator: mockCreator,
      stores: mockStores,
      users: mockUsers,
      existingIssues: []
    });
    assert.strictEqual(r.resultSummary.successCount, 0);
    assert.strictEqual(r.resultSummary.failedCount, 1);
    assert.ok(/门店用户不存在/.test(r.resultSummary.results[0].reason));
  });

  test('重复导入相同数据 → 第2次全部跳过', () => {
    const importData = JSON.stringify([
      { title: '去重问题A', storeId: 's1', deadline: '2026-12-25' },
      { title: '去重问题B', storeId: 's2', deadline: '2026-12-26' }
    ]);
    const r1 = processImport({
      format: 'json',
      data: importData,
      creator: mockCreator,
      stores: mockStores,
      users: mockUsers,
      existingIssues: []
    });
    assert.strictEqual(r1.resultSummary.successCount, 2);
    const r2 = processImport({
      format: 'json',
      data: importData,
      creator: mockCreator,
      stores: mockStores,
      users: mockUsers,
      existingIssues: r1.newIssues
    });
    assert.strictEqual(r2.resultSummary.successCount, 0);
    assert.strictEqual(r2.resultSummary.skippedCount, 2);
  });
});

section('importService：导入记录查询', () => {
  const imports = [
    { id: 'batch-1', createdAt: 1000, creatorName: 'A' },
    { id: 'batch-3', createdAt: 3000, creatorName: 'C' },
    { id: 'batch-2', createdAt: 2000, creatorName: 'B' }
  ];
  test('listImportRecords 按时间倒序排列并分页', () => {
    const r = listImportRecords(imports, { page: 1, pageSize: 2 });
    assert.strictEqual(r.total, 3);
    assert.strictEqual(r.list.length, 2);
    assert.strictEqual(r.list[0].id, 'batch-3');
    assert.strictEqual(r.list[1].id, 'batch-2');
    const r2 = listImportRecords(imports, { page: 2, pageSize: 2 });
    assert.strictEqual(r2.list.length, 1);
    assert.strictEqual(r2.list[0].id, 'batch-1');
  });

  test('getImportRecordDetail 查询单条', () => {
    const r = getImportRecordDetail(imports, 'batch-2');
    assert.ok(r);
    assert.strictEqual(r.id, 'batch-2');
    assert.strictEqual(getImportRecordDetail(imports, 'nonexistent'), null);
  });
});

console.log(`\n══════════════════════════════`);
console.log(`  通过: ${passed}   失败: ${failed}`);
console.log(`══════════════════════════════`);
process.exit(failed > 0 ? 1 : 0);
