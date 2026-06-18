# M4 Public Beta - 需求规格

## 概述

完成 Public Beta 发布准备：文档站点、API reference、示例项目、GitHub Pages 在线示例、性能基准、浏览器兼容性、可访问性、bundle 预算、公开 API 迁移说明和 Changesets beta 发布。

## 项目信息

- 项目名: my-mind
- 架构类型: monorepo
- 需求来源: `docs/prd-mind-map.md` M4

## 需求版本

| 日期 | 版本 | 说明 |
| --- | --- | --- |
| 2026-06-18 | v1 | 从 PRD v0.12 拆分 M4 Public Beta |

## 用户故事

- 作为外部开发者，我想要清晰文档和可复制示例，以便 10 分钟内完成最小集成。
- 作为维护者，我想要 API 稳定性说明、性能基准和 bundle 预算，以便 beta 发布后可控演进。
- 作为产品团队，我想要公开在线示例，以便收集真实用户试用反馈。

## 功能需求

1. [F-001] 完成文档站点，覆盖快速开始、核心概念、React 集成、只读模式、自定义节点、导入导出、主题和 FAQ。
2. [F-002] 完成 API reference，标记 stable/experimental，并说明迁移策略。
3. [F-003] 完成 GitHub Pages 在线示例页面，可公开访问并支持左侧数据编辑、右侧实时预览、编辑/预览切换。
4. [F-004] 完成性能基准，覆盖 100/500/1000 节点渲染、搜索、拖拽、导出。
5. [F-005] 完成浏览器兼容性测试，覆盖 Chrome、Edge、Safari、Firefox 最新两个大版本。
6. [F-006] 完成可访问性检查，默认主题主要文本对比度满足 WCAG AA，颜色不是状态唯一表达。
7. [F-007] 完成 bundle 预算检查，core gzip < 80KB，react gzip < 160KB，库自有 react 代码 < 60KB。
8. [F-008] 完成公开 API 迁移说明和 breaking-change 规则。
9. [F-009] 使用 Changesets 准备 beta 版本发布。
10. [F-010] 完成 Public Beta 验收报告。

## 非功能需求

- 文档: 开发者 2 分钟内理解项目定位，10 分钟内完成最小集成。
- 性能: 1000 节点仍可浏览、搜索、折叠和缩放。
- 可访问性: WCAG AA 重点路径通过检查。
- 安全: 文档和示例不得包含真实密钥、token、后端地址或用户隐私数据。

## 验收标准

- [ ] [AC-001] 文档站点和在线示例页面可静态构建并部署到 GitHub Pages。
- [ ] [AC-002] README、API reference、示例项目和迁移说明一致。
- [ ] [AC-003] 100/500/1000 节点性能基准有记录并满足 PRD 指标或有明确风险说明。
- [ ] [AC-004] Chrome、Edge、Safari、Firefox 兼容性测试通过。
- [ ] [AC-005] 可访问性和 bundle 预算检查通过。
- [ ] [AC-006] Changesets beta 发布流程可执行，且 release notes 覆盖主要能力和限制。

## 依赖

- M3 Import/Export Beta
- VitePress 或 Storybook
- Playwright
- bundle analyzer
- Changesets

## 开放问题

- 是否需要中文文档作为首发文档，PRD 推荐英文 API 文档和示例优先，中文指南可同步补充。
- `themes`、`plugins`、`devtools` 是否作为独立 npm 包发布需 Beta 前确认。
