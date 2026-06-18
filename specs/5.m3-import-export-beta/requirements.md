# M3 Import/Export Beta - 需求规格

## 概述

完成 Public Beta 前的导入导出能力：Markdown、OPML、缩进文本、JSON 导入；PNG、SVG、Markdown、OPML、缩进文本、JSON 导出；并补齐 Next.js、只读模式、自定义节点和 GitHub Pages 在线示例。

## 项目信息

- 项目名: my-mind-node
- 架构类型: monorepo
- 需求来源: `docs/prd-mind-map.md` M3

## 需求版本

| 日期 | 版本 | 说明 |
| --- | --- | --- |
| 2026-06-18 | v1 | 从 PRD v0.12 拆分 M3 Import/Export Beta |

## 用户故事

- 作为宿主应用，我想要导入 Markdown、OPML、缩进文本和 JSON，以便把已有资料转成导图。
- 作为用户，我想要导出 PNG、SVG、Markdown、OPML、缩进文本和 JSON，以便分享、备份或迁移数据。
- 作为开发者，我想要多种示例项目，以便确认库能在 Vite、Next.js、只读和自定义节点场景下运行。

## 功能需求

1. [F-001] 创建 `@my-mind-node/importers` 和 `@my-mind-node/exporters` 可选包，避免导入导出依赖进入核心路径。
2. [F-002] 支持 Markdown 导入，根据标题、缩进和列表解析节点层级。
3. [F-003] 支持 OPML 导入，保留层级和文本。
4. [F-004] 支持 JSON 和缩进文本导入，并复用 M1 校验。
5. [F-005] 支持 Markdown、OPML、缩进文本和 JSON 导出，保留层级、任务、链接和备注等可表达元信息。
6. [F-006] 支持 PNG 导出，可导出当前视图或完整导图，支持像素倍率和背景色配置。
7. [F-007] 支持 SVG 导出，保持矢量可缩放并保留主题样式。
8. [F-008] 所有导入失败和导出失败返回结构化错误。
9. [F-009] 补齐 Next.js 示例、只读模式示例、自定义节点示例。
10. [F-010] 完成 GitHub Pages 在线示例页面构建和部署命令。
11. [F-011] 浏览器 E2E 覆盖导入导出真实路径。

## 非功能需求

- 安全: 导入内容按不可信输入处理，Markdown/OPML 不得导致 XSS。
- 性能: 1000 节点以内导入导出应可用；导出大图时避免长时间冻结 UI。
- 包体积: 可选导入导出包不应被 core/react 默认引入。
- 兼容性: PNG/SVG 导出仅在客户端环境执行，SSR import 安全。

## 验收标准

- [ ] [AC-001] Markdown、OPML、缩进文本、JSON 可导入并生成合法 `MindMapDocument`。
- [ ] [AC-002] Markdown、OPML、缩进文本、JSON 导出结果可再次导入为等价层级。
- [ ] [AC-003] PNG/SVG 在真实浏览器中导出成功，导出失败返回结构化错误。
- [ ] [AC-004] core/react 不默认打入 importers/exporters 的重依赖。
- [ ] [AC-005] Next.js、readonly、custom-node 和 GitHub Pages 示例可构建。

## 依赖

- M2.5 Product Polish
- 浏览器 Canvas API
- DOM serialization
- Markdown parser 或轻量自研解析器
- OPML XML parser/serializer
- Playwright

## 开放问题

- Public Beta 是否必须包含 Markdown、OPML、PNG、SVG 全量导入导出，PRD 推荐包含；如进度受限需产品确认裁剪。
- FreeMind/XMind/PDF 不进入首发范围。
