# Dark Mode Live Playground Rendering - 任务清单

## 任务版本

| 日期 | 版本 | 说明 |
| --- | --- | --- |
| 2026-06-20 | v1 | 初始任务清单 |

## 项目信息

- 项目名: my-mind-node-workspace
- 架构类型: monorepo
- specs 路径: specs/10.dark-mode-live-playground-rendering/

## 任务列表

### 功能 1: 暗黑模式视觉一致性

- [x] T-001: 在 `MindMapEditor.tsx` 中为 `.mmn-editor` 增加 theme mode 标识，并把当前 `theme` 传入 `documentToFlow` ~15min
- [x] T-002: 扩展 `document-to-flow.ts` 的 `FlowConversionOptions`，实现 light/dark theme 感知的根节点默认样式与自动分支 palette，保持自定义节点 style 优先 ~30min
- [x] T-003: 重构 `packages/react/src/styles.css` 的浅色硬编码，新增 surface/border/muted/shadow/control/error 等语义 CSS token，并为 dark mode 覆盖 token ~45min
- [x] T-004: 补齐 toolbar、breadcrumbs、theme/search/inspector panel、outline、inputs、edge label、node controls、collapsed count、resize handle、empty state 的暗色样式 ~45min
- [x] T-005: 调整 `MiniMap` 暗色模式视觉，使背景、mask、节点和边在 `Graphite` 下清晰可辨 ~15min

### 功能 2: playground 实时渲染

- [x] T-006: 重构 `apps/playground/src/App.tsx` 的 `applyEditorText` 为可复用 import 函数，支持成功清错、失败保留当前 document、fallback 自动切换 tab ~30min
- [x] T-007: 增加 JSON/Markdown/Mermaid 文本输入的防抖实时解析 effect，并通过 ref 避免 document -> text 同步触发循环导入 ~45min
- [x] T-008: 删除 playground 底部 `Apply` 按钮，保留 `Import` 立即解析入口并修正 `.segmented` 四个 tab 的布局 ~15min

### 测试与验证

- [x] T-009: 更新/新增 React 单元测试，覆盖 dark theme 默认节点/分支配色和自定义节点颜色不被覆盖 ~30min
- [x] T-010: 更新现有 Playwright E2E，移除对 `Apply` 的点击依赖，改为等待实时渲染结果 ~30min
- [x] T-011: 新增 Playwright E2E 覆盖 `Apply` 不存在、invalid input 不覆盖当前导图、`Graphite` 暗色模式关键元素颜色变化 ~45min
- [x] T-012: 运行 `pnpm typecheck`、`pnpm test`、`pnpm e2e` 和 `git diff --check`，修复验证问题 ~30min

## 依赖关系

- T-002 依赖 T-001。
- T-003、T-004、T-005 可在 T-001 后并行推进。
- T-007 依赖 T-006。
- T-010 依赖 T-006、T-007、T-008。
- T-011 依赖 T-001 到 T-008。
- T-012 依赖 T-009 到 T-011。

## 风险点

- 实时 import 可能与 document -> text 同步形成循环更新；通过 `lastSyncedTextRef` / `lastImportedTextRef` 区分文本来源。
- 暗色默认分支 palette 如果直接覆盖节点 `style`，会破坏用户自定义颜色；实现时必须保持 `node.style.*` 优先级。
- CSS token 替换范围较广，可能影响浅色主题视觉；需要同时在 Paper 和 Graphite 下跑 E2E/人工截图检查。
- Mermaid/Markdown 输入在编辑过程中常出现短暂无效状态；失败时必须只展示错误，不提交半成品 document。

## 预估总时间

- 约 6 小时 15 分钟。
