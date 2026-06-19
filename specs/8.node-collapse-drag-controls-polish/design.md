# Node Collapse Drag Controls Polish - 技术设计

## 设计版本

| 日期 | 版本 | 说明 |
| --- | --- | --- |
| 2026-06-19 | v1 | 根据折叠计数、拖拽稳定性和节点四角缩放反馈新建设计 |

## 项目架构

- 架构类型: monorepo
- 涉及层: `packages/react` 交互与样式、`packages/core` 命令复用、`apps/playground` 示例、组件测试与 Playwright E2E

## 功能模块设计

### 模块 1: 折叠数量与再次展开入口

折叠节点仍由 `MindMapNode.collapsed` 表达，React 层在转换为 flow nodes 时计算隐藏数量并交给 `MindNode` 展示。

**涉及层及关键设计:**

- 在 `packages/react/src/document-to-flow.ts` 中为每个 visible node 计算 `collapsedHiddenCount`，仅当节点 `collapsed=true` 且隐藏子孙数量大于 0 时传入。
- 隐藏数量统计以折叠分支内全部不可见子孙节点为准，而不是只统计直接 `children`。
- 扩展 `MindNodeData`，新增 `collapsedHiddenCount?: number` 和 `onExpandCollapsed?: (nodeId: NodeId) => void`。
- `MindNode` 在折叠态展示常驻数量按钮，按钮文案可用 `+{count}`，`aria-label` 使用 `Expand {node.title}, {count} hidden nodes`。
- 点击数量按钮调用 `node.collapse`，设置 `collapsed=false`，成功后自动布局。
- 现有 hover 折叠按钮可在折叠态降级为同一个展开入口，或在折叠数量按钮存在时隐藏，避免重复控件重叠。
- 只读模式默认不提交展开命令；如后续需要 Viewer 本地展开，应单独设计 local view state，不在本规格内扩张数据模型。

### 模块 2: 拖拽命中语义

将“拖到节点上入子”和“拖到节点上方/下方空隙排序”拆成两个几何命中路径，减少当前通过目标节点内部上/中/下分区导致的误判。

**涉及层及关键设计:**

- 在 `packages/react/src/drag-interactions.ts` 中引入方向感知的 drop geometry helper，输入包括 moving node rect、target node rect、layout direction 和排序阈值。
- `reparent` 判定基于 moving node 与 target node 的有效重合，例如拖动节点中心点进入 target rect 或两个 rect 的重合比例超过最小阈值。
- `sort-before` / `sort-after` 判定基于 target rect 外侧的上方/下方排序带；moving node 不应与 target rect 有效重合，但需要处于同一可排序邻域内。
- right/left 导图默认使用垂直上/下排序带；up/down 布局后续可复用同一 helper 的 cross-axis / main-axis 计算。
- 释放前继续展示 insertion preview，文案沿用 `Insert before this node` / `Insert after this node`。
- 命中结果仍复用 `getDropValidationReason`，保证根节点、自身、后代和被拖动集合内部目标不可提交。
- 多选拖放继续只移动选择集中的顶层节点，排序时按原文档顺序提交。

### 模块 3: 拖拽过程与 viewport 稳定

拖拽提交应该改变文档结构和布局，但不应该把用户当前视口自动缩回全局 fit view。

**涉及层及关键设计:**

- `MindMapEditor` 的 drag session 继续只在拖动释放时调用一次 `runCommand`，拖动中不写 `MindMapDocument`。
- 在 drag session 期间保存当前 React Flow viewport；释放后结构提交和自动布局完成时恢复或保持该 viewport，避免 zoom/pan 跳变。
- 调整自动 `fitView` 触发条件：初始化、切换 view root、外部显式导入/重置文档可以 `fitView`，普通拖拽移动、排序、折叠展开和节点缩放不得因 `document.revision` 改变而自动 `fitView`。
- 可引入内部 `suppressNextFitViewRef` 或把 `autoFitKey` 从 revision 维度改为更稳定的初始化 key，但必须保留首次加载时完整展示导图。
- `mergeFlowNodeData` 在拖拽期间继续保留临时位置；提交完成后只切换到布局结果一次，避免先回旧位置再到新布局造成闪烁。
- 如果提交失败，回滚到提交前 flow data，但仍保持用户 viewport，不额外 `fitView`。

### 模块 4: 四角节点缩放控制

节点缩放继续复用 core 的 `node.resize` 命令，只改变 React 节点上的操作入口和命中行为。

**涉及层及关键设计:**

- `MindNode` 不再在底部 `mmn-node__quick` 中渲染 “Shrink node” / “Grow node” 的 “- / +” 按钮。
- 当节点 selected 且非 readonly、`nodeSizing.showQuickControls !== false` 时，在节点四角渲染缩放 handle。
- 四角 handle 使用 `button` 或 pointer-aware control，类名如 `mmn-node__resize-handle mmn-node__resize-handle--top-left`。
- 鼠标拖动任意角点时，根据指针到节点中心的距离变化计算 scale delta，并通过 `node.resize` 提交；点击或键盘操作可按 `nodeSizing.scaleStep` 执行一次增减。
- 缩放 handle 必须添加 `nodrag` / `nopan`，并在 `pointerdown`、`mousedown`、`click` 中阻止事件冒泡，避免触发 React Flow 节点拖拽或 pane pan。
- `minScale`、`maxScale` 和 `scaleStep` 继续从 `nodeSizing` 读取；如果 `scaleStep` 缺省，沿用现有 0.1 步进。
- 现有 “Enter node view” 能力不作为缩放按钮处理；如保留入口，应迁移为独立图标按钮，避免重新形成底部 “- / +” 工具条。

### 模块 5: 样式与可访问性

所有默认控件样式放在 `packages/react/src/styles.css`，保持宿主无需额外 CSS 即可使用。

**涉及层及关键设计:**

- 折叠数量按钮常驻显示，但体积应小于节点主标题，不遮挡文本编辑区域和 hover 加子节点入口。
- 四角缩放 handle 使用稳定尺寸，例如 18px 到 24px；缩放时不得改变节点布局尺寸导致 hover 区域跳动。
- 四角 handle 需要 focus visible 样式，并提供 `aria-label`，例如 `Resize node from top left`。
- 删除底部 “- / +” 后，应同步清理或重命名 `.mmn-node__quick` 中仅服务缩放按钮的样式，避免空容器残留。
- 折叠数量、排序预览和非法目标反馈不能只依赖颜色表达。

## 接口契约

### `MindNodeData`

```typescript
export interface MindNodeData extends Record<string, unknown> {
  collapsedHiddenCount?: number;
  onExpandCollapsed?: (nodeId: NodeId) => void;
  showNodeResizeControls?: boolean;
}
```

### `NodeSizingConfig`

现有字段继续生效；实现时需要补齐当前未完全使用的 `showQuickControls` 和 `scaleStep`。

```typescript
export interface NodeSizingConfig {
  minScale?: number;
  maxScale?: number;
  scaleStep?: number;
  showQuickControls?: boolean;
}
```

### Drop geometry helper

```typescript
interface DropGeometryInput {
  movingRect: DOMRect;
  targetRect: DOMRect;
  layoutDirection: MindMapDocument["layout"]["direction"];
  sortGapPx: number;
  overlapRatio: number;
}
```

## 数据模型

- 不新增持久化字段。
- 折叠状态继续写入 `MindMapNode.collapsed`。
- 隐藏数量、四角缩放拖动状态、drop geometry 和 viewport 抑制标记都是 React 层临时状态。
- 节点缩放继续写入现有 `MindMapNode.style.scale`，通过 `node.resize` 命令维护历史记录。

## 安全考虑

- 折叠数量、按钮标题和错误提示按纯文本渲染。
- Pointer 事件监听必须在组件卸载、拖动取消和 pointerup 后清理，避免悬挂监听修改过期状态。
- 不新增网络请求、动态代码执行、HTML 注入或外部资源加载。

## 技术决策

| 决策 | 选项 | 理由 |
| --- | --- | --- |
| 折叠数量 | 统计隐藏子孙节点总数 | 更接近用户对“折叠后还有多少内容”的理解 |
| 展开入口 | 折叠态常驻数量按钮 | 避免折叠后用户找不到再次展开路径 |
| 入子命中 | 有效重合才入子 | 对齐“拖动到节点上”的视觉语义 |
| 排序命中 | 节点外上/下排序带 | 对齐“拖到节点上方或下方且不重合”的用户描述 |
| 视口稳定 | 拖拽/折叠/缩放后不自动 `fitView` | 防止画布闪烁和恢复到最小页面 |
| 缩放入口 | 四角 resize handles | 取消底部 “- / +” 按钮，减少下方遮挡 |
| 缩放数据 | 复用 `node.resize` 和 `style.scale` | 不扩张 core 数据模型，保留历史和配置边界 |
