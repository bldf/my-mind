# Dark Mode Live Playground Rendering - 需求规格

## 概述

修复暗黑模式下编辑器、节点、面板和 playground 整体仍偏浅色且对比度不足的问题，并将 playground 文本数据区从点击 `Apply` 后渲染改为输入后实时渲染。

## 项目信息

- 项目名: my-mind-node-workspace
- 产品名: my-mind-node
- 架构类型: monorepo
- 需求来源: `/my-ai-prd` 用户反馈暗黑模式不清晰、playground 需要取消底部 `Apply` 按钮并实时渲染

## 需求版本

| 日期 | 版本 | 说明 |
| --- | --- | --- |
| 2026-06-20 | v1 | 初始需求规格 |

## 用户故事

- 作为导图编辑用户，我希望切换到暗黑模式后画布、节点、连线、工具栏、面板、控件和文字整体同步变暗，以便在暗色环境下仍能清晰阅读和编辑。
- 作为开发者体验 playground 的用户，我希望修改 JSON、Markdown 或 Mermaid 文本后导图自动更新，以便无需每次点击 `Apply` 才能看到渲染结果。
- 作为调试导入格式的用户，我希望输入暂时无效时当前导图保持不变，并看到明确错误提示，以便可以继续编辑修正。

## 功能需求

1. [F-001] 暗黑模式必须影响编辑器整体视觉层级，包括 canvas、节点默认颜色、根节点默认颜色、自动分支颜色、边、工具栏、面包屑、主题面板、搜索面板、检查器、outline、MiniMap、hover/selected/drop/resize 状态。
2. [F-002] 暗黑模式下节点文字、边、边框、控制按钮和输入框必须保持可读对比度，不得出现浅色硬编码造成的文字或节点不清晰。
3. [F-003] 自定义节点样式不得被暗黑模式覆盖。节点已有 `style.backgroundColor`、`style.borderColor`、`style.color` 时继续优先使用节点自定义样式。
4. [F-004] 默认主题与 document theme 都必须支持暗黑模式；`MindMapTheme.mode = "dark"` 时应使用暗色 token 和暗色默认分支配色。
5. [F-005] playground 文本数据区取消底部 `Apply` 按钮。用户编辑 JSON、Markdown 或 Mermaid 文本后，导图应在短暂防抖后自动解析并实时更新。
6. [F-006] playground 保留 `Import` 按钮作为立即解析/重试入口，点击后应复用实时解析逻辑。
7. [F-007] 实时解析失败时，不覆盖当前有效导图；错误信息展示在数据区下方，并在下一次成功解析或导图更新时清除。
8. [F-008] JSON tab 中粘贴 Markdown 或 Mermaid 时，仍支持现有格式自动识别 fallback；fallback 成功后切换到对应 tab。
9. [F-009] playground 的数据 tab 布局应正确容纳 JSON、Markdown、Mermaid、Outline 四个入口，不应因固定三列导致拥挤或错位。

## 非功能需求

- 性能: 文本实时渲染需要防抖，避免每个按键都触发布局和全量导图更新；100 节点 fixture 下输入时界面保持可交互。
- 可访问性: 暗黑模式下文字、按钮、输入框、选中态和错误态应满足基本可读对比度；不能只依赖颜色表达 drop/invalid 状态。
- 兼容性: 保持现有受控 `MindMapEditor`、`MindMapViewer`、`OutlineEditor` API 兼容，不扩张 core 持久化数据模型。

## 验收标准

- [ ] [AC-001] 在 playground 点击 toolbar 的 `Themes` 并选择 `Graphite` 后，canvas、节点、根节点、分支节点、连线、toolbar、panel、MiniMap 和 hover 控件都呈现暗色视觉，不再出现白底白边或低对比文字。
- [ ] [AC-002] 暗黑模式下自动分支节点与根节点文字清晰可读，选中态、拖拽 drop 预览和 resize handle 可辨识。
- [ ] [AC-003] 自定义节点颜色在暗黑模式下仍按节点自定义 `style` 渲染，不被默认暗色分支 palette 覆盖。
- [ ] [AC-004] playground 中不再出现名为 `Apply` 的按钮；JSON、Markdown、Mermaid 文本输入后无需点击按钮即可更新导图。
- [ ] [AC-005] 输入无效 JSON 时当前导图保持上一份有效内容，同时显示解析错误；继续修正为有效内容后错误消失且导图更新。
- [ ] [AC-006] 在 JSON tab 粘贴 Markdown 或 Mermaid 后，实时解析 fallback 成功并自动切换到正确 tab。
- [ ] [AC-007] `pnpm typecheck`、`pnpm test`、`pnpm e2e` 全部通过。

## 依赖

- 现有 `@my-mind-node/core` theme 数据模型。
- 现有 `@my-mind-node/react` theme panel、React Flow、CSS 变量和 `documentToFlow` 转换。
- 现有 `@my-mind-node/importers` 与 `@my-mind-node/exporters`。

## 开放问题

- 无。
