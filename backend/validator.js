function validateRequiredFields(item) {
  const missing = [];
  if (!item.title) missing.push('title');
  if (!item.storeId) missing.push('storeId');
  if (!item.deadline) missing.push('deadline');
  if (missing.length > 0) {
    return {
      valid: false,
      reason: `缺少必填字段(${missing.join('/')})`
    };
  }
  return { valid: true };
}

function parseDeadline(deadlineInput) {
  let timestamp;
  if (typeof deadlineInput === 'number') {
    timestamp = deadlineInput;
  } else {
    timestamp = new Date(deadlineInput).getTime();
  }
  if (isNaN(timestamp)) {
    return { valid: false, reason: '截止时间格式无效' };
  }
  return { valid: true, timestamp };
}

function toDateString(timestamp) {
  const d = new Date(timestamp);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

module.exports = {
  validateRequiredFields,
  parseDeadline,
  toDateString
};
