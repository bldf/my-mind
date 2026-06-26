# Branch List UI Polish & Editor Refactor - 技术设计

## 设计版本

| 日期         | 版本 | 说明     |
| ------------ | ---- | -------- |
| 2026-06-26   | v1   | 初始设计 |

## 项目架构

- 架构类型: pnpm monorepo
- 涉及层: `packages/core`（布局算法）、`packages/react`（UI 组件 + hooks）、`packages/core/__tests__`（测试）

## 功能模块设计

### 模块 1: 分支列表菜单项样式优化

**涉及层及关键设计:**

**前端组件 (`packages/react/src/components/BranchListPanel.tsx`):**

- 修改 `mmn-branch-list-item__count` 的渲染逻辑：从 `{totalNodes} {totalNodes === 1 ? "node" : "nodes"}` 改为仅 `{totalNodes}`
- 标题区域 `mmn-branch-list-item__title` 的 CSS 改为支持3行截断

**样式 (`packages/react/src/styles.css`):**

```css
.mmn-branch-list-item__title {
  flex: 1;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  font-size: 13px;
  margin-right: 8px;
  word-break: break-word;
}
```

移除原有的 `white-space: nowrap` 和 `text-overflow: ellipsis`，改用 `-webkit-line-clamp: 3` 实现多行截断。`-webkit-line-clamp` 已被所有主流浏览器支持（Chrome、Firefox、Safari、Edge）。

### 模块 2: 单子节点子树整体居中布局

**涉及层及关键设计:**

**核心算法 (`packages/core/src/layout.ts`):**

当前 `simpleTreeLayout` 的行为：
- 根节点放置在 `(0, 0)`（实际为 `-rootSize.width/2, -rootSize.height/2`）
- 当 `shouldSplitRoot = false`（root 只有1个子节点）时，所有子树都在根节点的一侧
- 这导致整体子树偏向一侧，根节点虽在原点但整体视觉不居中

修复方案：在 `simpleTreeLayout` 中，当 `shouldSplitRoot = false` 时，在所有节点位置计算完成后，计算整个子树的包围盒，然后将所有位置偏移使包围盒中心位于 `(0, 0)`。

```typescript
// 在 simpleTreeLayout 返回前，如果 shouldSplitRoot 为 false，
// 计算所有节点的 bounding box 并居中
if (!shouldSplitRoot && Object.keys(positions).length > 0) {
  const bounds = computeBoundingBox(positions, document);
  const offsetX = -(bounds.minX + bounds.maxX) / 2;
  const offsetY = -(bounds.minY + bounds.maxY) / 2;
  for (const id of Object.keys(positions)) {
    positions[id].x += offsetX;
    positions[id].y += offsetY;
  }
}
```

需要新增辅助函数 `computeBoundingBox`，遍历 `positions` 并结合 `document.nodes` 中节点的宽高计算完整包围盒。该函数为纯函数，复杂度 O(n)。

**测试 (`packages/core/src/__tests__/core.test.ts`):**

新增测试用例验证：
- 单子节点 + 多孙节点场景下，包围盒中心在 `(0, 0)` 附近
- 多子节点场景（`shouldSplitRoot = true`）行为不变

### 模块 3: MindMapEditor.tsx 拆分重构

**涉及层及关键设计:**

当前 `MindMapEditor.tsx` 共 2134 行，包含：
- 模块级纯函数（约 225 行，L158-L383）
- `EditorCanvas` 组件主体（约 1740 行，L385-L2125）
- `MindMapEditor` 导出包装器（约 8 行，L2127-L2134）

**拆分策略：**

#### 3.1 提取纯函数到工具模块

| 目标文件 | 提取的函数 | 行数估算 |
| -------- | ---------- | -------- |
| `packages/react/src/editor-utils.ts` | `clamp`, `documentsEqual`, `normalizeToolbarControls`, `isTextInputActive`, `getVisibleSubtreeNodeIds`, `getFlowNodeStartPositions`, `resolveDragInteractionSettings`, `mergeFlowNodeData`, `getSortGapPx` | ~120 |
| `packages/react/src/viewport-utils.ts` | `normalizeWheelDelta`, `isPinchLikeWheel`, `isScrollableWheelTarget`, `shouldIgnoreViewportWheel` | ~60 |
| `packages/react/src/drag-geometry.ts` | `getEventClientPoint`, `getNodeElement`, `toDropRect`, `getSyntheticMovingRect`, `getUnionRect`, `placeMeasuredRectAtPoint`, `getMovingNodesRect` | ~80 |

同时提取常量和类型定义到对应模块。

#### 3.2 提取自定义 hooks

| 目标文件 | 提取的逻辑 | 行数估算 |
| -------- | ---------- | -------- |
| `packages/react/src/hooks/useViewportControl.ts` | `scheduleViewportUpdate`, `scheduleFitView`, `scheduleFit1to1View`, `scheduleCenterView`, `flushPendingViewportUpdate`, `centerViewAtCurrentZoom`, wheel 事件处理, fullscreen/resize 监听 | ~200 |
| `packages/react/src/hooks/useHistory.ts` | `history` ref, `syncHistoryAvailability`, `undo`, `redo`, `resetToInitialDocument`, `canReset` | ~60 |
| `packages/react/src/hooks/useDragInteraction.ts` | `dragSession` ref, `dropIntent` state, `getDropIntentAtPoint`, `commitDrop`, `onNodeDragStart`, `onNodeDrag`, `onNodeDragStop`, `flashDropTarget` | ~200 |
| `packages/react/src/hooks/useBranchListState.ts` | `splitMode`, `selectedBranchId`, `sidebarCollapsed`, `sidebarPreviewOpen`, `sidebarPinned`, `sidebarWidth`, `branchSwitchPending`, branch switch 逻辑, resize handle 逻辑 | ~180 |

#### 3.3 拆分后 MindMapEditor.tsx 结构

```
imports (~30 lines)
常量/类型 (~20 lines)
EditorCanvas 组件 (~600 lines)
  - useState/useMemo 声明
  - 调用自定义 hooks
  - flowData 同步
  - onToolbarAction / onKeyDown
  - renderCanvasContent
  - return JSX
MindMapEditor 包装器 (~8 lines)
```

总计预估 ~660-760 行，满足 ≤ 800 行约束。

#### 3.4 测试文件

| 测试文件 | 测试目标 |
| -------- | -------- |
| `packages/react/src/__tests__/editor-utils.test.ts` | `clamp`, `documentsEqual`, `normalizeToolbarControls`, `isTextInputActive`, `getVisibleSubtreeNodeIds`, `getFlowNodeStartPositions`, `resolveDragInteractionSettings`, `mergeFlowNodeData`, `getSortGapPx` |
| `packages/react/src/__tests__/viewport-utils.test.ts` | `normalizeWheelDelta`, `isPinchLikeWheel`, `shouldIgnoreViewportWheel` |
| `packages/react/src/__tests__/drag-geometry.test.ts` | `toDropRect`, `getSyntheticMovingRect`, `getUnionRect`, `placeMeasuredRectAtPoint`, `getEventClientPoint` |

纯函数中涉及 DOM 的函数（`isScrollableWheelTarget`、`getNodeElement`、`getMovingNodesRect`、`isTextInputActive`）在 jsdom 环境下测试。

## 接口契约

拆分后各模块通过 `export` 暴露纯函数和 hooks，`MindMapEditor.tsx` 通过 `import` 引用。`packages/react/src/index.ts` 的公开导出不变。

## 数据模型

无新增数据模型。`computeBoundingBox` 函数接收 `positions: Record<string, Point>` 和 `document: MindMapDocument`，返回 `{ minX, minY, maxX, maxY }`。

## 安全考虑

- 无安全风险，纯 UI 和代码结构变更
- 拆分过程中确保不引入全局变量或副作用

## 技术决策

| 决策 | 选项 | 理由 |
| ---- | ---- | ---- |
| 多行截断方案 | `-webkit-line-clamp` vs JS 计算行数 | `-webkit-line-clamp` 纯 CSS 实现，浏览器支持广泛，无需 JS 逻辑 |
| 居中修复位置 | layout 层 vs viewport 层 | layout 层修复更彻底，影响所有视图，且 O(n) 复杂度可接受 |
| 拆分粒度 | 按职责分模块 | 纯函数按领域分（editor/viewport/drag-geometry），hooks 按功能分（viewport/history/drag/branch-list） |
| hook 提取方式 | 自定义 hooks vs 组件拆分 | 自定义 hooks 保持 EditorCanvas 组件完整性，减少 props 传递 |
