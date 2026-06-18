# Node Drag Interaction Polish - 任务清单

## 任务版本

| 日期 | 版本 | 说明 |
| --- | --- | --- |
| 2026-06-18 | v1 | 根据节点拖拽与 hover 控件体验反馈新建任务 |

## 项目信息

- 项目名: my-mind-node-workspace
- 产品名: my-mind-node
- 架构类型: monorepo
- specs 路径: `specs/7.node-drag-interaction-polish/`

## 任务列表

### 功能 1: 拖拽跟手与 drop intent

- [ ] T-001: 复现 playground 节点拖动不跟手和释放后布局混乱问题，补充失败用例或记录最小复现场景 ~30min
- [ ] T-002: 在 `MindMapEditor` 中接入 React Flow 节点变化与 drag session，让拖动过程使用临时预览状态跟随鼠标 ~1h
- [ ] T-003: 实现拖动中不写文档、不写 history、不触发高频 `onChange` 的提交边界 ~30min
- [ ] T-004: 实现 drop 目标命中计算，区分中心入子区、上方排序区、下方排序区和非法目标 ~1h
- [ ] T-005: 实现中心区 2 秒 dwell timer、进度态、完成 flash 和切换目标时的清理逻辑 ~1h

### 功能 2: 释放提交与自动排版

- [ ] T-006: 实现入子释放提交，复用 `node.moveMany` 并在成功后运行 `simpleTreeLayout` / `applyLayoutResult` ~1h
- [ ] T-007: 实现上方/下方同级排序提交，正确计算移动后的 index 并保持多选顶层节点顺序 ~1h
- [ ] T-008: 实现未命中和非法目标回滚，确保释放后不会留下重叠、错线或漂移节点，并通过 `onError` 返回可恢复错误 ~45min

### 功能 3: 节点 hover 控件

- [ ] T-009: 在 `MindNode` 增加 hover “➕”按钮，点击创建子节点、选中新节点并重新排版 ~1h
- [ ] T-010: 在 `MindNode` 增加连线侧展开/折叠按钮，点击后切换 `collapsed` 并重新排版 ~1h
- [ ] T-011: 补齐 drop intent、排序插入线、flash、hover 控件的默认 CSS、可访问名称和只读模式隐藏逻辑 ~1h

### 集成与测试

- [ ] T-012: 补充 React 组件测试，覆盖 add child、collapse toggle、drop intent 状态和非法目标处理 ~1h
- [ ] T-013: 补充 Playwright E2E，覆盖 playground 拖拽跟手、2 秒入子、上下排序、添加子节点和折叠展开路径 ~1h
- [ ] T-014: 运行 `pnpm typecheck`、`pnpm test`、`pnpm e2e`、`git diff --check` 并修复发现的问题 ~1h

## 依赖关系

- T-002 依赖 T-001
- T-004 依赖 T-002、T-003
- T-005 依赖 T-004
- T-006、T-007、T-008 依赖 T-004、T-005
- T-009、T-010 依赖 T-006 的布局提交路径
- T-011 依赖 T-005、T-009、T-010
- T-012、T-013 依赖 T-006 到 T-011
- T-014 依赖 T-012、T-013

## 风险点

- React Flow 受控 nodes 如果只从 `MindMapDocument` 生成而不处理 `onNodesChange`，会继续出现拖动不跟手。
- 自动布局可能覆盖既有“拖到空白区域保留位置”的能力；本规格默认树结构拖拽优先，如需保留自由摆放，应通过配置显式区分。
- 2 秒 dwell timer 容易在拖拽取消或组件卸载后残留，必须统一清理。
- hover 控件和标题输入框都在节点内部，定位不当会导致无法编辑标题或误触按钮。
- E2E 拖拽和 2 秒等待容易 flaky，需要使用稳定选择器、可观测状态和合理超时。
