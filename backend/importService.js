const { parseByFormat } = require('./csvParser');
const { normalizeItems } = require('./fieldNormalizer');
const { resolveStoreId, findStoreUser } = require('./storeResolver');
const { validateRequiredFields, parseDeadline } = require('./validator');
const { checkConflict } = require('./conflictDetector');

function generateBatchId() {
  return `import-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function generateIssueId() {
  return `issue-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function buildImportRecord(batchId, creator, format, items, results) {
  let successCount = 0;
  let failedCount = 0;
  let skippedCount = 0;
  results.forEach(r => {
    if (r.status === 'success') successCount++;
    else if (r.status === 'failed') failedCount++;
    else if (r.status === 'skipped') skippedCount++;
  });
  return {
    id: batchId,
    creatorId: creator.id,
    creatorName: creator.name,
    format,
    totalCount: items.length,
    successCount,
    failedCount,
    skippedCount,
    results,
    createdAt: Date.now()
  };
}

function buildIssue(item, resolvedStoreId, deadlineTimestamp, creator, storeUser, batchId) {
  const now = Date.now();
  return {
    id: generateIssueId(),
    title: item.title,
    description: item.description || '',
    category: item.category || '其他',
    status: 'pending',
    storeId: resolvedStoreId,
    creatorId: creator.id,
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
}

function buildTimelineEntry(issue, creator) {
  const entry = {
    id: `t-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    action: 'imported',
    actionName: '批量导入',
    userId: creator.id,
    userName: creator.name,
    time: Date.now(),
    remark: '批量导入问题'
  };
  issue.timeline.push(entry);
  issue.updatedAt = Date.now();
  return entry;
}

function processImport({ format, data, creator, stores, users, existingIssues }) {
  const batchId = generateBatchId();
  const parsedItems = parseByFormat(format, data);
  const normalizedItems = normalizeItems(parsedItems);

  const results = [];
  const newIssues = [];

  normalizedItems.forEach((item, index) => {
    const fieldCheck = validateRequiredFields(item);
    if (!fieldCheck.valid) {
      results.push({ index, status: 'failed', reason: fieldCheck.reason });
      return;
    }

    const storeResolution = resolveStoreId(item.storeId, stores);
    if (!storeResolution.resolved) {
      results.push({ index, status: 'failed', reason: storeResolution.reason });
      return;
    }
    const resolvedStoreId = storeResolution.storeId;

    const storeUserCheck = findStoreUser(resolvedStoreId, users);
    if (!storeUserCheck.found) {
      results.push({ index, status: 'failed', reason: storeUserCheck.reason });
      return;
    }
    const storeUser = storeUserCheck.user;

    const deadlineCheck = parseDeadline(item.deadline);
    if (!deadlineCheck.valid) {
      results.push({ index, status: 'failed', reason: deadlineCheck.reason });
      return;
    }
    const deadlineTimestamp = deadlineCheck.timestamp;

    const conflictCheck = checkConflict(item, resolvedStoreId, deadlineTimestamp, existingIssues.concat(newIssues));
    if (conflictCheck.conflict) {
      results.push({ index, status: 'skipped', reason: conflictCheck.reason });
      return;
    }

    const newIssue = buildIssue(item, resolvedStoreId, deadlineTimestamp, creator, storeUser, batchId);
    buildTimelineEntry(newIssue, creator);
    newIssues.push(newIssue);
    results.push({ index, status: 'success', issueId: newIssue.id });
  });

  const importRecord = buildImportRecord(batchId, creator, format, normalizedItems, results);

  return {
    batchId,
    newIssues,
    importRecord,
    resultSummary: {
      batchId,
      totalCount: normalizedItems.length,
      successCount: importRecord.successCount,
      failedCount: importRecord.failedCount,
      skippedCount: importRecord.skippedCount,
      results
    }
  };
}

function listImportRecords(imports, { page = 1, pageSize = 20 } = {}) {
  const sorted = [...imports].sort((a, b) => b.createdAt - a.createdAt);
  const total = sorted.length;
  const start = (page - 1) * pageSize;
  const list = sorted.slice(start, start + pageSize);
  return { list, total, page, pageSize };
}

function getImportRecordDetail(imports, id) {
  return imports.find(r => r.id === id) || null;
}

module.exports = {
  generateBatchId,
  buildImportRecord,
  buildIssue,
  buildTimelineEntry,
  processImport,
  listImportRecords,
  getImportRecordDetail
};
