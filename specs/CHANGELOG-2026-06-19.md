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
