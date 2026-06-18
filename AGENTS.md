# my-mind

Codex/Claude automation workspace for My Mind Node PRD, local skills, prompts, and subagent instructions.

## 技术栈

- 语言: Markdown, YAML, Bash, JavaScript ESM
- 框架: Codex skills/prompts, Claude slash commands, subagent specs
- 包管理: 无（当前没有 package.json、lockfile 或依赖安装步骤）

## 常用命令

- 安装依赖: 未配置（当前仓库无依赖清单）
- 开发运行: 未配置（文档/提示词仓库，无本地服务）
- 构建: 未配置（无构建产物）
- 测试: `git diff --check`
- Lint: `git diff --check`

## 目录结构

```text
.
├── docs/                     # My Mind Node 产品/需求文档
├── .codex/
│   ├── agents/               # Codex subagent 定义
│   ├── prompts/              # Codex slash prompts 与 my-ai 节点
│   ├── rules/                # Codex 项目规则
│   └── skills/               # 本地 Codex skills 与辅助脚本
└── .claude/
    └── commands/             # Claude slash commands 与 my-ai 节点
```

## 项目规则

Codex 执行任务前应读取：

- `.codex/rules/coding-style.md`
- `.codex/rules/testing.md`
- `.codex/rules/security.md`
- `.codex/rules/git-workflow.md`

