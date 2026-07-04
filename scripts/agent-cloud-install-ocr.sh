#!/usr/bin/env bash
# Install ocr from a fork branch for host-agent cloud environments.
#
# Canonical usage:
#
#   "install": "pnpm install && bash -c \"$(curl -fsSL https://raw.githubusercontent.com/munsunouk/open-code-review/cursor-agent-adapter/scripts/agent-cloud-install-ocr.sh)\""
#
# When open-code-review is already cloned as a sibling repo in a multi-repo environment:
#
#   OCR_SOURCE=checkout OCR_REPO_DIR=../open-code-review bash scripts/agent-cloud-install-ocr.sh
#
# Environment variables:
#   OCR_SOURCE          checkout | clone  (default: clone unless cmd/opencodereview exists in cwd)
#   OCR_FORK_URL        Git remote for clone mode (default: munsunouk fork)
#   OCR_BRANCH          Branch to build (default: cursor-agent-adapter)
#   OCR_REPO_DIR        Checkout root for checkout mode (default: parent of this script)
#   OCR_INSTALL_DIR     Install directory (default: /usr/local/bin if writable, else $HOME/.local/bin)
#   OCR_HOST_LABEL      Display label for logs/errors (default: Agent Cloud)
#   OCR_INSTALLER_NAME  Log prefix override (default: agent-cloud-install-ocr)
set -euo pipefail

OCR_FORK_URL="${OCR_FORK_URL:-https://github.com/munsunouk/open-code-review.git}"
OCR_BRANCH="${OCR_BRANCH:-cursor-agent-adapter}"
OCR_HOST_LABEL="${OCR_HOST_LABEL:-Agent Cloud}"
OCR_INSTALLER_NAME="${OCR_INSTALLER_NAME:-agent-cloud-install-ocr}"

log() {
	printf '%s: %s\n' "$OCR_INSTALLER_NAME" "$*"
}

die() {
	printf '%s: error: %s\n' "$OCR_INSTALLER_NAME" "$*" >&2
	exit 1
}

default_install_dir() {
	if [ -w /usr/local/bin ] 2>/dev/null; then
		printf '/usr/local/bin'
		return
	fi
	printf '%s/.local/bin' "$HOME"
}

OCR_INSTALL_DIR="${OCR_INSTALL_DIR:-$(default_install_dir)}"

ensure_go() {
	command -v go >/dev/null 2>&1 || die "go is required; add Go 1.25+ to the ${OCR_HOST_LABEL} Dockerfile or base image"
}

ensure_path() {
	mkdir -p "$OCR_INSTALL_DIR"
	export PATH="$OCR_INSTALL_DIR:$PATH"
	local profile="${HOME}/.bashrc"
	local path_line="export PATH=\"$OCR_INSTALL_DIR:\$PATH\""
	if { [ ! -e "$profile" ] || [ -w "$profile" ]; } && ! grep -Fqx "$path_line" "$profile" 2>/dev/null; then
		printf '\n%s\n' "$path_line" >>"$profile"
	fi
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
		git -C "$repo_root" fetch origin "$OCR_BRANCH" --depth 1
		git -C "$repo_root" checkout -B "$OCR_BRANCH" FETCH_HEAD
	fi

	build_ocr "$repo_root"
}

install_from_clone() {
	local tmpdir
	tmpdir="$(mktemp -d)"
	OCR_CLONE_TMPDIR="$tmpdir"
	trap 'rm -rf "$OCR_CLONE_TMPDIR"' EXIT

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
		local root
		if [ -n "${OCR_REPO_DIR:-}" ]; then
			root="$OCR_REPO_DIR"
		elif [ -f "./cmd/opencodereview/main.go" ]; then
			root="$PWD"
		else
			root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
		fi
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
