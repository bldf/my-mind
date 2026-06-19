# Node Collapse Drag Controls Polish - 任务清单

## 任务版本

| 日期 | 版本 | 说明 |
| --- | --- | --- |
| 2026-06-19 | v1 | 根据折叠计数、拖拽稳定性和节点四角缩放反馈新建任务 |

## 项目信息

- 项目名: my-mind-node-workspace
- 产品名: my-mind-node
- 架构类型: monorepo
- specs 路径: `specs/8.node-collapse-drag-controls-polish/`

## 任务列表

### 功能 1: 折叠数量与展开入口

- [ ] T-001: 在 `documentToFlow` 中计算折叠节点隐藏子孙数量，并通过 `MindNodeData.collapsedHiddenCount` 传给节点组件 ~30min
- [ ] T-002: 在 `MindNode` 中实现折叠数量按钮，点击后调用 `node.collapse collapsed=false` 并重新布局，处理与现有 hover 折叠按钮的显示优先级 ~1h
- [ ] T-003: 补齐折叠数量按钮默认样式、`aria-label`、focus 状态和只读模式边界 ~30min

### 功能 2: 拖拽命中与 viewport 稳定

- [ ] T-004: 复现并记录拖拽排序时页面闪烁、自动缩回最小页面和当前命中语义不符合预期的最小场景 ~30min
- [ ] T-005: 在 `drag-interactions` 中新增方向感知的 drop geometry helper，区分有效重合入子和节点外上/下排序区域 ~1h
- [ ] T-006: 改造 `MindMapEditor` 的 drop intent 计算与释放提交，确保重合释放入子、上/下空隙释放排序，并保留非法结构校验 ~1h
- [ ] T-007: 调整自动 `fitView` 和 drag session 提交流程，拖拽、排序、折叠展开和节点缩放后保持 React Flow viewport，不因 document revision 改变而重置视口 ~1h

### 功能 3: 四角节点缩放控制

- [ ] T-008: 移除选中节点底部 “- / +” 缩放按钮，改为渲染四角 resize handles，并补齐 `nodeSizing.showQuickControls` / `scaleStep` 的实际使用 ~1h
- [ ] T-009: 实现四角缩放 handle 的 pointer / click / keyboard 行为，复用 `node.resize`，并隔离 React Flow drag/pan 事件 ~1h
- [ ] T-010: 补齐四角缩放样式、可访问名称、focus 状态和只读隐藏逻辑，避免与标题编辑、加子节点和折叠数量按钮重叠 ~45min

### 集成与测试

- [ ] T-011: 补充 React 组件测试，覆盖隐藏数量计算、点击展开、drop geometry helper、四角缩放回调和底部 “- / +” 不再渲染 ~1h
- [ ] T-012: 补充 Playwright E2E，覆盖折叠后数量按钮展开、拖拽不重置 viewport、重合入子、上/下空隙排序和四角缩放操作 ~1h
- [ ] T-013: 运行 `pnpm typecheck`、`pnpm test`、`pnpm e2e`、`git diff --check` 并修复发现的问题 ~1h

## 依赖关系

- T-002 依赖 T-001
- T-003 依赖 T-002
- T-005 依赖 T-004
- T-006 依赖 T-005
- T-007 依赖 T-006
- T-009 依赖 T-008
- T-010 依赖 T-008、T-009
- T-011 依赖 T-001 到 T-010
- T-012 依赖 T-001 到 T-010
- T-013 依赖 T-011、T-012

## 风险点

- 折叠数量如果只按 visible nodes 计算，可能漏算深层隐藏子孙；需要直接从 `document.nodes` 遍历折叠分支。
- 折叠数量按钮和现有 hover 折叠按钮都位于节点边缘，定位不当会造成遮挡或按钮闪烁。
- 当前 `autoFitKey` 若继续绑定 `document.revision`，拖拽提交、排序、折叠和缩放都可能触发 `fitView`，导致页面看起来闪烁或缩回最小视图。
- 排序命中从“节点内部上/下区”改为“节点外上/下空隙”后，需要重新校准 Playwright 拖拽坐标，避免 E2E 仍拖到目标节点内部。
- 四角缩放 handle 若未加 `nodrag` / `nopan` 或未阻止 pointer 事件冒泡，点击缩放会被 React Flow 当成节点拖拽或画布平移。
- 四角缩放如果每个 pointermove 都提交 `node.resize`，会造成 history 膨胀；应合并为合理步进或在 pointerup 提交。
