---
title: 移行ガイド
sidebar:
  order: 2
---

プレビュー版 `ocr codex` と `codex-review-*` から host-agent 表面へ移行します。

## コマンド改名

| 旧 | 新 |
|----|-----|
| `ocr codex prepare` | `ocr agent prepare` |
| `ocr codex validate-comments` | `ocr agent validate-comments` |
| `ocr codex report` | `ocr agent report` |
| `ocr codex context …` | `ocr agent context …` |

## スキーマ改名

`codex-review-*` は拒否されます。現行 `ocr` で bundle と comments を再生成してください。

## 2 つのパス

- **ホスト agent:** `ocr agent …`（LLM 不要）
- **ネイティブ OCR:** `ocr review` / `ocr scan`（LLM 必要）

## 自動化

1. `report` の前に必ず `validate-comments`（`--validation` 必須）
2. 検証失敗時 exit code **2**
3. manifest の `partial` / `skipped_files` を確認

## 関連

- [Agent Skill](../integrations/agent-skill/)
- [クイックスタート](../quickstart/)
