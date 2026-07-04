---
title: Agent Skill
sidebar:
  order: 1
---

Register OCR as a callable skill so a host agent (Cursor, Codex, Claude Code,
or any framework that loads `SKILL.md`) can run deterministic reviews without
re-deriving flags, validation rules, or report steps.

## What ships in the repo

The canonical skill lives at
[`skills/open-code-review/SKILL.md`](https://github.com/alibaba/open-code-review/blob/main/skills/open-code-review/SKILL.md).
It declares the **host-agent workflow**: OCR prepares immutable review bundles
and validates externally authored findings; the host agent owns reasoning,
prioritization, second-pass reflection, and optional fixes.

> **No OCR LLM required.** The default skill path uses `ocr agent …` only.
> Configure an LLM only when you explicitly want legacy `ocr review` / `ocr scan`.

## Install

### Option 1: `npx skills add` (recommended)

Run from inside the project where you want the skill available:

```bash
npx skills add alibaba/open-code-review --skill open-code-review
```

Re-run the command to update to the latest skill version.

### Option 2: Manual copy (system-wide)

```bash
mkdir -p ~/.claude/skills
cp -R /path/to/open-code-review/skills/open-code-review ~/.claude/skills/
```

### Option 3: IDE plugins

- **Cursor:** install the plugin from this repository (see README Option 4).
- **Codex:** install from `.agents/plugins/marketplace.json` or the Codex plugin cache.

## What the skill does

When the host agent loads `SKILL.md`, a typical `/open-code-review` request
follows this pipeline:

1. **Prepare deterministic input**

   ```bash
   ocr agent prepare --format json [--from BASE --to HEAD | --commit SHA | --scan …]
   ```

   Default (no flags) reviews the workspace diff. Use `--preview` first when
   scope is unclear. For oversized diffs, rerun with `--split` and process every
   manifest bundle.

2. **Gather evidence with target-aware context**

   ```bash
   ocr agent context read --bundle <bundle-or-manifest.json> [--bundle-index N] --path <file>
   ```

   Range and commit context must come from the bundle target, not the working
   tree. A `stale_bundle` error means you must rerun prepare.

3. **Author findings** as `agent-review-comments/v1` JSON (path, line range,
   priority, category, title, evidence, recommendation, confidence).

4. **Validate before reporting**

   ```bash
   ocr agent validate-comments --bundle <bundle-or-manifest.json> \
     --comments <comments.json> --output <validation.json>
   ```

   Resolve every validation error. Do not publish invalid findings.

5. **Render the report**

   ```bash
   ocr agent report --bundle <bundle-or-manifest.json> \
     --comments <comments.json> --validation <validation.json> \
     --format markdown --output <report.md>
   ```

6. **Fix only when asked.** The host agent edits code only after explicit user
   intent; commit/push/PR actions require separate authorization.

### Scan and large targets

- Full-file scan: `ocr agent prepare --scan [--path PATHS] --format json`
- Multi-bundle manifests: pass `--bundle-index <n>` to `context`, and set
  `comments.bundle_id` to the slice you validated.
- Partial manifests (`partial: true`, empty `bundles: []`) mean uncovered scope —
  report that explicitly; never count skipped files as reviewed.

See [Migration](../migration/) if you still have `ocr codex` or
`codex-review-comments/v1` artifacts.

## Anthropic Agent SDK

```python
from anthropic_agent_sdk import Agent

agent = Agent(
    skill_paths=["/path/to/open-code-review/skills/open-code-review"],
)

agent.run("Review my staged changes — focus on race conditions.")
```

## Other agent frameworks

Any framework with a “register external skill” surface can ingest `SKILL.md`.
The markdown body works as a prompt template even when frontmatter schemas differ.

## See Also

- [Migration](../migration/) — `ocr codex` → `ocr agent`, schema renames.
- [QuickStart](../quickstart/) — install `ocr` and run your first host-agent review.
- [Command (Claude Code)](../claude-code/) — slash-command flavor of the same workflow.
- [Direct Subprocess](../subprocess/) — call the CLI yourself from scripts.
