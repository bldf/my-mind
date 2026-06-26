# Viewport Interaction Controls Polish - 技术设计

## 设计版本

| 日期 | 版本 | 说明 |
| --- | --- | --- |
| 2026-06-25 | v1 | 初始技术设计 |

## 项目架构

- 架构类型: pnpm monorepo
- 涉及层: `packages/react` 组件与样式、`packages/core` history 复用、`apps/playground` 体验验证、`tests/e2e` 浏览器回归
- 项目规范: 遵循 `AGENTS.md`、`.codex/rules/coding-style.md`、`.codex/rules/testing.md`、`.codex/rules/security.md`、`.codex/rules/git-workflow.md`

## 功能模块设计

### 模块 1: 视口滚轮缩放

在 `packages/react/src/types.ts` 扩展 `ViewportConfig`，保留 `zoomOnScroll` 现有语义，并新增可选参数:

- `wheelZoomSensitivity?: number`
- `wheelZoomMaxStep?: number`
- `fitViewOnResize?: boolean`

`MindMapEditor` 中不直接依赖 React Flow 默认滚轮缩放完成线性体验。启用 `viewport.zoomOnScroll` 时，在编辑器容器或 React Flow pane 上处理 `wheel` 事件，按 `deltaY` 计算目标 zoom:

```text
step = clamp(-deltaY * sensitivity, -maxStep, maxStep)
nextZoom = clamp(currentZoom * (1 + step), minZoom, maxZoom)
```

缩放锚点使用事件的 `clientX/clientY`。根据当前 viewport 与容器 bounds 计算缩放前鼠标所在 flow 坐标，再反推 `x/y/zoom`，调用 `flow.setViewport`。滚轮事件只更新 viewport，不提交文档、不记录 history。

**涉及层及关键设计:**

- React: `MindMapEditor` 增加 wheel handler、viewport clamp 常量和可配置参数。
- CSS/UX: 缩放不添加额外视觉组件；继续使用顶部 zoom 按钮。
- 测试: E2E 断言小幅 wheel 只产生小幅 transform 变化，并保持鼠标锚点附近节点稳定。

### 模块 2: 全屏 toggle 与状态同步

`Toolbar` 需要支持基于状态改变 label/icon。`ViewToolbarControl` 保留 `fullscreen`，`MindMapEditor` 内部维护 `isFullscreen`:

- 点击 `fullscreen` 且当前容器不是 `document.fullscreenElement` 时调用 `container.requestFullscreen()`。
- 点击 `fullscreen` 且当前容器已经全屏时调用 `document.exitFullscreen()`。
- 监听 `fullscreenchange`，只同步 `isFullscreen`；全屏导致的真实容器宽高变化统一交给 `ResizeObserver` 触发保留当前 zoom 的居中，避免无尺寸变化的状态事件误重置 viewport。
- `requestFullscreen` / `exitFullscreen` 不可用或失败时沿用 `onError` 返回可恢复错误。

**涉及层及关键设计:**

- React: `MindMapEditor` 增加 fullscreen state、effect 清理监听。
- Toolbar: `fullscreen` 在全屏时显示 `Minimize` 图标和 `Exit fullscreen` 文案，非全屏时显示 `Maximize` 和 `Fullscreen`。
- 测试: 单元测试模拟 `document.fullscreenElement` / `fullscreenchange`；E2E 覆盖按钮二次点击退出。

### 模块 3: 子树拖拽实时跟随

现有 `dragSession` 只记录被拖动的顶层节点集合。将其扩展为:

```ts
interface DragSession {
  commitNodeIds: NodeId[];
  visualNodeIds: NodeId[];
  startPositions: Record<string, Point>;
}
```

拖动开始时:

- `commitNodeIds` 使用现有 `getTopLevelMovableNodeIds`，用于最终 `node.moveMany` 结构提交。
- `visualNodeIds` 包含 `commitNodeIds` 及其所有当前可见后代；如果后代已经因折叠不可见，不加入视觉移动集合。
- `startPositions` 记录所有 `visualNodeIds` 的 React Flow 起始位置。

拖动过程中，当 React Flow 只移动主节点时，根据主节点位移将同一 delta 应用到 `visualNodeIds` 中其他节点的本地 `flowNodes`，并保持 `mergeFlowNodeData(..., keepPositions=true)` 不覆盖这些临时位置。连线随节点位置实时刷新。

拖动释放时:

- drop intent 命中时仍只对 `commitNodeIds` 调用 `node.moveMany`，避免把后代提交成同级移动。
- 未命中或非法时恢复 `flowData.nodes` / `flowData.edges`。
- 自动布局只在提交成功后执行一次，history 只记录一次结构变更。

**涉及层及关键设计:**

- React: `MindMapEditor` 增加可见后代收集 helper 和拖拽本地位置同步逻辑。
- Core: 不需要改变数据模型；必要时可复用 `getDescendantIds`，但可见性按 React 层 `getVisibleNodeIds` 过滤。
- 测试: React helper 测试覆盖父节点拖动时 `visualNodeIds`；E2E 覆盖父节点拖拽过程中子节点 bounding box 同向变化。

### 模块 4: MiniMap 显式启用

在 `packages/react/src/types.ts` 新增:

```ts
export interface MiniMapConfig {
  visible?: boolean;
  pannable?: boolean;
  zoomable?: boolean;
}
```

并在 `MindMapEditorProps` 增加 `minimap?: MiniMapConfig`。`MindMapEditor` 默认不渲染 `<MiniMap />`；只有 `props.minimap?.visible === true` 时渲染，并将 `pannable` / `zoomable` 默认设为 `true`。

`MindMapViewer` 继承该行为，不再默认展示 MiniMap。Playground 如需要演示 MiniMap，必须显式传入 `minimap={{ visible: true }}`；本次需求默认保持 playground 不展示。

**涉及层及关键设计:**

- API: 新增可选 props，不影响未使用 MiniMap 的宿主。
- CSS: 保留现有 MiniMap override，仅在组件存在时生效。
- 测试: 默认渲染时查询不到 `.react-flow__minimap`；显式启用时可以查询到。

### 模块 5: 暗黑背景 `#10172a`

更新 `packages/react/src/themes.ts` 中内置 Graphite 主题:

- `colors.canvas` 改为 `#10172a`。
- 检查 dark mode CSS token 是否有硬编码背景覆盖 `--mmn-canvas`；如有同步调整。
- 保持节点、根节点、自动分支 palette、边、toolbar、面板的对比度，不覆盖节点自定义 `style`。

**涉及层及关键设计:**

- React theme: `resolveTheme` 不需要改动。
- CSS: `.mmn-editor`、React Flow background、panel 背景继续通过 CSS variables 派生。
- 测试: 更新现有 dark theme 单元测试和 E2E 断言 `#10172a`。

### 模块 6: 顶部历史控制

扩展 `ViewToolbarControl`:

```ts
| "undo"
| "redo"
| "reset"
```

`MindMapEditor` 的默认可编辑 toolbar 包含 `undo`、`redo`、`reset`；`MindMapViewer` 和 `readonly` 模式不展示编辑历史控制。`Toolbar` 接收每个 control 的状态:

- `disabledControls?: Partial<Record<ViewToolbarControl, boolean>>`
- `activeControls?: Partial<Record<ViewToolbarControl, boolean>>`
- `labels?: Partial<Record<ViewToolbarControl, string>>`

`MindMapEditor` 需要把 history 从纯 `ref` 状态提升出可渲染状态，例如维护 `historyVersion` 或 `historySnapshot`，每次记录、撤销、重做、reset 后触发一次渲染。保留现有键盘快捷键 `Cmd/Ctrl+Z` 和 `Cmd/Ctrl+Shift+Z`。

初始状态使用 `initialDocumentRef` 记录:

- 非受控模式: 初始化为 `defaultValue ?? createEmptyDocument()`。
- 受控模式: 初始化为首次传入的 `value`。
- reset 成功后清空 `past/future`，提交 `initialDocumentRef.current`。

**涉及层及关键设计:**

- React: 可继续使用现有 local history，也可以改为 `HistoryManager`；关键是 UI 状态可更新。
- Toolbar: 使用 `Undo2`、`Redo2`、`RotateCcw` 等 lucide 图标。
- 测试: 编辑标题后 undo 可用；undo 后 redo 可用；reset 恢复初始文档并清空按钮状态。

### 模块 7: 容器 resize 后重新居中

在 `MindMapEditor` 使用 `ResizeObserver` 观察 `containerRef.current`。当宽高发生变化且满足以下条件时，下一帧根据当前可见节点 bounds 计算中心点，并调用 `flow.setViewport` 更新 `x/y`，保留当前 `zoom`:

- `props.viewport?.fitViewOnResize !== false`
- 节点已初始化且存在可见节点
- 当前没有节点拖拽 session
- 当前没有节点缩放 session
- 当前焦点不在标题 textarea、搜索输入或 inspector 表单输入中

需要对 resize 事件做 `requestAnimationFrame` 合并，避免连续 layout resize 多次改写 viewport。observer 首次回调只建立宽高基线，且不得因节点初始化状态变化而重建；组件卸载时断开 observer。

**涉及层及关键设计:**

- React: `MindMapEditor` 增加 resize observer effect 和交互中断 guard。
- 测试: JSDOM 单元测试覆盖 observer 清理和配置关闭；E2E 通过调整容器 class 或 viewport size 验证重新居中。

### 模块 8: 搜索隐藏过滤 toolbar

在计算 toolbar controls 时统一做规范化:

```text
rawControls = props.toolbar?.controls ?? DEFAULT_TOOLBAR
controls = rawControls.filter(control => !(control === "search" && props.search?.hidden))
```

`onToolbarAction("search")` 在 `search.hidden` 时直接 no-op，防止宿主通过自定义按钮或旧状态打开面板。`SearchPanel` 继续使用 `open={searchOpen && !props.search?.hidden}` 作为第二道保护。

**涉及层及关键设计:**

- React: `MindMapEditor` 控制层过滤。
- Viewer: `MindMapViewer` 默认 controls 也经过同一过滤逻辑。
- 测试: `search={{ hidden: true }}` 时 toolbar 无 `Search` 按钮；即使 props.controls 显式包含 `search` 也被过滤。

## 接口契约

### React Props

```ts
export interface ViewportConfig {
  zoomOnScroll?: boolean;
  panOnDrag?: boolean;
  fitViewOnInit?: boolean;
  fitViewOnResize?: boolean;
  wheelZoomSensitivity?: number;
  wheelZoomMaxStep?: number;
}

export interface MiniMapConfig {
  visible?: boolean;
  pannable?: boolean;
  zoomable?: boolean;
}

export interface MindMapEditorProps {
  minimap?: MiniMapConfig;
}
```

`ViewToolbarControl` 新增 `"undo" | "redo" | "reset"`，仅影响 toolbar 控件枚举，不改变 `MindMapDocument` 数据结构。

## 数据模型

不新增持久化数据字段。所有新增状态均为 React 运行时状态:

- `isFullscreen`
- `historySnapshot` 或 `historyVersion`
- `initialDocumentRef`
- `dragSession.visualNodeIds`
- `ResizeObserver` 最近尺寸缓存

## 安全考虑

- Fullscreen API 只对当前编辑器容器调用，不绕过用户手势要求，不访问外部页面。
- 事件监听、ResizeObserver、requestAnimationFrame 和 timeout 必须在卸载时清理。
- 搜索隐藏和 MiniMap 隐藏只影响 UI 渲染，不改变文档内容或权限模型。
- 继续按纯文本渲染节点标题、错误消息和 toolbar label。

## 技术决策

| 决策 | 选项 | 理由 |
| --- | --- | --- |
| MiniMap 默认隐藏 | 新增 `minimap.visible` 显式启用 | 符合用户反馈，且比 `hidden` 默认 true 更直观 |
| 滚轮缩放 | 自定义 wheel handler + `flow.setViewport` | 可控制线性比例、单帧步进和鼠标锚点，避免默认行为过猛 |
| reset 初始状态 | 记录 editor 挂载时文档快照 | 与“还原到初始状态”语义一致，不引入新的持久化字段 |
| 子树拖拽 | 本地视觉同步后代，提交仍只移动顶层节点 | 保持拖拽直觉，同时避免破坏树结构和 history 语义 |
| 搜索隐藏 | toolbar controls 规范化过滤 | 宿主配置和 UI 表现一致，并兼容显式 controls 包含 search 的情况 |
