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

## 2026-06-25 - Viewport Interaction Controls Polish / wheel 与子树拖拽

- React Flow 的 `onPaneScroll` 只在 wheel target 恰好是 pane 时触发，无法覆盖节点上方的指针锚点缩放；SDK 需要在 `.react-flow` 外层使用 `{ capture: true, passive: false }` 的原生 wheel listener，并在卸载或配置变化时清理。
- 子树拖拽需要区分 `visualNodeIds` 与 `commitNodeIds`：可见后代跟随视觉位移并从 drop target 中排除，但命中矩形和最终 `node.moveMany` 仍只使用顶层提交节点，否则大子树外接框会破坏原有 reparent/sort 区域。
- 容器 `ResizeObserver` 不应依赖 `nodesInitialized` 或渲染节点数量重建；拖拽提交后的节点重初始化会让首次 observer 回调把 `clientWidth` 与 `contentRect` 差异误判为 resize。首次回调只建立同口径尺寸基线，后续真实宽高变化才触发保留当前 zoom 的居中。
- Playwright 在读取节点 bounding box 前应等待初始 viewport transform 连续稳定，避免异步 `fitView` 让鼠标坐标过期并制造拖拽假失败。
