# 变更日志 — 2026-06-20

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
