# Node Drag Interaction Polish - 任务清单

## 任务版本

| 日期 | 版本 | 说明 |
| --- | --- | --- |
| 2026-06-18 | v1 | 根据节点拖拽与 hover 控件体验反馈新建任务 |
| 2026-06-19 | v2 | 根据截图反馈新增即时入子、排序提交、标题编辑后重排、多行标题、根节点完整展示和 hover 控件命中返工任务 |

## 项目信息

- 项目名: my-mind-node-workspace
- 产品名: my-mind-node
- 架构类型: monorepo
- specs 路径: `specs/7.node-drag-interaction-polish/`

## 任务列表

### 功能 1: 拖拽跟手与 drop intent

- [x] T-001: 复现 playground 节点拖动不跟手和释放后布局混乱问题，补充失败用例或记录最小复现场景 ~30min
- [x] T-002: 在 `MindMapEditor` 中接入 React Flow 节点变化与 drag session，让拖动过程使用临时预览状态跟随鼠标 ~1h
- [x] T-003: 实现拖动中不写文档、不写 history、不触发高频 `onChange` 的提交边界 ~30min
- [x] T-004: 实现 drop 目标命中计算，区分中心入子区、上方排序区、下方排序区和非法目标 ~1h
- [x] T-005: 实现中心区 2 秒 dwell timer、进度态、完成 flash 和切换目标时的清理逻辑 ~1h

### 功能 2: 释放提交与自动排版

- [x] T-006: 实现入子释放提交，复用 `node.moveMany` 并在成功后运行 `simpleTreeLayout` / `applyLayoutResult` ~1h
- [x] T-007: 实现上方/下方同级排序提交，正确计算移动后的 index 并保持多选顶层节点顺序 ~1h
- [x] T-008: 实现未命中和非法目标回滚，确保释放后不会留下重叠、错线或漂移节点，并通过 `onError` 返回可恢复错误 ~45min

### 功能 3: 节点 hover 控件

- [x] T-009: 在 `MindNode` 增加 hover “➕”按钮，点击创建子节点、选中新节点并重新排版 ~1h
- [x] T-010: 在 `MindNode` 增加连线侧展开/折叠按钮，点击后切换 `collapsed` 并重新排版 ~1h
- [x] T-011: 补齐 drop intent、排序插入线、flash、hover 控件的默认 CSS、可访问名称和只读模式隐藏逻辑 ~1h

### 集成与测试

- [x] T-012: 补充 React 组件测试，覆盖 add child、collapse toggle、drop intent 状态和非法目标处理 ~1h
- [x] T-013: 补充 Playwright E2E，覆盖 playground 拖拽跟手、2 秒入子、上下排序、添加子节点和折叠展开路径 ~1h
- [x] T-014: 运行 `pnpm typecheck`、`pnpm test`、`pnpm e2e`、`git diff --check` 并修复发现的问题 ~1h

### 功能 4: 即时拖放与排序返工

- [ ] T-015: 返工 T-005 的中心区入子逻辑，移除 2 秒等待门槛，改为拖到目标节点中心区域后 mouseup 立即提交 `node.moveMany` ~45min
- [ ] T-016: 修复目标节点上方/下方排序释放后还原的问题，确保同级 `children` 顺序、React Flow 节点状态和 `onChange` JSON 一致更新 ~45min

### 功能 5: 标题编辑、换行与布局稳定

- [ ] T-017: 在节点标题编辑提交后重新测量节点尺寸并调度一次自动布局，覆盖长标题导致节点重叠或连线穿过标题的问题 ~1h
- [ ] T-018: 支持节点标题换行输入、保存和展示，保留 `MindMapNode.title` 中的 `\n`，并让节点容器随多行内容自动增高 ~1h
- [ ] T-019: 修复根节点长标题或 100 节点 fixture 下展示不全的问题，调整根节点尺寸、bounds 计算和 `fitView` padding ~45min

### 功能 6: Hover 控件命中

- [ ] T-020: 修复节点左右侧/连线侧 hover 按钮必须先选中节点才能点击的问题，补齐 hover/focus 可见性、`pointer-events`、`z-index`、`nodrag` / `nopan` 处理 ~45min

### v2 集成与测试

- [ ] T-021: 补充 React 组件测试，覆盖即时入子、同级排序提交、标题换行渲染、编辑后布局调度和 hover 控件点击回调 ~1h
- [ ] T-022: 补充 Playwright E2E，覆盖截图反馈场景：拖到中心释放即入子、拖到上/下释放排序、编辑长标题后不乱排、多行标题、根节点完整展示、hover 直接点按钮 ~1h
- [ ] T-023: 运行 `pnpm typecheck`、`pnpm test`、`pnpm e2e`、`git diff --check` 并修复 v2 返工发现的问题 ~1h

## 依赖关系

- T-002 依赖 T-001
- T-004 依赖 T-002、T-003
- T-005 依赖 T-004
- T-006、T-007、T-008 依赖 T-004、T-005
- T-009、T-010 依赖 T-006 的布局提交路径
- T-011 依赖 T-005、T-009、T-010
- T-012、T-013 依赖 T-006 到 T-011
- T-014 依赖 T-012、T-013
- T-015 依赖 T-004、T-005，并替换 T-005 的 2 秒 dwell 作为提交门槛
- T-016 依赖 T-007、T-008
- T-017 依赖 T-006 的布局提交路径和现有 layout scheduler
- T-018 依赖 T-017 的尺寸测量与布局调度
- T-019 依赖 T-017、T-018
- T-020 依赖 T-009、T-010、T-011
- T-021、T-022 依赖 T-015 到 T-020
- T-023 依赖 T-021、T-022

## 风险点

- React Flow 受控 nodes 如果只从 `MindMapDocument` 生成而不处理 `onNodesChange`，会继续出现拖动不跟手。
- 自动布局可能覆盖既有“拖到空白区域保留位置”的能力；本规格默认树结构拖拽优先，如需保留自由摆放，应通过配置显式区分。
- v1 的 2 秒 dwell timer 已被 v2 替换，返工时必须删除或停用遗留 timer，避免拖拽取消或组件卸载后仍修改状态。
- hover 控件和标题输入框都在节点内部，定位不当会导致无法编辑标题或误触按钮。
- 原 v1 的 2 秒等待 E2E 需要改为即时释放断言，并继续使用稳定选择器、可观测状态和合理超时。
- v2 移除入子等待后误拖入子的风险上升，需要依赖中心区命中、明确 hover 高亮和非法结构校验降低误操作。
- 标题换行会改变节点高度，布局如果仍使用固定尺寸会继续出现根节点裁切、节点重叠或连线穿字。
- hover 按钮若没有 `nodrag` / `nopan` 或 pointer event 修正，点击可能被 React Flow 节点拖拽、画布平移或选择逻辑拦截。
