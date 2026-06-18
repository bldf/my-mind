# my-mind

Codex/Claude automation workspace and implementation monorepo for My Mind Node.

## 技术栈

- 语言: TypeScript, React TSX, JavaScript ESM, Markdown, YAML, Bash
- 框架: pnpm workspaces, React, React Flow, Vite, VitePress, Vitest, Playwright, tsup, Codex skills/prompts, Claude slash commands
- 包管理: pnpm `9.15.0`

## 常用命令

- 安装依赖: `pnpm install`
- 开发运行: `pnpm --filter @my-mind-node/playground dev`
- 构建: `pnpm build`
- 测试: `pnpm test`
- Typecheck: `pnpm typecheck`
- Lint: `pnpm lint`
- E2E: `pnpm e2e`
- Fixtures: `pnpm fixtures`
- Bench: `pnpm bench`
- Bundle: `pnpm bundle`
- 格式/空白检查: `git diff --check`

## 目录结构

```text
.
├── docs/                     # My Mind Node 产品/需求文档
├── specs/                    # 从 PRD 拆分的 my-ai-auto-dev 编号 feature specs
├── packages/
│   ├── core/                 # DOM-free schema、校验、命令、历史、搜索与布局转换
│   ├── react/                # React Flow Editor/Viewer、大纲、搜索、检查器和样式
│   ├── importers/            # 可选 JSON/Markdown/OPML/缩进文本导入
│   └── exporters/            # 可选 JSON/Markdown/OPML/缩进文本/SVG/PNG 导出
├── apps/
│   ├── playground/           # Vite 示例与 E2E 目标
│   ├── docs/                 # VitePress 文档站
│   ├── next-example/         # Next.js SSR-safe 示例
│   ├── readonly-example/     # 只读 Viewer 示例
│   └── custom-node-example/  # 自定义节点渲染示例
├── tests/                    # fixtures、bench、a11y、Playwright E2E
├── scripts/                  # fixture、bench、bundle budget 脚本
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
