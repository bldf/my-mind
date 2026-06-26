# Changelog

## 2026-06-26 - Viewport Interaction Controls Polish v2

完成 `12.viewport-interaction-controls-polish/` 的 v2 追加任务，补齐 viewport 输入与节点标题对齐：

- 普通 wheel / 触控板滚动默认平移 viewport，不写入文档或 history。
- pinch-like wheel 和触屏 pinch 执行锚点缩放，并新增 `panOnScroll`、`zoomOnPinch`、`wheelPanSensitivity` viewport 配置。
- 默认节点标题按视觉行数动态切换：单行居中，多行左对齐；自定义 `renderNode` 不被覆盖。
- 更新 README、React guide 和 API reference 中的 viewport 行为说明。
- `tasks.md` 共 17 个任务均已标记为 `[x]`。

## 2026-06-20 - Hyperlink Node Navigation

完成 `11.hyperlink-node-navigation/`，让只读超链接节点与 Inspector links 共用安全打开路径：

- 新增 React 层链接工具，支持 `node.links[0]` 优先、标题 URL 兜底、危险协议过滤和 `noopener,noreferrer` 默认新标签打开。
- `documentToFlow` 向 `MindNode` 透传派生链接与 `onOpenLink`，只读链接节点点击打开链接，普通只读节点仍进入节点视图，编辑态 textarea 不误触跳转。
- Inspector links 改为复用统一 `openNodeLink`，宿主 `onOpenLink` 仍完全优先；默认路径通过 `onError` 报告不安全 URL 或 opener 异常。
- playground 增加 `?readonly=1` 验证入口，并新增 Playwright E2E 使用 `window.open` spy 覆盖 Markdown link 节点点击。
- `tasks.md` 共 11 个任务均已标记为 `[x]`。

## 2026-06-20 - Dark Mode & Live Playground Rendering

完成 `10.dark-mode-live-playground-rendering/`，实现暗色模式视觉一致性与 playground 实时文本解析渲染：

- `MindMapEditor` 绑定 `data-theme-mode` 并在 CSS 中支持语义 variables 以切换 Graphite 风格暗色模式。
- 根节点与自动分支默认着色支持暗色 palette 自适应，同时优先遵循用户自定义节点 style。
- 移除 playground 底部 `Apply` 按钮，改为 300ms 防抖文本自动解析并实时更新画布，同时通过同步 ref 初始化解决了 active drag-and-drop pointer session 在 mount 时断开的冲突。
- 补齐 Graphite 样式 data-theme-mode 检查与 invalid JSON 容错保存 E2E 测试。
- `tasks.md` 共 12 个任务均已标记为 `[x]`。

## 2026-06-19 - Node drag interaction polish

完成 `7.node-drag-interaction-polish/`，补齐 playground 中节点拖拽整理工作流：

- `MindMapEditor` 接入 React Flow 受控节点变化与 drag session，拖动中只更新预览状态。
- 支持中心区 mouseup 即时入子、上/下区同级排序、非法目标错误、释放后自动稳定排版。
- `MindNode` 增加 hover 加子节点与展开/折叠控件，标题编辑改为支持换行的 `textarea`，并补齐 drop intent、插入线、flash 和只读隐藏逻辑。
- core 布局估算支持显式换行和软换行高度，标题提交后按新尺寸重新布局并触发 fit view。
- 新增 `dragInteraction` 实验配置、React smoke/core 覆盖和 Playwright 100 节点 fixture 交互 E2E。
- `tasks.md` 共 23 个任务均已标记为 `[x]`。

## 2026-06-18 - M0-M4 implementation in current repo

按 `my-ai-auto-dev` 执行 6 个 feature specs，并在当前仓库初始化 `my-mind-node` pnpm monorepo：

- 新增 `@my-mind-node/core`，覆盖 schema、校验、命令、历史、搜索、布局转换、JSON 和缩进文本。
- 新增 `@my-mind-node/react`，覆盖 Editor/Viewer、React Flow 适配、工具栏、主题、面包屑、节点缩放、大纲、搜索和检查器。
- 新增 `@my-mind-node/importers` 与 `@my-mind-node/exporters`，保持导入导出能力为可选包。
- 新增 Vite playground、VitePress docs、Next.js/readonly/custom-node 示例、GitHub Pages workflow、fixtures、bench、bundle budget、a11y 报告和 Playwright E2E。
- 6 个 `tasks.md` 共 75 个任务均已标记为 `[x]`。

## 2026-06-18 - PRD milestone specs

从 `docs/prd-mind-map.md` 拆分出 6 个可执行 feature specs：

- `1.m0-technical-prototype/` - React Flow、Worker 布局、最小 core 模型与 playground 验证。
- `2.m1-core-alpha/` - core schema、命令、历史、选择、序列化和缩进文本。
- `3.m2-react-alpha/` - Editor/Viewer、主题侧边栏、节点局部缩放、工具栏、面包屑与示例原型。
- `4.m2-5-product-polish/` - 大纲、搜索、检查器、多选拖拽、批量操作、空状态和移动端基础体验。
- `5.m3-import-export-beta/` - Markdown、OPML、JSON、缩进文本、PNG、SVG 导入导出和示例补齐。
- `6.m4-public-beta/` - 文档站点、API reference、性能、兼容性、可访问性、bundle 和 beta 发布准备。

本次没有执行 SDK 代码开发任务；所有 `tasks.md` 均保持 `[ ]`，等待后续传入目标代码项目后由 `my-ai-auto-dev` 执行。
