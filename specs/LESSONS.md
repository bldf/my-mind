# LESSONS.md - 架构决策与踩坑记录

> 开发时必须参考。仅记录非显而易见的架构决策、踩坑与跨 feature 影响。

## 2026-06-18 - PRD 拆分 / Specs 初始化

- 当前仓库是 PRD、prompt、skill 与 subagent 指令工作区，不是 My Mind Node 的代码实现仓库；本次只生成可被 `my-ai-auto-dev` 消费的编号 specs，不初始化 npm monorepo 或安装依赖。
- `docs/prd-mind-map.md` 的 M2.5 Product Polish 内容独立成 `4.m2-5-product-polish/`，避免把 React Alpha 的核心嵌入能力和后续 polish/复杂交互塞进同一个 `tasks.md`。
- 后续执行 `my-ai-auto-dev` 时，应显式传入 specs 路径 `specs/` 和目标代码项目路径；不要从本仓库自动推断相邻实现仓库。
