#!/usr/bin/env bash
# Install ocr from a fork branch for Cursor Cloud Agent environments.
#
# Use in the environment "install" / update command (Cursor Dashboard → Cloud Agents)
# or in .cursor/environment.json:
#
#   "install": "pnpm install && bash -c \"$(curl -fsSL https://raw.githubusercontent.com/munsunouk/open-code-review/cursor-agent-adapter/scripts/cursor-cloud-install-ocr.sh)\""
#
# When open-code-review is already cloned as a sibling repo in a multi-repo environment:
#
#   OCR_SOURCE=checkout OCR_REPO_DIR=../open-code-review bash scripts/cursor-cloud-install-ocr.sh
#
# Environment variables:
#   OCR_SOURCE        checkout | clone  (default: clone unless cmd/opencodereview exists in cwd)
#   OCR_FORK_URL      Git remote for clone mode (default: munsunouk fork)
#   OCR_BRANCH        Branch to build (default: cursor-agent-adapter)
#   OCR_REPO_DIR      Checkout root for checkout mode (default: parent of this script)
#   OCR_INSTALL_DIR   Install directory (default: /usr/local/bin if writable, else $(go env GOPATH)/bin)
set -euo pipefail

OCR_FORK_URL="${OCR_FORK_URL:-https://github.com/munsunouk/open-code-review.git}"
OCR_BRANCH="${OCR_BRANCH:-cursor-agent-adapter}"

log() {
	printf 'cursor-cloud-install-ocr: %s\n' "$*"
}

die() {
	printf 'cursor-cloud-install-ocr: error: %s\n' "$*" >&2
	exit 1
}

default_install_dir() {
	if [ -w /usr/local/bin ] 2>/dev/null; then
		printf '/usr/local/bin'
		return
	fi
	printf '%s/bin' "$(go env GOPATH)"
}

OCR_INSTALL_DIR="${OCR_INSTALL_DIR:-$(default_install_dir)}"

ensure_go() {
	command -v go >/dev/null 2>&1 || die "go is required; add Go 1.25+ to the Cursor Cloud Dockerfile or base image"
}

ensure_path() {
	mkdir -p "$OCR_INSTALL_DIR"
	export PATH="$OCR_INSTALL_DIR:$PATH"
}

build_ocr() {
	local src_dir="$1"
	[ -f "$src_dir/cmd/opencodereview/main.go" ] || die "missing $src_dir/cmd/opencodereview"
	(
		cd "$src_dir"
		go build -o "$OCR_INSTALL_DIR/ocr" ./cmd/opencodereview
	)
}

install_from_checkout() {
	local repo_root="$1"
	repo_root="$(cd "$repo_root" && pwd)"
	log "building ocr from checkout at $repo_root (branch: $(git -C "$repo_root" rev-parse --abbrev-ref HEAD 2>/dev/null || echo unknown))"

	if [ -n "${OCR_BRANCH:-}" ]; then
		git -C "$repo_root" fetch origin "$OCR_BRANCH" --depth 1 2>/dev/null || true
		git -C "$repo_root" checkout "$OCR_BRANCH" 2>/dev/null || true
	fi

	build_ocr "$repo_root"
}

install_from_clone() {
	local tmpdir
	tmpdir="$(mktemp -d)"
	trap 'rm -rf "$tmpdir"' EXIT

	log "cloning $OCR_FORK_URL (branch: $OCR_BRANCH)"
	git clone --depth 1 --branch "$OCR_BRANCH" "$OCR_FORK_URL" "$tmpdir"
	build_ocr "$tmpdir"
}

verify_install() {
	command -v ocr >/dev/null 2>&1 || die "ocr not found on PATH after install"
	log "installed $(ocr version 2>/dev/null || ocr --help 2>&1 | head -n1)"
}

main() {
	ensure_go
	ensure_path

	local source="${OCR_SOURCE:-}"
	if [ -z "$source" ]; then
		if [ -f "./cmd/opencodereview/main.go" ]; then
			source="checkout"
		elif [ -n "${OCR_REPO_DIR:-}" ] && [ -f "${OCR_REPO_DIR}/cmd/opencodereview/main.go" ]; then
			source="checkout"
		else
			source="clone"
		fi
	fi

	case "$source" in
	checkout)
		local root="${OCR_REPO_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
		install_from_checkout "$root"
		;;
	clone)
		install_from_clone
		;;
	*)
		die "unknown OCR_SOURCE: $source (expected checkout or clone)"
		;;
	esac

	verify_install
	log "done; ocr is available at $OCR_INSTALL_DIR/ocr"
}

main "$@"
