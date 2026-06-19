# N4: Review

每个 task 完成后必须执行，按**单个 task 粒度**审查。

## 1. 自审

检查本 task 变更的：

- 代码质量：命名、结构、可读性、是否符合 `.antigravity/rules/`
- 逻辑正确性：边界条件、错误处理、并发安全
- 安全性：硬编码密钥、`.env` 误入 git、注入漏洞、OWASP Top 10
- 性能：N+1 查询、不必要的重复计算、内存泄漏风险

发现问题立即修复，不确定则暂停。

## 2. 调用 code-review-and-quality（强制）

自审通过后，必须调用 `code-review-and-quality` skill：

- 使用当前 Antigravity 环境中可用的 `code-review-and-quality` skill；不要硬编码用户级绝对路径
- review 输入限定为**本 task 涉及的变更文件 diff**（不是整个 working tree）
- review 前重新读取当前 task、requirements.md、design.md、tasks.md、相关项目规则和验证结果
- 按 skill 要求覆盖 correctness、readability、architecture、security、performance、verification
- 所有 Critical/Important/必改问题 -> 修复后重新调用 `code-review-and-quality` 复审
- 误报 -> 记录理由后忽略
- **审查通过后方可进入 N5**
