# Branch List Focus Layout - 技术设计

## 设计版本

| 日期 | 版本 | 说明 |
| --- | --- | --- |
| 2026-06-26 | v1 | 初始技术设计 |

## 项目架构

- 架构类型: pnpm monorepo
- 涉及层: `packages/react` 组件、状态与样式，`packages/core` 树遍历 helper 复用，`apps/playground` 体验验证，`tests/e2e` 浏览器回归
- 项目规范: 遵循 `AGENTS.md`、`.agents/rules/coding-style.md`、`.agents/rules/testing.md`、`.agents/rules/security.md`、`.agents/rules/git-workflow.md`

## 功能模块设计

### 模块 1: 列表布局配置与启用条件

在 `packages/react/src/types.ts` 新增可选配置:

```ts
export interface BranchListLayoutConfig {
  hidden?: boolean;
  autoShowDepth?: number;
  defaultOpen?: boolean;
  defaultSidebarWidth?: number;
  minSidebarWidth?: number;
  maxSidebarWidthRatio?: number;
}

export interface MindMapEditorProps {
  branchListLayout?: BranchListLayoutConfig;
}
```

默认行为:

- `hidden !== true` 时启用能力。
- `autoShowDepth ?? 3`，表示树深度达到 3 层时展示半透明切换按钮。
- `defaultOpen` 只影响初次渲染时是否直接进入列表布局；默认 `false`，避免改变现有嵌入体验。
- `defaultSidebarWidth` 默认 `280`，`minSidebarWidth` 默认 `220`，`maxSidebarWidthRatio` 默认 `0.45`。

深度检测使用 `MindMapDocument` 纯数据遍历，不依赖 DOM:

```text
root depth = 1
child depth = parent depth + 1
eligible = maxDepth >= autoShowDepth && root.children.length > 0
```

该 helper 可以先放在 `MindMapEditor.tsx` 附近的纯函数区；如果后续多个包需要复用，再提升到 `@my-mind-node/core`。

**涉及层及关键设计:**

- React types: 新增可选配置，不破坏旧 props。
- React state: 根据文档和配置 `useMemo` 计算 `branchListEligible` 和 `rootBranchItems`。
- 测试: 单元测试覆盖浅层文档不展示、深层文档展示、配置隐藏后不展示。

### 模块 2: 列表布局状态模型

`MindMapEditor` 内部新增视图状态:

```ts
type BranchListMode = "normal" | "split";

interface BranchListState {
  mode: BranchListMode;
  selectedBranchId?: NodeId;
  sidebarCollapsed: boolean;
  sidebarPreviewOpen: boolean;
  sidebarPinned: boolean;
  sidebarWidth: number;
}
```

进入 split 时:

1. 将当前 `effectiveViewRootId` 保存到 `previousViewRootIdRef`。
2. 通过当前视图根的祖先链推断其所属一级分支；若当前视图根本身就是一级分支则直接使用；若无法推断则使用 `document.rootId` 的第一个 child。
3. 设置 `selectedBranchId`，右侧 `viewRootId` 使用该分支 id。
4. 调用现有 `onViewRootChange`，保持宿主知道视图根变化。

退出 split 时:

1. 设置 `mode = "normal"`。
2. 恢复 `previousViewRootIdRef.current`，若该节点已不存在则恢复 `document.rootId`。
3. 清理 `sidebarPreviewOpen`，保留 `sidebarWidth` 作为本次会话内状态。

当文档变更导致当前 `selectedBranchId` 不存在或不再是根节点一级 child 时，自动选择第一个可用一级分支；如果文档不再满足启用条件，则退出 split 并隐藏按钮。

**涉及层及关键设计:**

- React: 复用现有 `viewRootId` / `effectiveViewRootId`，不新增文档字段。
- Core: 复用 `getAncestorIds` 判断当前视图根所属一级分支。
- History: 分支切换只改本地视图状态，不调用 `runCommand` 或 `commitDocument`。

### 模块 3: 半透明切换按钮

新增内部组件 `BranchListToggleButton`，渲染在 `.mmn-editor` 内部左侧浮层。按钮使用 lucide 图标，例如 `PanelLeftOpen` / `PanelLeftClose`，并提供 `title`、`aria-label`、`aria-pressed`。

按钮状态:

- 默认停靠在容器左侧中上位置，`opacity` 约 `0.72`，hover / focus 时提高不透明度。
- pointer down 后进入拖拽，使用 `setPointerCapture` 跟踪移动。
- 拖拽位置存储为相对容器的 `{ x, y }`，拖动中用 `transform: translate(...)`，避免频繁触发布局。
- pointer up 时根据容器 bounds clamp 到可见范围；若释放点越界或靠近任意边缘，则吸附到最近边缘。

按钮拖拽必须忽略 click 误触: 如果 pointer move 超过阈值，例如 4px，释放时不触发 toggle。

**涉及层及关键设计:**

- React: 本地 pointer state，组件卸载时清理 capture 和临时状态。
- CSS: 使用 `position: absolute`、`z-index` 高于 React Flow 但低于 modal/panel，半透明 surface 取现有 CSS token。
- 测试: E2E 拖到容器外释放后断言按钮仍在 `.mmn-editor` bounds 内且可点击。

### 模块 4: 左侧一级分支列表

新增内部组件 `BranchListPanel`:

```tsx
interface BranchListPanelProps {
  document: MindMapDocument;
  branchIds: NodeId[];
  selectedBranchId?: NodeId;
  collapsed: boolean;
  previewOpen: boolean;
  pinned: boolean;
  onSelectBranch: (nodeId: NodeId) => void;
  onCollapse: () => void;
  onPin: () => void;
}
```

列表项内容:

- 节点标题，使用普通文本渲染。
- 分支色彩 swatch，可复用 `documentToFlow` 的 palette 思路，或用当前节点 `style.backgroundColor` / `style.borderColor` 回退到 CSS accent。
- 后代数量或直接子节点数量，例如 `12 nodes`，帮助用户判断分支规模。
- 选中态使用 `aria-current="page"`，按钮样式与现有 toolbar / breadcrumbs 保持一致。

列表顶部:

- 收起按钮: `PanelLeftClose`，点击进入收起态。
- 固定按钮: 仅在 preview 展开或未固定时显示，`Pin` / `PinOff` icon，点击后 `sidebarPinned=true`、`sidebarCollapsed=false`。

长标题处理:

- 列表项整体固定高度或最小高度，标题最多两行，超出省略。
- 窄宽度下保留 swatch 和标题主体，数量文字可换到下一行或隐藏。

**涉及层及关键设计:**

- React: 列表项点击调用 `setSelectedBranchId` 和现有 `enterViewRoot(branchId)`。
- CSS: `.mmn-branch-list`、`.mmn-branch-list__item` 等命名，全部使用 `--mmn-*` tokens 适配暗黑模式。
- A11y: 列表容器使用 `nav` 或 `aside` + `aria-label="Root branches"`；列表项为 button。

### 模块 5: 左右分栏与拖拽调整宽度

列表布局下，`.mmn-editor` 内部结构从单一画布变为 shell:

```tsx
<div className="mmn-branch-layout" style={{ "--mmn-branch-sidebar-width": `${width}px` }}>
  <BranchListPanel />
  <BranchListResizeHandle />
  <div className="mmn-branch-layout__canvas">
    {topbar}
    {reactFlow}
    {panels}
  </div>
</div>
```

普通布局继续保持现有视觉结构，避免影响未启用用户。实现时可以抽取 `renderCanvasSurface()`，让普通布局和 split 布局复用同一份 `ReactFlow`、`ThemePanel`、`SearchPanel`、`InspectorPanel` 渲染逻辑。

拖拽分隔条:

- 使用 `role="separator"`、`aria-orientation="vertical"`、`aria-valuenow`、`aria-valuemin`、`aria-valuemax`。
- pointer drag 时按容器宽度计算 sidebar width，并 clamp 到 `[minSidebarWidth, containerWidth * maxSidebarWidthRatio]`。
- 拖拽过程中暂停 text selection，释放后清理全局 pointer listener。
- 宽度变化后触发已有 `ResizeObserver` 或显式 `scheduleCenterView()`，让右侧画布在当前分支中恢复可读位置。

**涉及层及关键设计:**

- React: `sidebarWidth` 是本地状态，不写入文档和 history。
- CSS: `display: grid; grid-template-columns: var(--mmn-branch-sidebar-width) 8px minmax(0, 1fr)`；收起时右侧 `grid-column` 占满。
- 测试: E2E 拖动 separator 后读取侧栏宽度变化，并断言右侧 React Flow 仍可交互。

### 模块 6: 收起、悬停展开与固定

收起态目标是“右侧自动全屏”:

- `sidebarCollapsed=true` 且 `sidebarPreviewOpen=false` 时，布局不占用侧栏宽度，右侧 canvas `grid-column: 1 / -1`。
- 保留一个左侧 hover trigger，例如 `.mmn-branch-hover-rail`，宽度 10-16px，透明或极轻量显示。
- pointer enter hover rail 后设置 `sidebarPreviewOpen=true`，以 overlay 形式展示 `BranchListPanel`，不挤压右侧画布。
- pointer leave preview panel 后，如果没有 pinned，则 `sidebarPreviewOpen=false`。
- 点击固定按钮后 `sidebarPinned=true`、`sidebarCollapsed=false`、`sidebarPreviewOpen=false`，列表回到占位分栏。

为了避免在触屏设备上 hover 不可用，收起态下 hover rail 也作为 button，可点击临时展开或固定列表。

**涉及层及关键设计:**

- React: 区分占位分栏展开和 overlay preview 展开。
- CSS: overlay panel 使用 `position: absolute; left: 0; top: 0; bottom: 0; width: var(--mmn-branch-sidebar-width)`，并带半透明 backdrop / shadow。
- A11y: 收起后 hover rail 提供 `aria-label="Show branch list"`。

### 模块 7: 右侧子树渲染与现有能力协同

右侧画布不创建新文档，而是把现有 `documentToFlow(document, { viewRootId })` 的 `viewRootId` 改为 `selectedBranchId`。这样可以直接复用:

- 子树可见节点过滤
- 当前 view root 的 root presentation
- 现有节点编辑、折叠、拖拽、搜索结果点击、面包屑
- `fitViewOnInit`、`fitViewOnResize`、全屏、MiniMap 和 toolbar

需要注意:

- 列表布局下 `Breadcrumbs` 可以继续展示从文档根到当前一级分支的路径；如果顶部空间不足，按现有 responsive 规则横向滚动。
- 搜索命中根节点之外的其他一级分支时，点击搜索结果应自动切换 `selectedBranchId` 到该节点所属一级分支，再进入对应 `viewRootId`。
- 若用户在右侧通过右键或面包屑进入更深节点视图，仍应保持左侧选中其所属一级分支；右侧 `viewRootId` 可以是深节点，但列表项仍表示一级分支归属。
- 点击左侧一级分支时右侧 `viewRootId` 重置为该一级分支本身。

**涉及层及关键设计:**

- React: 新增 `getRootBranchIdForNode(document, nodeId)` helper。
- Search: `onSearchResultClick` 路径中补充分支切换逻辑。
- Tests: 单元测试覆盖从深层 view root 进入 split 时左侧选中正确一级分支。

### 模块 8: 主题、响应式与视觉细节

CSS 继续以 `.mmn-editor` 变量为唯一主题入口:

- `--mmn-surface`、`--mmn-border`、`--mmn-muted-text`、`--mmn-control-hover`、`--mmn-shadow`
- 不引入单色大面积背景；列表使用半透明 surface 和清晰选中态。
- 左侧列表使用 8px 或更小圆角，避免卡片嵌套卡片。
- 切换按钮使用图标优先，不放大段文案；hover tooltip 通过 `title` / `aria-label`。

响应式策略:

- 容器宽度小于约 720px 时，进入 split 后默认收起列表，只保留 hover/click rail。
- 侧栏最大宽度按容器比例限制，标题用两行 clamp。
- toolbar、breadcrumbs、search/theme/inspector panel 仍在右侧 canvas 内定位，不能被左侧列表覆盖。

**涉及层及关键设计:**

- CSS: 新增 branch list 相关 class，避免改动现有节点样式。
- E2E: 覆盖 dark mode 下 computed background/border/text color 不是浅色残留；窄容器下列表不覆盖 toolbar。

## 接口契约

### React Props

```ts
export interface BranchListLayoutConfig {
  hidden?: boolean;
  autoShowDepth?: number;
  defaultOpen?: boolean;
  defaultSidebarWidth?: number;
  minSidebarWidth?: number;
  maxSidebarWidthRatio?: number;
}

export interface MindMapEditorProps {
  branchListLayout?: BranchListLayoutConfig;
}
```

### 事件语义

- 进入、退出、切换右侧 `viewRootId` 时可继续调用现有 `onViewRootChange(nodeId)`。
- 列表布局状态、侧栏宽度、按钮位置、收起/固定状态不新增公开事件，先作为组件内部 transient UI state。
- 所有分支列表交互都不得调用 `onChange`，除非用户在右侧画布执行真实文档编辑。

## 数据模型

- 不新增 `MindMapDocument` 字段。
- 不修改节点、连接线、layout、metadata 或 revision。
- 分支列表状态全部保存在 React 本地 state/ref。

## 安全考虑

- 节点标题按 React 文本渲染，不使用 `dangerouslySetInnerHTML`。
- 按钮位置和侧栏宽度仅存在内存中，不写入 localStorage，避免在宿主页面留下隐式持久化。
- pointer 监听、ResizeObserver 和 requestAnimationFrame 必须在组件卸载时清理。
- 不访问网络、不读取文件、不请求浏览器权限。

## 技术决策

| 决策 | 选项 | 理由 |
| --- | --- | --- |
| 右侧子树渲染复用 `viewRootId` | 复用现有 `documentToFlow`，不生成临时文档 | 保持 history、selection、折叠、搜索和面包屑语义一致，降低数据同步风险 |
| 左侧列表展示根节点直接子节点 | 固定用 `document.rootId.children` | 符合“根节点下边对应的一级节点”，避免当前深层视图导致列表内容漂移 |
| 列表状态使用本地 React state | 不写入文档 metadata | 这是阅读布局状态，不应污染用户数据或触发保存 |
| 收起后 hover 展开使用 overlay | 不挤压右侧画布 | 满足右侧全屏，同时允许临时切换分支 |
| 切换按钮拖拽吸附只约束在容器内 | 不允许按钮离开容器 | 避免按钮丢失，符合嵌入式 SDK 的安全交互边界 |
