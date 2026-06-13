function initModalClose() {
  const overlay = document.getElementById('modalOverlay');
  const closeBtn = document.getElementById('modalClose');
  
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      closeModal();
    }
  });
  
  closeBtn.addEventListener('click', closeModal);
  
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && overlay.style.display !== 'none') {
      closeModal();
    }
  });
}

function openModal(title, bodyHtml, footerHtml) {
  document.getElementById('modalTitle').textContent = title;
  document.getElementById('modalBody').innerHTML = bodyHtml;
  document.getElementById('modalFooter').innerHTML = footerHtml;
  document.getElementById('modalOverlay').style.display = 'flex';
}

function closeModal() {
  document.getElementById('modalOverlay').style.display = 'none';
}

function openCreateModal() {
  const user = getCurrentUser();
  if (user.role !== 'supervisor') {
    showToast('只有督导可以创建问题', 'error');
    return;
  }

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 3);
  const defaultDeadline = tomorrow.toISOString().slice(0, 16);

  const storesOptions = stores.map(s => 
    `<option value="${s.id}">${s.name}</option>`
  ).join('');

  const bodyHtml = `
    <form id="createForm">
      <div class="form-group">
        <label>问题标题 *</label>
        <input type="text" id="createTitle" required placeholder="请输入问题标题">
      </div>
      <div class="form-group">
        <label>问题分类</label>
        <select id="createCategory">
          <option value="安全">安全</option>
          <option value="服务">服务</option>
          <option value="质量">质量</option>
          <option value="卫生">卫生</option>
          <option value="其他">其他</option>
        </select>
      </div>
      <div class="form-group">
        <label>分派门店 *</label>
        <select id="createStoreId" required>
          ${storesOptions}
        </select>
      </div>
      <div class="form-group">
        <label>截止时间 *</label>
        <input type="datetime-local" id="createDeadline" required value="${defaultDeadline}">
      </div>
      <div class="form-group">
        <label>问题描述</label>
        <textarea id="createDescription" placeholder="请详细描述问题..." rows="3"></textarea>
      </div>
      <div class="form-group">
        <label>附件图片（本地路径模拟，用逗号分隔）</label>
        <input type="text" id="createAttachments" placeholder="/mock/images/xxx.jpg,/mock/images/yyy.jpg">
        <p class="form-help">多个路径用英文逗号分隔，示例：/mock/images/photo1.jpg</p>
      </div>
    </form>
  `;

  const footerHtml = `
    <button class="btn btn-secondary" onclick="closeModal()">取消</button>
    <button class="btn btn-primary" onclick="submitCreate()">创建问题</button>
  `;

  openModal('创建巡检问题', bodyHtml, footerHtml);
}

async function submitCreate() {
  const title = document.getElementById('createTitle').value.trim();
  const category = document.getElementById('createCategory').value;
  const storeId = document.getElementById('createStoreId').value;
  const deadline = document.getElementById('createDeadline').value;
  const description = document.getElementById('createDescription').value.trim();
  const attachmentsStr = document.getElementById('createAttachments').value.trim();

  if (!title) {
    showToast('请输入问题标题', 'error');
    return;
  }
  if (!storeId) {
    showToast('请选择门店', 'error');
    return;
  }
  if (!deadline) {
    showToast('请选择截止时间', 'error');
    return;
  }

  const user = getCurrentUser();
  const attachments = attachmentsStr ? attachmentsStr.split(',').map(s => s.trim()).filter(s => s) : [];

  const res = await api.createIssue({
    title,
    description,
    category,
    storeId,
    deadline: new Date(deadline).getTime(),
    attachments,
    creatorId: user.userId
  });

  if (res.code === 0) {
    showToast('问题创建成功', 'success');
    closeModal();
    refreshCurrentPage();
  } else {
    showToast(res.message || '创建失败', 'error');
  }
}

async function openIssueDetail(issueId) {
  const user = getCurrentUser();
  const res = await api.getIssue(issueId);
  
  if (res.code !== 0) {
    showToast(res.message || '加载失败', 'error');
    return;
  }

  const issue = res.data;
  const isStoreUser = user.role === 'store' && user.storeId === issue.storeId;
  const isSupervisor = user.role === 'supervisor';

  const bodyHtml = `
    <div class="issue-detail-header">
      <div class="issue-detail-title">${issue.title}</div>
      <div class="issue-detail-meta">
        <span class="issue-detail-meta-item">
          <span>🏪</span> ${getStoreName(issue.storeId)}
        </span>
        <span class="issue-detail-meta-item">
          <span>👤</span> 责任人: ${issue.responsibleName}
        </span>
        <span class="issue-detail-meta-item">
          <span>📅</span> 创建人: ${issue.creatorName}
        </span>
        <span class="status-badge status-${issue.status}">${issue.statusText}</span>
        ${issue.isOverdue ? '<span class="overdue-badge">已逾期</span>' : ''}
      </div>
    </div>

    <div class="issue-detail-section">
      <h4>基本信息</h4>
      <div class="issue-detail-content">
        <p><strong>分类：</strong>${issue.category || '未分类'}</p>
        <p><strong>截止时间：</strong>${formatDate(issue.deadline)}</p>
        <p><strong>创建时间：</strong>${formatDate(issue.createdAt)}</p>
        <p><strong>更新时间：</strong>${formatDate(issue.updatedAt)}</p>
      </div>
    </div>

    <div class="issue-detail-section">
      <h4>问题描述</h4>
      <div class="issue-detail-content">
        ${issue.description || '无描述'}
      </div>
    </div>

    ${issue.attachments && issue.attachments.length ? `
    <div class="issue-detail-section">
      <h4>问题附件</h4>
      <div class="attachment-list">
        ${issue.attachments.map((att, idx) => `
          <div class="attachment-item" title="${att}" onclick="window.open('http://localhost:3000${att}', '_blank')">
            📷
          </div>
        `).join('')}
      </div>
    </div>
    ` : ''}

    ${issue.rectifyContent ? `
    <div class="issue-detail-section">
      <h4>整改内容</h4>
      <div class="issue-detail-content">
        ${issue.rectifyContent}
      </div>
    </div>
    ` : ''}

    ${issue.rectifyAttachments && issue.rectifyAttachments.length ? `
    <div class="issue-detail-section">
      <h4>整改附件</h4>
      <div class="attachment-list">
        ${issue.rectifyAttachments.map((att, idx) => `
          <div class="attachment-item" title="${att}" onclick="window.open('http://localhost:3000${att}', '_blank')">
            📷
          </div>
        `).join('')}
      </div>
    </div>
    ` : ''}

    ${issue.extensionHistory && issue.extensionHistory.length ? `
    <div class="issue-detail-section">
      <h4>延期记录</h4>
      <div class="issue-detail-content">
        ${issue.extensionHistory.map(ext => `
          <div style="margin-bottom:12px;padding-bottom:12px;border-bottom:1px solid var(--border);">
            <div style="font-weight:500;margin-bottom:4px;">
              申请延期 ${ext.requestDays} 天 - 
              <span style="font-size:12px;color:var(--text-light);">
                ${ext.status === 'approved' ? '已批准' : ext.status === 'rejected' ? '已驳回' : '待审批'}
              </span>
            </div>
            <div style="font-size:13px;color:var(--gray-600);margin-bottom:4px;">
              原因：${ext.reason}
            </div>
            <div style="font-size:12px;color:var(--text-light);">
              申请人：${ext.requesterName} · ${formatDate(ext.requestedAt)}
              ${ext.approvedAt ? ` · 审批人：${ext.approverName} · ${formatDate(ext.approvedAt)}` : ''}
            </div>
          </div>
        `).join('')}
      </div>
    </div>
    ` : ''}

    <div class="issue-detail-section">
      <h4>操作时间线</h4>
      <div class="timeline">
        ${issue.timeline.slice().reverse().map(item => `
          <div class="timeline-item">
            <div class="timeline-dot ${item.action}"></div>
            <div class="timeline-content">
              <div class="timeline-header">
                <span class="timeline-action">${item.actionName}</span>
                <span class="timeline-time">${formatDate(item.time)}</span>
              </div>
              <div class="timeline-user">操作人：${item.userName}</div>
              ${item.remark ? `<div class="timeline-remark">${item.remark}</div>` : ''}
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;

  let footerBtns = '';
  
  if (isStoreUser) {
    if (issue.status === 'pending' || issue.status === 'rejected') {
      footerBtns += `<button class="btn btn-primary" onclick="handleAcceptFromDetail('${issue.id}')">接单</button>`;
    }
    if (issue.status === 'rectifying') {
      footerBtns += `<button class="btn btn-success" onclick="openRectifyModal('${issue.id}')">提交整改</button>`;
      footerBtns += `<button class="btn btn-warning" onclick="openExtensionModal('${issue.id}')">申请延期</button>`;
    }
  }
  
  if (isSupervisor && issue.status === 'rechecking') {
    footerBtns += `<button class="btn btn-danger" onclick="openRecheckModal('${issue.id}', false)">复验不通过</button>`;
    footerBtns += `<button class="btn btn-success" onclick="openRecheckModal('${issue.id}', true)">复验通过</button>`;
  }

  if (isSupervisor) {
    const pendingExtension = issue.extensionHistory && issue.extensionHistory.find(e => e.status === 'pending');
    if (pendingExtension) {
      footerBtns += `<button class="btn btn-danger" onclick="handleRejectExtension('${issue.id}', '${pendingExtension.id}')">驳回延期</button>`;
      footerBtns += `<button class="btn btn-success" onclick="handleApproveExtension('${issue.id}', '${pendingExtension.id}')">批准延期</button>`;
    }
  }

  footerBtns += `<button class="btn btn-secondary" onclick="closeModal()">关闭</button>`;

  openModal('问题详情', bodyHtml, footerBtns);
}

async function handleAcceptFromDetail(issueId) {
  const user = getCurrentUser();
  const res = await api.acceptIssue(issueId, user.userId, '');
  if (res.code === 0) {
    showToast('接单成功', 'success');
    closeModal();
    refreshCurrentPage();
  } else {
    showToast(res.message || '接单失败', 'error');
  }
}

function openRectifyModal(issueId) {
  closeModal();
  
  const bodyHtml = `
    <form id="rectifyForm">
      <div class="form-group">
        <label>整改内容 *</label>
        <textarea id="rectifyContent" required placeholder="请详细描述整改措施和结果..." rows="4"></textarea>
      </div>
      <div class="form-group">
        <label>整改附件（本地路径模拟，用逗号分隔）</label>
        <input type="text" id="rectifyAttachments" placeholder="/mock/images/xxx.jpg">
        <p class="form-help">多个路径用英文逗号分隔</p>
      </div>
      <div class="form-group">
        <label>备注</label>
        <textarea id="rectifyRemark" placeholder="补充说明..." rows="2"></textarea>
      </div>
    </form>
  `;

  const footerHtml = `
    <button class="btn btn-secondary" onclick="closeModal()">取消</button>
    <button class="btn btn-primary" onclick="submitRectify('${issueId}')">提交整改</button>
  `;

  openModal('提交整改', bodyHtml, footerHtml);
}

async function submitRectify(issueId) {
  const content = document.getElementById('rectifyContent').value.trim();
  const attachmentsStr = document.getElementById('rectifyAttachments').value.trim();
  const remark = document.getElementById('rectifyRemark').value.trim();

  if (!content) {
    showToast('请填写整改内容', 'error');
    return;
  }

  const user = getCurrentUser();
  const attachments = attachmentsStr ? attachmentsStr.split(',').map(s => s.trim()).filter(s => s) : [];

  const res = await api.rectifyIssue(issueId, {
    userId: user.userId,
    content,
    attachments,
    remark
  });

  if (res.code === 0) {
    showToast('整改提交成功', 'success');
    closeModal();
    refreshCurrentPage();
  } else {
    showToast(res.message || '提交失败', 'error');
  }
}

function openExtensionModal(issueId) {
  closeModal();
  
  const bodyHtml = `
    <form id="extensionForm">
      <div class="form-group">
        <label>延期天数 *</label>
        <input type="number" id="extensionDays" min="1" max="30" value="3" required>
      </div>
      <div class="form-group">
        <label>延期原因 *</label>
        <textarea id="extensionReason" required placeholder="请详细说明延期原因..." rows="3"></textarea>
      </div>
      <div class="form-group">
        <label>备注</label>
        <textarea id="extensionRemark" placeholder="补充说明..." rows="2"></textarea>
      </div>
    </form>
  `;

  const footerHtml = `
    <button class="btn btn-secondary" onclick="closeModal()">取消</button>
    <button class="btn btn-primary" onclick="submitExtension('${issueId}')">提交申请</button>
  `;

  openModal('申请延期', bodyHtml, footerHtml);
}

async function submitExtension(issueId) {
  const days = parseInt(document.getElementById('extensionDays').value);
  const reason = document.getElementById('extensionReason').value.trim();
  const remark = document.getElementById('extensionRemark').value.trim();

  if (!days || days <= 0) {
    showToast('请输入有效的延期天数', 'error');
    return;
  }
  if (!reason) {
    showToast('请填写延期原因', 'error');
    return;
  }

  const user = getCurrentUser();

  const res = await api.requestExtension(issueId, user.userId, days, reason, remark);

  if (res.code === 0) {
    showToast('延期申请已提交', 'success');
    closeModal();
    refreshCurrentPage();
  } else {
    showToast(res.message || '提交失败', 'error');
  }
}

function openRecheckModal(issueId, passed = null) {
  closeModal();
  
  const title = passed === true ? '复验通过' : passed === false ? '复验不通过' : '复验';
  const defaultRemark = passed === false ? '整改不达标，请重新整改' : '复验通过';
  
  const bodyHtml = `
    <form id="recheckForm">
      <div class="form-group">
        <label>复验结果</label>
        <select id="recheckResult">
          <option value="true" ${passed === true ? 'selected' : ''}>通过</option>
          <option value="false" ${passed === false ? 'selected' : ''}>不通过</option>
        </select>
      </div>
      <div class="form-group">
        <label>复验备注</label>
        <textarea id="recheckRemark" placeholder="请填写复验意见..." rows="3">${defaultRemark}</textarea>
      </div>
    </form>
  `;

  const footerHtml = `
    <button class="btn btn-secondary" onclick="closeModal()">取消</button>
    <button class="btn btn-primary" onclick="submitRecheck('${issueId}')">确认</button>
  `;

  openModal(title, bodyHtml, footerHtml);
}

async function submitRecheck(issueId) {
  const passed = document.getElementById('recheckResult').value === 'true';
  const remark = document.getElementById('recheckRemark').value.trim();

  const user = getCurrentUser();

  const res = await api.recheckIssue(issueId, user.userId, passed, remark);

  if (res.code === 0) {
    showToast(passed ? '复验通过，问题已关闭' : '复验不通过，已退回整改', 'success');
    closeModal();
    refreshCurrentPage();
  } else {
    showToast(res.message || '操作失败', 'error');
  }
}

async function handleApproveExtension(issueId, extensionId) {
  if (!confirm('确定批准该延期申请吗？')) return;
  
  const user = getCurrentUser();
  const res = await api.approveExtension(issueId, user.userId, extensionId, '');
  
  if (res.code === 0) {
    showToast('延期已批准', 'success');
    closeModal();
    refreshCurrentPage();
  } else {
    showToast(res.message || '操作失败', 'error');
  }
}

async function handleRejectExtension(issueId, extensionId) {
  if (!confirm('确定驳回该延期申请吗？')) return;
  
  const user = getCurrentUser();
  const res = await api.rejectExtension(issueId, user.userId, extensionId, '');
  
  if (res.code === 0) {
    showToast('延期已驳回', 'success');
    closeModal();
    refreshCurrentPage();
  } else {
    showToast(res.message || '操作失败', 'error');
  }
}

function openImportModal() {
  const user = getCurrentUser();
  if (user.role !== 'supervisor') {
    showToast('门店账号不能导入问题', 'error');
    return;
  }

  const sampleCSV = `标题,分类,门店,截止时间,描述
货架标签缺失,卫生,朝阳路店,2026-07-01,价签缺失需要补齐
收银台排队过长,服务,海淀店,2026-07-15,高峰期排队超过15分钟`;

  const sampleJSON = JSON.stringify([
    { title: '货架标签缺失', category: '卫生', storeId: '朝阳路店', deadline: '2026-07-01', description: '价签缺失需要补齐' },
    { title: '收银台排队过长', category: '服务', storeId: '海淀店', deadline: '2026-07-15', description: '高峰期排队超过15分钟' }
  ], null, 2);

  const bodyHtml = `
    <form id="importForm">
      <div class="form-group">
        <label>导入格式 *</label>
        <select id="importFormat">
          <option value="csv">CSV</option>
          <option value="json">JSON</option>
        </select>
        <p class="form-help">支持 CSV 和 JSON 两种格式</p>
      </div>
      <div class="form-group">
        <label>上传文件</label>
        <input type="file" id="importFile" accept=".csv,.json,.txt">
        <p class="form-help">选择 .csv 或 .json 文件</p>
      </div>
      <div class="form-group">
        <label>或直接粘贴数据 *</label>
        <textarea id="importData" rows="8" placeholder="在此粘贴 CSV 或 JSON 数据..."></textarea>
      </div>
      <div class="form-group">
        <label>字段说明</label>
        <div class="import-field-help">
          <p><strong>必填字段：</strong>标题(title)、门店(storeId，可用门店名称如"朝阳路店")、截止时间(deadline，格式 YYYY-MM-DD)</p>
          <p><strong>可选字段：</strong>分类(category，默认"其他")、描述(description)</p>
          <p><strong>冲突规则：</strong>标题+门店+截止时间相同的记录会被跳过，不会覆盖已有数据</p>
        </div>
      </div>
      <div class="import-sample">
        <div class="import-sample-tabs">
          <button type="button" class="sample-tab active" data-format="csv" onclick="switchSampleTab('csv')">CSV 示例</button>
          <button type="button" class="sample-tab" data-format="json" onclick="switchSampleTab('json')">JSON 示例</button>
        </div>
        <pre class="sample-code" id="sampleCSV">${sampleCSV}</pre>
        <pre class="sample-code" id="sampleJSON" style="display:none">${sampleJSON}</pre>
      </div>
    </form>
  `;

  const footerHtml = `
    <button class="btn btn-secondary" onclick="closeModal()">取消</button>
    <button class="btn btn-primary" onclick="submitImport()">开始导入</button>
  `;

  openModal('批量导入问题', bodyHtml, footerHtml);

  document.getElementById('importFile').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(ev) {
      document.getElementById('importData').value = ev.target.result;
      if (file.name.endsWith('.json')) {
        document.getElementById('importFormat').value = 'json';
      } else {
        document.getElementById('importFormat').value = 'csv';
      }
    };
    reader.readAsText(file, 'utf-8');
  });
}

function switchSampleTab(format) {
  document.querySelectorAll('.sample-tab').forEach(t => t.classList.remove('active'));
  document.querySelector(`.sample-tab[data-format="${format}"]`).classList.add('active');
  document.getElementById('sampleCSV').style.display = format === 'csv' ? 'block' : 'none';
  document.getElementById('sampleJSON').style.display = format === 'json' ? 'block' : 'none';
}

async function submitImport() {
  const user = getCurrentUser();
  if (user.role !== 'supervisor') {
    showToast('门店账号不能导入问题', 'error');
    return;
  }

  const format = document.getElementById('importFormat').value;
  const data = document.getElementById('importData').value.trim();

  if (!data) {
    showToast('请输入或上传导入数据', 'error');
    return;
  }

  const res = await api.importIssues(user.userId, format, data);

  if (res.code === 0) {
    showImportResult(res.data);
    refreshCurrentPage();
  } else {
    showToast(res.message || '导入失败', 'error');
  }
}

function showImportResult(result) {
  const { batchId, totalCount, successCount, failedCount, skippedCount, results } = result;

  const statusLabel = { success: '成功', failed: '失败', skipped: '跳过' };
  const statusClass = { success: 'import-status-success', failed: 'import-status-failed', skipped: 'import-status-skipped' };

  const resultRows = results.map((r, i) => `
    <tr>
      <td>${r.index !== undefined ? r.index + 1 : i + 1}</td>
      <td><span class="${statusClass[r.status] || ''}">${statusLabel[r.status] || r.status}</span></td>
      <td>${r.reason || '-'}</td>
      <td>${r.issueId || '-'}</td>
    </tr>
  `).join('');

  const bodyHtml = `
    <div class="import-result-summary">
      <div class="import-result-stat import-result-total">
        <span class="import-result-number">${totalCount}</span>
        <span class="import-result-label">总计</span>
      </div>
      <div class="import-result-stat import-result-success">
        <span class="import-result-number">${successCount}</span>
        <span class="import-result-label">成功</span>
      </div>
      <div class="import-result-stat import-result-failed">
        <span class="import-result-number">${failedCount}</span>
        <span class="import-result-label">失败</span>
      </div>
      <div class="import-result-stat import-result-skipped">
        <span class="import-result-number">${skippedCount}</span>
        <span class="import-result-label">跳过</span>
      </div>
    </div>
    <div class="import-batch-id">批次ID：${batchId}</div>
    <div class="import-result-detail">
      <table class="import-result-table">
        <thead>
          <tr>
            <th>行号</th>
            <th>状态</th>
            <th>原因</th>
            <th>问题ID</th>
          </tr>
        </thead>
        <tbody>
          ${resultRows}
        </tbody>
      </table>
    </div>
  `;

  const footerHtml = `
    <button class="btn btn-secondary" onclick="closeModal()">关闭</button>
  `;

  openModal('导入结果', bodyHtml, footerHtml);
}
