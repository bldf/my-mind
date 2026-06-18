# M0 Technical Prototype - 需求规格

## 概述

完成 My Mind Node 的最小技术原型，验证 React Flow 画布、Worker 布局、最小 core 数据模型、自定义贝塞尔曲线 Edge 和 100 节点 fixture 可行性。

## 项目信息

- 项目名: my-mind-node
- 架构类型: monorepo
- 需求来源: `docs/prd-mind-map.md` M0

## 需求版本

| 日期 | 版本 | 说明 |
| --- | --- | --- |
| 2026-06-18 | v1 | 从 PRD v0.12 拆分 M0 技术原型 |

## 用户故事

- 作为库作者，我想要一个可运行的 monorepo 原型，以便后续按 M1-M4 分阶段演进。
- 作为开发者，我想要在 playground 中看到可编辑导图，以便判断库的默认体验是否值得继续集成。
- 作为维护者，我想要布局在 Worker 中执行，以便大图编辑不会阻塞主线程。

## 功能需求

1. [F-001] 初始化 pnpm workspaces monorepo、ESM only 工具链、TypeScript strict、MIT license 和基础 lint/format 配置。
2. [F-002] 创建 `@my-mind-node/core` 包，提供 framework/DOM 无关的最小数据模型。
3. [F-003] 创建 `@my-mind-node/react` 包，封装 React Flow 并暴露实验版 `MindMapEditor`。
4. [F-004] 实现 `createEmptyDocument` 和 `parseDocument`，对不可信 JSON 返回结构化校验结果。
5. [F-005] 实现 `MindMapDocument` 到布局 graph 的纯转换，以及布局结果回写节点 `position`。
6. [F-006] 实现 Worker 布局调度，支持 requestId 丢弃过期响应、超时、防抖和结构化错误。
7. [F-007] 实现自定义节点和自定义贝塞尔曲线 Edge，覆盖 default、hover、selected、label 状态。
8. [F-008] 实现基础编辑：Tab 创建子节点、Enter 创建同级、Delete 删除、标题编辑、节点拖拽移动。
9. [F-009] 实现视口控制：空白平移、`+`/`-` 缩放、Ctrl+滚轮按鼠标位置缩放、全屏切换。
10. [F-010] 实现顶部右上角工具栏、顶部面包屑、右键上下文菜单进入节点视图。
11. [F-011] 提供 100 节点 fixture 和 Vite playground 渲染验证。
12. [F-012] 记录 M0 性能验证结论，确认 100 节点原型达到退出标准。

## 非功能需求

- 性能: 100 节点导图初始渲染 P95 < 1s；布局不在主线程执行长任务。
- 安全: 默认不发起网络请求；导入 JSON 按不可信输入处理；节点标题按文本渲染。
- 兼容性: ESM only；React 18+；现代浏览器最新两个大版本。
- 架构边界: `@my-mind-node/core` 不依赖 React、React Flow、DOM 或 ELK 运行时。

## 验收标准

- [ ] [AC-001] 根 `pnpm build`、`pnpm test`、`pnpm typecheck`、`pnpm lint` 可运行并通过。
- [ ] [AC-002] `@my-mind-node/core` 的单测不渲染 DOM，依赖图不包含 React/React Flow。
- [ ] [AC-003] playground 能加载 100 节点 fixture，节点层级和连线正确。
- [ ] [AC-004] 基础编辑、拖拽、缩放、全屏、进入节点视图和面包屑返回路径可手动验证。
- [ ] [AC-005] 自定义 Edge 在 default、hover、selected、label 状态下视觉可辨。
- [ ] [AC-006] 性能验证文档记录 Worker 布局、100 节点渲染和主线程阻塞结论。

## 依赖

- React
- React Flow
- ELK.js
- TypeScript
- pnpm workspaces
- Vitest
- Vite
- tsup 或 rollup

## 开放问题

- npm scope `@my-mind-node` 所有权需在 M1 前确认。
- M0 可使用实验 API；Public Beta 前再进入 semver 保护。
