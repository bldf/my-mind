# 变更日志 — 2026-06-26

## Feature 12: Viewport Interaction Controls Polish v2

### 新增

- 普通鼠标滚轮和触控板滚动默认平移 viewport，且不触发文档 `onChange` 或 history。
- 触控板 pinch-like wheel 使用 `ctrlKey` / `metaKey` 分类后执行指针锚定缩放，并保留 `minZoom` / `maxZoom`、灵敏度和单帧最大步进限制。
- 触屏 pinch 通过可配置 `viewport.zoomOnPinch` 默认启用；宿主可关闭。
- 节点标题按视觉行数动态对齐：单行居中，多行或自动换行左对齐，自定义 `renderNode` 不受影响。

### 关键文件

- `packages/react/src/MindMapEditor.tsx` — 拆分 wheel 平移、pinch-like 缩放和 React Flow `zoomOnPinch` 配置。
- `packages/react/src/types.ts` — 新增 `panOnScroll`、`zoomOnPinch` 和 `wheelPanSensitivity`。
- `packages/react/src/nodes/MindNode.tsx` 与 `packages/react/src/styles.css` — 为默认节点标题追加多行 class 并左对齐。
- `packages/react/src/__tests__/react-smoke.test.tsx` — 覆盖多行标题 class 与自定义渲染隔离。
- `tests/e2e/playground.spec.ts` — 覆盖普通 wheel 平移、pinch-like wheel 缩放和标题对齐切换。
- `README.md`、`apps/docs/docs/guides/react.md`、`apps/docs/docs/reference/api.md` — 同步 viewport 行为与配置说明。

### 架构决策

- `.react-flow` 外层继续使用 non-passive capture wheel listener，但先按事件目标与手势类型分类，避免普通滚动和平移、pinch 缩放互相吞事件。
- 旧版普通 wheel 缩放只在宿主显式设置 `panOnScroll: false` 且 `zoomOnScroll: true` 时保留，默认交互转为普通滚动平移、pinch 缩放。
- 多行标题判定复用现有 layout 估算，保持 SSR-safe，不引入 DOM 行盒测量或自定义节点样式侵入。
