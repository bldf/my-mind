# Hyperlink Node Navigation - 技术设计

## 设计版本

| 日期 | 版本 | 说明 |
| --- | --- | --- |
| 2026-06-20 | v1 | 初始技术设计 |

## 项目架构

- 架构类型: monorepo
- 涉及层: `packages/react` 节点渲染与链接打开策略、`packages/core` 类型复用、`apps/playground` 示例验证、React 单元测试、Playwright E2E

## 功能模块设计

### 模块 1: 链接解析与安全打开策略

新增 React 层内部链接工具，负责从 `MindMapNode` 派生主链接，并在宿主未接管时执行默认安全打开。该模块不改变 core schema，也不让 core 依赖 DOM。

**涉及层及关键设计:**

- 在 `packages/react/src/link-utils.ts` 新增纯函数：
  - `getPrimaryNodeLink(node: MindMapNode): NodeLink | undefined`
  - `getTitleUrlLink(node: MindMapNode): NodeLink | undefined`
  - `isSafeExternalUrl(url: string): boolean`
  - `openSafeExternalUrl(url: string, targetWindow = window): boolean`
- `getPrimaryNodeLink` 规则：
  - 优先返回 `node.links[0]` 中 `url.trim()` 非空的链接。
  - 如果 `node.links` 为空，且 `node.title.trim()` 是可解析的安全 URL，则返回 `{ url: title, label: title }`。
  - 不从 `note`、`metadata` 或标题中的任意片段自动提取链接，避免误判普通文本。
- URL 安全规则：
  - 默认允许 `http:`、`https:`、`mailto:`、`tel:`。
  - 禁止 `javascript:`、`data:`、`vbscript:`、空字符串和解析失败的 URL。
  - 相对路径默认不直接打开；宿主可通过 `onOpenLink` 自行处理应用内路由或跨文档链接。
- 默认打开使用 `window.open(url, "_blank", "noopener,noreferrer")`。真实浏览器在启用 `noopener,noreferrer` 时可能返回 `null`，即使链接已成功交给浏览器打开，因此实现不能把 `null` 返回值当作失败信号。

### 模块 2: `MindNode` 可点击链接展示

`MindNode` 当前只在只读模式下使用 button 展示标题，编辑模式使用 textarea。实现时应新增链接状态，不让跳转污染编辑路径。

**涉及层及关键设计:**

- 扩展 `MindNodeData`：
  - `link?: NodeLink`
  - `onOpenLink?: (url: string, node: MindMapNode) => void`
- `documentToFlow` 在构造 node data 时调用 `getPrimaryNodeLink(node)`，并把 `options.onOpenLink` 透传给节点。
- `MindNode` 渲染策略：
  - `data.renderNode` 存在时，不替换宿主自定义渲染，只可通过 `data.link` 暴露链接信息。
  - `data.readonly && data.link` 时，标题按钮点击打开链接，而不是进入节点视图。
  - `data.readonly && !data.link` 保持现有点击进入节点视图行为。
  - 非只读编辑模式保持 textarea；如后续存在非编辑展示态，可在该展示态上复用同一链接按钮。
- 链接按钮事件必须 `preventDefault()` 和 `stopPropagation()`，并加 `nodrag nopan` 类，避免 React Flow 同时处理选择、拖拽或画布平移。
- 键盘触发沿用 button 原生 Enter/Space 行为；ARIA label 使用链接 label 或 URL，例如 `Open link Example from Topic 88`。
- 视觉上新增轻量 class：
  - `.mmn-node--link`
  - `.mmn-node__title--link`
  - 可选 `.mmn-node__link-icon`
- 样式只增加文字下划线、外链图标或 hover 颜色，不覆盖 `node.style.color` 和主题 token。

### 模块 3: `MindMapEditor` 统一链接打开入口

`MindMapEditor` 已把 `props.onOpenLink` 传给 `InspectorPanel`。本次需要增加统一打开函数，供画布节点和 Inspector 共同使用。

**涉及层及关键设计:**

- 在 `EditorCanvas` 中新增 `openNodeLink(node, url)` callback：
  - 如果 `props.onOpenLink` 存在，直接调用并返回。
  - 如果不存在，调用 `openSafeExternalUrl(url)`。
  - 如果 URL 不安全或打开失败，调用 `props.onError?.({ code, message, recoverable: true })`。
- 将 `openNodeLink` 传给：
  - `documentToFlow({ onOpenLink: openNodeLink })`
  - `InspectorPanel` 的 `onOpenLink`
- 为 `FlowConversionOptions` 增加：

```typescript
onOpenLink?: (url: string, node: MindMapNode) => void;
```

- `InspectorPanel` 不再直接调用 `props.onOpenLink?.(url, node)` 作为唯一行为，而是接收统一后的打开函数，因此默认安全打开和错误反馈也覆盖侧栏 links 列表。

### 模块 4: playground 与测试

playground 已能导入 Markdown link，并在 JSON 中保留 `links`。本规格重点补真实点击验证。

**涉及层及关键设计:**

- React 单元测试：
  - `getPrimaryNodeLink` 优先 `links[0]`。
  - URL 标题兜底。
  - 不安全 URL 被拒绝。
  - `MindNode` 链接按钮点击调用 `onOpenLink` 且阻止传播。
  - 只读非链接节点仍可进入节点视图。
- `MindMapEditor` 或 `documentToFlow` 测试：
  - flow node data 包含 `link` 和 `onOpenLink`。
  - Inspector links 触发同一打开函数。
- Playwright E2E：
  - 在 Markdown tab 输入包含 `[Example](https://example.com)` 的导图。
  - 切换到只读路径或使用可点击展示态验证节点链接点击。
  - 推荐在测试页面注入 `window.open` spy 或使用宿主 `onOpenLink` 测试回调，避免真实打开外部站点。

## 接口契约

### Public API

不新增公开 prop。继续使用现有 `MindMapEditorProps.onOpenLink`：

```typescript
onOpenLink?: (url: string, node: MindMapNode) => void;
```

语义补充：

- 画布链接节点和 Inspector links 均会调用该回调。
- 宿主提供回调时，库不执行默认 `window.open`。
- 宿主未提供回调时，库只对安全 URL 执行默认新标签页打开。

### Internal React Conversion

```typescript
export interface FlowConversionOptions {
  onOpenLink?: (url: string, node: MindMapNode) => void;
}

export interface MindNodeData {
  link?: NodeLink;
  onOpenLink?: (url: string, node: MindMapNode) => void;
}
```

这些字段属于 `packages/react` 内部渲染契约，不进入 core 数据模型。

## 数据模型

- 不新增持久化字段。
- 主链接继续使用 `MindMapNode.links: NodeLink[]`。
- 标题 URL 兜底只在渲染时派生，不回写 `node.links`。
- 多链接节点本规格仅打开第一个链接；多链接菜单后续单独设计。

## 安全考虑

- 用户导入的 Markdown、JSON 和标题文本均视为不可信输入。
- 默认打开只允许安全协议；不支持的协议通过 `onError` 反馈，不静默执行。
- 不用 `dangerouslySetInnerHTML` 渲染链接 label、URL 或节点标题。
- `window.open` 必须包含 `noopener,noreferrer`，避免新页面获得 opener。
- 相对路径和跨文档链接默认交给宿主 `onOpenLink`，避免库擅自改变当前应用路由。
- 链接点击不应发起后台请求；只有用户显式点击时才打开浏览器导航。

## 技术决策

| 决策 | 选项 | 理由 |
| --- | --- | --- |
| 链接数据来源 | `node.links[0]` 优先，标题 URL 兜底 | 复用现有 schema，同时满足“节点本身是链接”的直觉 |
| 默认跳转方式 | 新标签页 + `noopener,noreferrer` | 避免用户离开编辑器，并降低 opener 风险 |
| 宿主接管 | 复用 `onOpenLink` | 已有 public API，避免新增重复 prop |
| URL 过滤位置 | React 层内部工具 | core 保持 DOM-free，React 层负责浏览器打开行为 |
| 自定义节点 | 暴露数据，不强行包裹 | 避免破坏 `renderNode` 宿主自定义交互 |
| 多链接处理 | 仅打开第一个链接 | 本需求粒度小，菜单和链接管理留给后续规格 |
