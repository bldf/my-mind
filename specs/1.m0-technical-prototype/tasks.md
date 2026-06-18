# M0 Technical Prototype - 任务清单

## 任务版本

| 日期 | 版本 | 说明 |
| --- | --- | --- |
| 2026-06-18 | v1 | 从 PRD v0.12 M0 生成 |

## 项目信息

- 项目名: my-mind-node
- 架构类型: monorepo
- specs 路径: `specs/1.m0-technical-prototype/`

## 任务列表

### 功能 1: 工具链与包骨架

- [x] T-001: 初始化 pnpm workspaces、根 `package.json`、`pnpm-workspace.yaml`、`tsconfig.base.json`、`.gitignore`、MIT license 和 lint/format 配置 ~1h
- [x] T-002: 搭建 `@my-mind-node/core` 包骨架，配置 ESM only、tsup、Vitest 和 `src/index.ts` ~30min
- [x] T-003: 搭建 `@my-mind-node/react` 包骨架，配置 React/React Flow peer dependencies、tsup、Vitest 和入口导出 ~30min

### 功能 2: Core 原型

- [x] T-004: 实现最小数据模型、branded id 类型、`createEmptyDocument` 和公开导出 ~1h
- [x] T-005: 实现 `parseDocument` 安全解析与 schema/root/children/parentId/position/cycle 校验 ~1h
- [x] T-006: 实现 document 与布局 graph 的纯转换函数及单元测试 ~45min

### 功能 3: React Flow 与 Worker

- [x] T-007: 实现 Worker 布局调度，覆盖 requestId、超时、防抖和异常回传 ~1h
- [x] T-008: 实现 `MindMapEditor` 受控/非受控模式与 document 到 React Flow 适配 ~1h
- [x] T-009: 实现 `MindNode` 标题编辑、选中态和拖拽写回 `position` ~1h
- [x] T-010: 实现 `BezierEdge` default/hover/selected/label 状态和可访问 hit-area ~45min

### 功能 4: 交互与验证

- [x] T-011: 实现 Tab/Enter/Delete 基础编辑、空白平移、`+`/`-` 缩放、Ctrl+滚轮缩放和全屏切换 ~1h
- [x] T-012: 实现顶部右上角工具栏、面包屑、右键菜单进入节点视图 ~1h
- [x] T-013: 生成 100 节点 fixture，搭建 Vite playground 并完成手动渲染验证 ~45min
- [x] T-014: 编写 M0 性能验证记录，运行 build/test/typecheck/lint 并修复发现的问题 ~45min

## 依赖关系

- T-002、T-003 依赖 T-001
- T-004、T-005、T-006 依赖 T-002
- T-007 依赖 T-006
- T-008 依赖 T-003、T-007
- T-009、T-010、T-011、T-012 依赖 T-008
- T-013 依赖 T-011、T-012
- T-014 依赖 T-013

## 风险点

- React Flow 与公开 `MindMapDocument` 状态容易混淆，所有外部回调必须回传稳定文档模型。
- Worker 中接入 ELK.js 可能遇到 bundler/worker 入口问题；M0 可以先保证 Worker 语义和布局隔离，再在 M1 加强真 ELK 集成。
- Ctrl+滚轮按鼠标位置缩放需要真实浏览器验证，单元测试不足以证明节点不跳动。
