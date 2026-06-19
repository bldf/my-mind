---
description: Security rules for local skills, prompts, scripts, logs, and generated workflow assets.
---

# Security

本仓库会保存可被 Codex/Claude 执行或引用的 workflow 指令，因此安全重点是防止密钥入库、防止危险工具指令失控、防止日志泄露个人信息。

## 敏感信息

- 禁止提交 API key、token、cookie、私钥、助记词、OAuth secret、数据库连接串、云服务凭据或真实用户隐私数据。
- `.env`、`.env.*`、本地配置、浏览器 profile、会话文件、扫描报告和临时输出应默认不入库；如确需示例，使用 `.env.example` 并填占位值。
- 新增日志文件前先确认是否应该被 Git 跟踪。日志只保留必要动作摘要，不能包含 token、完整请求体、个人日程详情或私密备注。
- 当前仓库没有 `.gitignore`。如后续产生构建产物、下载缓存、`.DS_Store`、日志或本地密钥文件，应先补充 ignore 规则再生成这些文件。

## Prompt 与 Skill 安全

- 任何会删除文件、重置 Git、安装依赖、访问网络、控制浏览器/桌面应用或调用外部服务的 workflow，都必须写明触发条件、用户确认条件和失败回退。
- 不在 prompt 中要求 agent 绕过 sandbox、审批、权限弹窗或安全扫描。
- 涉及密钥缺失时，实现应使用环境变量或占位 TODO，不要求用户把密钥粘贴进仓库文件。
- 安全扫描、Telegram 通知、Calendar、Chrome CDP 等集成说明要区分本地环境检查、真实执行和报告输出，避免默认执行高风险动作。

## 脚本安全

- Bash 中使用 `set -euo pipefail`，读取用户输入后做类型、范围和格式校验。
- JavaScript 和 Bash 都不得把未清洗的用户输入拼接进 shell、AppleScript、SQL、URL 或动态代码执行。
- 临时文件、socket、cache 等本地运行时文件应写入用户 runtime/cache 目录，并使用尽量小的权限。

