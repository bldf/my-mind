# M2 React Alpha - 技术设计

## 设计版本

| 日期 | 版本 | 说明 |
| --- | --- | --- |
| 2026-06-18 | v1 | 从 PRD v0.12 M2 生成 |

## 项目架构

- 架构类型: monorepo
- 涉及层: `packages/react`、`packages/core`、`apps/example` 或 `apps/playground`、浏览器 E2E

## 功能模块设计

### 模块 1: React 组件 API

`MindMapEditor` 面向编辑，`MindMapViewer` 面向只读浏览。二者共享渲染、主题、视口、面包屑、选择和链接打开逻辑。

**涉及层及关键设计:**

- props 对齐 PRD §8.2：`value`、`defaultValue`、`readonly`、`height`、`theme`、`toolbar`、`themePanel`、`nodeSizing`、`selection`、`breadcrumbs`、`viewport`、`onChange`、`onThemeChange`、`onSelectionChange`、`onError`。
- 受控模式不直接修改外部文档；非受控模式内部保存文档并回调。
- Viewer 不执行修改文档的命令。

### 模块 2: 工具栏与主题侧边栏

顶部右上角工具栏默认启用。主题按钮打开右侧侧边栏，侧边栏展示内置主题和宿主传入主题。

**涉及层及关键设计:**

- `ViewToolbarControl` 支持 `theme`、`fullscreen`、`zoomOut`、`zoomIn`、`fitView`。
- `ThemePanelConfig` 默认 `placement: right`，支持 `themes`、`defaultOpen`、`showSystemMode`。
- 非受控 Editor 中主题写入 `MindMapDocument.theme`；受控模式触发 `onThemeChange`。
- Viewer 中主题切换只改变本地视图状态。

### 模块 3: 节点局部放大/缩小

节点缩放是节点样式编辑，不是 viewport zoom。命令落到 core `node.resize`。

**涉及层及关键设计:**

- 点击节点后展示轻量快捷工具条，优先使用图标按钮。
- `NodeSizingConfig` 控制 `minScale`、`maxScale`、`scaleStep`、`showQuickControls`。
- 多选状态下对全部选中节点应用同一步进。
- 达到边界时按钮置灰或返回 `NODE_SCALE_OUT_OF_RANGE`。

### 模块 4: 视图与快捷键

React Flow 负责 viewport，库封装稳定命令接口和可访问 UI。

**涉及层及关键设计:**

- Ctrl+滚轮缩放中心为鼠标位置对应的画布坐标。
- 全屏使用 Fullscreen API，失败调用 `onError`。
- 进入节点视图只更新 view root 和 breadcrumb。
- 快捷键分层：编辑类命令进入 core history；视图命令不进入文档 history。

### 模块 5: 示例页面

示例页面首屏就是可操作导图，桌面端左数据编辑、右导图预览，窄屏用标签或分段控件。

**涉及层及关键设计:**

- 示例默认加载可运行样例数据。
- JSON 编辑错误要展示可读提示。
- 示例用于 10 分钟集成路径和手动 QA。

## 接口契约

以 PRD §8.2、§8.3 为准，M2 重点落地：

- `MindMapEditorProps`
- `MindMapViewerProps`
- `ToolbarConfig`
- `ThemePanelConfig`
- `NodeSizingConfig`
- `ViewportConfig`
- `BreadcrumbConfig`
- `onThemeChange`
- `onSelectionChange`
- `onViewRootChange`
- `onError`

## 数据模型

- 主题切换写入 `MindMapDocument.theme` 或本地 view state。
- 节点缩放写入 `MindMapNode.style.scale`。
- 面包屑由 parent 链派生，不持久化。

## 安全考虑

- JSON 编辑区解析失败只展示错误摘要，不把原始危险内容渲染为 HTML。
- link 点击必须可由 `onOpenLink` 拦截。
- 组件默认不发起网络请求。

## 技术决策

| 决策 | 选项 | 理由 |
| --- | --- | --- |
| 主题入口 | 顶部右上角按钮 + 右侧侧边栏 | 精确对应 PRD 的用户交互路径 |
| 节点缩放模型 | `style.scale` | 区分节点局部尺寸和画布 zoom |
| Viewer 主题切换 | 本地状态 | 只读模式不得修改传入文档 |
| 示例首屏 | 可操作编辑器 | PRD 要求首屏是实际体验，不做营销页 |
