---
description: Run Open Code Review agent workflow to review code changes and apply fixes.
---

Invoke Open Code Review (OCR) through the host-agent workflow. The coding agent performs review reasoning; OCR supplies deterministic bundles, validation, and reporting.

## Workflow

### Step 1: Prepare review evidence

```bash
ocr agent prepare --format json --output /tmp/bundle.json
```

- Default (no user arguments): reviews staged, unstaged, and untracked changes (workspace mode).
- If the user provides `--commit` or `-c`: pass through as-is.
- If the user provides `--from` and `--to`: pass through as-is.
- For full-file scan: add `--scan` and optional `--path` filters.
- Set a 5-minute timeout for prepare.
- If the `ocr` command is not found, install it with `npm i -g @alibaba-group/open-code-review` or build from source.

### Step 2: Review and write comments

Produce `agent-review-comments/v1` JSON that references the bundle `bundle_id`. Use `ocr agent context` when deeper repository context is required.

Silently discard low-confidence findings before continuing.

### Step 3: Validate comments

```bash
ocr agent validate-comments \
  --bundle /tmp/bundle.json \
  --comments /tmp/comments.json \
  --output /tmp/validation.json
```

Treat exit code **2** as validation failure and exit code **1** as tool/infrastructure errors. Do not render a report when validation is invalid.

### Step 4: Render report

```bash
ocr agent report \
  --bundle /tmp/bundle.json \
  --comments /tmp/comments.json \
  --validation /tmp/validation.json \
  --format markdown
```

### Step 5: Fix adopted issues

Automatically fix issues worth adopting when the user requested fixes.
