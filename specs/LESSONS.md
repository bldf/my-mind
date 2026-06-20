# LESSONS.md - 架构决策与踩坑记录

> 开发时必须参考。仅记录非显而易见的架构决策、踩坑与跨 feature 影响。

## 2026-06-18 - PRD 拆分 / Specs 初始化

- 当前仓库是 PRD、prompt、skill 与 subagent 指令工作区，不是 My Mind Node 的代码实现仓库；本次只生成可被 `my-ai-auto-dev` 消费的编号 specs，不初始化 npm monorepo 或安装依赖。
- `docs/prd-mind-map.md` 的 M2.5 Product Polish 内容独立成 `4.m2-5-product-polish/`，避免把 React Alpha 的核心嵌入能力和后续 polish/复杂交互塞进同一个 `tasks.md`。
- 后续执行 `my-ai-auto-dev` 时，应显式传入 specs 路径 `specs/` 和目标代码项目路径；不要从本仓库自动推断相邻实现仓库。

## 2026-06-18 - M0-M4 Auto Dev / 当前仓库实现

- 本次用户明确要求“代码写在当前仓库”，因此覆盖了初始化时“不在本仓库实现代码”的默认假设；当前仓库已成为 `my-mind-node` pnpm monorepo 实现仓库。
- core/react/importers/exporters 保持分包：`@my-mind-node/core` 不依赖 React、React Flow、DOM 或导入导出包；React 工具栏的导出入口只暴露可选错误，不静态引入 exporters。
- 本地 `pnpm` 首次运行会写用户级工具缓存，sandbox 下会失败；依赖安装与 Playwright 浏览器下载需要用户批准后执行。
- Playwright E2E 不能复用常见 `5173` 端口，容易命中已有旧服务；测试专用端口固定为 `5187` 并启用 Vite `strictPort`。
- VitePress build 会生成 `apps/docs/docs/.vitepress/.temp/`，需要在 `.gitignore` 和 ESLint ignore 中排除，不能把生成文件纳入 lint/review。

## 2026-06-20 - Dark Mode Live Playground Rendering / 实时解析渲染与 mount 防抖避免冲突

- **Mount 时的防抖自动导入冲突**: 首次加载页面时，若 `lastSyncedTextRef` 和 `lastImportedTextRef` 默认为空，组件渲染后 300ms 会自动触发一次导入解析，并调用 `setDocument` 重置文档。在 E2E 测试等场景下，如果在 mount 瞬间开始节点拖拽，这 300ms 的文档重置会导致 React Flow 的节点被销毁重建，从而切断拖拽中的 Pointer Session 并使测试失败。
- **解决方法**: 在 `App.tsx` 中把 refs 的初始值设置为 initialDocument 序列化后的文本，使得 on mount 时的 `editorText === lastSyncedTextRef.current` 成立，完美规避初始多余的 debounced import 触发。

## 2026-06-20 - Hyperlink Node Navigation / readonly playground E2E path

- `apps/playground` 支持 `?readonly=1` 查询参数：数据面板仍可导入 JSON/Markdown/Mermaid，右侧画布以 `MindMapEditor readonly` 渲染。后续需要验证 Viewer/readonly-only 交互时可复用该路径，不必为 E2E 额外启动 readonly example dev server。
