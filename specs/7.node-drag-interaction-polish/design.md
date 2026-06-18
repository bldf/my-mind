# Node Drag Interaction Polish - 技术设计

## 设计版本

| 日期 | 版本 | 说明 |
| --- | --- | --- |
| 2026-06-18 | v1 | 根据节点拖拽与 hover 控件体验反馈新建设计 |

## 项目架构

- 架构类型: monorepo
- 涉及层: `packages/react` 交互与样式、`packages/core` 命令复用、`apps/playground` 示例、组件测试与 Playwright E2E

## 功能模块设计

### 模块 1: React Flow 拖拽预览状态

`MindMapEditor` 继续以 `MindMapDocument` 作为真实数据源，但拖动过程引入临时 drag session，避免每一帧把节点位置写回文档。

**涉及层及关键设计:**

- 在 `packages/react/src/MindMapEditor.tsx` 中接入 `onNodesChange`、`onNodeDragStart`、`onNodeDrag`、`onNodeDragStop`。
- 使用临时 flow nodes 或 drag preview position map 承接 React Flow 的拖动变化，确保节点跟随鼠标。
- drag session 记录被拖动节点、拖动起点、当前指针位置、当前 drop intent、是否已触发 2 秒 reparent dwell。
- 拖动过程中不调用 `runCommand`，不写 history，不触发宿主 `onChange`。
- 释放时根据 drop intent 生成一次 core command 或 batch command。

### 模块 2: Drop 目标命中与 2 秒悬停

拖放命中只在可见节点中计算，且排除根节点移动、自身、后代、被拖动集合内部节点等非法目标。

**涉及层及关键设计:**

- 使用 React Flow 节点 bounds 或 DOM `getBoundingClientRect()` 计算指针所在目标。
- 将目标节点垂直方向划分为上方排序区、中心入子区、下方排序区；默认比例可用 `30% / 40% / 30%`。
- 指针处于中心入子区时启动 2000ms dwell timer；期间展示进度态，达到 2 秒后给目标节点添加一次 flash 状态并锁定 `reparent` intent。
- 指针移出中心区、切换目标节点或切到上/下排序区时清理 timer。
- 上方和下方排序区立即展示 insertion preview，释放时提交同级排序。

### 模块 3: 释放提交与重新布局

释放时统一通过 core command 修改文档结构，然后用现有布局函数生成稳定位置。

**涉及层及关键设计:**

- `reparent` intent 使用 `node.moveMany`，`parentId` 为目标节点 id，`index` 默认为目标子列表尾部。
- `sort-before` 和 `sort-after` intent 使用 `node.moveMany`，`parentId` 为目标节点 `parentId`，`index` 根据目标在同级 children 中的位置计算。
- 结构变更成功后调用 `simpleTreeLayout` 与 `applyLayoutResult`，保证释放后节点、连线和子树间距恢复稳定。
- 未命中合法目标时不保留单节点任意漂移位置，回到布局结果，避免画布出现截图中的重叠与错线。
- 多选拖放只提交选择集中的顶层节点，沿用 core `node.moveMany` 的去重规则。
- 如果命令失败，回滚拖拽预览状态并通过 `onError` 返回可恢复错误。

### 模块 4: 节点 hover 编辑控件

`MindNode` 负责展示节点级 hover 控件，具体命令仍由 `MindMapEditor` 统一执行。

**涉及层及关键设计:**

- 扩展 `MindNodeData`，新增 `onAddChild`、`onToggleCollapse`、`dropIntent`、`branchSide` 等内部回调与状态。
- 可编辑且非只读节点 hover 时展示“➕”按钮；按钮放在子节点延展方向的边缘，root 可按当前布局方向展示主入口。
- 点击“➕”后调用 `node.create`，父节点为当前节点；命令成功后重新布局，并将 selection 切到新节点。
- 有子节点的节点 hover 时展示展开/折叠按钮；按钮放在当前树边连接侧，折叠显示 expand 图标，展开显示 collapse 图标。
- 控件必须避免覆盖标题输入主区域，使用绝对定位和较小 hit area，但保留清晰点击范围。

### 模块 5: 视觉反馈与样式

样式放在 `packages/react/src/styles.css`，保证默认主题无需宿主额外 CSS 即可使用。

**涉及层及关键设计:**

- 新增 drop target hover、dwell progress、flash 完成态、sort insertion line、invalid target 等类名。
- flash 动画控制在约 260ms 到 400ms，避免长动画干扰拖拽。
- 排序预览线使用文本或图标辅助的 `aria-label`，不要只靠颜色表达。
- hover 控件在缩放节点上仍保持可点击，避免被节点 `transform: scale()` 影响到过小。

## 接口契约

### `MindMapEditorProps`

可新增可选配置，默认值满足本需求，不要求 playground 显式传入。

```typescript
export interface DragInteractionConfig {
  enabled?: boolean;
  reparentDwellMs?: number;
  sortZoneRatio?: number;
  flashDurationMs?: number;
  autoLayoutOnDrop?: boolean;
  showAddChildControl?: boolean;
  showCollapseControl?: boolean;
}

export interface MindMapEditorProps {
  dragInteraction?: DragInteractionConfig;
}
```

### 内部 drop intent

```typescript
type DropIntent =
  | { type: "none" }
  | { type: "reparent"; targetId: NodeId; armed: boolean }
  | { type: "sort-before"; targetId: NodeId }
  | { type: "sort-after"; targetId: NodeId }
  | { type: "invalid"; targetId?: NodeId; reason: string };
```

## 数据模型

- 不新增持久化字段。
- 拖拽预览、hover、dwell、flash 和 insertion line 都是 React 层临时状态。
- 文档结构仍通过 `children`、`parentId` 和现有 core command 更新。
- 折叠状态继续写入 `MindMapNode.collapsed`。

## 安全考虑

- hover 控件标题、错误反馈和可访问文本按纯文本渲染。
- 拖拽 timer 必须在组件卸载、目标切换和拖拽取消时清理，避免悬挂 timer 修改过期状态。
- 不新增网络请求、动态代码执行或 HTML 注入路径。

## 技术决策

| 决策 | 选项 | 理由 |
| --- | --- | --- |
| 拖动跟手 | React Flow 临时节点状态 | 解决受控 nodes 缺少变化处理导致拖动不跟手的问题 |
| 拖动中写入 | 不写 `MindMapDocument` | 避免高频 `onChange`、history 膨胀和布局抖动 |
| 释放后位置 | 结构变更后自动布局 | 符合导图树形编辑预期，避免节点重叠和连线错乱 |
| 入子触发 | 中心区 2 秒 dwell + flash | 精确对应用户要求，降低误拖入子概率 |
| 排序触发 | 上下区 insertion preview | 用户能在释放前确认 before/after 结果 |
| 子节点入口 | 节点边缘 hover “➕” | 常用编辑路径可见，不依赖键盘快捷键 |
| 折叠入口 | 连线侧 hover toggle | 控件位置与树结构方向一致，减少视觉搜索成本 |
