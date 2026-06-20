# Hyperlink Node Navigation - 需求规格

## 概述

当画布节点带有超链接时，用户点击节点可跳转到对应链接，同时保留宿主应用拦截、URL 安全校验、只读/编辑模式交互边界和可访问性。

## 项目信息

- 项目名: my-mind-node-workspace
- 产品名: my-mind-node
- 架构类型: monorepo
- 需求来源: `/my-ai-prd` 用户反馈“如果节点是超链接，点击可跳转”

## 需求版本

| 日期 | 版本 | 说明 |
| --- | --- | --- |
| 2026-06-20 | v1 | 初始需求规格 |

## 用户故事

- 作为导图查看用户，我想要点击超链接节点直接打开目标链接，以便从导图快速跳到外部资料或业务页面。
- 作为宿主应用开发者，我想要通过 `onOpenLink` 拦截链接打开行为，以便接入路由、权限、埋点或自定义安全策略。
- 作为导图编辑用户，我想要普通节点选择、拖拽、标题编辑和控件点击不被误判为跳转，以便编辑体验保持稳定。

## 功能需求

1. [F-001] 节点超链接判定优先使用现有 `MindMapNode.links[0]`；当节点没有 links 但 `title` 本身是安全 URL 文本时，也应作为可跳转链接节点处理。
2. [F-002] 可跳转节点在画布中需要有明确视觉提示，例如链接样式、hover 态或外链图标，但不得破坏现有主题、自动分支颜色和自定义节点样式。
3. [F-003] 点击可跳转节点的展示标题区域时，必须调用 `MindMapEditorProps.onOpenLink(url, node)`；宿主提供该回调时由宿主完全接管跳转。
4. [F-004] 宿主未提供 `onOpenLink` 时，安全外部 URL 默认在新标签页打开，并使用 `noopener,noreferrer`；不安全或不支持的 URL 不得直接跳转。
5. [F-005] 链接点击不得触发节点选择切换、拖拽、画布平移、进入节点视图或结构编辑命令。
6. [F-006] 编辑模式下，正在编辑标题的 textarea 不应因点击文本触发跳转；只有非编辑展示态或专门的链接入口触发跳转。
7. [F-007] 只读 `MindMapViewer` 中可点击链接节点应正常跳转；只读模式仍不得暴露标题编辑、加子节点、拖拽重排或节点缩放入口。
8. [F-008] `renderNode` 自定义节点场景不强制覆盖宿主渲染；应通过数据或辅助回调让宿主自行选择如何渲染和打开链接。
9. [F-009] Inspector 中现有 links 列表继续可点击，并与画布节点点击共用同一套打开与安全策略。
10. [F-010] Markdown 导入产生的 `[label](url)` 节点链接、JSON 中已有 `links` 字段和标题为 URL 的节点都应能在 playground 或测试中验证点击跳转。

## 非功能需求

- 安全: URL 按不可信输入处理。默认打开只允许明确安全的协议，禁止 `javascript:`、`data:` 等可执行或危险协议直接跳转。
- 可访问性: 可跳转节点需要可聚焦或具备可访问名称，屏幕阅读器能识别其链接行为；键盘 Enter/Space 应可触发打开。
- 可用性: 链接节点的视觉提示应低干扰，不遮挡 hover 控件、折叠计数、resize handle 或 drop intent。
- 兼容性: 不改变 `MindMapDocument` 持久化 schema，不移除既有 `onOpenLink` API，不破坏受控/非受控模式。
- 性能: 链接判定应为轻量纯函数，1000 节点渲染下不得引入明显额外开销。

## 验收标准

- [ ] [AC-001] 节点存在 `links: [{ url: "https://example.com", label: "Example" }]` 时，画布节点展示为可点击链接节点。
- [ ] [AC-002] 点击链接节点标题区域会调用 `onOpenLink("https://example.com", node)`，且不会同时触发节点选择、进入节点视图或拖拽。
- [ ] [AC-003] 未传 `onOpenLink` 时，点击安全 URL 会通过 `window.open(url, "_blank", "noopener,noreferrer")` 或等价安全方式打开。
- [ ] [AC-004] `javascript:`、`data:`、空字符串和解析失败 URL 不会默认跳转，并通过 `onError` 或可恢复错误路径反馈。
- [ ] [AC-005] 标题本身为 `https://example.com` 且 `links` 为空时，节点仍可点击跳转。
- [ ] [AC-006] 编辑模式下聚焦 textarea、选择文本、输入或提交标题不会误触发链接跳转。
- [ ] [AC-007] 只读 `MindMapViewer` 中点击链接节点可跳转，同时仍不暴露编辑入口。
- [ ] [AC-008] Inspector links 列表和画布节点点击走同一 `onOpenLink` 与默认安全打开策略。
- [ ] [AC-009] React 单元测试覆盖链接判定、点击拦截、安全 URL 过滤和键盘触发。
- [ ] [AC-010] Playwright E2E 覆盖 Markdown link 导入后点击节点跳转或触发宿主拦截。
- [ ] [AC-011] `pnpm typecheck`、`pnpm test`、`pnpm e2e`、`git diff --check` 通过。

## 依赖

- 现有 `MindMapNode.links` 数据字段。
- 现有 `MindMapEditorProps.onOpenLink` 回调。
- 现有 `InspectorPanel` links 列表。
- `packages/react` 现有 `MindNode`、`documentToFlow`、`MindMapEditor`。
- Vitest / Testing Library。
- Playwright。

## 开放问题

- 无。默认策略为 `links[0]` 优先、URL 标题兜底；如后续需要多链接选择菜单或跨文档内部路由，可在新规格中扩展。
