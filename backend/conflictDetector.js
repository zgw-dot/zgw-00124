const { toDateString } = require('./validator');

function checkConflict(item, resolvedStoreId, deadlineTimestamp, existingIssues) {
  const deadlineStr = toDateString(deadlineTimestamp);
  const conflict = existingIssues.find(existing => {
    if (existing.title !== item.title || existing.storeId !== resolvedStoreId) return false;
    const existingDeadlineStr = toDateString(existing.deadline);
    return existingDeadlineStr === deadlineStr;
  });
  if (conflict) {
    return { conflict: true, reason: '标题+门店+截止时间重复' };
  }
  return { conflict: false };
}

module.exports = {
  checkConflict
};
