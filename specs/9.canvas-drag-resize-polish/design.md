# Canvas Drag & Resize Polish - 技术设计

## 设计版本

| 日期 | 版本 | 说明 |
| --- | --- | --- |
| 2026-06-19 | v1 | 初始技术设计 |

## 项目架构

- 架构类型: monorepo
- 涉及层: React Frontend Components (`packages/react`)

## 功能模块设计

### 模块 1: 消除拖拽闪烁 (Flicker elimination)

**原因分析:**
在 `MindMapEditor.tsx` 中，`dropIntent` 是一个本地 React state。当拖拽节点在画布上移动时，`onNodeDrag` 高频触发并更新 `dropIntent`，导致 `MindMapEditor` 重新渲染。
由于 `flowNodes` 和 `flowEdges` 是通过 `useEffect` 异步监听 `flowData` 改变并进行状态更新的：
1. `dropIntent` 改变 -> `MindMapEditor` 渲染（此时 `renderedNodes` 为旧的 `flowNodes`，而 React Flow 内部更新了高亮，导致短暂状态不一致/闪烁）。
2. 渲染后 `useEffect` 执行 -> 调用 `setFlowNodes` 和 `setFlowEdges` 触发第二次渲染。
这造成了双重渲染和单帧状态不匹配，引起视觉闪烁。

**解决方案:**
在 `MindMapEditor.tsx` 的渲染函数中，采用渲染期状态更新（Render-phase state update）模式直接同步 `flowNodes` 和 `flowEdges`，彻底取代现有的 `useEffect` 监听逻辑：
```typescript
const [prevFlowData, setPrevFlowData] = useState(flowData);
if (flowData !== prevFlowData) {
  setPrevFlowData(flowData);
  setFlowEdges(flowData.edges);
  setFlowNodes((currentNodes) =>
    mergeFlowNodeData(flowData, currentNodes, Boolean(dragSession.current)),
  );
}
```
这样，当 `flowData` 发生改变时，React 会在提交 DOM 之前重新运行渲染，使 DOM 更改合并在同一帧中，彻底消除闪烁。

---

### 模块 2: 1:1 跟随鼠标拖拽缩放与历史记录优化

**设计方案:**
1. **数据与逻辑分离**:
   - 拖动过程中：通过回调 `onResizeProgress(nodeId, scale)` 实时更新 `flowNodes` 中对应节点的 scale（直接修改 `node.style.scale`），从而让 React Flow 实时刷新视图，而不写入 document/history 撤销栈。
   - 拖动结束时：通过回调 `onResizeCommit(nodeId, scale)` 向 core 发送 `node.resize` 动作命令，更新文档状态并写入撤销历史中（产生且仅产生一次 undo/redo 记录）。
2. **1:1 缩放数学公式**:
   - 在 `MindNode.tsx` 中，当 `pointerdown` 发生于缩放手柄时：
     - 记录起始 scale：`startScale = node.style.scale ?? 1`
     - 记录起始鼠标到节点中心的距离：`startDistance = Math.hypot(clientX - centerX, clientY - centerY)`
   - 在 `pointermove` 过程中，实时计算：
     - 当前鼠标到中心距离：`currentDistance`
     - 目标 scale：`targetScale = startScale * (currentDistance / startDistance)`
     - 限制在配置的范围内：`clampedScale = Math.max(minScale, Math.min(maxScale, targetScale))`
     - 触发 `onResizeProgress(nodeId, clampedScale)`。
3. **点击微调支持**:
   - 若 `pointerup` 触发时没有检测到有效移动且没有触发过 `pointermove` 缩放，则默认增加或减少一个 `resizeStep`（根据点击的手柄位置判断或统一增加），然后提交 commit。

## 接口契约

在 `MindNodeData` 中新增两个回调：
- `onResizeProgress?: (nodeId: NodeId, scale: number) => void`
- `onResizeCommit?: (nodeId: NodeId, scale: number) => void`

在 `FlowConversionOptions` 中同步传递这两个接口。
