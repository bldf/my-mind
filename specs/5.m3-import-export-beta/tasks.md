# M3 Import/Export Beta - 任务清单

## 任务版本

| 日期 | 版本 | 说明 |
| --- | --- | --- |
| 2026-06-18 | v1 | 从 PRD v0.12 M3 生成 |

## 项目信息

- 项目名: my-mind-node
- 架构类型: monorepo
- specs 路径: `specs/5.m3-import-export-beta/`

## 任务列表

### 功能 1: 包与文本导入导出

- [ ] T-001: 创建 `@my-mind-node/importers` 和 `@my-mind-node/exporters` 包，配置 ESM only、types、tests 和 exports ~1h
- [ ] T-002: 实现 Markdown 导入，覆盖标题、列表、缩进和异常输入测试 ~1h
- [ ] T-003: 实现 OPML 导入，覆盖层级、文本和安全 XML 解析 ~1h
- [ ] T-004: 实现 Markdown、OPML、缩进文本、JSON 导出和往返测试 ~1h

### 功能 2: PNG/SVG 与 React 集成

- [ ] T-005: 实现 `ExportOptions`、导出错误码和统一 `exportMindMap` 接口 ~45min
- [ ] T-006: 实现 PNG 导出当前视图/完整导图、像素倍率和背景色选项 ~1h
- [ ] T-007: 实现 SVG 导出、主题样式内联和浏览器 E2E 验证 ~1h
- [ ] T-008: 在 React 工具栏中接入可选导出入口，确保 importers/exporters 不进入默认 bundle ~1h

### 功能 3: 示例与验证

- [ ] T-009: 补齐 Next.js 示例，验证 SSR import 安全 ~1h
- [ ] T-010: 补齐 readonly 和 custom-node 示例 ~1h
- [ ] T-011: 完成 GitHub Pages 示例页面构建命令和部署说明 ~45min
- [ ] T-012: 补齐导入导出 E2E、bundle 检查、build/test/typecheck/lint 验证 ~1h

## 依赖关系

- T-002、T-003、T-004 依赖 T-001
- T-005 依赖 T-001
- T-006、T-007 依赖 T-005
- T-008 依赖 T-006、T-007
- T-009、T-010 依赖 M2 React Alpha
- T-011 依赖 T-009、T-010
- T-012 依赖 T-002 到 T-011

## 风险点

- Markdown/OPML 兼容范围容易无限膨胀；Beta 只覆盖 PRD 明确的结构化层级。
- PNG/SVG 导出依赖真实浏览器，必须用 E2E 验证而不能只靠单测。
- 导入导出包体积和依赖需要隔离，避免污染 core/react 默认路径。
