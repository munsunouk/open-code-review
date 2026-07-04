---
title: Migration
sidebar:
  order: 2
---

Upgrade integrations from preview `ocr codex` commands and `codex-review-*`
schemas to the released host-agent surface.

## Command rename (`ocr codex` → `ocr agent`)

| Legacy | Replacement |
|--------|-------------|
| `ocr codex prepare` | `ocr agent prepare` |
| `ocr codex validate-comments` | `ocr agent validate-comments` |
| `ocr codex report` | `ocr agent report` |
| `ocr codex context …` | `ocr agent context …` |

The hidden `ocr codex` alias was removed before release. Regenerate bundles and
comments instead of hand-editing old command names.

## Schema rename (`codex-review-*` → `agent-review-*`)

Preview builds used `codex-review-bundle/v1`, `codex-review-comments/v1`, and
related IDs. Loaders reject those strings. Regenerate artifacts with a current
`ocr` binary; do not patch `schema_version` by hand.

## Host-agent vs native OCR

| Path | Commands | LLM required? |
|------|----------|---------------|
| **Host-agent** | `ocr agent prepare`, `context`, `validate-comments`, `report` | No — the host agent authors findings |
| **Native OCR** | `ocr review`, `ocr scan` | Yes — OCR calls your configured LLM |

Skills and IDE plugins default to the host-agent path.

## Automation checklist

1. Run `ocr agent validate-comments` **before** `ocr agent report`.
2. Pass `--validation` to report; missing or invalid validation fails the command.
3. `validate-comments` exits **2** when comments fail validation (JSON may still
   be written). Exit **1** means tool or infrastructure errors.
4. Inspect `partial`, `skipped_files`, and `bundles` in scan/split manifests.
   Validate/report operate on one bundle at a time and do not prove full manifest
   coverage.

## Sessions and state

Agent sessions live under `$HOME/.opencodereview/sessions/` as viewer-compatible
JSONL. Legacy `controlPlane: "codex-owned"` records may still appear; migrate to
`ocr agent` with `controlPlane: "agent"` for full workflow timelines.

Changing `$HOME` or `~/.opencodereview/rule.json` between prepare and validate
can change rule resolution without a `stale_bundle` error — rerun prepare when
policy inputs must stay fixed.

## See Also

- [Agent Skill](../integrations/agent-skill/) — current skill workflow.
- [QuickStart](../quickstart/) — install and first review.
- [`docs/CODEX_MIGRATION.md`](https://github.com/alibaba/open-code-review/blob/main/docs/CODEX_MIGRATION.md) — full repo copy of this guide.
