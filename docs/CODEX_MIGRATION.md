# OCR agent migration notes

## `ocr codex` removal

The legacy `ocr codex` command namespace was removed in favor of the host-agnostic `ocr agent` surface. A brief hidden `ocr codex` alias existed during development and was removed before release.

| Legacy | Replacement |
|--------|-------------|
| `ocr codex prepare` | `ocr agent prepare` |
| `ocr codex validate-comments` | `ocr agent validate-comments` |
| `ocr codex report` | `ocr agent report` |
| `ocr codex context ...` | `ocr agent context ...` |

## Schema rename (`codex-review-*` → `agent-review-*`)

Preview builds of this branch used `codex-review-bundle/v1`, `codex-review-comments/v1`, and related schema IDs. The released protocol uses `agent-review-*` names only. Loaders reject the old schema strings; regenerate bundles and comments instead of hand-editing `schema_version`.

## Host-agent vs native OCR

- **Host-agent path:** `ocr agent ...` prepares deterministic bundles and validates externally authored comments. No OCR LLM provider or API key is required.
- **Native OCR path:** `ocr review` and `ocr scan` still invoke OCR's configured external LLM when you explicitly want that workflow.

## Automation requirements

1. Always run `ocr agent validate-comments` before `ocr agent report`.
2. Pass `--validation` to `ocr agent report`; the command fails when validation is missing or invalid.
3. `validate-comments` exits with code **2** when comments fail validation (even when JSON output is present). Exit code **1** indicates tool or infrastructure errors.

## Manifest `partial` semantics

`ocr agent prepare --scan` and `--split` may return exit code 0 with `partial: true` when files are skipped or budgets truncate scope. Automation must inspect `partial`, `skipped_files`, and `bundles` in the manifest JSON. `validate-comments` and `report` operate on a single bundle at a time and do not prove full manifest coverage.

## Viewer sessions

Agent sessions are recorded under `~/.opencodereview/sessions/` with viewer-compatible JSONL. Files are not pruned automatically; long-lived CI runners should plan for growth or periodic cleanup.

Legacy `controlPlane: "codex-owned"` sessions may still appear in the session list, but workflow events stored as unknown types (for example `codex_event`) are ignored. Only `agent_event` records render in the agent workflow timeline. Migrate to `ocr agent` with `controlPlane: "agent"` for full observability.

## Refresh stale Codex plugin cache

If `~/.codex/plugins/cache/open-code-review/.../SKILL.md` still mentions `ocr codex` or `codex-review-comments/v1`, refresh from this repository:

```bash
./scripts/reinstall-codex-plugin.sh
```

Or reinstall from the local marketplace entry in `.agents/plugins/marketplace.json`.
