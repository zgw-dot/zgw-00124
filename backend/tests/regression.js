const http = require('http');

const BASE = 'http://localhost:3000';
let passed = 0;
let failed = 0;

function request(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE + path);
    const opts = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: { 'Content-Type': 'application/json' }
    };
    const req = http.request(opts, (res) => {
      let data = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

function assert(condition, name, detail = '') {
  if (condition) {
    console.log(`  ✅  ${name}`);
    passed++;
  } else {
    console.log(`  ❌  ${name}  ${detail}`);
    failed++;
  }
}

async function section(title, fn) {
  console.log(`\n──────── ${title} ────────`);
  await fn();
}

(async function main() {
  console.log('巡店看板回归测试');
  console.log(`服务地址: ${BASE}`);

  // ---------- 准备工作 ----------
  const health = await request('GET', '/api/health');
  if (health.status !== 200 || health.body.code !== 0) {
    console.error('后端服务未启动，请先启动 backend/server.js');
    process.exit(1);
  }

  // 读取初始数据备份
  const { body: cfgBefore } = await request('GET', '/api/config');
  const backupCfg = { ...cfgBefore.data };

  // 1) 创建一个测试专用问题（截止 1 天前，分配给 s3 西城店）
  const oneDayAgo = Date.now() - 1 * 24 * 60 * 60 * 1000;
  const { body: createResp } = await request('POST', '/api/issues', {
    title: '回归测试-专用问题',
    description: '超期阈值回归测试专用，测试后请删除',
    category: '其他',
    storeId: 's3',
    deadline: oneDayAgo,
    attachments: [],
    creatorId: 'u1'
  });
  const testIssue = createResp.data;
  assert(testIssue && testIssue.id, '准备：创建测试问题（截止 1 天前，门店 s3）',
    testIssue ? `id=${testIssue.id}` : '创建失败');

  async function cleanup() {
    // 恢复配置
    await request('PUT', '/api/config', backupCfg);
    // 测试问题可留，打印提示
    console.log(`\n测试问题 ID: ${testIssue ? testIssue.id : '(未创建)'} —— 可在系统中手动清理`);
  }

  try {
    // ================================================================
    // Bug 1：门店详情越权
    // ================================================================
    await section('Bug #1 复现与验证：门店详情权限', async () => {
      const otherStoreIssueId = 'issue-001'; // s1 朝阳路店

      // 门店账号 u2（朝阳路店 s1）读 s3 的测试问题 —— 应 403
      const r1 = await request('GET',
        `/api/issues/${testIssue.id}?currentUserId=u2&currentUserRole=store`);
      assert(r1.body.code === 403,
        '门店(s1)读其他门店(s3)问题详情 → 返回 403',
        `实际 code=${r1.body.code} msg=${r1.body.message}`);

      // 门店账号 u4（西城店 s3）读自己门店的测试问题 —— 应 200
      const r2 = await request('GET',
        `/api/issues/${testIssue.id}?currentUserId=u4&currentUserRole=store`);
      assert(r2.body.code === 0 && r2.body.data && r2.body.data.id === testIssue.id,
        '门店(s3)读自己门店(s3)问题详情 → 返回 200',
        `实际 code=${r2.body.code}`);

      // 督导 u1 读任意门店问题（s1 的 issue-001）—— 应 200
      const r3 = await request('GET',
        `/api/issues/${otherStoreIssueId}?currentUserId=u1&currentUserRole=supervisor`);
      assert(r3.body.code === 0 && r3.body.data && r3.body.data.id === otherStoreIssueId,
        '督导读任意门店问题详情 → 返回 200',
        `实际 code=${r3.body.code}`);

      // 不带身份（匿名）读 —— 兼容旧行为，应仍能读到（不加限制）
      const r4 = await request('GET', `/api/issues/${otherStoreIssueId}`);
      assert(r4.body.code === 0 && r4.body.data,
        '不带身份参数读详情 → 兼容旧行为返回 200',
        `实际 code=${r4.body.code}`);
    });

    // ================================================================
    // Bug 2：超期阈值
    // ================================================================
    await section('Bug #2 复现与验证：overdueThresholdDays 阈值', async () => {
      // ---- 阈值 = 10 天：截止 1 天的问题不应算超期 ----
      await request('PUT', '/api/config', {
        overdueThresholdDays: 10,
        warningThresholdDays: 1
      });

      // 详情接口 isOverdue
      const detail = await request('GET',
        `/api/issues/${testIssue.id}?currentUserId=u1&currentUserRole=supervisor`);
      assert(detail.body.code === 0 && detail.body.data.isOverdue === false,
        '[阈值=10] 详情字段 isOverdue = false',
        `实际 isOverdue=${detail.body.data && detail.body.data.isOverdue}`);

      // 列表筛选 overdue=1 不应包含它
      const listOverdue = await request('GET',
        `/api/issues?overdue=1&pageSize=100&currentUserId=u1&currentUserRole=supervisor`);
      const hit1 = listOverdue.body.data.list.some(i => i.id === testIssue.id);
      assert(!hit1,
        '[阈值=10] 列表筛选 overdue=1 不包含测试问题',
        '结果中出现了该测试问题');

      // 列表筛选 overdue=0 应包含它
      const listNotOverdue = await request('GET',
        `/api/issues?overdue=0&pageSize=100&currentUserId=u1&currentUserRole=supervisor`);
      const hit0 = listNotOverdue.body.data.list.some(i => i.id === testIssue.id);
      assert(hit0,
        '[阈值=10] 列表筛选 overdue=0 包含测试问题',
        '结果中未出现该测试问题');

      // 仪表盘统计：该问题不计入 overdue 数量
      const stats10 = await request('GET',
        `/api/dashboard/stats?currentUserId=u1&currentUserRole=supervisor`);
      const s3Stats10 = stats10.body.data.byStore.find(s => s.storeId === 's3');
      // s3 原本还有 issue-003（截止 1 天前），阈值 10 天时也不算超期
      // 所以 s3 overdue 应该为 0
      assert(s3Stats10 && s3Stats10.overdue === 0,
        '[阈值=10] 按门店统计 s3.overdue = 0',
        `实际 overdue=${s3Stats10 && s3Stats10.overdue}`);

      // ---- 阈值 = 0 天：截止 1 天的问题应该算超期（同步变化） ----
      await request('PUT', '/api/config', {
        overdueThresholdDays: 0,
        warningThresholdDays: 1
      });

      const detail0 = await request('GET',
        `/api/issues/${testIssue.id}?currentUserId=u1&currentUserRole=supervisor`);
      assert(detail0.body.code === 0 && detail0.body.data.isOverdue === true,
        '[阈值=0] 详情字段 isOverdue = true',
        `实际 isOverdue=${detail0.body.data && detail0.body.data.isOverdue}`);

      const listOverdue0 = await request('GET',
        `/api/issues?overdue=1&pageSize=100&currentUserId=u1&currentUserRole=supervisor`);
      const hit1_0 = listOverdue0.body.data.list.some(i => i.id === testIssue.id);
      assert(hit1_0,
        '[阈值=0] 列表筛选 overdue=1 包含测试问题',
        '结果中未出现该测试问题');

      const stats0 = await request('GET',
        `/api/dashboard/stats?currentUserId=u1&currentUserRole=supervisor`);
      const s3Stats0 = stats0.body.data.byStore.find(s => s.storeId === 's3');
      // 现在 issue-003 和测试问题都算超期
      assert(s3Stats0 && s3Stats0.overdue >= 1,
        '[阈值=0] 按门店统计 s3.overdue ≥ 1（同步变化）',
        `实际 overdue=${s3Stats0 && s3Stats0.overdue}`);

      // ---- 恢复阈值 = 10 天，再确认统计回去了 ----
      await request('PUT', '/api/config', {
        overdueThresholdDays: 10,
        warningThresholdDays: 1
      });
      const statsBack = await request('GET',
        `/api/dashboard/stats?currentUserId=u1&currentUserRole=supervisor`);
      const s3Back = statsBack.body.data.byStore.find(s => s.storeId === 's3');
      assert(s3Back && s3Back.overdue === 0,
        '[阈值=10 恢复] 按门店统计 s3.overdue 回到 0',
        `实际 overdue=${s3Back && s3Back.overdue}`);
    });

    // ================================================================
    // 导出接口也使用正确的阈值判定
    // ================================================================
    await section('导出接口超期标记一致性', async () => {
      await request('PUT', '/api/config', {
        overdueThresholdDays: 10,
        warningThresholdDays: 1
      });
      const exp = await request('GET',
        `/api/export/issues?currentUserId=u1&currentUserRole=supervisor`);
      const csv = exp.raw || '';
      const lines = csv.split('\n');
      const testLine = lines.find(l => l.includes(testIssue.id));
      assert(testLine && testLine.includes(',否,'),
        '[阈值=10] 导出 CSV 中测试问题的「是否逾期」= 否',
        testLine ? `匹配行内容: ${testLine}` : 'CSV 中没找到测试问题');
    });

    // ================================================================
    // 批量导入：门店账号权限拦截
    // ================================================================
    await section('批量导入：门店账号权限拦截', async () => {
      const r1 = await request('POST', '/api/issues/import', {
        creatorId: 'u2',
        format: 'json',
        data: JSON.stringify([{ title: 'test', storeId: 's1', deadline: '2026-07-01' }])
      });
      assert(r1.body.code === 403,
        '门店账号(u2)调用导入接口 → 返回 403',
        `实际 code=${r1.body.code} msg=${r1.body.message}`);

      const r2 = await request('POST', '/api/issues/import', {
        creatorId: 'u3',
        format: 'json',
        data: JSON.stringify([{ title: 'test', storeId: 's2', deadline: '2026-07-01' }])
      });
      assert(r2.body.code === 403,
        '门店账号(u3)调用导入接口 → 返回 403',
        `实际 code=${r2.body.code}`);
    });

    // ================================================================
    // 批量导入：正常导入 + 冲突跳过
    // ================================================================
    await section('批量导入：正常导入与冲突跳过', async () => {
      const futureDeadline = '2026-08-15';
      const importData = [
        { title: '导入测试-问题A', storeId: 's1', deadline: futureDeadline, category: '安全', description: '导入测试A' },
        { title: '导入测试-问题B', storeId: 's2', deadline: futureDeadline, category: '服务', description: '导入测试B' }
      ];

      const r1 = await request('POST', '/api/issues/import', {
        creatorId: 'u1',
        format: 'json',
        data: JSON.stringify(importData)
      });
      assert(r1.body.code === 0,
        '督导批量导入2条问题 → code=0',
        `实际 code=${r1.body.code}`);
      assert(r1.body.data.successCount === 2,
        '成功数量 = 2',
        `实际 successCount=${r1.body.data.successCount}`);
      assert(r1.body.data.failedCount === 0,
        '失败数量 = 0',
        `实际 failedCount=${r1.body.data.failedCount}`);
      assert(r1.body.data.skippedCount === 0,
        '跳过数量 = 0',
        `实际 skippedCount=${r1.body.data.skippedCount}`);
      assert(r1.body.data.batchId && r1.body.data.batchId.startsWith('import-'),
        '返回批次ID，以 import- 开头',
        `实际 batchId=${r1.body.data.batchId}`);

      const batchId1 = r1.body.data.batchId;

      const r2 = await request('POST', '/api/issues/import', {
        creatorId: 'u1',
        format: 'json',
        data: JSON.stringify(importData)
      });
      assert(r2.body.code === 0,
        '重复导入相同数据 → code=0',
        `实际 code=${r2.body.code}`);
      assert(r2.body.data.skippedCount === 2,
        '冲突跳过数量 = 2',
        `实际 skippedCount=${r2.body.data.skippedCount}`);
      assert(r2.body.data.successCount === 0,
        '重复导入成功数量 = 0',
        `实际 successCount=${r2.body.data.successCount}`);
      const skipResult = r2.body.data.results.find(r => r.status === 'skipped');
      assert(skipResult && skipResult.reason === '标题+门店+截止时间重复',
        '跳过原因为"标题+门店+截止时间重复"',
        `实际 reason=${skipResult && skipResult.reason}`);

      const detail = await request('GET',
        `/api/issues/${r1.body.data.results[0].issueId}?currentUserId=u1&currentUserRole=supervisor`);
      assert(detail.body.code === 0 && detail.body.data.importBatchId === batchId1,
        '导入的问题包含 importBatchId 字段',
        `实际 importBatchId=${detail.body.data && detail.body.data.importBatchId}`);
      assert(detail.body.data.importSource === 'batch_import',
        '导入的问题 importSource = batch_import',
        `实际 importSource=${detail.body.data && detail.body.data.importSource}`);

      const hasImportedTimeline = detail.body.data.timeline.some(t => t.action === 'imported');
      assert(hasImportedTimeline,
        '导入问题的时间线包含 imported 操作',
        '');
    });

    // ================================================================
    // 批量导入：部分失败
    // ================================================================
    await section('批量导入：部分失败', async () => {
      const mixedData = [
        { title: '部分失败-成功', storeId: 's1', deadline: '2026-09-01', description: '应该成功' },
        { title: '', storeId: 's1', deadline: '2026-09-01', description: '缺标题应失败' },
        { title: '部分失败-缺门店', storeId: '', deadline: '2026-09-01', description: '缺门店应失败' },
        { title: '部分失败-缺截止', storeId: 's1', deadline: '', description: '缺截止时间应失败' },
        { title: '部分失败-无效门店', storeId: '不存在的店', deadline: '2026-09-01', description: '门店不存在应失败' }
      ];

      const r1 = await request('POST', '/api/issues/import', {
        creatorId: 'u1',
        format: 'json',
        data: JSON.stringify(mixedData)
      });
      assert(r1.body.code === 0,
        '混合数据导入 → code=0',
        `实际 code=${r1.body.code}`);
      assert(r1.body.data.successCount === 1,
        '成功数量 = 1',
        `实际 successCount=${r1.body.data.successCount}`);
      assert(r1.body.data.failedCount === 4,
        '失败数量 = 4',
        `实际 failedCount=${r1.body.data.failedCount}`);
    });

    // ================================================================
    // 批量导入：CSV 格式
    // ================================================================
    await section('批量导入：CSV 格式支持', async () => {
      const csvData = `标题,分类,门店,截止时间,描述
CSV导入测试1,安全,朝阳路店,2026-10-01,通过门店名解析
CSV导入测试2,服务,s2,2026-10-02,通过门店ID导入`;

      const r1 = await request('POST', '/api/issues/import', {
        creatorId: 'u1',
        format: 'csv',
        data: csvData
      });
      assert(r1.body.code === 0,
        'CSV格式导入 → code=0',
        `实际 code=${r1.body.code}`);
      assert(r1.body.data.successCount === 2,
        'CSV导入成功数量 = 2',
        `实际 successCount=${r1.body.data.successCount}`);

      const detail1 = await request('GET',
        `/api/issues/${r1.body.data.results[0].issueId}?currentUserId=u1&currentUserRole=supervisor`);
      assert(detail1.body.data.storeId === 's1',
        'CSV"朝阳路店"解析为 storeId=s1',
        `实际 storeId=${detail1.body.data && detail1.body.data.storeId}`);
      assert(detail1.body.data.category === '安全',
        'CSV分类字段正确映射为"安全"',
        `实际 category=${detail1.body.data && detail1.body.data.category}`);
    });

    // ================================================================
    // 导入记录持久化：导入后可查询
    // ================================================================
    await section('导入记录持久化与查询', async () => {
      const r1 = await request('GET', '/api/imports');
      assert(r1.body.code === 0 && r1.body.data.list.length > 0,
        'GET /api/imports 返回导入记录列表',
        `实际 list.length=${r1.body.data && r1.body.data.list.length}`);

      const firstRecord = r1.body.data.list[0];
      assert(firstRecord.id && firstRecord.creatorName && firstRecord.createdAt,
        '导入记录包含 id, creatorName, createdAt',
        '');

      const r2 = await request('GET', `/api/imports/${firstRecord.id}`);
      assert(r2.body.code === 0 && r2.body.data.id === firstRecord.id,
        'GET /api/imports/:id 返回单条记录',
        `实际 code=${r2.body.code}`);
      assert(r2.body.data.results && Array.isArray(r2.body.data.results),
        '导入记录详情包含 results 数组',
        '');

      const r3 = await request('GET', '/api/imports/999-nonexistent');
      assert(r3.body.code === 404,
        '查询不存在的导入记录 → 404',
        `实际 code=${r3.body.code}`);
    });

    // ================================================================
    // 导出 CSV 包含导入批次和来源字段
    // ================================================================
    await section('导出 CSV 包含导入批次和来源字段', async () => {
      const exp = await request('GET',
        `/api/export/issues?currentUserId=u1&currentUserRole=supervisor`);
      const csv = exp.raw || '';
      const headerLine = csv.split('\n')[0];
      assert(headerLine.includes('导入批次ID'),
        'CSV 表头包含"导入批次ID"列',
        `实际表头: ${headerLine}`);
      assert(headerLine.includes('导入来源'),
        'CSV 表头包含"导入来源"列',
        `实际表头: ${headerLine}`);

      const importIssueLine = csv.split('\n').find(l => l.includes('导入测试-问题A'));
      assert(importIssueLine && importIssueLine.includes('batch_import'),
        '导入问题的行包含 batch_import 来源标记',
        importIssueLine ? '找到行但无标记' : '未找到行');

      const manualLine = csv.split('\n').find(l => l.includes('回归测试-专用问题'));
      assert(manualLine && manualLine.includes('manual'),
        '手动创建的问题行包含 manual 来源标记',
        manualLine ? '找到行但无标记' : '未找到行');
    });

  } catch (err) {
    console.error('测试执行异常:', err);
  } finally {
    await cleanup();
  }

  console.log(`\n══════════════════════════════`);
  console.log(`  通过: ${passed}   失败: ${failed}`);
  console.log(`══════════════════════════════`);
  process.exit(failed > 0 ? 1 : 0);
})();
