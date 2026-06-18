# M4 Public Beta - 任务清单

## 任务版本

| 日期 | 版本 | 说明 |
| --- | --- | --- |
| 2026-06-18 | v1 | 从 PRD v0.12 M4 生成 |

## 项目信息

- 项目名: my-mind-node
- 架构类型: monorepo
- specs 路径: `specs/6.m4-public-beta/`

## 任务列表

### 功能 1: 文档与示例

- [x] T-001: 初始化文档站点，完成快速开始、核心概念、React 集成和隐私边界页面 ~1h
- [x] T-002: 编写只读模式、自定义节点、主题、导入导出、错误处理和 SSR 指南 ~1h
- [x] T-003: 生成 API reference，标记 stable/experimental 并对齐 package exports ~1h
- [x] T-004: 完成 GitHub Pages 在线示例页面和静态部署配置 ~1h

### 功能 2: 发布门槛验证

- [x] T-005: 建立 100/500/1000 节点性能基准，覆盖渲染、搜索、拖拽和导出 ~1h
- [x] T-006: 建立浏览器兼容性 E2E 矩阵，覆盖 Chrome、Edge、Safari、Firefox ~1h
- [x] T-007: 建立可访问性检查和键盘路径走查，记录 WCAG AA 与状态表达结果 ~1h
- [x] T-008: 建立 bundle 预算检查，验证 core/react/importers/exporters 体积和默认依赖边界 ~1h

### 功能 3: Beta 发布准备

- [x] T-009: 编写公开 API 迁移说明、breaking-change 规则和 Beta 限制说明 ~1h
- [x] T-010: 使用 Changesets 准备 beta release notes 和 package metadata 检查 ~45min
- [x] T-011: 完成 README、文档站点、示例、API reference、CHANGELOG 一致性检查 ~45min
- [x] T-012: 运行完整 build/test/typecheck/lint/e2e/bench，输出 Public Beta 验收报告 ~1h

## 依赖关系

- T-002 依赖 T-001
- T-003 依赖 M3 API 稳定面
- T-004 依赖 M3 示例页面
- T-005 依赖 fixtures 和核心功能完整
- T-006 依赖 T-004
- T-007 依赖 T-004
- T-008 依赖 M3 包结构
- T-009 依赖 T-003
- T-010 依赖 T-009
- T-011 依赖 T-001 到 T-010
- T-012 依赖 T-011

## 风险点

- 性能或 bundle 预算可能不达标；需要在报告中区分 beta blocker 和可接受风险。
- API reference 与实际 exports 容易漂移，发布前必须自动或半自动核对。
- GitHub Pages 示例必须确认不会上传用户数据或依赖后端服务。
