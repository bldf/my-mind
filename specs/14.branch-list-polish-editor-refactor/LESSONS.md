# Lessons Learned

## 2026-06-26 - 14.branch-list-polish-editor-refactor / Branch List UI Polish & Editor Refactor

### 1. 自定义 Hooks 间的循环依赖解耦
在从超大组件（MindMapEditor.tsx ~1900 行）提取自定义 hooks 时，`useViewportControl` 和 `useBranchListState` 之间存在循环依赖：前者需要后者返回的 `effectiveViewRootId`，后者需要前者返回的 `scheduleFitView` 等函数。
**解决办法**：重新设计接口使调用顺序线性化。移除 `useViewportControl` 对 `effectiveViewRootId` 的依赖（不再 fallback 到 effectiveViewRootId），移除 `pendingBranchViewportUpdateRef` 参数。最终 hooks 调用顺序为：`useViewportControl` → `useHistory` → `useBranchListState` → `useDragInteraction`，无循环依赖。

### 2. 共享 Refs 模式
多个 hooks 之间需要共享可变状态（如 `dragSessionRef`、`nodeResizeActiveRef`）。这些 refs 不能在某个 hook 内部创建后传给另一个 hook（会导致顺序耦合）。
**解决办法**：在父组件（MindMapEditor/EditorCanvas）中创建共享 refs，作为参数传递给需要它们的 hooks。这样 hooks 之间通过参数传递而非内部创建来共享状态，保持独立性。

### 3. createEmptyDocument 生成唯一 ID 与测试断言
`createEmptyDocument` 每次调用会通过 `createId` 生成不同的 `id` 和 `rootId`。因此在测试 `documentsEqual`（基于 `JSON.stringify` 比较）时，两次调用 `createEmptyDocument({ rootTitle: "Root" })` 产生的文档并不相等。
**解决办法**：测试中使用 `JSON.parse(JSON.stringify(doc1))` 深拷贝来创建"相同"的文档，而非分别调用 `createEmptyDocument`。

### 4. 重构后 Lint 清理的重要性
从大文件中提取纯函数和 hooks 后，原有的 import 语句中会残留大量未使用的导入（类型、函数、常量）。这些不会被 TypeScript 类型检查报错，但会被 ESLint 的 `no-unused-vars` 规则捕获。
**解决办法**：重构完成后必须运行 `pnpm lint`，逐个文件清理未使用的 import 和变量。特别注意类型导入（`type X`）和值导入（`X`）需要分别检查。
