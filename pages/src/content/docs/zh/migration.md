---
title: 迁移指南
sidebar:
  order: 2
---

从预览版 `ocr codex` 与 `codex-review-*` schema 升级到正式 host-agent 接口。

## 命令重命名

| 旧命令 | 新命令 |
|--------|--------|
| `ocr codex prepare` | `ocr agent prepare` |
| `ocr codex validate-comments` | `ocr agent validate-comments` |
| `ocr codex report` | `ocr agent report` |
| `ocr codex context …` | `ocr agent context …` |

## Schema 重命名

`codex-review-bundle/v1` 等旧 ID 已被拒绝。请用当前 `ocr` 重新生成 bundle 与 comments。

## 两条路径

- **宿主 agent：** `ocr agent …`，无需 OCR LLM
- **原生 OCR：** `ocr review` / `ocr scan`，需 LLM 配置

## 自动化要点

1. 先 `validate-comments`，再 `report`（必须传 `--validation`）
2. 校验失败时 exit code **2**
3. 检查 scan/split manifest 的 `partial` 与 `skipped_files`

会话与规则文件位于 `$HOME/.opencodereview/`。prepare 与 validate 之间修改
`rule.json` 或 `HOME` 可能导致规则漂移而无 `stale_bundle` 错误。

## 参见

- [Agent Skill](../integrations/agent-skill/)
- [快速开始](../quickstart/)
