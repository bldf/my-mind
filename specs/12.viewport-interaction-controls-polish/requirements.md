# Viewport Interaction Controls Polish - 需求规格

## 概述

优化 `MindMapEditor` / `MindMapViewer` 的视口缩放、全屏、子树拖拽、MiniMap、暗黑背景、顶部历史控制、容器尺寸变化重定位和搜索入口隐藏逻辑，让画布交互更线性、可恢复、可配置。

## 项目信息

- 项目名: my-mind-node-workspace
- 产品名: my-mind-node
- 架构类型: pnpm monorepo
- 需求来源: 2026-06-25 `/my-ai-prd` 编辑器体验反馈

## 需求版本

| 日期 | 版本 | 说明 |
| --- | --- | --- |
| 2026-06-25 | v1 | 初始需求规格 |

## 用户故事

- 作为导图编辑用户，我希望滚轮或触控板缩放是连续线性的，以便可以精细控制画布视图而不是一次滚动就突然放大或缩小。
- 作为导图编辑用户，我希望全屏按钮可以进入也可以退出全屏，以便在沉浸编辑后能回到原页面。
- 作为导图编辑用户，我希望拖动有子节点的节点时整棵可见子树一起移动，以便拖拽过程符合导图的父子结构直觉。
- 作为 SDK 使用者，我希望 MiniMap 默认不展示，只有显式传入参数才展示，以便嵌入页面默认更简洁。
- 作为暗黑模式用户，我希望画布背景为 `#10172a`，以便暗色环境下视觉更统一。
- 作为编辑用户，我希望顶部提供撤销、重做和还原初始状态按钮，以便编辑后可以快速回退或恢复。
- 作为嵌入 SDK 的开发者，我希望容器宽高变化后画布自动重新居中，以便响应式布局、侧栏展开或全屏切换后导图仍在视口中心。
- 作为 SDK 使用者，我希望禁用搜索时搜索按钮也不展示，以便工具栏和配置保持一致。

## 功能需求

1. [F-001] 当 `viewport.zoomOnScroll` 启用时，滚轮和触控板缩放必须按 `wheel` delta 连续计算缩放比例，不得出现一次滚动直接大幅跳变。
2. [F-002] 滚轮缩放必须以鼠标当前位置为缩放锚点，缩放前后指针下的画布坐标保持稳定，并遵守 `minZoom` / `maxZoom`。
3. [F-003] 滚轮缩放需要提供可配置的灵敏度与单帧最大步进安全上限；默认值应适合普通鼠标滚轮和高频触控板。
4. [F-004] 顶部全屏按钮必须支持 toggle 行为：未全屏时进入编辑器容器全屏，已全屏时退出全屏。
5. [F-005] 全屏状态必须监听浏览器 `fullscreenchange`，用户按 Esc 或浏览器退出全屏后，按钮图标、标题和内部状态同步更新。
6. [F-006] 拖动一个拥有可见子节点的节点时，所有可见后代节点和相关连线必须在拖拽过程中跟随同一位移实时移动；折叠隐藏的后代不需要渲染跟随，但仍保持树结构归属。
7. [F-007] 子树拖拽释放后，结构提交仍以被拖动的顶层节点为单位，子节点不得被错误改成同级节点、脱离父节点或重复提交历史记录。
8. [F-008] MiniMap 默认不渲染；必须新增显式配置参数，只有宿主传入启用配置时才在右下角展示 MiniMap。
9. [F-009] 内置暗黑主题和暗黑模式画布背景必须使用 `#10172a`，并保证节点、连线、toolbar、MiniMap、搜索面板、检查器等仍具备可读对比度。
10. [F-010] 编辑器顶部 toolbar 必须提供撤销、重做和还原初始状态入口；无可撤销/重做/还原内容时按钮禁用且有可访问状态。
11. [F-011] 撤销、重做和还原初始状态必须复用现有 history 语义：每个有效编辑命令最多产生一条历史记录，撤销和重做不应新增历史记录。
12. [F-012] 还原初始状态应将文档恢复到编辑器挂载时的初始文档；受控模式下通过 `onChange(initialDocument)` 通知宿主，非受控模式下直接更新内部文档，并清空 undo/redo 栈。
13. [F-013] 编辑器容器宽高变化后，默认保留当前缩放比例并自动重新居中；该行为应可通过配置关闭，并且不得在节点拖拽、节点缩放或标题输入过程中抢夺视口。
14. [F-014] 当 `search={{ hidden: true }}` 或等价配置禁用搜索时，顶部 toolbar 的搜索按钮不得展示，即使默认 toolbar 或宿主 `controls` 中包含 `search`。
15. [F-015] `MindMapViewer` 必须继承 MiniMap 默认隐藏、搜索按钮隐藏和全屏 toggle 行为，同时保持只读模式不展示编辑历史按钮。

## 非功能需求

- 性能: 100 节点 fixture 下滚轮缩放、子树拖拽和容器 resize 重定位保持流畅，不触发高频 `onChange` 或全量 history 堆积。
- 可用性: toolbar 图标需要有明确 `aria-label` / `title`；全屏进入与退出、undo/redo/reset 禁用状态必须可理解。
- 兼容性: 保持现有 `MindMapEditor`、`MindMapViewer`、`toolbar.controls`、`viewport.zoomOnScroll`、`search.hidden` 的向后兼容；新增 MiniMap 与滚轮灵敏度参数为可选配置。
- 稳定性: ResizeObserver、fullscreenchange 和 wheel handler 必须在组件卸载时清理，避免重复监听或内存泄漏。
- 安全: 不引入 HTML 注入、外部链接自动打开或浏览器权限绕过；Fullscreen API 不可用时继续通过 `onError` 返回可恢复错误。

## 验收标准

- [ ] [AC-001] 在 playground 启用滚轮缩放后，单次小幅滚轮事件只产生小幅 zoom 变化，多次滚动呈连续线性变化，视口不跳到极大或极小。
- [ ] [AC-002] 滚轮缩放时鼠标指向的节点或画布位置保持在指针附近，不出现明显偏移。
- [ ] [AC-003] 点击全屏按钮进入全屏后，再次点击同一按钮可以退出全屏；按 Esc 退出后按钮状态同步恢复。
- [ ] [AC-004] 拖动有子节点的节点时，所有可见子节点和连线跟随父节点一起移动；释放后文档中父子关系保持正确。
- [ ] [AC-005] 默认渲染 `MindMapEditor` 和 `MindMapViewer` 时页面上没有 React Flow MiniMap；显式传入 MiniMap 启用参数后才展示。
- [ ] [AC-006] 选择 Graphite 或暗黑主题后，`.mmn-editor` 的画布背景为 `#10172a`，且主要文字、节点和连线可读。
- [ ] [AC-007] 编辑节点标题后，顶部撤销按钮变为可用；点击撤销恢复编辑前标题，点击重做恢复编辑后标题。
- [ ] [AC-008] 编辑多个节点后点击还原初始状态，文档恢复到编辑器挂载时的初始内容，undo/redo 按钮回到不可用状态。
- [ ] [AC-009] 改变编辑器容器宽度或高度后，导图自动重新居中显示且当前 zoom 不变；拖拽节点或编辑标题期间不会被 resize 居中打断。
- [ ] [AC-010] 设置 `search={{ hidden: true }}` 时 toolbar 中没有 `Search` 按钮，搜索面板也不会打开。
- [ ] [AC-011] 相关 React 单元测试、Playwright E2E、`pnpm typecheck`、`pnpm test`、`pnpm e2e`、`git diff --check` 通过。

## 依赖

- `@xyflow/react` 的 viewport、MiniMap、fullscreen 容器渲染能力
- `@my-mind-node/core` 的 `MindMapOperation`、`HistoryManager` / history 语义、`node.moveMany`
- `packages/react` 现有 `MindMapEditor`、`MindMapViewer`、`Toolbar`、`documentToFlow`、`drag-interactions`
- Vitest / Testing Library
- Playwright

## 开放问题

- 暂无。MiniMap 默认隐藏、搜索隐藏时过滤 toolbar、暗黑背景固定为 `#10172a` 均按本次反馈直接落地。
