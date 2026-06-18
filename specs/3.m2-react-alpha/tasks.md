# M2 React Alpha - 任务清单

## 任务版本

| 日期 | 版本 | 说明 |
| --- | --- | --- |
| 2026-06-18 | v1 | 从 PRD v0.12 M2 生成 |

## 项目信息

- 项目名: my-mind-node
- 架构类型: monorepo
- specs 路径: `specs/3.m2-react-alpha/`

## 任务列表

### 功能 1: 组件 API

- [x] T-001: 扩展 `MindMapEditorProps` 与 `MindMapViewerProps`，对齐 PRD M2 组件 API 和 TSDoc ~1h
- [x] T-002: 实现 `MindMapViewer` 只读渲染，复用 Editor 的 viewport、主题、面包屑和选择能力 ~1h
- [x] T-003: 完善受控/非受控文档状态流，确保所有编辑通过 `onChange` 和 core command 产生 operation ~1h

### 功能 2: 工具栏、主题与节点缩放

- [x] T-004: 实现顶部右上角工具栏配置、图标按钮、可访问名称和 tooltip ~1h
- [x] T-005: 实现主题 token、内置主题、`ThemePanelConfig` 和右侧主题侧边栏 ~1h
- [x] T-006: 实现 `theme.set` 命令、`onThemeChange` 和 Editor/Viewer 主题状态差异 ~1h
- [x] T-007: 实现 `NodeSizingConfig`、节点快捷工具条、放大/缩小/恢复默认大小按钮 ~1h
- [x] T-008: 实现 `node.resize` 与 undo/redo 集成，覆盖多选缩放和上下限错误 ~1h

### 功能 3: 视图、快捷键与示例

- [x] T-009: 完善全屏、`+`/`-` 缩放、Ctrl+滚轮、fit view 和空白平移交互 ~1h
- [x] T-010: 实现进入节点视图、面包屑回退、`onViewRootChange` 和右键菜单配置 ~1h
- [x] T-011: 实现默认快捷键映射和只读模式禁用编辑命令 ~1h
- [x] T-012: 搭建 Vite 最小示例页面，包含左侧 JSON 编辑区、右侧导图预览区和解析错误提示 ~1h

### 集成与测试

- [x] T-013: 补齐 React 组件测试、浏览器 E2E、build/test/typecheck/lint 验证和 10 分钟集成说明 ~1h

## 依赖关系

- T-002、T-003 依赖 T-001
- T-004 依赖 T-001
- T-005、T-006 依赖 T-004
- T-007、T-008 依赖 T-003
- T-009、T-010、T-011 依赖 T-003、T-004
- T-012 依赖 T-002、T-006、T-008、T-010
- T-013 依赖 T-012

## 风险点

- Viewer 与 Editor 共享太多实现时，容易让只读模式暴露编辑命令；必须用测试覆盖。
- 主题切换在受控/非受控模式语义不同，必须在 API 文档和测试中明确。
- 节点缩放和画布缩放 UI 必须视觉上区分，避免用户误解。
