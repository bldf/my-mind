# Dark Mode Live Playground Rendering - 技术设计

## 设计版本

| 日期 | 版本 | 说明 |
| --- | --- | --- |
| 2026-06-20 | v1 | 初始技术设计 |

## 项目架构

- 架构类型: monorepo
- 涉及层: `packages/react` 主题与样式、`apps/playground` 示例交互、React 单元测试、Playwright E2E

## 功能模块设计

### 模块 1: 暗黑模式主题 token 与容器状态

当前 `MindMapEditor` 只把 `theme.colors.canvas/node/nodeText/edge/selected/accent` 写入 CSS 变量，但 `packages/react/src/styles.css` 中仍有大量浅色硬编码，例如边框、阴影、面板背景、outline、输入框、error/empty/muted 文本和 hover 背景。实现时应把这些视觉值收敛为可随主题模式变化的 CSS token。

**涉及层及关键设计:**

- 在 `.mmn-editor` 上增加 `data-theme-mode={theme.mode ?? "light"}`，保留现有 `style` CSS 变量传递方式。
- 在 `packages/react/src/styles.css` 中新增语义变量，例如：
  - `--mmn-surface`
  - `--mmn-surface-muted`
  - `--mmn-border`
  - `--mmn-border-strong`
  - `--mmn-muted-text`
  - `--mmn-shadow`
  - `--mmn-control-hover`
  - `--mmn-danger`
- `.mmn-editor[data-theme-mode="dark"]` 覆盖上述 token，优先基于 `--mmn-node`、`--mmn-node-text`、`--mmn-selected`、`--mmn-accent` 做 `color-mix`，避免再次散落硬编码。
- toolbar、breadcrumbs、theme/search/inspector panel、edge label、node control、collapsed count、resize handle、outline、input、textarea、select、empty state、search results 全部改用 token。
- `MiniMap` 需要显式传入或用 CSS 覆盖暗色背景、mask、node stroke/fill，避免 React Flow 默认 MiniMap 保持浅色。
- 不改变 `MindMapTheme` 的持久化 schema；暗色模式只通过既有 `theme.mode` 和派生 CSS token 表达。

### 模块 2: 主题感知的默认节点与分支配色

当前 `document-to-flow.ts` 中根节点默认 presentation 固定为白底深色字，自动分支 palette 也固定为浅色高亮色。暗黑模式下这些值会绕过 CSS 变量，导致节点仍显浅色或文字对比不稳。

**涉及层及关键设计:**

- 扩展 `FlowConversionOptions`，增加 `theme?: MindMapTheme` 或最小化的 `themeMode?: MindMapTheme["mode"]` 与主题颜色输入。
- `MindMapEditor.tsx` 计算 `theme` 后，将其传给 `documentToFlow`，并把 `theme` 加入 `flowData` 的 `useMemo` 依赖。
- 将 `ROOT_PRESENTATION` 和 `AUTO_BRANCH_PALETTES` 改为函数，按 light/dark mode 返回 palette。
- 根节点默认样式应从当前主题派生：`backgroundColor` 使用 `theme.colors.node`，`color` 使用 `theme.colors.nodeText`，`borderColor` 可使用 `theme.colors.node` 或 `theme.colors.edge` 的弱化版本。
- 暗色自动分支 palette 使用深色底、较亮边和高对比文字，例如深青、深紫、深粉、深琥珀、深绿。边线颜色同步使用暗色 palette 的 `edge`。
- `applyDefaultPresentation` 继续保持“节点自定义样式优先”：只有 `node.style.*` 缺省时才填入 theme/palette 默认值。
- `getEdgeColor` 继续优先使用 `metadata.branchEdgeColor`、节点边框色和连接线样式；暗色 palette 只负责默认自动分支。

### 模块 3: playground 实时渲染与错误保留

当前 `apps/playground/src/App.tsx` 中 JSON/Markdown/Mermaid 文本只在点击 `Apply` 或 `Import` 后调用 `applyEditorText`。本次改为输入后防抖自动解析，保留 `Import` 作为立即解析入口。

**涉及层及关键设计:**

- 删除 `Apply` 按钮，只保留 `Import` 按钮，按钮点击调用同一套 `importEditorText` 逻辑并跳过防抖等待。
- 将 `applyEditorText` 拆为可复用函数，例如 `importEditorText(text, format, options)`：
  - `tab === "outline"` 时直接返回。
  - 先按当前 tab 格式解析。
  - 当前格式失败时，沿用 `looksLikeMermaid` / `looksLikeMarkdown` fallback。
  - fallback 成功后切换到对应 tab。
  - 解析失败时只 `setError`，不调用 `setDocument`。
  - 解析成功时 `updateDocument(applyBranchPresentation(parsed.value))` 并清除错误。
- 新增 `useEffect` 监听 `[editorText, tab]`，当 tab 为文本格式时设置 250ms 到 350ms 防抖定时器，触发自动 import。
- 增加 ref 防止导图变化同步文本时又立刻反向 import，例如：
  - `lastSyncedTextRef`: 记录由当前 document/export 生成的文本。
  - `lastImportedTextRef`: 记录最近成功导入的文本和格式。
  - 当 `editorText === lastSyncedTextRef.current` 时，自动 import effect 可跳过。
- 保留现有 document -> text 同步：当 canvas、outline 或 import 成功改变 document 时，当前文本 tab 仍要显示最新序列化/导出结果。
- 实时解析 debounce 期间不清空错误；成功解析后清空。无效输入期间 canvas 保持上一份有效 document。
- `apps/playground/src/styles.css` 中 `.segmented` 改为 `repeat(4, minmax(0, 1fr))` 或 `auto-fit`，保证四个 tab 对齐。

### 模块 4: 测试与验证

**涉及层及关键设计:**

- 在 `packages/react/src/__tests__/react-smoke.test.tsx` 增加主题感知默认 presentation 测试：
  - dark theme 下根节点默认背景/文字不再是浅色硬编码。
  - dark theme 下自动分支节点使用暗色 palette。
  - 自定义节点背景、边框和文字颜色不被覆盖。
- 更新现有 E2E 中依赖 `Apply` 的用例，改为填入文本后等待导图自动更新。
- 新增 playground E2E：
  - `Apply` 按钮不存在，`Import` 按钮存在。
  - invalid JSON 自动显示错误且当前画布不被覆盖。
  - 选择 `Graphite` 后抽样断言 `.mmn-editor`、`.mmn-node`、toolbar/panel 背景和文字颜色不是浅色默认值。
- `pnpm typecheck`、`pnpm test`、`pnpm e2e` 作为实现完成后的必跑验证。

## 接口契约

### `FlowConversionOptions`

```typescript
export interface FlowConversionOptions {
  theme?: MindMapTheme;
}
```

说明：

- 这是 React 包内部转换层接口，不是 public core 数据模型。
- 未传 `theme` 时继续使用现有浅色默认 presentation，保持非 `MindMapEditor` 直接调用 `documentToFlow` 的兼容性。

### `MindMapEditor`

不新增 public props。现有 `theme`、`document.theme` 和 theme panel 选择继续生效。

### Playground

不新增包级 API。`Import` 仅作为示例页面内部按钮，行为是“立即解析当前文本”。

## 数据模型

- 不新增持久化字段。
- `MindMapTheme` 继续使用现有结构。
- 暗色默认分支 palette、CSS token、实时 import 防抖状态和同步 ref 都是 React/playground 内部实现细节。

## 安全考虑

- 实时导入只解析本地 textarea 内容，不新增网络请求。
- Mermaid/Markdown/JSON 解析失败只显示纯文本错误信息，不渲染 HTML。
- 防抖 timer 和异步 export/import 需要在 effect cleanup 中取消，避免旧解析结果覆盖新输入。
- 继续禁止将用户输入拼接进 shell、动态代码或 URL。

## 技术决策

| 决策 | 选项 | 理由 |
| --- | --- | --- |
| 暗色模式入口 | 使用既有 `MindMapTheme.mode` | 不扩张数据模型，符合已有 theme schema |
| 样式表达 | CSS 语义 token + `data-theme-mode` | 能覆盖面板、控件、输入框和状态色，减少硬编码 |
| 默认节点配色 | `documentToFlow` 按 theme 派生 presentation | 节点 inline style 当前会覆盖 CSS 变量，必须在转换层修正 |
| 自定义样式 | 节点 style 优先 | 避免破坏宿主应用和 inspector 自定义颜色 |
| 实时渲染 | 防抖自动 import | 兼顾即时反馈与 100 节点 fixture 性能 |
| 错误处理 | 无效输入不提交 document | 避免半截 JSON/Markdown 清空或污染当前导图 |
| 手动按钮 | 保留 `Import`，删除 `Apply` | 满足取消 Apply，同时保留立即解析和重试入口 |
