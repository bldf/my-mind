# Lessons

## 2026-06-19 - Node Drag Interaction Polish / Playground E2E 源码验证

- `apps/playground` 在 E2E 中需要通过 Vite alias 指向 workspace 源码，否则会加载 `packages/*/dist` 的旧构建，导致交互测试无法覆盖当前实现。
- React Flow 拖拽预览不能只依赖 `dropIntent` state 变化来回滚；空白释放时 empty intent 可能保持同一对象，需要在 drop 未提交时显式把 `flowNodes` 复位到文档布局。
- 100 节点 fixture 下 `fitView` 会让节点屏幕高度很小，Playwright 排序落点应使用目标高度比例，不要用固定像素下限判断上/下区域。
