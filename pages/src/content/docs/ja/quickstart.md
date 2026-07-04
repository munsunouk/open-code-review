---
title: クイックスタート
sidebar:
  order: 3
---

数分で最初のコードレビューを実行します。

## 前提条件

- **Git ≥ 2.41**（scan は git 不要可）
- **Node.js ≥ 18** または Go 1.22+

## ステップ 1 — CLI インストール

```bash
npm install -g @alibaba-group/open-code-review
ocr version
```

## パス A — ホスト agent レビュー（skill 推奨）

**OCR LLM API キー不要。**

```bash
cd path/to/your-repo
ocr agent prepare --preview
ocr agent prepare --format json --output bundle.json
ocr agent validate-comments --bundle bundle.json --comments comments.json --output validation.json
ocr agent report --bundle bundle.json --comments comments.json \
  --validation validation.json --format markdown --output report.md
```

[Agent Skill](../integrations/agent-skill/) をインストールすると IDE agent がこの流れに従います。

## パス B — ネイティブ OCR LLM レビュー

```bash
ocr config provider
ocr llm test
ocr review
```

## 関連

- [Agent Skill](../integrations/agent-skill/)
- [移行ガイド](../migration/)
