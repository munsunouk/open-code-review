---
title: Command（Claude Code Plugin）
sidebar:
  order: 2
---

安装打包的命令，使 OCR 在 [Claude Code](https://docs.anthropic.com/en/docs/claude-code)
内端到端运行——评审 diff、分类发现，并自动应用值得采纳的修复。

## 仓库里有什么

仓库在
[`plugins/open-code-review/`](https://github.com/alibaba/open-code-review/tree/main/plugins/open-code-review)
下提供 Claude Code plugin。命令 prompt 本体位于
[`plugins/open-code-review/commands/review.md`](https://github.com/alibaba/open-code-review/blob/main/plugins/open-code-review/commands/review.md)，
是下述工作流的权威依据。

## 安装

### 方式 1：plugin marketplace（推荐）

在 **Claude Code 内**运行这两条命令：

```bash
/plugin marketplace add alibaba/open-code-review
/plugin install open-code-review@open-code-review
```

这会注册 `/open-code-review:review` slash 命令，并保持可通过 `/plugin` 更新。

### 方式 2：直接复制命令文件

若想跳过 plugin marketplace，把命令文件直接放进 `.claude/commands/`。这会注册为
`/open-code-review`（无 `:review` 后缀）。

**项目级**（随仓库提交，团队共享）：

```bash
mkdir -p .claude/commands
curl -o .claude/commands/open-code-review.md \
  https://raw.githubusercontent.com/alibaba/open-code-review/main/plugins/open-code-review/commands/review.md
```

**用户级**（机器上每个项目可用）：

```bash
mkdir -p ~/.claude/commands
curl -o ~/.claude/commands/open-code-review.md \
  https://raw.githubusercontent.com/alibaba/open-code-review/main/plugins/open-code-review/commands/review.md
```

### 其他支持命令的 agent

命令文件是带单个 frontmatter 字段的纯 markdown——没有任何 Claude Code 专有
内容。如果你的 agent 支持类似的 **command** 约定（从目录加载为可调用命令的
markdown prompt），上面的文件复制方法就是安装路径：把 `open-code-review.md`
放进你的 agent 读取命令的目录，按你的 agent 调用命令的方式调用它。prompt 正文
与 agent 无关——它只告诉模型选哪些 `ocr` 参数以及如何分级输出。

> **前置条件：** `ocr` CLI 需在 `PATH` 上。**默认 host-agent 路径不需要 OCR LLM。**
> 仅在你显式使用 legacy `ocr review` 时才需配置 LLM。

## 使用

在 Claude Code 中按名调用命令。通过 plugin marketplace 安装的用
`/open-code-review:review`，直接复制文件的用 `/open-code-review`：

```
/open-code-review:review
/open-code-review:review review this PR against main
/open-code-review:review focus on race conditions in commit abc123
```

prompt 根据你的请求推断 `ocr agent prepare` 参数：无参数 → 工作区；commit → `--commit`；分支区间 → `--from` / `--to`。

## 命令做什么

1. **`ocr agent prepare`** — 构建确定性 bundle（5 分钟超时）。
2. **评审** — Claude 编写 `agent-review-comments/v1`（可选用 `ocr agent context`）。
3. **`ocr agent validate-comments`** — 退出码 **2** 表示无效，勿生成报告。
4. **`ocr agent report`** — 校验通过后渲染 Markdown。
5. **修复** — 用户要求时自动修复高置信度问题（**默认自动修复**，与 [Agent Skill](../agent-skill/) 不同）。

## 另见

- [Agent Skill](../agent-skill/)——SDK 级等价物；同一个底层 CLI，不同默认值
  （修复前先询问）。
- [Direct Subprocess](../subprocess/)——绕过 slash 命令，自行调用 CLI。
