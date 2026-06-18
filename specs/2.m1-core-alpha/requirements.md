# M1 Core Alpha - 需求规格

## 概述

完成 `@my-mind-node/core` 的 Alpha 能力：稳定文档 schema、校验、命令系统、历史、选择、折叠、基础标签/任务/连接线、JSON 序列化、缩进文本导入导出和 Worker 布局适配。

## 项目信息

- 项目名: my-mind-node
- 架构类型: monorepo
- 需求来源: `docs/prd-mind-map.md` M1

## 需求版本

| 日期 | 版本 | 说明 |
| --- | --- | --- |
| 2026-06-18 | v1 | 从 PRD v0.12 拆分 M1 Core Alpha |

## 用户故事

- 作为前端开发者，我想要一个 framework-agnostic core 包，以便在 React 之外也能处理导图数据。
- 作为库维护者，我想要命令和操作流可序列化，以便后续支持 undo/redo、保存和协作 adapter。
- 作为宿主应用，我想要安全导入 JSON 和缩进文本，以便接入 AI 输出、剪贴板和轻量文本数据。

## 功能需求

1. [F-001] 完整定义 core Alpha 文档 schema，覆盖节点、连接线、标签、任务、链接、图片、样式、布局和 metadata 前向扩展字段。
2. [F-002] 实现文档校验器，覆盖 root、parent/children、连接线端点、标签引用、任务字段、position、style 和循环引用。
3. [F-003] 实现命令系统，覆盖节点创建、更新、删除、移动、折叠、标签、连接线、选择、视图和主题命令的 core 子集。
4. [F-004] 所有修改文档的命令生成可序列化 `MindMapOperation` 和 inverse。
5. [F-005] 实现 undo/redo history，支持批量命令和破坏性操作回滚。
6. [F-006] 实现 `SelectionState` 和多选状态工具函数，为 React 层多选和检查器联动提供稳定模型。
7. [F-007] 实现 JSON 导入导出与 schema 版本字段。
8. [F-008] 实现缩进文本导入导出，支持空格/Tab 缩进、项目符号剥离和结构化错误。
9. [F-009] 实现布局输入输出适配，core 不依赖 ELK 运行时，只暴露内部稳定布局结构。
10. [F-010] 完成 core 单元测试和类型测试，证明 core 不依赖 React/DOM。

## 非功能需求

- 性能: 500 节点以内校验和基础命令执行不产生明显阻塞；大图布局输入转换可单独 benchmark。
- 安全: 所有导入内容按不可信输入处理，文本转义责任清晰。
- 兼容性: ESM only；TypeScript 类型完整；core 可在非浏览器环境单测运行。
- 架构边界: core 不引入 React、React Flow、DOM、ELK 运行时依赖。

## 验收标准

- [ ] [AC-001] `@my-mind-node/core` 可单独 `build`、`test`、`typecheck`。
- [ ] [AC-002] 文档校验覆盖无效 root、悬挂 parentId、无效 connection、未知 tag、循环引用和非法 position。
- [ ] [AC-003] 节点创建、删除、移动、折叠、连接线、标签和选择命令均可生成 operation。
- [ ] [AC-004] undo/redo 能回滚节点创建、删除、移动和批量命令。
- [ ] [AC-005] JSON 和缩进文本可往返导入导出，异常输入返回结构化错误。
- [ ] [AC-006] 依赖图证明 core 不包含 React、React Flow、DOM 或 ELK 运行时。

## 依赖

- TypeScript
- Vitest
- M0 monorepo 骨架

## 开放问题

- npm scope 所有权仍需在发布 Alpha 前确认。
- Public Beta 前需要决定哪些字段标记稳定、哪些字段仍是 experimental。
