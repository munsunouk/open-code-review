# OCR agent migration notes

## `ocr codex` removal

The legacy `ocr codex` command namespace was removed in favor of the host-agnostic `ocr agent` surface.

| Legacy | Replacement |
|--------|-------------|
| `ocr codex prepare` | `ocr agent prepare` |
| `ocr codex validate-comments` | `ocr agent validate-comments` |
| `ocr codex report` | `ocr agent report` |
| `ocr codex context ...` | `ocr agent context ...` |

## Codex-owned vs native OCR

- **Codex-owned / host-agent path:** `ocr agent ...` prepares deterministic bundles and validates externally authored comments. No OCR LLM provider or API key is required.
- **Native OCR path:** `ocr review` and `ocr scan` still invoke OCR's configured external LLM when you explicitly want that workflow.

## Automation requirements

1. Always run `ocr agent validate-comments` before `ocr agent report`.
2. Pass `--validation` to `ocr agent report`; the command fails when validation is missing or invalid.
3. Treat a non-zero exit code from `validate-comments` as a blocking failure even when JSON output is present.

## Viewer sessions

Agent sessions are recorded under `~/.opencodereview/sessions/` with viewer-compatible JSONL. Legacy `ocr codex`-owned session records are no longer rendered by the viewer.
