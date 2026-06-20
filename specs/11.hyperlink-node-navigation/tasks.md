# Hyperlink Node Navigation - 任务清单

## 任务版本

| 日期 | 版本 | 说明 |
| --- | --- | --- |
| 2026-06-20 | v1 | 初始任务清单 |

## 项目信息

- 项目名: my-mind-node-workspace
- 架构类型: monorepo
- specs 路径: specs/11.hyperlink-node-navigation/

## 任务列表

### 功能 1: 链接解析与打开策略

- [x] T-001: 新增 `packages/react/src/link-utils.ts`，实现 `getPrimaryNodeLink`、标题 URL 兜底、`isSafeExternalUrl` 和 `openSafeExternalUrl` 纯函数 ~30min
- [x] T-002: 为 link utils 增加单元测试，覆盖 `links[0]` 优先、标题 URL 兜底、空链接、不安全协议和安全协议 ~30min
- [x] T-003: 在 `MindMapEditor.tsx` 中实现统一 `openNodeLink` callback，优先调用 `props.onOpenLink`，否则执行默认安全打开，并通过 `onError` 报告失败 ~30min

### 功能 2: 画布节点点击跳转

- [x] T-004: 扩展 `document-to-flow.ts` 的 `FlowConversionOptions` 和 node data，向 `MindNode` 透传 `link` 与 `onOpenLink` ~20min
- [x] T-005: 修改 `MindNode.tsx`，在只读链接节点标题区域渲染可点击链接按钮，阻止事件冒泡、拖拽和平移误触发，并保留非链接节点进入节点视图行为 ~45min
- [x] T-006: 补充 `.mmn-node--link`、`.mmn-node__title--link` 等样式，提供低干扰链接视觉提示并兼容 light/dark theme token ~20min
- [x] T-007: 调整 `InspectorPanel` 链接点击，使侧栏 links 与画布节点共用 `openNodeLink` 默认安全打开和错误反馈 ~15min

### 功能 3: 测试与示例验证

- [x] T-008: 更新 React 组件测试，覆盖链接节点点击调用 `onOpenLink`、阻止传播、键盘触发、非链接只读节点仍进入节点视图 ~45min
- [x] T-009: 更新或新增 `documentToFlow` 测试，确认 flow node data 包含派生链接且自定义 `renderNode` 不被强制包裹 ~20min
- [x] T-010: 新增 Playwright E2E，导入 Markdown link 后验证链接节点可点击，并使用 `onOpenLink` 或 `window.open` spy 避免真实访问外部站点 ~45min
- [x] T-011: 运行 `pnpm typecheck`、`pnpm test`、`pnpm e2e` 和 `git diff --check`，修复验证问题 ~30min

## 依赖关系

- T-002 依赖 T-001。
- T-003 依赖 T-001。
- T-004 依赖 T-001、T-003。
- T-005 依赖 T-004。
- T-006 依赖 T-005。
- T-007 依赖 T-003。
- T-008 依赖 T-005、T-007。
- T-009 依赖 T-004。
- T-010 依赖 T-005、T-007。
- T-011 依赖 T-008 到 T-010。

## 风险点

- 链接点击可能与 React Flow 的 node click selection、drag session、pane pan 冲突；必须在链接按钮上使用 `stopPropagation`、`preventDefault`、`nodrag`、`nopan`。
- 默认 `window.open` 使用 `noopener,noreferrer` 时真实浏览器可能返回 `null`，即使链接已成功交给浏览器打开；实现不能把该返回值当作失败信号，E2E 需要 spy 而不真实跳转。
- 标题 URL 兜底可能把普通文本误判为链接；只接受完整可解析且安全协议明确的标题，不做片段提取。
- 暗色/浅色主题样式最近刚收敛到 token，新增链接视觉提示要使用现有 token，避免重新引入浅色硬编码。
- `renderNode` 是宿主完全自定义入口，强行包裹可能破坏业务交互；本规格只透出链接数据和回调，不替换宿主内容。

## 预估总时间

- 约 5 小时 10 分钟。
