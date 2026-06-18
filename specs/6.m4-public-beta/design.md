# M4 Public Beta - 技术设计

## 设计版本

| 日期 | 版本 | 说明 |
| --- | --- | --- |
| 2026-06-18 | v1 | 从 PRD v0.12 M4 生成 |

## 项目架构

- 架构类型: monorepo
- 涉及层: docs app、example app、packages API docs、tests/e2e、tests/bench、release 配置

## 功能模块设计

### 模块 1: 文档站点

文档站点服务于外部开发者试用，首页优先快速开始和真实编辑器示例，不做泛营销页。

**涉及层及关键设计:**

- 快速开始包含安装、样式引入、最小 React 示例、保存回调。
- Guides 覆盖受控模式、只读模式、自定义节点、主题、导入导出和错误处理。
- FAQ 覆盖 SSR、包体积、数据隐私、导入导出范围和非首发能力。

### 模块 2: API reference 与迁移说明

公开 API 进入 semver 保护范围前必须标记稳定性。

**涉及层及关键设计:**

- stable: Beta 承诺的公开类型和组件。
- experimental: AI/provider、协作 adapter、插件和可能调整的高级接口。
- breaking change 需要 changeset、迁移说明和版本策略。

### 模块 3: 性能与兼容性

性能测试和浏览器测试作为发布门槛，不只做本地人工检查。

**涉及层及关键设计:**

- 100/500/1000 节点 fixture 复用生成脚本。
- bench 输出 JSON/Markdown 报告，记录 P95 指标。
- E2E 覆盖主流浏览器矩阵。
- 对不达标项记录风险和后续优化计划。

### 模块 4: 可访问性与视觉验收

默认主题和关键 UI 需要达到可演示、可访问的基础质量。

**涉及层及关键设计:**

- 使用自动化可访问性检查和手动键盘路径走查。
- 颜色状态配合文本/图标。
- 截图留档默认主题、暗色模式、选中态、hover、错误态。

### 模块 5: Release

Changesets 管理 beta 发布说明，确保 package metadata、license、exports 和 README 一致。

**涉及层及关键设计:**

- beta release notes 包含能力、限制、迁移风险和反馈入口。
- package exports 与 API reference 对齐。
- 发布前检查不包含 `.env`、密钥和临时文件。

## 接口契约

- 文档站点 URL 和 GitHub Pages 部署配置。
- Changesets release notes。
- API reference 中 stable/experimental 标记。
- 性能报告和兼容性报告 Markdown。

## 数据模型

无新增业务数据模型；重点是文档、报告和 release metadata。

## 安全考虑

- 示例不包含真实密钥、cookie、token、后端地址或用户数据。
- GitHub Pages 示例只使用本地 fixture，不上传导图数据。
- 发布前检查 `.env*`、临时日志和浏览器 profile 未入库。

## 技术决策

| 决策 | 选项 | 理由 |
| --- | --- | --- |
| 文档工具 | VitePress 或 Storybook | PRD 均允许；若 API 文档更重则 VitePress 更轻 |
| 发布工具 | Changesets | PRD 明确预期，适合 monorepo 多包发版 |
| Beta API 标记 | stable/experimental | 降低过早锁死 provider/plugin 等扩展点的风险 |
| 示例部署 | GitHub Pages | PRD 明确要求公开静态示例 |
