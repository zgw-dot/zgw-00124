function resolveStoreId(rawStoreId, stores) {
  if (!rawStoreId) {
    return { resolved: false, reason: '缺少门店字段' };
  }
  const storeById = stores.find(s => s.id === rawStoreId);
  if (storeById) {
    return { resolved: true, storeId: storeById.id };
  }
  const storeByName = stores.find(s => s.name === rawStoreId);
  if (storeByName) {
    return { resolved: true, storeId: storeByName.id };
  }
  return { resolved: false, reason: '门店不存在' };
}

function findStoreUser(resolvedStoreId, users) {
  const storeUser = users.find(u => u.storeId === resolvedStoreId && u.role === 'store');
  if (!storeUser) {
    return { found: false, reason: '门店用户不存在' };
  }
  return { found: true, user: storeUser };
}

module.exports = {
  resolveStoreId,
  findStoreUser
};
