# Viewport Interaction Controls Polish - 任务清单

## 任务版本

| 日期 | 版本 | 说明 |
| --- | --- | --- |
| 2026-06-25 | v1 | 初始任务 |
| 2026-06-26 | v2 | 新增滚轮平移、双指缩放和节点标题动态对齐任务 |

## 项目信息

- 项目名: my-mind-node-workspace
- 产品名: my-mind-node
- 架构类型: pnpm monorepo
- specs 路径: `/Users/bldf/MyProject/githubpro/my-mind/specs/12.viewport-interaction-controls-polish/`

## 任务列表

### 功能 1: 视口缩放与尺寸变化

- [x] T-001: 扩展 `ViewportConfig`，实现线性 wheel 缩放灵敏度、最大步进和鼠标锚点缩放逻辑 ~1h
- [x] T-002: 增加 `ResizeObserver` 驱动的容器尺寸变化后保留 zoom 自动居中，并补充拖拽、缩放、输入中的中断保护 ~1h
- [x] T-003: 修正全屏按钮为 enter/exit toggle，监听 `fullscreenchange` 并同步 toolbar label/icon 与 resize 后居中 ~1h

### 功能 2: Toolbar、历史与配置入口

- [x] T-004: 扩展 `ViewToolbarControl` 与 `Toolbar` 状态模型，支持 `undo`、`redo`、`reset`、禁用态、动态 label 和全屏退出图标 ~1h
- [x] T-005: 将 `MindMapEditor` history 状态接入顶部按钮，实现撤销、重做、还原初始状态和 reset 后清空 history ~1h
- [x] T-006: 按 `search.hidden` 过滤 toolbar 搜索按钮，并确保隐藏搜索时 `onToolbarAction("search")` no-op ~30min
- [x] T-007: 新增 `minimap` 显式启用配置，默认不渲染 MiniMap，Viewer 继承同一行为 ~30min

### 功能 3: 拖拽与主题视觉

- [x] T-008: 扩展拖拽 session，收集被拖动顶层节点的可见后代并在拖动中同步本地位置和连线 ~1h
- [x] T-009: 保证子树拖拽释放后只用顶层节点提交 `node.moveMany`，非法释放恢复布局且不新增多余 history ~45min
- [x] T-010: 将内置暗黑主题 canvas 背景改为 `#10172a`，检查相关 CSS token 和 dark mode 测试断言 ~30min

### 集成与测试

- [x] T-011: 补充 React 单元测试，覆盖 MiniMap 默认隐藏/显式展示、搜索隐藏过滤、history 按钮/reset、暗黑背景和全屏状态同步 ~1h
- [x] T-012: 补充 Playwright E2E，覆盖平滑滚轮缩放、全屏进入退出、父节点拖拽子树跟随、容器 resize 居中和搜索按钮隐藏 ~1h
- [x] T-013: 运行 `pnpm typecheck`、`pnpm test`、`pnpm e2e`、`git diff --check` 并修复回归 ~1h

### 功能 4: v2 视口输入与节点文本对齐

- [x] T-014: 扩展 `ViewportConfig` 与 `MindMapEditor` wheel handler，区分普通滚轮/触控板滚动与 pinch-like zoom，并实现普通滚轮平移 viewport 且不写入 history ~1h
- [x] T-015: 启用可配置 `zoomOnPinch`，让触屏双指 pinch 和触控板 pinch-like wheel 可以按手势中心缩放，同时保留 `minZoom` / `maxZoom` 与缩放灵敏度限制 ~45min
- [x] T-016: 在 `MindNode` 为 editable、readonly、link 标题按视觉行数追加多行 class，CSS 实现单行居中、多行左对齐，自定义 `renderNode` 不受影响 ~45min
- [x] T-017: 补充 React 单元测试与 Playwright E2E，覆盖滚轮平移、pinch/ctrl-wheel 缩放、单行标题居中、多行标题左对齐，并运行 `pnpm typecheck`、`pnpm test`、`pnpm e2e`、`git diff --check` ~1h

## 依赖关系

- T-002 依赖 T-001 的 viewport 工具常量与交互 guard。
- T-005 依赖 T-004 的 toolbar 控件和禁用态能力。
- T-012 依赖 T-001、T-002、T-003、T-007、T-008 完成后再编写稳定浏览器断言。
- T-013 依赖所有实现与测试任务完成。
- T-015 依赖 T-014 的 wheel 事件分类，避免普通滚轮平移和 pinch 缩放互相吞事件。
- T-017 依赖 T-014、T-015、T-016 完成后再补充端到端验收。

## 风险点

- React Flow 默认 wheel zoom 与自定义 wheel handler 可能冲突；实现时应关闭默认 `zoomOnScroll` 并由本地逻辑统一接管。
- ResizeObserver 可能在全屏、侧栏动画或初始布局时连续触发；需要 rAF 合并并避免编辑中抢夺焦点。
- 子树拖拽的临时位置同步可能与 React Flow 自身 node changes 竞争；需要用 `dragSession` 明确区分视觉节点和最终提交节点。
- 受控模式 reset 只能通过 `onChange` 请求宿主恢复；如果宿主忽略回调，组件不能强制改变外部 `value`。
- v2 将普通滚轮用于平移、pinch-like wheel 用于缩放，可能影响依赖旧版普通 wheel 缩放的宿主；需要通过 `panOnScroll: false` 或等价配置保留旧行为。
- 节点标题自动换行行数来自 layout 估算，字体、缩放和宽度覆盖可能导致估算与真实 DOM 行数存在边界差异；需要用单元测试和真实浏览器 computed style 同时覆盖。
