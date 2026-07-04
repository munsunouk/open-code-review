---
title: QuickStart
sidebar:
  order: 3
---

Get your first code review running in a few minutes.

## Prerequisites

- **Git ≥ 2.41** (for diff-based reviews; scan mode can run without a git repo)
- **Node.js ≥ 18** (for the npm install path) **or** Go 1.22+ (to build from source)

## Step 1 — Install the CLI

```bash
npm install -g @alibaba-group/open-code-review
ocr version
```

> See [Installation](../installation/) for more methods (Homebrew, build from source).

---

## Path A — Host-agent review (recommended for skills)

Use this path when **Cursor, Codex, Claude Code, or another agent** performs the
review reasoning. **No OCR LLM API key is required.**

### Step 2A — Preview workspace scope

```bash
cd path/to/your-repo
ocr agent prepare --preview
```

### Step 3A — Prepare a review bundle

```bash
# Workspace diff (default)
ocr agent prepare --format json --output bundle.json

# Branch range
ocr agent prepare --from main --to feature-branch --format json --output bundle.json

# Single commit
ocr agent prepare --commit abc123 --format json --output bundle.json
```

Your host agent reads the bundle, writes `agent-review-comments/v1` JSON,
then runs:

```bash
ocr agent validate-comments --bundle bundle.json --comments comments.json --output validation.json
ocr agent report --bundle bundle.json --comments comments.json \
  --validation validation.json --format markdown --output report.md
```

Install the [Agent Skill](../integrations/agent-skill/) so your IDE agent
follows this pipeline automatically.

---

## Path B — Native OCR LLM review (legacy)

Use this path when you want **OCR's configured external LLM** to analyze diffs
directly (`ocr review` / `ocr scan`).

### Step 2B — Configure an LLM

```bash
ocr config provider
```

Non-interactive example:

```bash
ocr config set provider                    anthropic
ocr config set model                       claude-opus-4-6
ocr config set providers.anthropic.api_key sk-ant-xxxxxxxxxx
```

### Step 3B — Test connectivity

```bash
ocr llm test
```

### Step 4B — Run your first review

```bash
cd path/to/your-repo
ocr review                              # workspace
ocr review --from main --to feature-branch
ocr review --commit abc123
```

Preview without invoking the LLM:

```bash
ocr review --preview
ocr agent prepare --preview             # host-agent equivalent
```

Machine-readable output for scripts:

```bash
ocr review --format json --audience agent > review.json   # native OCR
ocr agent prepare --format json > bundle.json             # host-agent
```

> See [CLI Reference](../cli-reference/) for every flag. See
> [Migration](../migration/) when upgrading from `ocr codex`.

## See Also

- [Agent Skill](../integrations/agent-skill/) — host-agent workflow for IDE agents.
- [Migration](../migration/) — `ocr codex` → `ocr agent`, schema renames.
- [Installation](../installation/) — every install method and OCR's state directory.
- [Configuration](../configuration/) — env vars and provider setup (native OCR path).
- [Integrations](../integrations/) — Claude Code, CI, subprocess.
