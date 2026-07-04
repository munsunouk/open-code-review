---
title: Command（Claude Code Plugin）
sidebar:
  order: 2
---

Install the bundled command so Open Code Review runs end-to-end inside
[Claude Code](https://docs.anthropic.com/en/docs/claude-code) using the
**host-agent** workflow — Claude performs review reasoning; OCR supplies
deterministic bundles, validation, and reporting.

## What ships in the repo

The repo ships a Claude Code plugin under
[`plugins/open-code-review/`](https://github.com/alibaba/open-code-review/tree/main/plugins/open-code-review).
The command prompt lives at
[`plugins/open-code-review/commands/review.md`](https://github.com/alibaba/open-code-review/blob/main/plugins/open-code-review/commands/review.md)
and is the source of truth for the workflow below.

## Install

### Option 1: Plugin marketplace (recommended)

Run these two commands **inside Claude Code**:

```bash
/plugin marketplace add alibaba/open-code-review
/plugin install open-code-review@open-code-review
```

### Option 2: Copy the command file directly

```bash
mkdir -p .claude/commands
curl -o .claude/commands/open-code-review.md \
  https://raw.githubusercontent.com/alibaba/open-code-review/main/plugins/open-code-review/commands/review.md
```

> **Prerequisite:** the `ocr` CLI must be on `PATH` (npm install or build from
> source). **No OCR LLM** is required for the default host-agent command path.
> Configure an LLM only when you explicitly want legacy `ocr review`.

## Use

```
/open-code-review:review
/open-code-review:review review this branch against main
/open-code-review:review focus on race conditions in commit abc123
```

Claude infers prepare flags from your request (workspace, `--commit`, or
`--from` / `--to`).

## What the command does

1. **`ocr agent prepare`** — build a deterministic review bundle (5-minute timeout).
2. **Review** — Claude authors `agent-review-comments/v1` JSON (optionally uses
   `ocr agent context`). Low-confidence findings are dropped.
3. **`ocr agent validate-comments`** — exit **2** means invalid comments; do not report.
4. **`ocr agent report`** — render Markdown when validation passes.
5. **Fix** — apply high-confidence fixes when the user requested them (this command
   auto-fixes by default, unlike the [Agent Skill](../agent-skill/)).

## See Also

- [Agent Skill](../agent-skill/) — same host-agent pipeline; asks before fixing.
- [Direct Subprocess](../subprocess/) — call `ocr agent` from your own scripts.
- [Migration](../migration/) — `ocr codex` → `ocr agent` renames.
