---
title: Agent Skill
sidebar:
  order: 1
---

OCR を呼び出し可能な skill として登録し、ホスト agent（Cursor、Codex、Claude Code 等）が
決定論的レビューを実行できるようにします。

## リポジトリ内容

[`skills/open-code-review/SKILL.md`](https://github.com/alibaba/open-code-review/blob/main/skills/open-code-review/SKILL.md)
が正本です。**ホスト agent がレビュー推論を担当**し、OCR は bundle・コンテキスト・
検証・レポートを提供します。

> **OCR LLM 不要。** デフォルトは `ocr agent …` のみ。`ocr review` / `ocr scan` を
> 明示的に使う場合のみ LLM 設定が必要です。

## インストール

```bash
npx skills add alibaba/open-code-review --skill open-code-review
```

## ワークフロー

1. `ocr agent prepare --format json`（大きな diff は `--split`）
2. `ocr agent context … --bundle … [--bundle-index N]`
3. `agent-review-comments/v1` JSON を作成
4. `ocr agent validate-comments … --output validation.json`
5. `ocr agent report … --validation validation.json --format markdown`
6. 修正はユーザー明示時のみ

スキャンは `--scan`。`partial: true` は未カバー範囲を意味します。

[移行ガイド](../migration/)（`ocr codex` → `ocr agent`）を参照。

## 関連

- [移行ガイド](../migration/)
- [クイックスタート](../quickstart/)
