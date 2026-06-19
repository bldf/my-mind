# Lessons Learned

## 2026-06-19 - 9.canvas-drag-resize-polish / Canvas Drag & Resize Polish

### 1. React Flow 节点引用与元数据稳定性
在 React Flow 中，节点数组（`nodes`）内部维护了大量的运行时布局与状态属性（例如 `measured`、`width`、`height`、`dragging`、`resizing` 等）。如果在每次拖拽或位置同步时都生成全新的节点对象引用，会导致 React Flow 丢失这些运行时元数据。这不仅会引起严重的画布/连接线重新渲染闪烁，还会由于状态丢失而导致拖拽时的落点指示标签（Drop Label）被瞬间隐藏。
**架构决策/解决办法**：在 `mergeFlowNodeData` 中进行浅对比，如果仅有拖拽位置发生变化，则保留原始的 React Flow 节点对象引用，仅更新必要属性，从而保证 React Flow 渲染的高度平滑与状态稳定。

### 2. JSDOM 环境下 PointerEvent 的缺失与模拟
在以 JSDOM 为测试环境的单元测试（如 Vitest + Testing Library）中，全局 `window.PointerEvent` 默认未定义。在重构 `MindNode` 引入原生指针事件监听（`pointerdown` / `pointermove` / `pointerup`）后，测试用例在触发组件指针操作时会因为找不到 `PointerEvent` 而崩溃。
**架构决策/解决办法**：在单元测试环境中增加防御性 mock：
```typescript
if (typeof window.PointerEvent === 'undefined') {
  window.PointerEvent = class PointerEvent extends MouseEvent {} as any;
}
```
这样可以确保测试能够平稳派发各类鼠标/指针交互事件。
