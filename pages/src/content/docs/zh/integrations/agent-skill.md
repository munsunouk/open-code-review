---
title: Agent Skill
sidebar:
  order: 1
---

将 OCR 注册为可调用 skill，使宿主 agent（Cursor、Codex、Claude Code 等）在无需
自行推导参数的情况下运行确定性评审。

## 仓库内容

规范 skill 位于
[`skills/open-code-review/SKILL.md`](https://github.com/alibaba/open-code-review/blob/main/skills/open-code-review/SKILL.md)。
**宿主 agent 拥有评审推理**；OCR 提供确定性 bundle、上下文、校验与报告。

> **无需 OCR LLM。** 默认路径仅使用 `ocr agent …`。仅在显式使用 `ocr review` /
> `ocr scan` 时才需配置 LLM。

## 安装

```bash
npx skills add alibaba/open-code-review --skill open-code-review
```

或手动复制到 `~/.claude/skills/`。Cursor / Codex 插件见 README。

## 工作流

1. `ocr agent prepare --format json`（默认 workspace diff；大目标用 `--split`）
2. `ocr agent context read|find|diff|search --bundle … [--bundle-index N]`
3. 编写 `agent-review-comments/v1` JSON
4. `ocr agent validate-comments --bundle … --comments … --output validation.json`
5. `ocr agent report --bundle … --comments … --validation … --format markdown`
6. 仅在用户明确要求时修改代码

扫描：`ocr agent prepare --scan`。多 bundle manifest 需 `--bundle-index`。
`partial: true` 表示未覆盖范围，须在报告中说明。

详见 [迁移指南](../migration/)（`ocr codex` → `ocr agent`）。

## 参见

- [迁移指南](../migration/)
- [快速开始](../quickstart/)
- [Command（Claude Code）](../claude-code/)
