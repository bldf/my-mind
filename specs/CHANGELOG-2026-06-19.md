# 变更日志 — 2026-06-19

## Feature 7: Node Drag Interaction Polish v2

### 新增

- 中心区拖放释放即入子，移除 v1 的 2 秒 dwell 提交门槛，同时保留 `reparentDwellMs` public 配置兼容。
- 上/下区排序释放后以实时命中结果提交，保证同级 `children` 顺序、React Flow 节点状态和 playground JSON 一致。
- 节点标题编辑改为支持换行的 `textarea`，保存 `MindMapNode.title` 中的 `\n`，并让长标题、多行标题和根节点参与布局尺寸估算。
- hover 加子节点与展开/折叠控件补齐可点击命中处理，按钮使用 `nodrag` / `nopan`，标题本身保持可拖拽。
- playground JSON 面板新增稳定可访问名称，Playwright E2E 不再依赖第一个 `textarea`。

### 关键文件

- `packages/react/src/MindMapEditor.tsx` — 即时 drop 提交、排序最终命中、标题提交后自动布局和 revision 触发 fit view。
- `packages/react/src/nodes/MindNode.tsx` — 多行标题编辑、hover 控件事件隔离和标题拖拽保留。
- `packages/react/src/drag-interactions.ts` — reparent intent 文案从等待态改为即时 drop 文案。
- `packages/react/src/styles.css` — 多行标题展示、hover 控件命中区域和 dwell 进度样式清理。
- `packages/core/src/layout.ts` — 多行标题宽高估算与 layout graph 高度同步。
- `apps/playground/src/App.tsx` — JSON 面板可访问选择器。
- `tests/e2e/playground.spec.ts` — 即时入子、排序、多行标题、根节点完整展示和 hover 控件 E2E。

### 架构决策

- 拖放结构变更以 mouseup 时的实时命中结果为准，不依赖上一帧 `dropIntent`，避免中心/排序区域切换时提交旧 intent。
- 节点标题 textarea 不能加 `nodrag` / `nopan` 或拦截 `pointerdown`，否则从节点中心拖拽会失效；只隔离 hover 控件按钮。
- 多行标题布局优先使用基于文本行数和估算宽度的 fallback 尺寸，保持 core DOM-free。

## Feature 8: Node Collapse Drag Controls Polish

### 新增

- 折叠且存在隐藏子孙节点的节点展示常驻 `+N` 入口，点击后通过 `node.collapse collapsed=false` 展开并重新布局；只读模式下作为非变更提示展示。
- 拖拽命中从“目标节点内部上/中/下区”改为几何语义：有效重合释放入子，目标外侧上/下空隙释放排序，并继续复用非法结构校验。
- 自动 `fitView` 不再绑定 `document.revision`，拖拽、排序、折叠展开和节点缩放后保持用户当前 React Flow viewport。
- 选中节点底部 “- / +” 缩放按钮迁移为四角 resize handles，复用 `node.resize`、`nodeSizing.scaleStep`、`minScale` 和 `maxScale`。
- ESLint 忽略规则同步生成产物目录，避免 Next `.next` / `out` / `next-env.d.ts` 进入源码 lint。

### 关键文件

- `packages/react/src/document-to-flow.ts` — 计算 collapsed hidden descendants 并传入 `MindNodeData`。
- `packages/react/src/nodes/MindNode.tsx` — 折叠数量入口、四角 resize handles、事件隔离和只读边界。
- `packages/react/src/drag-interactions.ts` — 方向感知 drop geometry helper，区分 reparent 与 sort-before/sort-after。
- `packages/react/src/MindMapEditor.tsx` — drop intent 计算、释放提交、失败回滚和稳定 auto-fit key。
- `packages/react/src/styles.css` — 折叠计数与四角 resize handle 默认样式。
- `packages/react/src/__tests__/react-smoke.test.tsx` — 折叠计数、drop geometry、resize handle 和旧底部按钮回归测试。
- `tests/e2e/playground.spec.ts` — 折叠计数展开、viewport 保持、重合入子、外侧排序和四角缩放 E2E。

### 架构决策

- Drop geometry 使用当前指针点和已测得节点尺寸合成 moving rect，避免 React Flow drag callback 中 DOM rect position flush 时序导致 before/after 与 reparent 误判。
- 排序只在目标外侧空隙且 cross-axis 有足够重叠时触发；拖在目标内部即按有效重合入子处理。
- 取消 revision 驱动的 auto fit 后，E2E 需要把连续 before/after 排序拆成 fresh page 或显式用户 `fitView` 场景，因为 drop 后不自动 fit 是预期行为。

## Feature 9: Canvas Drag Resize Polish

### 新增

- 节点四角 resize 手势改为连续距离比缩放；拖动中只更新本地临时 `scale`，释放鼠标后再单次提交 `node.resize`。
- 点击 resize handle 且未发生有效位移时，保留单步 `nodeSizing.scaleStep` 缩放行为。
- `MindMapEditor` 将后续 `flowData` 变更改为 render-phase 同步，降低 React Flow 运行时节点元数据丢失造成的拖拽闪烁风险。

### 关键文件

- `packages/react/src/nodes/MindNode.tsx` — resize 指针事件监听、距离比计算和点击微调。
- `packages/react/src/MindMapEditor.tsx` — `onResizeProgress`、`onResizeCommit` 和 render-phase flow data 同步。
- `packages/react/src/document-to-flow.ts` — 将 resize progress / commit 与 scale 边界传递至节点。
- `packages/react/src/__tests__/react-smoke.test.tsx` — 连续拖拽缩放与点击微调单元测试。
- `tests/e2e/playground.spec.ts` — 拖动中不写入 JSON、释放后一次提交、一次 undo 还原的 E2E。

### 架构决策

- 拖动缩放过程不写入 document/history，避免高频 `onChange` 和撤销栈碎片。
- 初始 flow data 仍在 effect 中同步；后续 flow data 变化在 render phase 同步，避免提交后单帧状态不一致。
- JSDOM 下缺少 `PointerEvent` 时，用 `MouseEvent` 构造器作为测试 fallback。
