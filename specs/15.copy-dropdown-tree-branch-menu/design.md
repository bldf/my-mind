# Copy Dropdown & Tree Branch Menu - 技术设计

## 设计版本

| 日期 | 版本 | 说明 |
| --- | --- | --- |
| 2026-06-26 | v1 | 初始设计 |

## 项目架构

- 架构类型: pnpm monorepo
- 涉及层: `packages/react` UI adapter、`apps/playground` 集成应用、`tests` 单元与 E2E
- 包边界: `@my-mind-node/react` 可以依赖 `@my-mind-node/core`、React、React Flow、lucide；不得依赖 `@my-mind-node/exporters`。JSON、Markdown、Mermaid 文本生成由 playground 通过可选回调接入。

## 功能模块设计

### 模块 1: 复制下拉 Toolbar 控件

扩展现有 toolbar 类型，在 `ViewToolbarControl` 中新增 `"copy"`，并在 `Toolbar.tsx` 中对该 control 渲染特殊的 hover/focus dropdown。

建议新增类型:

```typescript
export type CopyDataFormat = "json" | "markdown" | "mermaid";

export interface ToolbarCopyConfig {
  formats?: CopyDataFormat[];
  disabled?: boolean;
  labels?: Partial<Record<CopyDataFormat, string>>;
}

export interface ToolbarConfig {
  controls?: ViewToolbarControl[];
  hidden?: boolean;
  copy?: ToolbarCopyConfig;
}
```

`Toolbar` 继续保持 presentational 组件，不直接接触 `MindMapDocument` 或 exporters。对于 `"copy"` control，组件渲染:

- 主按钮: lucide `Copy` 图标，`aria-haspopup="menu"`，`aria-expanded` 随 dropdown 状态变化。
- 下拉列表: `role="menu"`，三个 `role="menuitem"` 按钮，标签为 `JSON`、`Markdown`、`Mermaid`。
- 交互: hover 打开，focus within 打开，Escape 关闭，点击格式后关闭。

`ToolbarProps` 增加 `copyConfig` 和 `onCopyAction(format)`，`MindMapEditor` 负责把 copy action 接到宿主回调与 Clipboard API。

### 模块 2: 复制数据生成与剪贴板写入

在 `MindMapEditorProps` 中新增可选复制回调，避免 React 包引入 exporters:

```typescript
export interface CopyDataRequest {
  format: CopyDataFormat;
  document: MindMapDocument;
}

export type CopyDataResult =
  | { ok: true; text: string }
  | { ok: false; error: MindMapError };

export interface MindMapEditorProps {
  onCopyData?: (request: CopyDataRequest) => string | CopyDataResult | Promise<string | CopyDataResult>;
  onCopySuccess?: (format: CopyDataFormat) => void;
}
```

`MindMapEditor` 内部流程:

1. 用户点击格式菜单项。
2. 若 format 为 `json` 且宿主未提供 `onCopyData`，使用 `serializeDocument(document)` 生成文本。
3. 若 format 为 `markdown` 或 `mermaid` 且宿主未提供 `onCopyData`，通过 `onError` 报 `COPY_NOT_CONFIGURED`。
4. 若宿主提供 `onCopyData`，优先使用回调结果。
5. 调用 `navigator.clipboard.writeText(text)`。
6. 成功时设置短暂 `copiedFormat` 状态或调用 `onCopySuccess`；失败时通过 `onError` 报 `CLIPBOARD_WRITE_FAILED`。

playground 在 `App.tsx` 中提供:

```typescript
const copyMindMapData = async ({ format, document }: CopyDataRequest) => {
  if (format === "json") return serializeDocument(document);
  const result = await exportMindMap(document, format);
  return result.ok ? String(result.value) : { ok: false, error: result.error };
};
```

这样 Markdown 和 Mermaid 继续由 `apps/playground` 层使用 `@my-mind-node/exporters`，符合当前 architecture boundary。

### 模块 3: Branch Tree 数据模型

把现有 `branchIds: NodeId[]` 升级为可渲染 Tree item。新增纯函数建议放入 `packages/react/src/branch-tree.ts` 或 `layout-helpers.ts` 附近:

```typescript
export interface BranchTreeItem {
  nodeId: NodeId;
  depth: 1 | 2 | 3;
  childItems: BranchTreeItem[];
  hasDocumentChildren: boolean;
  fallbackLeaf?: boolean;
}

export function buildBranchTreeItems(
  document: MindMapDocument,
  options?: { maxDepth?: 3 },
): BranchTreeItem[];
```

构建规则:

- 从 `document.rootId` 的直接 children 开始，一级节点全部生成 item。
- 二级/三级 item 默认只保留 `children.length > 0` 的节点。
- 对每个一级节点，如果没有任何二级父节点被保留，则展示该一级节点的直接二级 children，并标记 `fallbackLeaf: true`。
- 三级以下不递归，避免菜单变成完整大纲。
- 输出顺序保持 `children` 原顺序，确保菜单顺序和导图数据一致。

该 helper 是纯函数，单测覆盖深度截断、有子节点过滤、一级无可展开父节点 fallback、空文档/坏引用容错。

### 模块 4: BranchListPanel Tree 渲染

`BranchListPanel` 接收 `items: BranchTreeItem[]`，用递归或扁平化渲染默认展开 Tree。组件仍负责视觉和点击，不负责构建规则。

建议结构:

```typescript
interface BranchListPanelProps {
  document: MindMapDocument;
  items: BranchTreeItem[];
  selectedNodeId?: NodeId;
  selectedBranchId?: NodeId;
  onSelectNode: (nodeId: NodeId) => void;
}
```

渲染约定:

- 外层 `nav` 使用 `aria-label="Branch tree"`。
- Tree 容器使用 `role="tree"`；每行使用 `role="treeitem"` 和 `aria-level={item.depth}`。
- 默认展开，不需要交互式 disclosure 状态；有 childItems 的行可以显示 `ChevronDown` 或类似父节点提示图标。
- 缩进使用 CSS 自定义属性或 depth class，如 `.mmn-branch-tree-item--depth-2`。
- 一级 item 保留现有 swatch 和分支总数，二/三级 item 使用更轻的父节点标识和子节点数量。
- 当前 `effectiveViewRootId` 精确匹配的 item 使用 `aria-current="page"`；其一级祖先可加 `.mmn-branch-tree-item--ancestor`。

点击任一可见 item 调用 `onSelectNode(nodeId)`，由 `useBranchListState` 或 `MindMapEditor` 将右侧 `viewRootId` 切到该节点。

### 模块 5: Split Mode 状态接入

现有 split mode 使用 `rootBranchIds` 和 `selectedBranchId`。本期保留一级分支归属概念，同时增加 Tree 选中节点:

- `selectedBranchId`: 当前聚焦节点所属的原始一级分支，用于侧栏上下文、palette、文档变更兜底。
- `effectiveViewRootId`: 右侧实际聚焦节点，可以是一级、二级或三级 Tree item。
- `branchTreeItems`: 基于原始根节点构建，和 `effectiveViewRootId` 无关。

点击 Tree item 时:

1. 找到该 node 所属一级分支 `branchId = getRootBranchIdForNode(document, nodeId) ?? nodeId`。
2. 更新 `selectedBranchId`。
3. 调用现有 `setViewRootId(nodeId)` 和 `onViewRootChange(nodeId)`。
4. 复用现有分支切换后的 viewport 居中逻辑。

当文档变更导致当前 `effectiveViewRootId` 不存在或不再属于原始根子树时，兜底到第一个一级 item；当只影响 Tree 展示资格时，尽量保留仍存在的最近祖先。

### 模块 6: 样式与响应式

在 `styles.css` 中将 `.mmn-branch-list-item` 相关样式迁移或扩展为 Tree 命名:

- `.mmn-branch-tree`
- `.mmn-branch-tree-item`
- `.mmn-branch-tree-item--depth-1`
- `.mmn-branch-tree-item--depth-2`
- `.mmn-branch-tree-item--depth-3`
- `.mmn-branch-tree-item--selected`
- `.mmn-branch-tree-item--ancestor`
- `.mmn-toolbar__copy`
- `.mmn-toolbar__copy-menu`

样式要求:

- Tree 行高、缩进、计数 badge 固定，长标题最多 2-3 行并 `overflow-wrap: anywhere`。
- dropdown 使用 toolbar 内的 absolute layer 或 portal-free positioning，`z-index` 高于 toolbar 但低于全局 modal，且不被 `.mmn-toolbar` 横向滚动裁切。
- 暗黑模式使用现有 `--mmn-*` tokens，不新增单一色系主题。
- 窄容器下复制菜单可向左对齐，避免溢出编辑器右边界。

## 接口契约

新增公开 API 均为可选:

```typescript
export type CopyDataFormat = "json" | "markdown" | "mermaid";

export interface CopyDataRequest {
  format: CopyDataFormat;
  document: MindMapDocument;
}

export type CopyDataResult =
  | { ok: true; text: string }
  | { ok: false; error: MindMapError };

export interface ToolbarCopyConfig {
  formats?: CopyDataFormat[];
  disabled?: boolean;
  labels?: Partial<Record<CopyDataFormat, string>>;
}
```

`ToolbarConfig.copy` 未配置时，`"copy"` control 仍可展示 JSON fallback；Markdown/Mermaid 触发 `COPY_NOT_CONFIGURED`。playground 必须配置完整 `onCopyData`，所以用户看到的三项都可用。

## 数据模型

不修改 `MindMapDocument` schema，不新增持久化字段。复制状态、dropdown 打开状态、Tree 选中态和侧栏状态均为 React UI state。

## 安全考虑

- Clipboard 写入必须由用户点击触发，不做自动复制。
- 不读取剪贴板内容。
- 导出文本直接来自当前文档和现有 exporter，不执行用户输入。
- Tree 标题使用 React 文本节点渲染，禁止 `dangerouslySetInnerHTML`。
- 失败错误通过 `MindMapError` 结构传递，避免把完整异常对象或隐私上下文渲染到 UI。

## 技术决策

| 决策 | 选项 | 理由 |
| --- | --- | --- |
| 复制格式生成在宿主层完成 | `@my-mind-node/react` 直接依赖 exporters / 宿主提供 `onCopyData` | 选择宿主回调，保持 exporters 可选，符合当前包边界 |
| 复制入口加入现有 toolbar | playground 独立按钮 / React toolbar control | 用户明确要求顶部工具栏；通过可选 API 避免影响默认消费者 |
| Tree 基于原始根节点构建 | 基于当前 `viewRootId` / 基于 `document.rootId` | 用户要求展示原始根节点的一级与 1-3 级父节点，必须不随右侧聚焦漂移 |
| Tree 默认全部展开 | 增加折叠状态 / 无折叠状态 | 本期需求明确默认全部展开，先降低状态复杂度 |
| 二/三级过滤叶子节点 | 展示完整 3 级大纲 / 只展示父节点并带一级 fallback | 选择父节点优先，符合“仅支持有子节点的节点”，并用二级 fallback 避免空菜单 |
