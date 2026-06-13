# 巡店问题闭环看板

一个完整的巡店问题闭环管理系统，支持督导创建巡检问题、门店整改、督导复验关闭的全流程管理。

## 功能特性

- 📊 **仪表盘统计**：各状态问题数量、逾期比例、门店分布、分类统计
- 📝 **问题管理**：创建、分派、整改、复验、关闭全流程
- ⏰ **延期管理**：门店申请延期、督导审批
- 📈 **时间线记录**：完整的操作历史记录
- 🔍 **筛选导出**：按门店、状态、超期筛选，支持 CSV 导出（含导入批次和来源字段）
- 📤 **批量导入**：支持 CSV/JSON 格式批量创建问题，冲突自动跳过，导入记录持久化
- 🎛️ **阈值配置**：超期提醒阈值可配置
- 📱 **响应式设计**：适配桌面端和移动端
- 💾 **本地持久化**：数据存储在本地 JSON 文件，重启不丢失

## 技术栈

- **后端**：Node.js + Express
- **前端**：原生 HTML/CSS/JavaScript
- **数据存储**：本地 JSON 文件

## 快速开始

### 1. 安装依赖

```bash
cd backend
npm install
```

### 2. 启动服务

```bash
cd backend
npm start
```

服务启动后，访问 `http://localhost:3000` 即可使用系统。

## 角色说明

系统包含两种角色：**督导** 和 **门店**，可通过页面右上角的下拉框切换角色进行测试。

### 督导角色
- 用户名：张督导 (supervisor1)
- 权限：
  - 创建巡检问题并分派门店
  - 复验整改结果
  - 审批延期申请
  - 查看所有门店问题
  - 配置系统阈值

### 门店角色
- **朝阳路店**：王店长 (store1)
- **海淀店**：李店长 (store2)
- **西城店**：赵店长 (store3)
- 权限：
  - 查看本门店问题
  - 接单
  - 提交整改
  - 申请延期

## 角色切换验证

在页面右上角的「切换角色」下拉框中选择不同角色：

1. **切换为督导**：
   - 可以看到「创建问题」按钮
   - 仪表盘显示所有门店的汇总数据
   - 问题列表显示所有门店的问题
   - 待复验状态的问题有「复验」操作按钮

2. **切换为门店（如朝阳路店）**：
   - 看不到「创建问题」按钮
   - 仪表盘只显示本门店的数据
   - 问题列表只显示本门店的问题
   - 待接单状态的问题有「接单」按钮
   - 整改中的问题有「提交整改」和「申请延期」按钮

3. **数据隔离验证**：
   - 切换到海淀店角色，应该看不到朝阳路店和西城店的问题
   - 门店角色无法创建问题

## 主流程验证

按照以下步骤验证完整的问题闭环流程：

### 步骤 1：督导创建问题

1. 切换角色为「督导」
2. 点击「创建问题」按钮
3. 填写问题信息：
   - 问题标题：例如"消防通道堵塞"
   - 问题分类：选择"安全"
   - 分派门店：选择"朝阳路店"
   - 截止时间：选择一个未来的时间
   - 问题描述：详细描述问题
4. 点击「创建问题」
5. 验证：问题列表中出现新创建的问题，状态为「待接单」

### 步骤 2：门店接单

1. 切换角色为「朝阳路店」
2. 在问题列表中找到刚创建的问题
3. 点击「接单」按钮
4. 验证：问题状态变为「整改中」

### 步骤 3：门店提交整改

1. 在整改中状态的问题上，点击「提交整改」
2. 填写整改内容和备注
3. 点击「提交整改」
4. 验证：问题状态变为「待复验」

### 步骤 4：督导复验

1. 切换角色为「督导」
2. 找到待复验状态的问题
3. 点击「复验」按钮
4. 选择复验结果（通过/不通过）
5. 填写复验意见
6. 点击「确认」

**复验通过**：
- 问题状态变为「已关闭」
- 时间线增加「复验通过」记录

**复验不通过**：
- 问题状态回退为「整改中」
- 时间线增加「复验不通过」记录
- 门店可以重新整改

## 延期申请验证

### 门店申请延期

1. 切换为门店角色
2. 找到一个整改中或待接单的问题
3. 点击「申请延期」
4. 填写延期天数（如 3 天）和延期原因
5. 提交申请
6. 验证：问题详情中显示延期记录，状态为「待审批」

### 督导审批延期

1. 切换为督导角色
2. 打开有延期申请的问题详情
3. 可以看到「批准延期」和「驳回延期」按钮
4. 点击「批准延期」
5. 验证：问题截止时间延长，时间线增加「延期批准」记录

**延期原因校验**：
- 尝试不填写延期原因直接提交，应该提示"延期原因不能为空"

## 异常场景验证

### 1. 门店直接关闭问题（应该不可行）
- 门店角色没有关闭问题的权限
- 只有督导复验通过后问题才会关闭
- 验证：门店操作按钮中没有"关闭"选项

### 2. 延期原因为空（应该校验）
- 门店申请延期时，原因不能为空
- 验证：不填原因提交时会弹出错误提示

### 3. 复验失败后状态未回退（应该回退）
- 督导复验选择"不通过"
- 验证：问题状态从"待复验"回退到"整改中"
- 时间线中有"复验不通过"记录

### 4. 门店查看其他门店问题（应该不可行）
- 切换为朝阳路店角色
- 验证：只能看到朝阳路店的问题
- 海淀店和西城店的问题不会显示

### 5. 门店角色创建问题（应该不可行）
- 切换为门店角色
- 验证：页面上没有"创建问题"按钮
- 即使通过 API 创建也会返回权限错误

## 导出验证

### 导出当前筛选结果

1. 在问题列表页设置筛选条件（如选择某个门店、某个状态）
2. 点击「导出」按钮
3. 浏览器会下载一个 CSV 文件
4. 打开 CSV 文件验证：
   - 包含筛选后的所有问题
   - 列包含：问题ID、标题、分类、状态、是否逾期、门店、责任人、创建人、创建时间、截止时间、更新时间、描述、整改内容
   - 中文正常显示（UTF-8 BOM 编码，Excel 可直接打开）

### 导出全量数据
- 重置所有筛选条件后导出
- 验证：导出所有可见问题的数据

## 数据持久化验证

### 后端数据持久化
- 所有数据存储在 `backend/data/` 目录下的 JSON 文件中
- 问题数据：`backend/data/issues.json`
- 用户数据：`backend/data/users.json`
- 门店数据：`backend/data/stores.json`
- 配置数据：`backend/data/config.json`

**验证方法**：
1. 创建几个问题，做一些操作
2. 停止后端服务（Ctrl+C）
3. 重新启动服务：`npm start`
4. 刷新页面，验证数据仍然存在

### 前端状态持久化
- 筛选条件、当前角色、当前页面保存在浏览器 localStorage 中
- 刷新页面后这些设置会保持

**验证方法**：
1. 设置一些筛选条件
2. 切换角色
3. 刷新页面
4. 验证筛选条件和角色保持不变

## 系统配置

在「系统配置」页面可以调整：

- **超期提醒阈值（天）**：问题截止时间超过该天数后标记为超期
- **预警提醒阈值（天）**：距离截止时间不足该天数时显示预警

配置保存后立即生效，且后端重启后不丢失。

## 目录结构

```
zgw-00124/
├── backend/
│   ├── server.js          # 后端服务主文件（路由层：取参、鉴权、返回）
│   ├── csvParser.js       # CSV/JSON 解析模块
│   ├── fieldNormalizer.js # 字段归一化模块（中英文别名映射）
│   ├── storeResolver.js   # 门店解析模块（门店ID/名称→storeId，查找门店用户）
│   ├── validator.js       # 单行校验模块（必填字段、截止时间解析）
│   ├── conflictDetector.js# 冲突判断模块（标题+门店+截止时间去重）
│   ├── importService.js   # 导入主服务（记录构造、问题写入、全流程编排）
│   ├── package.json       # 依赖配置
│   ├── data/              # 数据存储目录
│   │   ├── users.json     # 用户数据
│   │   ├── stores.json    # 门店数据
│   │   ├── issues.json    # 问题数据
│   │   ├── config.json    # 系统配置
│   │   └── imports.json   # 导入记录（持久化，重启可查）
│   ├── tests/
│   │   ├── regression.js  # 回归测试（真实 HTTP 接口，全流程覆盖）
│   │   └── import-unit.js # 导入链路单元测试（各模块独立断言）
│   └── mock/              # 模拟资源目录
│       └── images/        # 模拟图片
├── frontend/
│   ├── index.html         # 主页面
│   ├── css/
│   │   └── style.css      # 样式文件（响应式）
│   └── js/
│       ├── api.js         # API 封装（importIssues / getImports 等）
│       ├── app.js         # 主应用逻辑
│       └── modal.js       # 弹窗逻辑（导入弹窗、结果渲染拆分独立函数）
└── README.md              # 说明文档
```

## API 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/health | 健康检查 |
| GET | /api/users | 获取用户列表 |
| GET | /api/users/:id | 获取用户详情 |
| GET | /api/stores | 获取门店列表 |
| GET | /api/config | 获取系统配置 |
| PUT | /api/config | 更新系统配置 |
| GET | /api/issues | 获取问题列表（支持筛选分页） |
| GET | /api/issues/:id | 获取问题详情 |
| POST | /api/issues | 创建问题 |
| POST | /api/issues/:id/accept | 门店接单 |
| POST | /api/issues/:id/rectify | 提交整改 |
| POST | /api/issues/:id/recheck | 复验 |
| POST | /api/issues/:id/extension | 申请延期 |
| POST | /api/issues/:id/extension/approve | 批准延期 |
| POST | /api/issues/:id/extension/reject | 驳回延期 |
| GET | /api/dashboard/stats | 仪表盘统计数据 |
| GET | /api/export/issues | 导出问题 CSV |
| GET | /api/imports | 获取导入记录列表 |
| GET | /api/imports/:id | 获取导入记录详情 |

## 问题状态流转

```
待接单 (pending)
    ↓ 门店接单
整改中 (rectifying)
    ↓ 提交整改
待复验 (rechecking)
    ↓ 复验通过
已关闭 (closed)

待复验 (rechecking)
    ↓ 复验不通过
整改中 (rectifying)  ← 回退

待接单/整改中
    ↓ 申请延期
状态不变 + 延期待审批
    ↓ 批准延期
截止时间延长 + 状态不变
```

## 初始数据

系统启动时会自动创建以下初始数据：

### 用户
- 张督导（督导）
- 王店长（朝阳路店）
- 李店长（海淀店）
- 赵店长（西城店）

### 门店
- 朝阳路店
- 海淀店
- 西城店

### 示例问题
- 消防通道堆放杂物（朝阳路店，待接单）
- 员工仪容仪表不规范（海淀店，整改中）
- 冷藏柜温度不达标（西城店，待复验，含延期记录）

---

## 批量导入链路架构说明

### 后端模块拆分

批量导入逻辑从 `server.js` 单文件拆分为 6 个独立模块 + 路由层：

| 模块文件 | 职责 | 主要函数 |
|---|---|---|
| `csvParser.js` | CSV/JSON 解析 | `parseCSV()` / `parseJSON()` / `parseByFormat()` |
| `fieldNormalizer.js` | 字段归一（中英文别名映射） | `normalizeFieldKey()` / `normalizeItems()` |
| `storeResolver.js` | 门店解析（ID或名称→storeId，门店用户匹配） | `resolveStoreId()` / `findStoreUser()` |
| `validator.js` | 单行校验（必填字段、截止时间解析） | `validateRequiredFields()` / `parseDeadline()` |
| `conflictDetector.js` | 冲突判断（标题+门店+截止时间 去重） | `checkConflict()` |
| `importService.js` | 主流程编排 + 数据构造 | `processImport()` / `buildIssue()` / `buildImportRecord()` / `listImportRecords()` |
| `server.js`（路由层） | 取参、鉴权、调用服务、返回响应 | `POST /api/issues/import` / `GET /api/imports` / `GET /api/imports/:id` |

### 路由层约束

`server.js` 的导入路由只做 4 件事：
1. 取参数：`creatorId` / `format` / `data`
2. 鉴权：校验用户存在且是督导（门店账号 403 拦截）
3. 调用 `importService.processImport()` 执行业务
4. 写入 issues.json 和 imports.json，返回响应

### 前端拆分

`frontend/js/modal.js` 中的导入弹窗与结果渲染拆分为独立函数，保留 DOM id、按钮行为和文案：

| 函数 | 职责 |
|---|---|
| `renderImportModalBody()` | 构造导入弹窗 body 模板（含格式选择、文件上传、示例代码） |
| `renderImportModalFooter()` | 构造导入弹窗 footer 模板（取消/开始导入） |
| `setupImportFileHandler()` | 绑定文件 change 事件（读取内容、自动识别格式） |
| `renderImportResultSummary()` | 渲染 4 格统计（总计/成功/失败/跳过） |
| `renderImportResultRows()` | 渲染每行的行号/状态/原因/问题ID |
| `renderImportResultBody()` | 组装完整结果页（统计+批次ID+明细表） |
| `renderImportResultFooter()` | 结果弹窗 footer（关闭按钮） |
| `openImportModal()` / `submitImport()` / `showImportResult()` | 流程入口，调用上述渲染函数 |

---

## 重构测试运行方式

### 测试分层

```
tests/
├── import-unit.js   # 单元测试（直接 require 各模块，不启动服务，约 40 个断言）
└── regression.js    # 回归测试（真实 HTTP 请求，全流程覆盖，约 44 个断言）
```

### 命令

```bash
cd backend

# 1) 导入链路单元测试（独立验证各模块，无需启动服务）
npm run test:unit

# 2) 启动服务（另开终端或后台运行）
npm start

# 3) 回归测试（真实接口调用，覆盖所有场景）
npm test
```

### 预期结果

**`npm run test:unit`（单元测试）预期全部通过：**
- CSV 解析：基础解析、BOM 头、引号字段、空 CSV
- JSON 解析：数组解析、非数组抛错
- 字段归一：中文/英文别名映射、未知字段原样保留
- 门店解析：ID/名称两种方式、空/不存在/无门店用户 3 种失败
- 字段校验：4 种必填字段缺失组合、截止时间数字/字符串/无效值
- 冲突判断：完全相同/三要素任意一个不同 的组合
- 数据构造：buildIssue 默认分类、buildTimelineEntry imported 动作、buildImportRecord 统计
- processImport 主流程：JSON 全成功、CSV 门店名解析、1成功2失败1跳过混合、重复导入全跳过
- 导入记录查询：分页倒序、按 id 查单条

**`npm test`（回归测试）预期全部通过（44/44）：**
- ✅ 门店账号调用 `/api/issues/import` → HTTP 403 `门店账号不能导入问题`
- ✅ 督导账号 JSON 导入 2 条 → `successCount=2, failedCount=0, skippedCount=0`
- ✅ 重复导入相同 2 条 → `skippedCount=2，原因: 标题+门店+截止时间重复`
- ✅ 导入问题含 `importBatchId` 和 `importSource='batch_import'`，时间线有 `imported` 动作
- ✅ 混合数据 5 条（1 成功 4 失败：缺标题/缺门店/缺截止/无效门店）
- ✅ CSV 格式导入：中文"朝阳路店"解析为 storeId=s1，分类映射正确
- ✅ 导入记录写入 imports.json，重启后 `/api/imports` 可查
- ✅ 导出 CSV 表头含"导入批次ID""导入来源"，导入问题行含 `batch_import`

---

## 真实接口调用示例

### 1. 门店账号被拦（curl）

```bash
curl -X POST http://localhost:3000/api/issues/import \
  -H "Content-Type: application/json" \
  -d '{
    "creatorId": "u2",
    "format": "json",
    "data": "[{\"title\":\"门店无权导入\",\"storeId\":\"s1\",\"deadline\":\"2026-12-01\"}]"
  }'
```

**预期响应：**
```json
{ "code": 403, "message": "门店账号不能导入问题" }
```

### 2. CSV 格式导入（curl）

```bash
curl -X POST http://localhost:3000/api/issues/import \
  -H "Content-Type: application/json" \
  -d '{
    "creatorId": "u1",
    "format": "csv",
    "data": "标题,分类,门店,截止时间,描述\ncurl测试1,安全,朝阳路店,2026-11-01,来自curl的CSV导入\ncurl测试2,服务,s2,2026-11-02,通过门店ID导入"
  }'
```

**预期响应（200 OK）：**
```json
{
  "code": 0,
  "data": {
    "batchId": "import-...",
    "totalCount": 2,
    "successCount": 2,
    "failedCount": 0,
    "skippedCount": 0,
    "results": [
      { "index": 0, "status": "success", "issueId": "issue-..." },
      { "index": 1, "status": "success", "issueId": "issue-..." }
    ]
  }
}
```

### 3. 成功/失败/跳过明细（Python requests）

```python
import requests
import json

base = 'http://localhost:3000/api'

# 构造混合数据：1成功 / 1失败(缺标题) / 1跳过(与已存在冲突)
payload = {
    "creatorId": "u1",
    "format": "json",
    "data": json.dumps([
        {"title": "python-全新问题", "storeId": "s1", "deadline": "2026-10-10", "category": "质量"},
        {"title": "", "storeId": "s1", "deadline": "2026-10-10"},
        {"title": "curl测试1", "storeId": "朝阳路店", "deadline": "2026-11-01"}
    ])
}

r = requests.post(f'{base}/issues/import', json=payload)
data = r.json()['data']
print(f'总计={data["totalCount"]} 成功={data["successCount"]} '
      f'失败={data["failedCount"]} 跳过={data["skippedCount"]}')

for row in data['results']:
    print(f'  第{row["index"]+1}行 status={row["status"]:7s} reason={row.get("reason","-"):20s} issueId={row.get("issueId","-")}')
```

**预期输出：**
```
总计=3 成功=1 失败=1 跳过=1
  第1行 status=success reason=-                    issueId=issue-...
  第2行 status=failed  reason=缺少必填字段(title/storeId/deadline) issueId=-
  第3行 status=skipped reason=标题+门店+截止时间重复   issueId=-
```

### 4. 导入记录重启后可查

```bash
# 1) 先停掉服务
# Ctrl+C

# 2) 重新启动
cd backend
npm start

# 3) 查询导入记录
curl http://localhost:3000/api/imports?pageSize=5
```

**预期：之前所有导入批次仍在列表中，按时间倒序；取任意 batchId：**
```bash
curl http://localhost:3000/api/imports/<batchId>
# 返回包含 successCount/failedCount/skippedCount/results 明细
```

### 5. 导出 CSV 含导入批次和来源

```bash
# 导出全量
curl -o issues.csv "http://localhost:3000/api/export/issues?currentUserId=u1&currentUserRole=supervisor"

# 检查表头（Windows PowerShell）
Get-Content issues.csv -Encoding UTF8 | Select-Object -First 1
# 预期包含：导入批次ID,导入来源

# 检查某导入问题行
Select-String -Path issues.csv -Pattern "curl测试1"
# 预期行中包含 batch_import 字样

# 检查手动创建的问题（回归测试专用问题）
Select-String -Path issues.csv -Pattern "回归测试-专用问题"
# 预期行中包含 manual 字样
```
