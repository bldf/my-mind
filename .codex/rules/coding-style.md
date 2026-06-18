---
description: Style rules for Markdown prompts, skills, agents, YAML metadata, and helper scripts.
---

# Coding Style

本仓库主要维护 AI 工作流资产，不是应用源码仓库。新增或修改内容时优先保持现有 Markdown、YAML front matter、skill 目录和 slash command 结构一致。

## Markdown 与提示词

- 主要叙述使用中文；工具名、命令、路径、文件名、变量名和 API 名称使用英文原文并放入反引号。
- Prompt 与 workflow 节点保持短句、命令式、可执行。避免写泛泛原则，优先写触发条件、输入、步骤、输出格式和暂停条件。
- 章节使用 `#` / `##` / `###` 层级；流程节点沿用 `N1` 到 `N8` 命名；任务和验收项沿用 `T-001`、`AC-001` 这类稳定编号。
- 代码块必须标注语言或格式，例如 `text`、`bash`、`markdown`、`typescript`、`yaml`。
- 修改 `.codex/prompts/my-ai-nodes/` 时，同步检查 `.claude/commands/my-ai-nodes/` 是否需要保持语义一致。

## Front Matter

- `.codex/skills/*/SKILL.md` 使用 `name` 和 `description`；描述要说明何时使用该 skill。
- `.codex/prompts/*.md` 使用 `description` 和 `argument-hint`；入口 prompt 要给出输入示例。
- `.codex/agents/*.md` 使用 `name`、`description`、`tools`、`model`；agent 正文只补充上下文纪律和回报格式，具体执行规则交给对应 skill。
- `.codex/skills/*/agents/openai.yaml` 保持现有 `interface.display_name`、`short_description`、`default_prompt` 结构。

## 脚本

- JavaScript 脚本沿用 ESM、显式 import、常量大写配置、函数名表达动作的风格。
- Bash 脚本沿用 `set -euo pipefail`，对用户输入做校验，避免把未转义输入拼进可执行代码。
- 只有在 skill 需要可复用自动化时才新增脚本；单次说明优先写在 Markdown 中。

