# Copy Dropdown & Tree Branch Menu - 任务清单

## 任务版本

| 日期 | 版本 | 说明 |
| --- | --- | --- |
| 2026-06-26 | v1 | 初始任务 |
| 2026-06-27 | v2 | 明确 Tree 默认紧凑展开、展开循环和文档变更同步 |

## 项目信息

- 项目名: my-mind-node-workspace
- 产品名: my-mind-node
- 架构类型: pnpm monorepo
- specs 路径: `/Users/bldf/MyProject/githubpro/my-mind/specs/15.copy-dropdown-tree-branch-menu/`

## 任务列表

### 功能 1: 复制下拉工具栏

- [ x ] T-001: 扩展 toolbar 与编辑器公开类型，新增 `"copy"` control、`CopyDataFormat`、`ToolbarCopyConfig`、`onCopyData` 等可选接口 ~30min
- [ x ] T-002: 修改 `Toolbar.tsx`，为 copy control 渲染 hover/focus 下拉菜单，包含 JSON、Markdown、Mermaid 三项及 aria/menu 键盘行为 ~1h
- [ x ] T-003: 在 `MindMapEditor.tsx` 接入复制流程，处理 JSON fallback、宿主回调、Clipboard API 写入、成功状态与失败 `MindMapError` ~1h
- [ x ] T-004: 在 `apps/playground/src/App.tsx` 配置 copy control，复用 `serializeDocument` 和 `exportMindMap` 生成 JSON、Markdown、Mermaid 文本 ~30min

### 功能 2: 分支 Tree 数据与渲染

- [ x ] T-005: 新增 `buildBranchTreeItems` 纯函数和 `BranchTreeItem` 类型，按原始根节点构建最多三级、父节点优先、二级 fallback 的 Tree 数据 ~1h
- [ x ] T-006: 改造 `BranchListPanel.tsx`，从一级按钮列表升级为默认紧凑展开 Tree 渲染，支持 depth、父节点提示、选中态、祖先态、长标题布局和单按钮展开循环 ~1h
- [ x ] T-007: 更新 `useBranchListState` / `MindMapEditor` 的分支选择逻辑，使 Tree item 点击后右侧 `viewRootId` 可切换到一级、二级或三级节点 ~1h
- [ x ] T-008: 补充 Tree 菜单 CSS，覆盖浅色/暗黑、三级缩进、计数、hover/focus、窄侧栏、收起预览和 toolbar 不遮挡 ~1h

### 功能 3: 测试与验证

- [ x ] T-009: 补充纯函数单元测试，覆盖 Tree 深度截断、父节点过滤、一级二级 fallback、顺序保持和坏引用容错 ~45min
- [ x ] T-010: 补充 React 组件测试，覆盖复制下拉展示、复制成功/失败、Tree 默认紧凑展开、展开循环、文档变更同步和 Tree item 点击不触发 `onChange` ~1h
- [ x ] T-011: 补充 Playwright E2E，验证 playground 三种格式复制文本可被再次导入、Tree 点击二/三级聚焦、暗黑和窄容器视觉稳定 ~1.5h
- [ x ] T-012: 运行 `pnpm typecheck`、`pnpm test`、`pnpm e2e`、`git diff --check`，修复类型、测试、浏览器和格式回归 ~1h

## 依赖关系

- T-002 依赖 T-001 的类型扩展。
- T-003 依赖 T-001 和 T-002。
- T-004 依赖 T-003。
- T-006 依赖 T-005。
- T-007 依赖 T-005 和 T-006。
- T-008 依赖 T-006。
- T-009 依赖 T-005。
- T-010 依赖 T-002、T-003、T-006、T-007。
- T-011 依赖 T-004、T-007、T-008。
- T-012 依赖全部实现与测试任务完成。

## 风险点

- Clipboard API 在非安全上下文、权限受限或浏览器策略下可能失败；实现必须走 `onError`，E2E 需 mock `navigator.clipboard.writeText`。
- `.mmn-toolbar` 当前 `overflow-x: auto`，copy dropdown 若放在 toolbar 内部可能被裁切；需要调整局部结构或使用不会破坏现有 toolbar 滚动的定位策略。
- `@my-mind-node/react` 不能直接引入 `@my-mind-node/exporters`；Markdown/Mermaid 复制必须通过 playground/宿主回调提供。
- Tree item 点击二/三级会改变右侧 `viewRootId`，要保持现有 split mode 的一级分支归属、面包屑、搜索结果跳转和 `onViewRootChange` 语义一致。
- Tree 全部展开后侧栏内容会变长；需要保证滚动区域稳定，不影响侧栏 header、收起按钮、固定按钮和 resize handle。
- 展开循环是本地 UI 状态；文档新增或删除分支后必须把当前循环状态重新映射到新的 Tree 结构，避免按钮文案和实际展开状态脱节。
- 复制和 Tree 选择都是 UI 状态操作，不能写入 `MindMapDocument` 或 history。
