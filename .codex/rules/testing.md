---
description: Verification rules for this documentation and Codex workflow repository.
---

# Testing

当前仓库已是 `my-mind-node` pnpm workspace，实现代码、文档站、示例和 Codex/Claude workflow 资产共存。验证重点是 TypeScript 包正确性、React 示例可构建、浏览器 E2E、Markdown/配置一致性，以及不要引入会破坏下游 Codex/Claude 读取的格式。

## 必跑检查

- 修改任何文件后运行 `git diff --check`，确认没有尾随空白、坏缩进或冲突标记。
- 修改 `packages/*`、`apps/playground` 或 shared TS 配置后运行 `pnpm typecheck`。
- 修改实现代码后运行 `pnpm test`。
- 修改构建、导出、文档站、示例或 package 配置后运行 `pnpm build`。
- 修改浏览器交互、playground 或 E2E 配置后运行 `pnpm e2e`。
- 修改 lint 配置或源码结构后运行 `pnpm lint`。
- 修改包体积敏感路径后运行 `pnpm bundle`。
- 新增或改名 `.codex/rules/*.md` 后，检查 `AGENTS.md` 的引用列表与实际文件一致。
- 修改 `.codex/prompts/my-ai-nodes/N*.md` 后，检查 `.codex/skills/my-ai-auto-dev/references/n*.md` 和 `.claude/commands/my-ai-nodes/N*.md` 是否需要同步。
- 修改 skill 入口时，确认 `.codex/skills/<skill>/SKILL.md` 的 front matter、标题、触发描述和引用文件路径都能从冷启动 agent 读懂。

## 人工验收

- 对 prompt、skill、agent 文档做一次从入口到输出的走读：输入是什么、必须读取哪些文件、何时暂停、最终输出什么。
- 对涉及自动编辑、审查、QA、数据库、合约或安全的规则，确认边界条件和升级给用户确认的条件写清楚。
- 对脚本改动，至少用无副作用命令或 dry-run 路径验证参数解析；涉及外部应用、日历、浏览器、网络或文件删除时不要在没有用户确认的情况下做真实破坏性操作。

## 当前验证矩阵

- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- `pnpm lint`
- `pnpm bundle`
- `pnpm e2e`
- `git diff --check`

## 不适用项

- 当前没有覆盖率门槛；如引入覆盖率阈值，需同步 package scripts 和 CI。
