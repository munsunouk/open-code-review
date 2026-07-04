#!/usr/bin/env bash
# Compatibility wrapper for users still calling the Codex Cloud install entrypoint.
set -euo pipefail

OCR_HOST_LABEL="${OCR_HOST_LABEL:-Codex Cloud}"
OCR_INSTALLER_NAME="${OCR_INSTALLER_NAME:-codex-cloud-install-ocr}"

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" 2>/dev/null && pwd || pwd)"
local_script="${script_dir}/agent-cloud-install-ocr.sh"

if [ -f "$local_script" ]; then
	exec env \
		OCR_HOST_LABEL="$OCR_HOST_LABEL" \
		OCR_INSTALLER_NAME="$OCR_INSTALLER_NAME" \
		bash "$local_script" "$@"
fi

install_repo="${OCR_SCRIPT_REPO:-munsunouk/open-code-review}"
install_ref="${OCR_SCRIPT_REF:-cursor-agent-adapter}"
install_script_url="https://raw.githubusercontent.com/${install_repo}/${install_ref}/scripts/agent-cloud-install-ocr.sh"

curl -fsSL "$install_script_url" | env \
	OCR_HOST_LABEL="$OCR_HOST_LABEL" \
	OCR_INSTALLER_NAME="$OCR_INSTALLER_NAME" \
	bash -s -- "$@"
