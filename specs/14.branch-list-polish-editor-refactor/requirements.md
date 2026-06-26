# Branch List UI Polish & Editor Refactor - 需求规格

## 概述

优化分支列表菜单的展示样式、修复单子节点分支的布局居中问题，并将超大的 `MindMapEditor.tsx` 拆分为可维护的模块结构。

## 项目信息

- 项目名: my-mind-node
- 架构类型: pnpm monorepo（core + react + importers + exporters）

## 需求版本

| 日期         | 版本 | 说明     |
| ------------ | ---- | -------- |
| 2026-06-26   | v1   | 初始需求 |

## 用户故事

- 作为思维导图用户，我希望分支列表菜单中长标题能完整展示多行而非一行截断，以便快速识别分支内容。
- 作为思维导图用户，我希望菜单右侧只显示节点数量数字而不带 "node(s)" 后缀，以便界面更简洁。
- 作为思维导图用户，当分支节点只有一个子节点且该子节点有多个孙节点时，我希望整个子树居中展示而非仅根节点居中，以便视觉上更均衡。
- 作为维护者，我希望 `MindMapEditor.tsx` 控制在 800 行以内，纯函数提取到工具库并附带测试，以便代码更易维护和测试。

## 功能需求

1. [F-001] 分支列表菜单项标题从单行截断改为最多3行截断，超出部分显示省略号
2. [F-002] 分支列表菜单项右侧数量显示从 "N nodes"/"N node" 改为仅显示数字 "N"
3. [F-003] 当根节点（或分支视图的 viewRoot）只有1个直接子节点时，`simpleTreeLayout` 应计算整个子树的包围盒并将整体居中，而非仅将根节点置于原点
4. [F-004] 将 `MindMapEditor.tsx` 中的纯函数提取到独立工具模块（如 `editor-utils.ts`、`viewport-utils.ts` 等）
5. [F-005] 将 `MindMapEditor.tsx` 中的复杂状态逻辑提取为自定义 hooks（如 `useViewportControl`、`useDragInteraction`、`useBranchListState` 等）
6. [F-006] 为所有提取出的纯函数补充单元测试用例
7. [F-007] 拆分后 `MindMapEditor.tsx` 总行数控制在 800 行以内

## 非功能需求

- 性能: 布局居中计算不应引入额外的时间复杂度，仍保持 O(n)
- 兼容性: 拆分后所有公开 API 和组件 props 保持不变
- 可维护性: 提取的模块职责单一，函数命名清晰
- 测试: 纯函数测试覆盖率不低于现有水平

## 验收标准

- [ ] [AC-001] 分支列表菜单项标题超过3行时显示省略号，1-3行内完整展示
- [ ] [AC-002] 分支列表菜单项右侧仅显示数字，不包含 "node" 或 "nodes" 文字
- [ ] [AC-003] 当 viewRoot 只有1个直接子节点且该子节点有多个孙节点时，整个子树在画布中居中展示
- [ ] [AC-004] `MindMapEditor.tsx` 行数 ≤ 800
- [ ] [AC-005] 所有提取的纯函数有对应的单元测试
- [ ] [AC-006] `pnpm typecheck` 通过
- [ ] [AC-007] `pnpm test` 通过
- [ ] [AC-008] `pnpm build` 通过
- [ ] [AC-009] `pnpm lint` 通过
- [ ] [AC-010] playground 可视化验证分支列表样式和布局居中效果

## 依赖

- `@my-mind-node/core` - `simpleTreeLayout` 布局函数
- `@xyflow/react` - React Flow 画布组件
- `vitest` - 单元测试框架

## 开放问题

- 无
