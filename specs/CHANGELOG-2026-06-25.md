# 变更日志 — 2026-06-25

## Feature 12: Viewport Interaction Controls Polish

### 新增

- 新增指针锚定的线性 wheel 缩放，支持灵敏度、单次最大步进和缩放上下限。
- 编辑器容器尺寸变化后默认保留当前 zoom 并自动居中，并在节点拖拽、节点缩放和画布输入期间暂停。
- 全屏按钮支持进入/退出 toggle，并通过 `fullscreenchange` 同步图标与可访问文案。
- 编辑 toolbar 新增 undo、redo、reset-to-mount-state 控制；只读模式自动隐藏历史控制。
- 父节点拖动时可见子树和连线实时跟随，释放后仍只提交顶层节点结构变更。
- MiniMap 改为显式启用，搜索隐藏配置同步过滤 toolbar，Graphite canvas 更新为 `#10172a`。

### 关键文件

- `packages/react/src/MindMapEditor.tsx` — wheel、resize、fullscreen、history、子树拖动和配置过滤主实现。
- `packages/react/src/types.ts` — 新增 viewport 参数、MiniMap 配置和历史 toolbar controls。
- `packages/react/src/components/Toolbar.tsx` — 控件禁用态、激活态、动态 label 与历史图标。
- `packages/react/src/styles.css` 与 `packages/react/src/themes.ts` — toolbar 状态样式和 Graphite canvas token。
- `packages/react/src/__tests__/react-smoke.test.tsx` — 组件状态、受控/非受控 reset、MiniMap、fullscreen 和 observer 回归。
- `tests/e2e/playground.spec.ts` — 跨浏览器 wheel、fullscreen、子树拖动、resize 居中和搜索隐藏验收。

### 架构决策

- wheel 缩放使用 React Flow 外层原生 non-passive capture listener，避免 pane target 限制和宿主页面滚动冲突。
- 子树拖拽只在 React Flow 本地节点状态中同步可见后代，文档与 history 在 mouseup 时最多提交一次顶层 `node.moveMany`。
- reset 初始状态保存为 editor mount 快照；受控模式通过 `onChange` 请求宿主更新，非受控模式直接更新内部文档。
- MiniMap 默认不渲染，新增配置全部为可选参数，保持现有宿主调用兼容。
