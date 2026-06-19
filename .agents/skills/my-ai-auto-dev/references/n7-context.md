# N7: 上下文管理

## task 完成后

重新读取：

- 当前 feature 的 specs（requirements.md、design.md、tasks.md）
- `{SPECS_DIR}/LESSONS.md`
- 代码项目的 `AGENTS.md` + `.antigravity/rules/`

如果当前 Antigravity TUI 支持 `/clear`，可执行 `/clear` 后重新加载上述文件；否则直接在当前会话中显式重读这些文件。

继续下一个 task。

## task 执行中

上下文达 80% -> 执行 `/compact`（如当前 Antigravity 支持）后继续当前 task。

## feature 完成后

清理上下文，进入下一个 feature。

全程自动继续，无需等待用户指令。
