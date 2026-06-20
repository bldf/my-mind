# 变更日志 — 2026-06-20

## Feature 11: Hyperlink Node Navigation

### 新增

- 新增 React 层链接工具，支持从 `MindMapNode.links[0]` 派生主链接，并在无 links 但标题是安全绝对 URL 时兜底为可点击链接节点。
- 只读 `MindNode` 链接节点标题渲染为可点击按钮，点击后调用宿主 `onOpenLink(url, node)`；宿主未接管时默认以 `noopener,noreferrer` 新标签打开安全 URL。
- Inspector links 与画布链接节点共用统一 `openNodeLink` 路径，危险协议或 opener 异常通过 `onError` 返回可恢复错误。
- playground 支持 `?readonly=1` 只读渲染路径，用于验证 Markdown link 导入后节点点击跳转。

### 关键文件

- `packages/react/src/link-utils.ts` — 新增链接派生、安全协议判断和默认打开工具。
- `packages/react/src/MindMapEditor.tsx` — 新增统一 `openNodeLink` callback，并传入 `documentToFlow` 与 `InspectorPanel`。
- `packages/react/src/document-to-flow.ts` — 为 flow node data 派生 `link` 并透传 `onOpenLink`。
- `packages/react/src/nodes/MindNode.tsx` — 只读链接节点标题可点击，同时保留普通只读节点进入节点视图行为。
- `packages/react/src/styles.css` — 新增链接节点低干扰视觉提示。
- `packages/react/src/__tests__/link-utils.test.ts` 与 `packages/react/src/__tests__/react-smoke.test.tsx` — 覆盖 URL 安全、链接节点点击、事件隔离和 flow data 派生。
- `tests/e2e/playground.spec.ts` — 新增 readonly Markdown link 节点点击 E2E，使用 `window.open` spy 避免真实外部访问。

### 架构决策

- 不改变 `MindMapDocument` 持久化 schema；标题 URL 兜底只在 React 渲染层派生，不回写 `node.links`。
- 默认打开只允许 `http:`、`https:`、`mailto:`、`tel:`，相对路径和跨文档路由交给宿主 `onOpenLink` 接管。
- 自定义 `renderNode` 不被库强制包裹，只通过 flow node data 暴露 link 与打开回调，避免破坏宿主自定义节点交互。

## Feature 10: Dark Mode Live Playground Rendering

### 新增

- 为 `.mmn-editor` 绑定 `data-theme-mode` 标识，并支持 CSS 语义 token 与 Graphite 主题暗黑模式样式覆盖。
- 根节点默认背景/边框/文本以及自动分支配色全面支持主题感知（Dark Palette 适配暗色高对比度展示），同时保留节点自定义样式的高优先级。
- playground 文本区移除 `Apply` 按钮，改用 300ms 防抖实时导入渲染模式，在输入无效内容时自动保留前一次有效导图，并在下方展示具体的解析错误信息。
- E2E 测试环境防抖挂载冲突防护，通过在 mount 时同步初始化 refs，防止 300ms 防抖触发的 document 重新渲染切断 Playground 的 Pointer Session。

### 关键文件

- `packages/react/src/MindMapEditor.tsx` — 绑定 `data-theme-mode` 属性，并将 `theme` 传入 conversion memo。
- `packages/react/src/document-to-flow.ts` — 实现 dark palate palette，并使默认根节点样式与自动分支配色适配 dark mode。
- `packages/react/src/styles.css` — 重构为语义变量，为暗色模式覆盖语义 token，适配 MiniMap、面板以及输入框文字 legibility。
- `apps/playground/src/App.tsx` — 移除 `Apply` 按钮，实现 debounced import 实时渲染机制，通过 refs 规避 feedback loop 循环。
- `apps/playground/src/styles.css` — 调整 `.segmented` 布局至 4 栏以适配 Outline 选项。
- `packages/react/src/__tests__/react-smoke.test.tsx` — 编写暗色模式根节点与自动分支配色单元测试。
- `tests/e2e/playground.spec.ts` — 重构去掉 `Apply` 按钮点击，添加 invalid JSON 保留图、Graphite data-theme-mode E2E 覆盖。

### 架构决策

- 暗色模式不向持久化 core 数据模型引入新的 fields，仅通过既有 `MindMapTheme.mode` 及 CSS tokens 进行表现层呈现。
- 实时自动导入通过 `lastSyncedTextRef` 和 `lastImportedTextRef` 进行输入文本过滤，避免由于 document-to-text 的导出引起的反向重新导入造成的死循环。
- 首次加载页面时预先初始化 refs，从而避免 debounce 在 300ms 后强制重刷 document，以防打断 E2E 测试中极其敏感的 active drag-and-drop pointer session。
