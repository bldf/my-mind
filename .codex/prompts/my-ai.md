---
description: Execute specs automatically with Codex
argument-hint: specs path plus one or more code project paths
---

# /my:ai - 自动开发

`$ARGUMENTS` - specs 文件夹路径 + 代码项目路径。

```bash
/my:ai specs在~/projects/my-app-specs，代码在~/code/my-app
/my:ai ~/projects/specs 前端~/code/fe 后端~/code/api
```

## 流程图

按此流程执行，到达每个节点时读取对应的节点文件获取详细规则：

1. 优先读取当前项目的 `.codex/prompts/my-ai-nodes/`
2. 如果命令安装在用户级 prompts，且项目内没有节点文件，则读取 `~/.codex/prompts/my-ai-nodes/`

```text
START
  |
  v
[N1: 初始化] -- 解析输入、扫描 features、加载上下文
  |
  v
+-> [N2: 进入 Feature] -- 读取 specs、分析依赖、输出执行计划
|     |
|     v
|   +-> [N3: 执行 Task] -- 检查 skill -> 开发
|   |     |
|   |     v
|   |   [N4: Review] -- 自审 -> 二次 review
|   |     |
|   |     v
|   |   [N5: 标记完成] -- tasks.md 标 [x]、写 LESSONS.md
|   |     |
|   |     v
|   |   [N6: QA 评估] -- 评分决定是否触发 QA
|   |     |
|   |     v
|   |   [N7: 上下文管理] -- 重新加载 specs
|   |     |
|   |     v
|   |   还有未完成 task? --YES--+
|   |     |
|   |    NO
|   |     |
|   |     v
|   +-- Feature 完成 -> 清理上下文
|         |
|         v
|       还有下一个 Feature? --YES--+
|         |
|        NO
|         |
|         v
      [N8: 完成] -- 文档同步 -> 输出总结
        |
        v
       END
```

## 全局规则

**暂停：** 业务逻辑歧义、不确定的安全问题、破坏性变更、环境阻塞。
**不暂停：** 纯技术选型 - 选最优解直接执行。

**执行策略：** Codex 自主决策串行或并行（无依赖 + 不同项目 -> 并行，否则串行）。如果当前 Codex 环境没有多 agent 工具，则退化为串行执行。
