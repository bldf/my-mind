# N3: 执行 Task

## 开始标记

```text
Task {T-编号}: {任务描述} ~{预估时间}
   Feature {F}/{总F} | 任务 {N}/{总数}
```

## Skill 匹配

根据任务涉及的工种，查看当前 Antigravity 环境可用的 skills/plugins。若项目已安装 `my-*` skills，按以下规则匹配：

- 前端 -> `my-frontend-engineer`
- 数据库 -> `my-database-engineer`
- 合约 -> `my-contract-engineer`
- QA/测试 -> `my-qa-engineer`
- 没有匹配 -> Antigravity 直接执行

有匹配的 skill -> 先读取并遵循该 skill，再执行任务。

## 开发

- 参考 design.md 技术设计和 `.antigravity/rules/` 规范
- 技术选型自行选最优解，不暂停
- 业务逻辑/产品方向问题 -> 暂停与用户沟通
