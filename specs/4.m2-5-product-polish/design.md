# M2.5 Product Polish - 技术设计

## 设计版本

| 日期 | 版本 | 说明 |
| --- | --- | --- |
| 2026-06-18 | v1 | 从 PRD v0.12 M2.5 生成 |

## 项目架构

- 架构类型: monorepo
- 涉及层: `packages/core` 命令与选择模型、`packages/react` 组件、`apps/example`、E2E

## 功能模块设计

### 模块 1: OutlineEditor

大纲视图直接读写 `MindMapDocument`，与画布共享 core 命令。

**涉及层及关键设计:**

- 标题编辑使用 `node.update`。
- Tab/Shift+Tab 使用 `node.move` 或 `node.moveMany` 改变层级。
- 拖拽排序生成结构移动命令。
- 大纲折叠状态写入节点 `collapsed`。

### 模块 2: 搜索与定位

搜索在 core 层提供纯函数，React 层负责 UI、定位和高亮。

**涉及层及关键设计:**

- 搜索字段包括 title、note、tags。
- 结果包含 nodeId、match field、snippet。
- 点击结果触发 view focus，并在画布/大纲中高亮。

### 模块 3: 检查器与节点详情

默认检查器提供备注、链接、标签、任务和样式编辑。宿主可隐藏或替换。

**涉及层及关键设计:**

- 检查器只通过 core command 更新文档。
- URL 字段不自动打开，点击跳转交给 `onOpenLink`。
- 标签颜色和任务状态必须有文本或图标辅助表达。

### 模块 4: 多选与成组拖动

React Flow selection 可复用，但对外始终转换为 `SelectionState`、`node.translate`、`node.moveMany`。

**涉及层及关键设计:**

- Shift/Ctrl/Cmd 点击追加或取消选择。
- Shift+空白拖拽框选，避免和空白平移冲突。
- 拖到空白区域生成一次 `node.translate`。
- 拖到目标节点生成 `node.moveMany`，只移动选择集顶层节点。
- 只读模式允许选择联动，不允许修改。

### 模块 5: 状态与移动端 polish

提供可读反馈与移动端基础路径，不把错误只留在 console。

**涉及层及关键设计:**

- 空状态引导创建根节点或导入数据。
- 解析错误和导出失败展示结构化错误摘要。
- 移动端使用标签/分段控件切换编辑和预览区域。

## 接口契约

- `OutlineEditorProps`
- `InspectorConfig`
- `SelectionConfig`
- `SearchResult`
- `node.moveMany`
- `node.translate`
- `selection.set`
- `selection.toggleNode`

## 数据模型

- 大纲、画布和检查器共享同一 `MindMapDocument`。
- 多选状态单独存在于 view state，并通过 `onSelectionChange` 通知宿主。
- 批量操作生成 operation batch。

## 安全考虑

- 链接编辑只保存 URL，不自动跳转。
- 搜索 snippet 按文本渲染，避免 HTML 注入。
- 导入或解析错误不输出敏感完整输入到日志。

## 技术决策

| 决策 | 选项 | 理由 |
| --- | --- | --- |
| 大纲编辑 | 复用 core command | 保证导图与大纲双向同步、undo/redo 一致 |
| 框选触发 | Shift+空白拖拽 | 避免和默认空白平移冲突 |
| 多选拖放 | 顶层节点去重 | 避免父子同时选中导致重复移动 |
| 移动端范围 | 基础浏览和编辑 | PRD 将复杂移动拖拽放在 Beta 以后可确认范围 |
