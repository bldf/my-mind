# Copy Dropdown & Tree Branch Menu - 需求规格

## 概述

在编辑器顶部工具栏增加复制数据下拉按钮，支持复制当前导图的 JSON、Markdown、Mermaid 文本；同时将现有左侧一级分支菜单升级为默认展开的三级 Tree 菜单，让用户可以从原始根节点下的一级、二级和三级导航项快速聚焦对应子树。

## 项目信息

- 项目名: my-mind-node-workspace
- 产品名: my-mind-node
- 架构类型: pnpm monorepo
- 需求来源: 2026-06-26 `/my-ai-prd` 顶部复制按钮与分支菜单三级 Tree 展示反馈

## 需求版本

| 日期 | 版本 | 说明 |
| --- | --- | --- |
| 2026-06-26 | v1 | 初始需求规格 |

## 实现约定

- “顶部工具栏”指 `MindMapEditor` 内现有 `.mmn-toolbar`，复制入口需要与主题、撤销、搜索、缩放等图标按钮处于同一工具栏区域。
- 复制格式仅包含 `JSON`、`Markdown`、`Mermaid` 三项，不包含 PNG、SVG、OPML、Indented text。
- JSON 复制使用当前 `MindMapDocument` 的稳定序列化结果；Markdown 和 Mermaid 复用现有 `@my-mind-node/exporters` 导出链路，但不能把 exporters 变成 `@my-mind-node/react` 的默认依赖。
- Tree 层级按原始文档根节点计算：`document.rootId` 不作为菜单项，根节点直接子节点为一级，一级子节点为二级，二级子节点为三级。
- Tree 一级节点始终展示；二级和三级优先只展示有子节点的父节点。若某个一级节点没有可继续展开的二级父节点，则展示它的二级子节点作为终点行，避免该一级分支在菜单中没有可见下钻内容。
- Tree 默认全部展开，本期不要求持久化折叠状态；后续如需手动折叠可作为独立增强。

## 用户故事

- 作为导图编辑用户，我希望在顶部工具栏直接复制当前导图数据，以便快速粘贴到文档、聊天窗口或 Mermaid 渲染工具中。
- 作为导图编辑用户，我希望复制按钮悬停后出现格式列表，以便不离开画布就能选择 JSON、Markdown 或 Mermaid。
- 作为导图阅读用户，我希望左侧分支菜单不只展示一级分支，而是以 Tree 方式展示到三级，以便快速定位较深的主题分组。
- 作为大纲整理用户，我希望 Tree 菜单默认展开并只保留有下级内容的父节点，以便菜单保持紧凑，不被大量叶子节点淹没。

## 功能需求

1. [F-001] 顶部工具栏必须新增复制按钮，使用图标按钮形态，并提供 `title`、`aria-label` 和键盘可访问入口。
2. [F-002] 鼠标移动到复制按钮或按钮获得焦点时，必须展示下拉列表，列表包含 `JSON`、`Markdown`、`Mermaid` 三个复制选项。
3. [F-003] 点击任一复制选项后，必须把当前导图转换为对应格式并写入系统剪贴板；成功后给出轻量状态反馈，失败时通过现有错误通道或可见状态提示用户。
4. [F-004] 复制操作不得修改 `MindMapDocument`、不得新增 undo/redo history、不得影响当前选区、视图根节点、分支菜单状态或编辑中的节点标题。
5. [F-005] React 包必须保持 import/export adapters 可选；`@my-mind-node/react` 不得直接依赖 `@my-mind-node/exporters`，Markdown 和 Mermaid 文本由宿主应用或可选回调提供。
6. [F-006] 现有左侧分支菜单必须从横向或平铺一级列表升级为 Tree 展示，视觉上体现层级缩进、父子关系和当前选中项。
7. [F-007] Tree 菜单必须只基于原始根节点 `document.rootId` 的子树构建，不受当前右侧 `viewRootId`、面包屑进入深层视图或搜索跳转影响。
8. [F-008] Tree 菜单必须默认全部展开，最多展示一级、二级和三级；三级以下节点不展示。
9. [F-009] Tree 菜单一级节点始终展示；二级和三级节点按“有子节点的父节点优先”展示，且一级分支没有可展开二级父节点时展示其二级子节点作为终点行。
10. [F-010] Tree 菜单项点击后，右侧画布必须以该菜单项对应节点作为 `viewRootId` 聚焦渲染对应子树；若点击的是无子节点终点行，则右侧仍聚焦该节点并保持画布可用。
11. [F-011] Tree 菜单选中态必须精确标识当前右侧聚焦节点，并在聚焦二级或三级时同时保留其一级祖先的上下文样式。
12. [F-012] Tree 菜单必须继续支持侧栏收起、悬停临时展开、固定、宽度拖拽、暗黑主题和只读 `MindMapViewer` 场景。
13. [F-013] Tree 菜单长标题必须在侧栏内专业换行或截断，不得撑破侧栏，不得覆盖数量、操作按钮、右侧画布或顶部工具栏。

## 非功能需求

- 性能: 1000 节点 fixture 下，Tree 构建和复制格式生成不造成明显交互卡顿；Tree 构建应使用 memoized helper，复制只在用户选择格式时执行。
- 可用性: 复制下拉和 Tree 菜单支持鼠标、键盘焦点与屏幕阅读器；复制下拉不能被 toolbar overflow 裁切到不可点击。
- 兼容性: 保持现有 `MindMapEditor`、`MindMapViewer`、`toolbar.controls`、`branchListLayout`、`onViewRootChange`、`onError` 的向后兼容；新增配置必须可选。
- 安全: 复制文本只写入系统剪贴板，不访问网络、不读取剪贴板、不持久化用户数据；节点标题按纯文本渲染，避免 HTML 注入。
- 包边界: `packages/core` 继续 DOM-free；`packages/react` 不依赖 importers/exporters；复制格式转换由 playground 或宿主层接入可选 adapters。

## 验收标准

- [ ] [AC-001] playground 顶部工具栏显示复制图标按钮；鼠标悬停或键盘聚焦后出现包含 `JSON`、`Markdown`、`Mermaid` 的下拉列表。
- [ ] [AC-002] 点击 `JSON` 后，剪贴板内容是当前导图 JSON，并可被现有 JSON 导入路径再次解析。
- [ ] [AC-003] 点击 `Markdown` 后，剪贴板内容是当前导图 Markdown，并可被现有 Markdown 导入路径再次解析。
- [ ] [AC-004] 点击 `Mermaid` 后，剪贴板内容以 `mindmap` 开头，并可被现有 Mermaid 导入路径再次解析。
- [ ] [AC-005] 浏览器禁用 Clipboard API 或复制失败时，界面显示可理解的失败状态，且不会修改导图数据。
- [ ] [AC-006] 深层导图进入分支列表模式后，左侧菜单以 Tree 方式默认展开，展示原始根节点下一级及符合规则的二级、三级项。
- [ ] [AC-007] 点击 Tree 中的一级、二级或三级菜单项后，右侧画布聚焦对应节点子树，面包屑和 `onViewRootChange` 与现有 `viewRootId` 语义一致。
- [ ] [AC-008] 当某个一级节点没有可继续展开的二级父节点时，菜单展示其二级子节点作为终点行；当存在可展开父节点时，叶子噪音不大量铺开。
- [ ] [AC-009] Tree 菜单在浅色、暗黑、窄容器、侧栏收起悬停展开和只读 Viewer 下样式稳定，不遮挡 toolbar 或右侧画布。
- [ ] [AC-010] 复制操作和 Tree 菜单切换均不触发 `onChange`，不会新增 undo/redo history。
- [ ] [AC-011] 相关 React 单元测试、Playwright E2E、`pnpm typecheck`、`pnpm test`、`pnpm e2e`、`git diff --check` 通过。

## 依赖

- `packages/react/src/components/Toolbar.tsx` 现有 toolbar 图标按钮与 `.mmn-toolbar` 样式
- `packages/react/src/MindMapEditor.tsx` 现有 `viewRootId`、`effectiveViewRootId`、`onViewRootChange`、topbar、错误上报与 split layout
- `packages/react/src/components/BranchListPanel.tsx` 现有左侧分支列表、选中态、收起、固定入口
- `packages/react/src/hooks/useBranchListState.ts` 现有 split mode、侧栏宽度、预览展开和分支切换状态
- `@my-mind-node/core` 的 `MindMapDocument`、`NodeId`、`getAncestorIds`、`serializeDocument`
- `@my-mind-node/exporters` 的 `exportMindMap(document, "markdown" | "mermaid")`
- Browser Clipboard API: `navigator.clipboard.writeText`
- Vitest / Testing Library
- Playwright

## 开放问题

- 暂无。Tree 展示规则按“实现约定”落地；如果后续希望叶子节点全部参与导航或手动折叠展开，可另开变更规格。
