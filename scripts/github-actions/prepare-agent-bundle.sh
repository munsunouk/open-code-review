#!/usr/bin/env bash
# Prepare a host-agent bundle; retry with --split when a single bundle is too large.
set -euo pipefail

BASE_REF="${1:?base ref required}"
HEAD_SHA="${2:?head sha required}"
OUTPUT="${3:-/tmp/bundle.json}"
STDERR_LOG="${4:-/tmp/agent-stderr.log}"

prepare_once() {
	local extra_flags=("$@")
	ocr agent prepare \
		--from "origin/${BASE_REF}" \
		--to "${HEAD_SHA}" \
		--format json \
		--output "${OUTPUT}" \
		"${extra_flags[@]}" \
		2>"${STDERR_LOG}"
}

if prepare_once; then
	cat "${STDERR_LOG}" || true
	exit 0
fi

echo "prepare-agent-bundle: single bundle failed; retrying with --split" >&2
cat "${STDERR_LOG}" || true
prepare_once --split
cat "${STDERR_LOG}" || true
