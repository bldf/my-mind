# Canvas Drag & Resize Polish - 任务清单

## 任务版本

| 日期 | 版本 | 说明 |
| --- | --- | --- |
| 2026-06-19 | v1 | 初始任务清单 |

## 项目信息

- 项目名: my-mind-node-workspace
- 架构类型: monorepo
- specs 路径: specs/9.canvas-drag-resize-polish/

## 任务列表

### 功能 1: 消除拖拽闪烁

- [ ] T-001: 修改 `MindMapEditor.tsx`，将 `useEffect` 同步 `flowData` 的逻辑重用 Render-phase 状态同步模式，彻底消除组件双渲染产生的闪烁 ~15min
- [ ] T-002: 运行 playground 开发服务器，手动拖拽节点，观察高亮与连线，确认拖动移动时无任何画布/节点闪烁 ~5min

### 功能 2: 1:1 跟随鼠标拖拽缩放与历史记录优化

- [ ] T-003: 在 `MindNodeData` 类型中新增 `onResizeProgress` 和 `onResizeCommit` 回调声明 ~5min
- [ ] T-004: 修改 `document-to-flow.ts`，在 `documentToFlow` 转换中将这两个回调正确传递至 `MindNode` 节点的 data 对象 ~5min
- [ ] T-005: 重构 `MindNode.tsx` 中的 `startResize` 实现：
  - 在 `pointerdown` 时获取初始 scale 和距中心距离 `startDistance`
  - 在 `pointermove` 时根据距离比值计算新 scale，并调用 `onResizeProgress` 改变临时状态，实现 1:1 跟随 ~20min
- [ ] T-006: 在 `MindMapEditor.tsx` 中实现 `onResizeProgress`：通过局部修改 `flowNodes` 中特定节点的 scale 属性触发重新渲染（不修改 doc 和 history） ~15min
- [ ] T-007: 在 `MindMapEditor.tsx` 中实现 `onResizeCommit`：在 pointerup 释放或 click 点击微调时，通过 core 命令 `node.resize` 统一将最终 delta 写入文档和撤销栈中 ~15min

### 测试与验证

- [ ] T-008: 编写/更新 React 单元测试与 Playwright E2E 测试，覆盖 1:1 拖拽缩放与历史记录单次提交行为 ~15min
- [ ] T-009: 运行 `pnpm test` 和 `pnpm e2e` 保证所有用例顺利通过 ~10min
