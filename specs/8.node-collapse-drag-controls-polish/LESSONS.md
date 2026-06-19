# LESSONS.md - Node Collapse Drag Controls Polish

## 2026-06-19 - Node Collapse Drag Controls Polish / T-004~T-007

- React Flow 的 `onNodeDrag` 回调里读取 moving node DOM rect 容易受内部 position flush 时序影响；drop geometry 更稳定的做法是用当前指针点和已测得节点尺寸合成 moving rect，再用有效重合判入子、目标外侧排序带判 before/after。
- 自动 `fitView` 不能继续绑定 `document.revision`；拖拽、折叠展开和缩放都会更新 revision，必须把自动 fit 限定到初始化和 view root 变化，否则用户当前 zoom/pan 会在交互后跳回全局视图。
- Playwright 排序坐标必须让 moving node 完全位于目标节点外侧空隙；拖在目标内部上/下边缘会和“有效重合入子”的新语义冲突。连续测试 before/after 时需要使用 fresh page 或显式用户 `fitView`，因为 drop 后不自动 fit 是本 feature 的预期行为。
