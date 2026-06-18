# M1 Core Alpha - 技术设计

## 设计版本

| 日期 | 版本 | 说明 |
| --- | --- | --- |
| 2026-06-18 | v1 | 从 PRD v0.12 M1 生成 |

## 项目架构

- 架构类型: monorepo
- 涉及层: `packages/core`、`tests/fixtures`、类型测试

## 功能模块设计

### 模块 1: Core schema

在 `packages/core/src/types.ts` 中扩展 PRD §8.1 的核心类型。Alpha 阶段字段尽量完整，但可通过 TSDoc 标注 experimental。

**涉及层及关键设计:**

- `MindMapDocument` 包含 `schemaVersion`、`id`、`title`、`rootId`、`nodes`、`connections`、`tags`、`theme`、`layout`、`revision`、`metadata`。
- `MindMapNode` 包含 title、note、links、tagIds、task、icon、image、collapsed、position、style、metadata。
- 使用 branded id 类型减少跨字段误传。

### 模块 2: 校验与解析

校验器分层：基础结构检查、引用完整性检查、树结构检查、字段语义检查。

**涉及层及关键设计:**

- `validateDocument(document)` 返回 `ParseResult<MindMapDocument>` 或 `ValidationResult`。
- `parseDocument(json)` 只负责 JSON parse + 调用校验。
- 校验不可只从 root DFS；孤儿节点和不可达子图也必须被检查，避免恶意数据潜入。

### 模块 3: 命令与操作流

命令执行器输入 `MindMapDocument` 和 `MindMapCommand`，输出 `CommandResult`，不持有 UI 状态。

**涉及层及关键设计:**

- 文档命令生成 `MindMapOperation`，包含 `commandType`、`inverse`、`patch`、metadata。
- 视图/选择命令可以独立返回状态结果，不进入文档 history。
- 批量命令需要组合 inverse，保证一次 undo 回滚一次用户意图。

### 模块 4: History

history 管理过去和未来两个 stack，操作以 transaction 为单位入栈。

**涉及层及关键设计:**

- `HistoryManager` 接受 operation batch。
- `undo()` 应按 inverse 逆序应用。
- `redo()` 重放原 command 或 forward patch。
- 删除节点需保存完整子树和关联 connection/tag 引用变化。

### 模块 5: 序列化与缩进文本

JSON 是稳定交换格式；缩进文本是轻量格式，只保留标题和层级。

**涉及层及关键设计:**

- JSON 导入导出保留完整字段，并根据 `schemaVersion` 预留迁移点。
- 缩进文本导入支持空格、Tab、项目符号剥离和多顶层行默认 root。
- 缩进不一致应返回结构化错误，不默默生成错误树。

## 接口契约

```ts
export function validateDocument(document: unknown): ParseResult<MindMapDocument>;
export function serializeDocument(document: MindMapDocument): string;
export function importIndentedText(text: string, options?: IndentedTextOptions): ParseResult<MindMapDocument>;
export function exportIndentedText(document: MindMapDocument, options?: IndentedTextOptions): string;
export function dispatchCommand(document: MindMapDocument, command: MindMapCommand): CommandResult;
```

## 数据模型

以 PRD §8.1、§8.3、§8.6 和 §8.8 为准，M1 必须落地：

- `MindMapDocument`
- `MindMapNode`
- `MindMapConnection`
- `MindMapTag`
- `NodeTask`
- `NodeStyle`
- `SelectionState`
- `MindMapCommand`
- `MindMapOperation`
- `ChangeMeta`
- `MindMapError`

## 安全考虑

- 所有 parser 返回错误对象，不抛未捕获异常。
- URL/link 只保存数据，不自动打开。
- 导入文本只当纯文本处理，不解释 HTML。
- JSON 解析不信任任何字段，包括 metadata。

## 技术决策

| 决策 | 选项 | 理由 |
| --- | --- | --- |
| 命令执行归属 | core | undo/redo、保存和协作都依赖稳定操作流 |
| 缩进文本位置 | core | 轻量格式不依赖浏览器或 React |
| ELK 运行时 | 不进 core | core 保持 framework/DOM/runtime 无关 |
| History 单位 | operation batch | 一次用户意图应一次 undo |
