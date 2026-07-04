---
title: Command（Claude Code Plugin）
sidebar:
  order: 2
---

パッケージ化されたコマンドをインストールすることで、OCR を [Claude Code](https://docs.anthropic.com/en/docs/claude-code)
内でエンドツーエンドに実行できます——diff をレビューし、発見を分類し、採用すべき修正を自動的に適用します。

## リポジトリに含まれるもの

リポジトリには
[`plugins/open-code-review/`](https://github.com/alibaba/open-code-review/tree/main/plugins/open-code-review)
配下に Claude Code plugin が用意されています。コマンドの prompt 本体は
[`plugins/open-code-review/commands/review.md`](https://github.com/alibaba/open-code-review/blob/main/plugins/open-code-review/commands/review.md)
にあり、以下で述べるワークフローの正式な拠り所です。

## インストール

### 方法 1：plugin marketplace（推奨）

**Claude Code 内で**次の 2 つのコマンドを実行します。

```bash
/plugin marketplace add alibaba/open-code-review
/plugin install open-code-review@open-code-review
```

これにより `/open-code-review:review` slash コマンドが登録され、`/plugin` を通じて更新可能な状態が保たれます。

### 方法 2：コマンドファイルを直接コピー

plugin marketplace をスキップしたい場合は、コマンドファイルを直接 `.claude/commands/` に配置します。これは `/open-code-review`（`:review` サフィックス無し）として登録されます。

**プロジェクトレベル**（リポジトリにコミットし、チームで共有）：

```bash
mkdir -p .claude/commands
curl -o .claude/commands/open-code-review.md \
  https://raw.githubusercontent.com/alibaba/open-code-review/main/plugins/open-code-review/commands/review.md
```

**ユーザーレベル**（マシン上のすべてのプロジェクトで利用可能）：

```bash
mkdir -p ~/.claude/commands
curl -o ~/.claude/commands/open-code-review.md \
  https://raw.githubusercontent.com/alibaba/open-code-review/main/plugins/open-code-review/commands/review.md
```

### コマンドをサポートするその他の agent

コマンドファイルは単一の frontmatter フィールドを持つ純粋な markdown です——Claude Code 固有の内容は一切含まれていません。あなたの agent が同様の **command** 規約（ディレクトリから呼び出し可能なコマンドとしてロードされる markdown prompt）をサポートしている場合、上記のファイルコピー方法がインストール経路になります。`open-code-review.md` を agent がコマンドを読み込むディレクトリに配置し、agent のコマンド呼び出し方法に従って呼び出してください。prompt 本文は agent に依存しません——モデルに対して、どの `ocr` 引数を選び、出力をどのように分類するかを伝えるだけです。

> **前提条件：** `ocr` CLI が `PATH` 上にあること。**デフォルトの host-agent パスでは OCR LLM は不要です。**
> legacy `ocr review` を明示的に使う場合のみ LLM を設定してください。

## 使い方

Claude Code でコマンドを名前で呼び出します。plugin marketplace 経由でインストールした場合は `/open-code-review:review` を、ファイルを直接コピーした場合は `/open-code-review` を使います。

```
/open-code-review:review
/open-code-review:review review this PR against main
/open-code-review:review focus on race conditions in commit abc123
```

prompt はリクエストから `ocr agent prepare` の引数を推論します（作業領域、`--commit`、`--from` / `--to`）。

## コマンドが行うこと

1. **`ocr agent prepare`** — 決定論的 bundle を構築（5 分タイムアウト）。
2. **レビュー** — Claude が `agent-review-comments/v1` を作成（必要なら `ocr agent context`）。
3. **`ocr agent validate-comments`** — 終了コード **2** は無効なコメント。
4. **`ocr agent report`** — 検証成功後に Markdown を生成。
5. **修正** — ユーザーが依頼した場合、高信頼度の問題を自動修正（[Agent Skill](../agent-skill/) とは異なり**デフォルトで自動修正**）。

## 関連項目

- [Agent Skill](../agent-skill/)——SDK レベルの同等物。同じ底層の CLI で、デフォルト値が異なります（修正前に尋ねる）。
- [Direct Subprocess](../subprocess/)——slash コマンドを介さず、自分で CLI を呼び出す方法。
