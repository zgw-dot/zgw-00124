const FIELD_ALIASES = {
  '标题': 'title', 'title': 'title',
  '分类': 'category', 'category': 'category',
  '门店': 'storeId', '门店ID': 'storeId', 'storeId': 'storeId', 'store': 'storeId',
  '截止时间': 'deadline', '截止日期': 'deadline', 'deadline': 'deadline',
  '描述': 'description', 'description': 'description', '说明': 'description'
};

function normalizeFieldKey(key) {
  const trimmed = key.trim();
  const lowerTrimmed = trimmed.toLowerCase();
  return FIELD_ALIASES[lowerTrimmed] || FIELD_ALIASES[trimmed] || trimmed;
}

function normalizeItem(item) {
  const normalized = {};
  Object.keys(item).forEach(key => {
    const mapped = normalizeFieldKey(key);
    normalized[mapped] = item[key];
  });
  return normalized;
}

function normalizeItems(items) {
  return items.map(normalizeItem);
}

module.exports = {
  FIELD_ALIASES,
  normalizeFieldKey,
  normalizeItem,
  normalizeItems
};
