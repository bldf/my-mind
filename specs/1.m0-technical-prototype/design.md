# M0 Technical Prototype - 技术设计

## 设计版本

| 日期 | 版本 | 说明 |
| --- | --- | --- |
| 2026-06-18 | v1 | 从 PRD v0.12 M0 生成 |

## 项目架构

- 架构类型: monorepo
- 涉及层: 根工具链、`packages/core`、`packages/react`、`apps/playground`、`tests/fixtures`、`tests/bench`

## 功能模块设计

### 模块 1: Monorepo 与工具链

使用 pnpm workspaces 管理 `packages/*` 与 `apps/*`。根配置提供统一的 build/test/typecheck/lint 脚本，所有包采用 ESM only。

**涉及层及关键设计:**

- 根 `package.json` 设置 `type: module`、`packageManager`、聚合 scripts。
- `pnpm-workspace.yaml` 声明 packages 和 playground。
- `tsconfig.base.json` 使用 strict、`moduleResolution: bundler`、`verbatimModuleSyntax`。
- `.gitignore` 覆盖 `node_modules`、`dist`、`.env*`、临时输出和密钥文件。

### 模块 2: Core 最小模型

`@my-mind-node/core` 只负责数据结构、工厂函数、解析校验和布局转换纯函数，不引入 UI 运行时。

**涉及层及关键设计:**

- `src/types.ts` 定义 `NodeId`、`DocumentId`、`MindMapDocument`、`MindMapNode`、`Point`、`ParseResult`、`MindMapError`。
- `src/document.ts` 实现 `createEmptyDocument`。
- `src/parse.ts` 实现 JSON parse、schema 校验、root/children/parentId/position/cycle 校验。
- `src/layout.ts` 实现 document 与布局 graph 的纯转换。

### 模块 3: React Flow 原型

`@my-mind-node/react` 对外暴露 `MindMapEditor`，内部适配 React Flow 的 nodes/edges，不把 React Flow 内部状态作为公开模型。

**涉及层及关键设计:**

- `document-to-flow.ts` 将 `MindMapDocument` 派生为 React Flow nodes/edges。
- `MindMapEditor.tsx` 支持受控/非受控模式、`onChange`、height。
- `nodes/MindNode.tsx` 支持选中态、标题编辑、拖拽。
- `edges/BezierEdge.tsx` 支持柔和曲线、hover、selected、label 和可访问点击区域。

### 模块 4: Worker 布局调度

Worker 入口执行布局计算，主线程只负责调度、取消、防抖和错误回传。

**涉及层及关键设计:**

- worker 消息包含 `requestId`、布局输入和配置。
- 主线程遇到新请求时丢弃旧响应；超时返回 `LAYOUT_TIMEOUT`。
- worker 异常统一为 `LAYOUT_WORKER_ERROR`。
- M0 固定布局方向为 `right`，其它方向后续在 M2 扩展。

### 模块 5: Playground 与验证

Vite playground 加载 100 节点 fixture，提供人工 QA 和性能记录入口。

**涉及层及关键设计:**

- `tests/fixtures/100-nodes.json` 用脚本生成，避免手写大型 fixture。
- `apps/playground` 默认展示导图，而不是营销落地页。
- `tests/bench` 记录 parse、布局转换和 100 节点基础性能。

## 接口契约

```ts
export function createEmptyDocument(options?: {
  title?: string;
  rootTitle?: string;
}): MindMapDocument;

export function parseDocument(json: string): ParseResult<MindMapDocument>;
```

```ts
export interface MindMapEditorProps {
  value?: MindMapDocument;
  defaultValue?: MindMapDocument;
  onChange?: (document: MindMapDocument) => void;
  height?: number | string;
}
```

## 数据模型

M0 只实现 PRD `MindMapDocument` 的最小子集：`schemaVersion`、`id`、`title`、`rootId`、`nodes`，节点包含 `id`、`parentId`、`children`、`title`、`position`。

## 安全考虑

- `parseDocument` 失败时返回结构化错误，不静默吞错。
- 标题渲染不使用 `dangerouslySetInnerHTML`。
- playground 不读取 cookie、localStorage 或外部网络数据。
- `.env*` 和密钥文件必须被 ignore。

## 技术决策

| 决策 | 选项 | 理由 |
| --- | --- | --- |
| 包管理 | pnpm workspaces | 符合 PRD 预期包结构和 monorepo 目标 |
| 构建 | tsup 优先 | M0 配置轻量，ESM 输出直接；体积问题后续再评估 rollup |
| 画布 | React Flow | PRD 已确认首发固定依赖，能快速验证交互 |
| 布局 | Worker 执行 | 避免布局长任务阻塞主线程 |
| 命令系统 | M0 简化实现 | 完整 command/history 在 M1 落地，M0 只验证交互可行性 |
