# Changelog

## 2026-06-18 - M0-M4 implementation in current repo

按 `my-ai-auto-dev` 执行 6 个 feature specs，并在当前仓库初始化 `my-mind-node` pnpm monorepo：

- 新增 `@my-mind-node/core`，覆盖 schema、校验、命令、历史、搜索、布局转换、JSON 和缩进文本。
- 新增 `@my-mind-node/react`，覆盖 Editor/Viewer、React Flow 适配、工具栏、主题、面包屑、节点缩放、大纲、搜索和检查器。
- 新增 `@my-mind-node/importers` 与 `@my-mind-node/exporters`，保持导入导出能力为可选包。
- 新增 Vite playground、VitePress docs、Next.js/readonly/custom-node 示例、GitHub Pages workflow、fixtures、bench、bundle budget、a11y 报告和 Playwright E2E。
- 6 个 `tasks.md` 共 75 个任务均已标记为 `[x]`。

## 2026-06-18 - PRD milestone specs

从 `docs/prd-mind-map.md` 拆分出 6 个可执行 feature specs：

- `1.m0-technical-prototype/` - React Flow、Worker 布局、最小 core 模型与 playground 验证。
- `2.m1-core-alpha/` - core schema、命令、历史、选择、序列化和缩进文本。
- `3.m2-react-alpha/` - Editor/Viewer、主题侧边栏、节点局部缩放、工具栏、面包屑与示例原型。
- `4.m2-5-product-polish/` - 大纲、搜索、检查器、多选拖拽、批量操作、空状态和移动端基础体验。
- `5.m3-import-export-beta/` - Markdown、OPML、JSON、缩进文本、PNG、SVG 导入导出和示例补齐。
- `6.m4-public-beta/` - 文档站点、API reference、性能、兼容性、可访问性、bundle 和 beta 发布准备。

本次没有执行 SDK 代码开发任务；所有 `tasks.md` 均保持 `[ ]`，等待后续传入目标代码项目后由 `my-ai-auto-dev` 执行。
