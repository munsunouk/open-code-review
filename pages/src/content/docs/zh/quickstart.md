---
title: 快速开始
sidebar:
  order: 3
---

几分钟内完成首次代码评审。

## 前置条件

- **Git ≥ 2.41**（diff 模式；scan 可无 git）
- **Node.js ≥ 18** 或 Go 1.22+

## 步骤 1 — 安装 CLI

```bash
npm install -g @alibaba-group/open-code-review
ocr version
```

## 路径 A — 宿主 agent 评审（skill 推荐）

**无需 OCR LLM API key。** Cursor / Codex 等 agent 负责推理。

```bash
cd path/to/your-repo
ocr agent prepare --preview
ocr agent prepare --format json --output bundle.json
```

校验与报告：

```bash
ocr agent validate-comments --bundle bundle.json --comments comments.json --output validation.json
ocr agent report --bundle bundle.json --comments comments.json \
  --validation validation.json --format markdown --output report.md
```

安装 [Agent Skill](../integrations/agent-skill/) 后 IDE agent 将自动遵循此流程。

## 路径 B — 原生 OCR LLM 评审

需配置 LLM：

```bash
ocr config provider
ocr llm test
ocr review
```

机器可读输出：

```bash
ocr review --format json --audience agent > review.json
ocr agent prepare --format json > bundle.json
```

## 参见

- [Agent Skill](../integrations/agent-skill/)
- [迁移指南](../migration/)
- [安装](../installation/)
