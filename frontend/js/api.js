const API_BASE = 'http://localhost:3000/api';

const api = {
  async request(url, options = {}) {
    try {
      const res = await fetch(`${API_BASE}${url}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        }
      });
      const data = await res.json();
      return data;
    } catch (e) {
      console.error('API请求失败:', e);
      return { code: -1, message: '网络请求失败，请检查后端服务是否启动' };
    }
  },

  getUsers(role) {
    let url = '/users';
    if (role) {
      url += `?role=${role}`;
    }
    return this.request(url);
  },

  getUser(id) {
    return this.request(`/users/${id}`);
  },

  getStores() {
    return this.request('/stores');
  },

  getConfig() {
    return this.request('/config');
  },

  updateConfig(config) {
    return this.request('/config', {
      method: 'PUT',
      body: JSON.stringify(config)
    });
  },

  getIssues(params = {}) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '' && value !== null) {
        query.append(key, value);
      }
    });
    return this.request(`/issues?${query.toString()}`);
  },

  getIssue(id) {
    return this.request(`/issues/${id}`);
  },

  createIssue(data) {
    return this.request('/issues', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  acceptIssue(id, userId, remark) {
    return this.request(`/issues/${id}/accept`, {
      method: 'POST',
      body: JSON.stringify({ userId, remark })
    });
  },

  rectifyIssue(id, data) {
    return this.request(`/issues/${id}/rectify`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  recheckIssue(id, userId, passed, remark) {
    return this.request(`/issues/${id}/recheck`, {
      method: 'POST',
      body: JSON.stringify({ userId, passed, remark })
    });
  },

  requestExtension(id, userId, days, reason, remark) {
    return this.request(`/issues/${id}/extension`, {
      method: 'POST',
      body: JSON.stringify({ userId, days, reason, remark })
    });
  },

  approveExtension(id, userId, extensionId, remark) {
    return this.request(`/issues/${id}/extension/approve`, {
      method: 'POST',
      body: JSON.stringify({ userId, extensionId, remark })
    });
  },

  rejectExtension(id, userId, extensionId, remark) {
    return this.request(`/issues/${id}/extension/reject`, {
      method: 'POST',
      body: JSON.stringify({ userId, extensionId, remark })
    });
  },

  getDashboardStats(currentUserId, currentUserRole) {
    let url = '/dashboard/stats';
    const params = [];
    if (currentUserId) params.push(`currentUserId=${currentUserId}`);
    if (currentUserRole) params.push(`currentUserRole=${currentUserRole}`);
    if (params.length) url += '?' + params.join('&');
    return this.request(url);
  },

  getExportUrl(params = {}) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '' && value !== null) {
        query.append(key, value);
      }
    });
    return `${API_BASE}/export/issues?${query.toString()}`;
  },

  importIssues(creatorId, format, data) {
    return this.request('/issues/import', {
      method: 'POST',
      body: JSON.stringify({ creatorId, format, data })
    });
  },

  getImports(page = 1, pageSize = 20) {
    return this.request(`/imports?page=${page}&pageSize=${pageSize}`);
  },

  getImportDetail(id) {
    return this.request(`/imports/${id}`);
  }
};
