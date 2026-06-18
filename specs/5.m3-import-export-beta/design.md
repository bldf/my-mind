# M3 Import/Export Beta - 技术设计

## 设计版本

| 日期 | 版本 | 说明 |
| --- | --- | --- |
| 2026-06-18 | v1 | 从 PRD v0.12 M3 生成 |

## 项目架构

- 架构类型: monorepo
- 涉及层: `packages/importers`、`packages/exporters`、`packages/core`、`packages/react`、`apps/examples`、E2E

## 功能模块设计

### 模块 1: Importers 包

导入器输出 `ParseResult<MindMapDocument>`，错误统一使用 core `MindMapError`。

**涉及层及关键设计:**

- Markdown 导入支持标题、缩进列表和普通列表。
- OPML 导入使用安全 XML 解析，忽略或报错未知结构。
- 缩进文本和 JSON 复用 core 实现。
- 所有导入后调用 `validateDocument`。

### 模块 2: Exporters 包

文本导出放在纯函数中，图片/矢量导出只在浏览器客户端执行。

**涉及层及关键设计:**

- Markdown/OPML/Indented Text/JSON 导出不依赖 DOM。
- PNG 导出通过当前视图或完整导图 DOM/canvas 截图路径实现。
- SVG 导出基于 DOM 序列化，内联必要主题样式。
- 导出选项对齐 PRD `ExportOptions`。

### 模块 3: React 集成入口

React 层提供工具栏导出入口，但导入导出包保持可选。

**涉及层及关键设计:**

- `ViewToolbarControl: 'export'` 可按需启用。
- importers/exporters 使用动态 import 或 peer/optional 方式避免默认进入核心 bundle。
- 导出失败通过 `onError` 和 rejected promise 暴露。

### 模块 4: 示例项目

示例覆盖主要接入方式，而不是只展示单一路径。

**涉及层及关键设计:**

- Vite 示例继续作为主 playground。
- Next.js 示例验证 SSR import 安全。
- readonly 示例展示 `MindMapViewer`。
- custom-node 示例展示 `renderNode` 扩展。
- GitHub Pages 示例页面使用静态构建产物。

## 接口契约

```ts
export type ImportFormat = 'json' | 'markdown' | 'opml' | 'indented-text';
export type ExportFormat = ImportFormat | 'png' | 'svg';

export function importMindMap(input: string | File, format: ImportFormat, options?: ImportOptions): Promise<ParseResult<MindMapDocument>>;
export function exportMindMap(document: MindMapDocument, format: ExportFormat, options?: ExportOptions): Promise<Blob | string>;
```

## 数据模型

- 所有导入最终生成 `MindMapDocument`。
- Markdown/OPML 无法表达的字段可忽略或放入 metadata，但不得伪造数据。
- PNG/SVG 导出不改变文档。

## 安全考虑

- Markdown 和 OPML 解析后只生成文本节点，不渲染原始 HTML。
- XML parser 禁用外部实体，避免 XXE 风险。
- 导出 SVG 时避免把用户提供的危险 HTML 原样嵌入。
- 浏览器 API 延迟到客户端执行，SSR 安全。

## 技术决策

| 决策 | 选项 | 理由 |
| --- | --- | --- |
| 导入导出拆包 | 独立 packages | 控制 core/react 包体积 |
| PNG/SVG 位置 | exporters + React 集成 | 纯数据导出和浏览器渲染导出分层清晰 |
| Markdown 范围 | 标题/列表/缩进优先 | Beta 目标是常见结构兼容，不做完整 Markdown 编辑器 |
| FreeMind/XMind | 不支持首发 | PRD 已明确不纳入首发范围 |
