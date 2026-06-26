# Branch List UI Polish & Editor Refactor - 任务清单

## 任务版本

| 日期         | 版本 | 说明     |
| ------------ | ---- | -------- |
| 2026-06-26   | v1   | 初始任务 |

## 项目信息

- 项目名: my-mind-node
- 架构类型: pnpm monorepo
- specs 路径: specs/14.branch-list-polish-editor-refactor/

## 任务列表

### 功能 1: 分支列表菜单项样式优化

- [ ] T-001: 修改 `BranchListPanel.tsx` 中 `mmn-branch-list-item__count` 渲染逻辑，移除 "node(s)" 后缀仅显示数字 ~5min
- [ ] T-002: 修改 `styles.css` 中 `.mmn-branch-list-item__title` 样式，从单行截断改为3行截断（`-webkit-line-clamp: 3`） ~5min

### 功能 2: 单子节点子树整体居中布局

- [ ] T-003: 在 `packages/core/src/layout.ts` 中新增 `computeBoundingBox` 纯函数，计算 positions 包围盒 ~15min
- [ ] T-004: 修改 `simpleTreeLayout`，当 `shouldSplitRoot = false` 时计算包围盒并偏移所有位置使整体居中 ~15min
- [ ] T-005: 在 `packages/core/src/__tests__/core.test.ts` 中新增测试用例验证单子节点居中和多子节点不变 ~15min

### 功能 3: MindMapEditor.tsx 纯函数提取

- [ ] T-006: 创建 `packages/react/src/editor-utils.ts`，提取 `clamp`、`documentsEqual`、`normalizeToolbarControls`、`isTextInputActive`、`getVisibleSubtreeNodeIds`、`getFlowNodeStartPositions`、`resolveDragInteractionSettings`、`mergeFlowNodeData`、`getSortGapPx` 及相关常量/类型 ~30min
- [ ] T-007: 创建 `packages/react/src/viewport-utils.ts`，提取 `normalizeWheelDelta`、`isPinchLikeWheel`、`isScrollableWheelTarget`、`shouldIgnoreViewportWheel` 及 `WHEEL_IGNORE_SELECTOR` 等常量 ~15min
- [ ] T-008: 创建 `packages/react/src/drag-geometry.ts`，提取 `getEventClientPoint`、`getNodeElement`、`toDropRect`、`getSyntheticMovingRect`、`getUnionRect`、`placeMeasuredRectAtPoint`、`getMovingNodesRect` ~15min
- [ ] T-009: 更新 `MindMapEditor.tsx` 的 import 引用提取出的模块，删除原有内联函数定义 ~15min

### 功能 4: 自定义 hooks 提取

- [ ] T-010: 创建 `packages/react/src/hooks/useViewportControl.ts`，提取 viewport 调度、wheel 处理、fullscreen/resize 监听逻辑 ~1h
- [ ] T-011: 创建 `packages/react/src/hooks/useHistory.ts`，提取 undo/redo/reset 历史管理逻辑 ~15min
- [ ] T-012: 创建 `packages/react/src/hooks/useDragInteraction.ts`，提取拖拽会话、drop intent、flash 逻辑 ~1h
- [ ] T-013: 创建 `packages/react/src/hooks/useBranchListState.ts`，提取 split mode、sidebar、branch switch 逻辑 ~30min
- [ ] T-014: 更新 `MindMapEditor.tsx` 引用自定义 hooks，删除原有内联逻辑 ~30min

### 功能 5: 纯函数测试用例

- [ ] T-015: 创建 `packages/react/src/__tests__/editor-utils.test.ts`，覆盖所有提取的纯函数 ~30min
- [ ] T-016: 创建 `packages/react/src/__tests__/viewport-utils.test.ts`，覆盖 `normalizeWheelDelta`、`isPinchLikeWheel` ~15min
- [ ] T-017: 创建 `packages/react/src/__tests__/drag-geometry.test.ts`，覆盖 `toDropRect`、`getSyntheticMovingRect`、`getUnionRect`、`placeMeasuredRectAtPoint` ~15min

### 集成与测试

- [ ] T-018: 运行 `pnpm typecheck` 确认类型安全 ~5min
- [ ] T-019: 运行 `pnpm test` 确认所有测试通过 ~5min
- [ ] T-020: 运行 `pnpm build` 确认构建成功 ~5min
- [ ] T-021: 运行 `pnpm lint` 确认代码风格一致 ~5min
- [ ] T-022: 启动 playground 可视化验证分支列表样式和布局居中效果 ~15min

## 依赖关系

- T-002 依赖 T-001（同文件不同关注点，可并行但建议顺序执行）
- T-004 依赖 T-003（`computeBoundingBox` 先行）
- T-005 依赖 T-004
- T-009 依赖 T-006、T-007、T-008
- T-014 依赖 T-010、T-011、T-012、T-013
- T-015 依赖 T-006
- T-016 依赖 T-007
- T-017 依赖 T-008
- T-018-T-022 依赖所有前置任务完成

## 风险点

- hook 提取时闭包依赖复杂，需仔细处理 `useCallback` 依赖数组，避免 stale closure
- `useDragInteraction` 和 `useViewportControl` 之间存在共享状态（`flushPendingViewportUpdate`、`nodeResizeActive`），需通过参数传递或共享 ref
- 布局居中修改可能影响已有 E2E 测试中的快照或坐标断言，需检查 `tests/e2e/playground.spec.ts`
- `-webkit-line-clamp` 在非常旧的浏览器中不支持，但项目目标浏览器均已支持
