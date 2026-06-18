# 变更日志 — 2026-06-18

## Feature 1: M0 Technical Prototype

### 新增

- pnpm workspace、TypeScript strict、tsup、Vitest、ESLint、Playwright 和 Vite playground。
- `@my-mind-node/core` 最小模型、解析校验、布局 graph 转换。
- `@my-mind-node/react` Editor 原型、React Flow 节点/边、工具栏、面包屑和基础快捷键。

### 关键文件

- `packages/core/src/index.ts` — core 公开 API。
- `packages/react/src/MindMapEditor.tsx` — React Editor 主入口。
- `apps/playground/src/App.tsx` — 100 节点 playground。
- `tests/fixtures/100-nodes.json` — M0 渲染 fixture。

## Feature 2: M1 Core Alpha

### 新增

- Alpha schema、`validateDocument`、命令系统、operation、history、selection、JSON/缩进文本序列化和搜索。

### 关键文件

- `packages/core/src/types.ts` — 文档、节点、连接线、标签、任务、样式和命令类型。
- `packages/core/src/commands.ts` — core command dispatcher。
- `packages/core/src/history.ts` — undo/redo transaction 管理。
- `packages/core/src/indented-text.ts` — 缩进文本导入导出。

## Feature 3: M2 React Alpha

### 新增

- `MindMapEditorProps`、`MindMapViewer`、主题侧栏、节点局部缩放、工具栏、全屏、fit view、只读模式和快捷键。

### 关键文件

- `packages/react/src/types.ts` — React 组件 API。
- `packages/react/src/MindMapViewer.tsx` — 只读 Viewer。
- `packages/react/src/components/Toolbar.tsx` — 顶部右上角图标工具栏。
- `packages/react/src/themes.ts` — 内置主题。

## Feature 4: M2.5 Product Polish

### 新增

- `OutlineEditor`、搜索面板、检查器、多选模型、批量命令入口、空状态/错误状态和移动端基础布局。

### 关键文件

- `packages/react/src/OutlineEditor.tsx` — 大纲编辑器。
- `packages/react/src/components/SearchPanel.tsx` — 搜索 UI。
- `packages/react/src/components/InspectorPanel.tsx` — 默认检查器。
- `tests/a11y/accessibility-report.md` — 可访问性走查记录。

## Feature 5: M3 Import/Export Beta

### 新增

- `@my-mind-node/importers` 与 `@my-mind-node/exporters` 独立可选包。
- Markdown、OPML、JSON、缩进文本导入导出，SVG/PNG 导出接口。
- Next.js、readonly、custom-node 示例。

### 关键文件

- `packages/importers/src/index.ts` — 统一导入 API。
- `packages/exporters/src/index.ts` — 统一导出 API。
- `apps/next-example/` — SSR-safe 示例。
- `apps/readonly-example/` 与 `apps/custom-node-example/` — React 示例补齐。

## Feature 6: M4 Public Beta

### 新增

- VitePress 文档站、API reference、迁移说明、Public Beta 报告、GitHub Pages workflow、性能 bench、bundle budget 和 Playwright 多浏览器矩阵。

### 关键文件

- `apps/docs/docs/` — 文档站内容。
- `.github/workflows/pages.yml` — GitHub Pages 部署。
- `tests/e2e/playground.spec.ts` — Chromium/Firefox/WebKit/mobile E2E。
- `scripts/bundle-budget.mjs` — gzip budget 检查。

## Feature 7: Node Drag Interaction Polish

### 新增

- `MindMapEditor` 拖拽预览状态，拖动中节点跟随鼠标但不写入 `MindMapDocument`、history 或高频 `onChange`。
- 节点中心 2 秒 dwell 后入子、上/下区域同级排序、非法目标可恢复错误和释放后自动稳定排版。
- `MindNode` hover 加子节点按钮、展开/折叠按钮、drop intent label、排序插入线和 flash/invalid 默认样式。
- `MindMapEditorProps.dragInteraction` 实验配置项，用于启用/调整 dwell、排序区域、flash、自动排版和 hover 控件。
- Playground Playwright 覆盖 100 节点 fixture 的跟手、入子、排序、加子节点和折叠展开路径。

### 关键文件

- `packages/react/src/MindMapEditor.tsx` — 拖拽 session、drop 提交、自动排版和 hover 命令入口。
- `packages/react/src/drag-interactions.ts` — drop zone、合法性校验、排序 index 和 intent label。
- `packages/react/src/nodes/MindNode.tsx` — 节点 hover 控件与 drop intent 渲染。
- `packages/react/src/styles.css` — dwell、flash、插入线、invalid 和 hover 控件默认样式。
- `tests/e2e/playground.spec.ts` — playground 交互 E2E。

## 架构决策

- 当前仓库按用户要求转为实现 monorepo，覆盖最初“仅 specs 工作区”的假设。
- core/react/importers/exporters 分包，确保 core 保持 DOM-free，导入导出不进入 React 默认 bundle。
- Playwright 使用专用 `5187` 端口和 Vite `strictPort`，避免复用已有本地服务导致误测。
- Playground E2E 通过 Vite alias 指向 workspace 源码，避免误测旧 `dist` 构建。
- React Flow 拖拽未命中或非法释放时显式复位预览 `flowNodes`，不依赖 state 对象变化触发布局回滚。
