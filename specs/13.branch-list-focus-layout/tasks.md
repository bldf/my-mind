# Branch List Focus Layout - 任务清单

## 任务版本

| 日期 | 版本 | 说明 |
| --- | --- | --- |
| 2026-06-26 | v1 | 初始任务 |

## 项目信息

- 项目名: my-mind-node-workspace
- 产品名: my-mind-node
- 架构类型: pnpm monorepo
- specs 路径: `/Users/bldf/MyProject/githubpro/my-mind/specs/13.branch-list-focus-layout/`

## 任务列表

### 功能 1: 启用条件与状态模型

- [x] T-001: 扩展 `MindMapEditorProps`，新增 `branchListLayout` 可选配置，并实现树深度检测、一级分支列表、根分支归属 helper 与单元测试 ~1h
- [x] T-002: 在 `MindMapEditor` 中新增列表布局状态，支持进入 split、退出恢复原 `viewRootId`、默认选中一级分支、文档变更后的分支兜底选择 ~1h
- [x] T-003: 将 split 模式下的右侧 `viewRootId` 接入现有 `documentToFlow` / `enterViewRoot` / `onViewRootChange`，保证分支切换不触发 `onChange` 或 history ~1h

### 功能 2: 左侧列表与分栏布局

- [x] T-004: 新增 `BranchListPanel` 内部组件，渲染根节点一级子节点、选中态、分支色彩提示、节点数量、收起按钮和固定按钮 ~1h
- [x] T-005: 抽取可复用的 canvas surface 渲染结构，新增 split shell，让左侧列表 and 右侧 React Flow 画布共存，同时保持普通布局不受影响 ~1h
- [x] T-006: 实现左右分隔条拖拽调整侧栏宽度，包含最小/最大宽度 clamp、`role="separator"` 可访问属性和拖拽清理逻辑 ~1h

### 功能 3: 切换按钮与收起交互

- [x] T-007: 新增半透明 `BranchListToggleButton`，支持深层文档自动显示、点击进出列表布局、图标/tooltip/aria 状态和暗黑模式样式 ~45min
- [x] T-008: 实现切换按钮 pointer 拖拽、容器内 clamp、越界释放吸附到最近边缘，并避免拖拽释放误触 toggle ~1h
- [x] T-009: 实现侧栏收起、左侧 hover/click rail 临时展开、鼠标离开自动收起、点击固定后恢复占位分栏，并在状态变化后重新居中右侧画布 ~1h

### 功能 4: 视觉、响应式与协同

- [x] T-010: 补充 branch list 相关 CSS，覆盖浅色/暗黑主题、列表项长标题、选中/hover/focus、overlay preview、窄容器默认收敛和 toolbar 不重叠 ~1h
- [x] T-011: 调整搜索结果、面包屑、Viewer、只读模式和 playground 配置，使列表布局在编辑器与只读视图中都能复用且不写入文档 ~1h

### 集成与测试

- [x] T-012: 补充 React 单元测试，覆盖启用条件、禁用配置、默认选中分支、分支切换不触发 `onChange`、Viewer 继承能力和浅层文档隐藏按钮 ~1h
- [x] T-013: 补充 Playwright E2E，覆盖进入/退出列表布局、点击一级分支切换右侧根节点、拖动分隔条、收起悬停展开固定、暗黑模式和按钮吸附 ~1.5h
- [x] T-014: 运行 `pnpm typecheck`、`pnpm test`、`pnpm e2e`、`git diff --check`，修复由列表布局引入的类型、单元测试、浏览器和格式回归 ~1h

## 依赖关系

- T-002 依赖 T-001 的配置与 helper。
- T-003 依赖 T-002 的 split 状态模型。
- T-005 依赖 T-004 的列表组件和 T-003 的右侧 view root 接入。
- T-006 依赖 T-005 的 split shell。
- T-008 依赖 T-007 的切换按钮基础组件。
- T-009 依赖 T-004、T-005、T-006 的侧栏结构。
- T-011 依赖 T-003、T-004、T-005 的基本列表布局能力。
- T-012 依赖 T-001 到 T-011 的实现完成。
- T-013 依赖 T-007、T-008、T-009、T-010、T-011 的交互与样式完成。
- T-014 依赖所有实现与测试任务完成。

## 风险点

- 现有 `MindMapEditor` 的 React Flow、topbar、panel 和 overlay 都在同一个容器内定位；引入 split shell 时容易造成 toolbar、breadcrumbs 或面板被左侧列表覆盖，需要先抽取 canvas surface 再接入布局。
- `viewRootId` 已用于面包屑和右键进入节点视图；split 模式下既要右侧以一级分支为根，又要允许继续进入更深节点，需要明确一级分支选中和实际右侧 view root 的关系。
- 切换按钮拖拽与点击共用 pointer 事件，必须做位移阈值判断，否则用户拖动释放可能误切换布局。
- hover 展开在触屏设备不可依赖，需要保留可点击 rail 和固定按钮。
- 分隔条拖拽会触发布局 resize；如果立即 `fitView` 可能和用户当前 zoom 冲突，应优先保留当前 zoom 并复用已有 `scheduleCenterView()` 行为。
- 列表布局不应写入文档或 history；实现时要避免把 `selectedBranchId`、宽度、按钮位置等 UI 状态放进 `metadata` 或通过 `onChange` 传给宿主。
