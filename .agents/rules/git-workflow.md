---
description: Git workflow rules inferred from this repository history and file layout.
---

# Git Workflow

当前提交历史使用 Conventional Commits 风格，例如 `feat(my-ai): ...`、`chore(codex): ...`、`feat(cli): ...`。继续沿用简短英文 type/scope，加中文或英文说明均可。

## Commit

- 推荐格式: `<type>(<scope>): <summary>`，例如 `feat(my-ai): add auto dev workflow` 或 `docs(rules): 初始化 Codex 项目规则`。
- 常用 type: `feat`、`fix`、`docs`、`chore`、`refactor`。
- scope 优先对应目录或工作流：`my-ai`、`codex`、`claude`、`skills`、`docs`。
- 一个 commit 聚焦一个语义变更。不要把 PRD 改写、skill 行为改动和脚本重构混在一起。

## 变更边界

- 修改 `.codex/prompts/` 时检查 `.claude/commands/` 是否有镜像命令需要同步。
- 修改 `.codex/agents/` 时检查对应 `.codex/skills/` 是否仍是唯一行为准则来源。
- 修改 `docs/prd-mind-map.md` 时不要顺手改 workflow 文件，除非任务明确要求同步产品需求到执行流程。
- 不要清理或删除既有跟踪文件（例如日志、系统元数据或旧 skill）作为附带操作；如需治理，单独提交并说明原因。

## 提交前检查

- 运行 `git status --short`，确认只包含本次任务相关文件。
- 运行 `git diff --check`。
- 对新增规则或入口文件，确认 `AGENTS.md` 引用存在，路径大小写正确。

