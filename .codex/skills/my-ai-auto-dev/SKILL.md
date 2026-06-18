---
name: my-ai-auto-dev
description: Execute numbered development specs automatically across one or more code projects. Use when the user asks to run a /my:ai-style workflow, implement features from requirements.md/design.md/tasks.md, resume unfinished spec tasks, coordinate review and QA after each task, or finish all specs end to end.
---

# My AI Auto Dev - 自动开发

从用户请求中解析 specs 文件夹路径 + 一个或多个代码项目路径。

```text
specs在~/projects/my-app-specs，代码在~/code/my-app
~/projects/specs 前端~/code/fe 后端~/code/api
```

## 流程图

按此流程执行，到达每个节点时读取本 skill 的对应 reference 文件获取详细规则：

- `references/n1-init.md`
- `references/n2-enter-feature.md`
- `references/n3-execute-task.md`
- `references/n4-review.md`
- `references/n5-mark-done.md`
- `references/n6-qa-eval.md`
- `references/n7-context.md`
- `references/n8-finish.md`

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
