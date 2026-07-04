#!/usr/bin/env bash
# Build ocr from a trusted checkout (used by GHA host-agent workflows).
set -euo pipefail

SRC_DIR="${1:-.}"
INSTALL_DIR="${2:-/usr/local/bin}"

if [ ! -f "${SRC_DIR}/cmd/opencodereview/main.go" ]; then
	echo "install-ocr-from-source: missing ${SRC_DIR}/cmd/opencodereview" >&2
	exit 1
fi

mkdir -p "${INSTALL_DIR}"
export GOTOOLCHAIN=auto
(
	cd "${SRC_DIR}"
	go build -o "${INSTALL_DIR}/ocr" ./cmd/opencodereview
)

if ! command -v ocr >/dev/null 2>&1; then
	export PATH="${INSTALL_DIR}:${PATH}"
fi

if ! ocr agent prepare --help >/dev/null 2>&1; then
	echo "install-ocr-from-source: built ocr lacks ocr agent subcommand" >&2
	exit 1
fi

echo "install-ocr-from-source: $(ocr version 2>/dev/null || echo ocr installed)"
