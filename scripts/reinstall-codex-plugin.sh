#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PLUGIN_SRC="${REPO_ROOT}/plugins/open-code-review"
SKILL_SRC="${REPO_ROOT}/skills/open-code-review"

if [[ ! -d "${PLUGIN_SRC}" ]]; then
  echo "plugin source not found: ${PLUGIN_SRC}" >&2
  exit 1
fi

echo "Open Code Review — refresh Codex plugin skill from repo checkout"
echo "Repo: ${REPO_ROOT}"

if command -v codex >/dev/null 2>&1; then
  echo "Attempting codex plugin refresh (optional; subcommands vary by Codex version)..."
  codex plugin install "${PLUGIN_SRC}" 2>/dev/null || true
  codex plugin update open-code-review 2>/dev/null || true
fi

CACHE_ROOT="${HOME}/.codex/plugins/cache/open-code-review/open-code-review"
if [[ -d "${CACHE_ROOT}" ]]; then
  while IFS= read -r version_dir; do
    target_skills="${version_dir}/skills/open-code-review"
    mkdir -p "$(dirname "${target_skills}")"
    rm -rf "${target_skills}"
    cp -R "${SKILL_SRC}" "${target_skills}"
    echo "Synced skill → ${target_skills}"
  done < <(find "${CACHE_ROOT}" -mindepth 1 -maxdepth 1 -type d)
else
  echo "No Codex cache at ${CACHE_ROOT}."
  echo "Install once from ${REPO_ROOT}/.agents/plugins/marketplace.json, then re-run this script."
fi

echo "Done. Restart Codex or reload plugins if the skill text still looks stale."
