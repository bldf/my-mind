---
name: my-ai-prd
description: Generate or update development specs from requirement documents, producing requirements.md, design.md, and tasks.md. Use when the user asks to convert PRD/docs into specs, run a /my:prd-style workflow, create numbered feature specs, or update existing feature specs from a change request.
---

# My AI PRD - 需求文档 -> 开发规格生成

支持两种模式：新建需求和需求变更。

## 输入参数

从用户请求中解析输入。支持以下格式：

- **新建模式**：`{项目文件夹路径}`
- **变更模式**：`--change {N}.{feature-name} 变更内容描述`

用户提供一个项目文件夹路径，文件夹结构约定：

```text
{项目文件夹}/
├── docs/           <- 需求文档（必须存在，PRD 从这里读取）
├── 1.xxx/          <- 已有的 specs（如有）
├── 2.xxx/          <- 本次生成的 specs
└── ...
```

## 模式判断

如果用户输入以 `--change` 开头 -> 进入变更模式（跳到「变更模式」章节）
否则 -> 进入新建模式

---

## 新建模式

### Step 1: 解析输入，读取需求文档

从用户请求中提取项目文件夹路径，记为 `SPECS_DIR`。

读取 `{SPECS_DIR}/docs/` 下的所有文件作为需求源：

- 支持 `.md`、`.txt`、`.pdf` 等文档格式
- 如果 docs/ 下有多个文件，全部读取并综合分析
- 如果 docs/ 不存在或为空，报错提示用户先在 docs/ 下放入需求文档

### Step 2: 获取项目名称

- 从当前目录的 `package.json` name 字段、`Cargo.toml`、`go.mod` 等提取项目名
- 如无法提取，使用当前目录名
- 转为 kebab-case，记为 `PROJECT_NAME`

### Step 3: 探测项目架构类型

扫描项目根目录、配置文件、目录结构、依赖声明，自行判断架构类型（monorepo / 多仓库 / 单体应用 / Web3 等）。记录 `ARCH_TYPE`。

### Step 4: 读取项目上下文

- 读取各仓库的 `AGENTS.md` 了解技术栈
- 读取 `.antigravity/rules/` 下所有规则文件
- 扫描目录结构，了解现有模块划分

### Step 5: 分析需求

从文档中提取功能目标、用户故事、验收标准、约束条件、依赖。

### Step 5.5: 开放问题确认

分析需求后，如果存在以下情况，**必须暂停并与用户对话确认**，不要自行假设：

- 需求描述模糊或有歧义的功能点
- 多种技术实现方案且差异较大
- 缺少关键信息（如目标平台、兼容性要求、第三方服务选型）
- 业务逻辑有矛盾或不完整
- 涉及权限、支付、敏感操作等需要明确确认的功能

格式：

```text
需要确认以下问题：

1. {问题描述} - {为什么需要确认}
2. {问题描述} - {为什么需要确认}

请逐一回复后继续生成 specs
```

所有问题确认完毕后再进入 Step 6。

### Step 6: 推断 feature 名称

根据需求内容生成一个简洁的 kebab-case 英文名称。

### Step 7: 生成 specs 目录

检查 `{SPECS_DIR}/` 下已有的编号目录（如 `1.xxx/`、`2.xxx/`），取最大编号 +1。

```text
{SPECS_DIR}/
├── docs/                        <- 需求文档（输入）
├── 1.比如这是一个已有的标题/     <- 已有 specs
└── 2.{feature-name}/            <- 本次新建
    ├── requirements.md
    ├── design.md
    └── tasks.md
```

### Step 8: 生成 requirements.md

```markdown
# {Feature 名称} - 需求规格

## 概述

{一句话描述}

## 项目信息

- 项目名: {PROJECT_NAME}
- 架构类型: {ARCH_TYPE}

## 需求版本

| 日期         | 版本 | 说明     |
| ------------ | ---- | -------- |
| {YYYY-MM-DD} | v1   | 初始需求 |

## 用户故事

- 作为 {角色}，我想要 {功能}，以便 {价值}

## 功能需求

1. [F-001] {需求描述}
2. [F-002] {需求描述}

## 非功能需求

- 性能: {要求}
- 安全: {要求}
- 兼容性: {要求}

## 验收标准

- [ ] [AC-001] {标准描述}

## 依赖

- {外部服务/库}

## 开放问题

- {待确认事项}
```

### Step 9: 生成 design.md

**必须先读取项目 `AGENTS.md` 和 `.antigravity/rules/` 下所有规范文件**，设计方案必须遵循项目已有的技术规范和约定。

按功能模块设计，每个模块说明涉及哪些层（前端、后端、数据库、合约等），具体分层根据项目实际架构决定，不做硬编码限制。

```markdown
# {Feature 名称} - 技术设计

## 设计版本

| 日期         | 版本 | 说明     |
| ------------ | ---- | -------- |
| {YYYY-MM-DD} | v1   | 初始设计 |

## 项目架构

- 架构类型: {ARCH_TYPE}
- 涉及层: {根据项目实际情况列出}

## 功能模块设计

### 模块 1: {模块名}

{技术方案，遵循 .antigravity/rules/ 中的规范}

**涉及层及关键设计:**

{根据项目实际分层描述，如数据模型、API 接口、组件设计、合约接口等}

### 模块 2: {模块名}

...

## 接口契约

{API、RPC、合约接口等 - 根据项目类型决定}

## 数据模型

{数据表/模型/链上存储 - 根据项目类型决定}

## 安全考虑

{基于 .antigravity/rules/security.md 和项目特有的安全规范}

## 技术决策

| 决策 | 选项 | 理由 |
| ---- | ---- | ---- |
```

### Step 10: 生成 tasks.md

**按功能拆任务。** AI 执行时根据 design.md 自动判断每个任务涉及哪些层。

```markdown
# {Feature 名称} - 任务清单

## 任务版本

| 日期         | 版本 | 说明     |
| ------------ | ---- | -------- |
| {YYYY-MM-DD} | v1   | 初始任务 |

## 项目信息

- 项目名: {PROJECT_NAME}
- 架构类型: {ARCH_TYPE}
- specs 路径: {SPECS_DIR}/{N}.{feature-name}/

## 任务列表

### 功能 1: {功能名}

- [ ] T-001: {任务描述} ~{预估时间}
- [ ] T-002: {任务描述} ~{预估时间}

### 功能 2: {功能名}

- [ ] T-003: {任务描述} ~{预估时间}

### 集成与测试

- [ ] T-010: 联调测试 ~{预估时间}
- [ ] T-011: E2E 测试 ~{预估时间}

## 依赖关系

- T-002 依赖 T-001

## 风险点

- {可能遇到的问题及应对}
```

**任务拆解原则：**

- 按功能拆，AI 执行时读 design.md 自动识别涉及哪些层
- 原子性，可独立完成和验证
- 预估完成时间（5min / 15min / 30min / 1h）
- **粒度控制**：每个子 specs（feature 目录）不宜过大，单个 tasks.md 控制在 **10-15 个任务以内**。如果需求过大，应在 Step 6 之前拆成多个独立的 feature 目录（如 `2.user-auth-login`、`3.user-auth-register`），每个 feature 有自己的 requirements/design/tasks 三件套。这样 my:ai 执行时上下文可控，不会因为 specs 太大导致丢失关键信息。

### Step 11: 输出总结

完成后报告：

- Feature 名称和序号
- Specs 路径
- 涉及的技术层
- 总任务数和预估总时间

---

## 变更模式

### Change Step 1: 解析输入

从 `$ARGUMENTS` 中提取：

- 目标 feature：`{N}.{feature-name}`
- 变更内容描述：用户在 feature 后面的自然语言内容

定位 feature 目录：

```text
{SPECS_DIR}/{N}.{feature-name}/
```

如果无法定位 `SPECS_DIR`，根据对话上下文、当前目录和已存在 specs 目录推断；仍无法确认时，暂停询问用户。

### Change Step 2: 读取当前 specs

读取目标 feature 的：

- requirements.md
- design.md
- tasks.md
- `{SPECS_DIR}/LESSONS.md`（如存在）
- 当前代码项目的 `AGENTS.md` 和 `.antigravity/rules/`

### Change Step 3: 分析变更影响

判断变更属于：

- **需求补充**：新增功能、验收标准、用户故事
- **设计调整**：接口、数据模型、模块划分、技术方案变化
- **任务调整**：新增、删除、重排、改写任务
- **风险/约束更新**：安全、性能、兼容性、依赖变化

如果变更含糊或会影响关键业务逻辑，必须暂停确认。

### Change Step 4: 更新 specs

按影响范围更新对应文件：

- requirements.md：新增需求版本记录，补充/修改功能需求、验收标准、开放问题
- design.md：新增设计版本记录，修改相关模块、接口契约、数据模型、安全考虑和技术决策
- tasks.md：新增任务版本记录，调整任务列表和依赖关系

更新任务时遵守：

- 已完成任务 `[x]` 不直接改写原意；如果已完成内容需要返工，新增任务并标注依赖原任务
- 已废弃任务标为 `[DROPPED]`，不要删除，保留原因
- 已变更任务标为 `[CHANGED]` 或更新描述并在版本记录说明
- 新增任务继续使用递增编号，不复用旧编号

### Change Step 5: 输出总结

完成后报告：

- 更新了哪些文件
- 新增/变更/废弃了哪些需求或任务
- 是否需要重新执行 `$my-ai-auto-dev` workflow
- 是否存在待用户确认的问题
