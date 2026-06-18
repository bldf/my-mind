---
description: Verification rules for this documentation and Codex workflow repository.
---

# Testing

当前仓库没有 `package.json`、测试框架、构建脚本或 CI 配置。验证重点是 Markdown/配置一致性、工作流引用完整性，以及不要引入会破坏下游 Codex/Claude 读取的格式。

## 必跑检查

- 修改任何文件后运行 `git diff --check`，确认没有尾随空白、坏缩进或冲突标记。
- 新增或改名 `.codex/rules/*.md` 后，检查 `AGENTS.md` 的引用列表与实际文件一致。
- 修改 `.codex/prompts/my-ai-nodes/N*.md` 后，检查 `.codex/skills/my-ai-auto-dev/references/n*.md` 和 `.claude/commands/my-ai-nodes/N*.md` 是否需要同步。
- 修改 skill 入口时，确认 `.codex/skills/<skill>/SKILL.md` 的 front matter、标题、触发描述和引用文件路径都能从冷启动 agent 读懂。

## 人工验收

- 对 prompt、skill、agent 文档做一次从入口到输出的走读：输入是什么、必须读取哪些文件、何时暂停、最终输出什么。
- 对涉及自动编辑、审查、QA、数据库、合约或安全的规则，确认边界条件和升级给用户确认的条件写清楚。
- 对脚本改动，至少用无副作用命令或 dry-run 路径验证参数解析；涉及外部应用、日历、浏览器、网络或文件删除时不要在没有用户确认的情况下做真实破坏性操作。

## 不适用项

- 当前没有单元测试、E2E 测试、覆盖率门槛或构建产物。
- 不要为了满足测试规则临时引入测试框架；只有仓库开始维护可执行包时，再补充 package 配置和对应测试规则。

