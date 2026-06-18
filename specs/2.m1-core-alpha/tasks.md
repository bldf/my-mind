# M1 Core Alpha - 任务清单

## 任务版本

| 日期 | 版本 | 说明 |
| --- | --- | --- |
| 2026-06-18 | v1 | 从 PRD v0.12 M1 生成 |

## 项目信息

- 项目名: my-mind-node
- 架构类型: monorepo
- specs 路径: `specs/2.m1-core-alpha/`

## 任务列表

### 功能 1: Schema 与校验

- [ ] T-001: 扩展 core 类型到 Alpha schema，覆盖节点、连接线、标签、任务、链接、图片、样式、布局和 metadata ~1h
- [ ] T-002: 实现 `validateDocument`，覆盖 root、parent/children、循环、连接线、标签、position、task 和 style 校验 ~1h
- [ ] T-003: 重构 `parseDocument` 复用 `validateDocument`，补充异常输入测试 fixture ~45min

### 功能 2: 命令与历史

- [ ] T-004: 定义 `MindMapCommand`、`CommandResult`、`MindMapOperation`、`ChangeMeta` 类型和错误码 ~45min
- [ ] T-005: 实现节点创建、更新、删除、移动、折叠命令及单测 ~1h
- [ ] T-006: 实现标签、连接线、选择命令及单测 ~1h
- [ ] T-007: 实现 operation inverse 生成和 `HistoryManager` undo/redo ~1h
- [ ] T-008: 覆盖批量命令、删除子树、移动非法目标和 root 删除禁止的历史回滚测试 ~1h

### 功能 3: 序列化与缩进文本

- [ ] T-009: 实现 JSON 序列化、schemaVersion 校验和未来迁移入口 ~45min
- [ ] T-010: 实现缩进文本导入，覆盖空格、Tab、项目符号、多顶层行和缩进错误 ~1h
- [ ] T-011: 实现缩进文本导出和导入导出往返测试 ~45min

### 集成与验证

- [ ] T-012: 补齐 core 类型测试、依赖边界检查、build/test/typecheck/lint 验证 ~1h

## 依赖关系

- T-002 依赖 T-001
- T-003 依赖 T-002
- T-004 依赖 T-001
- T-005、T-006 依赖 T-004
- T-007 依赖 T-005、T-006
- T-008 依赖 T-007
- T-009 依赖 T-002
- T-010、T-011 依赖 T-001
- T-012 依赖 T-003、T-008、T-011

## 风险点

- 删除节点的 inverse 需要保存完整子树和关联 connection，否则 undo 数据会丢失。
- 缩进文本格式看似简单，但混合缩进和多顶层行容易产生错误树，必须用结构化错误处理。
- core 类型一旦暴露过宽，Public Beta 前收缩 API 会更痛；Alpha 阶段需明确 experimental 标记。
