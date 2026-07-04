#!/usr/bin/env node
"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const repoRoot = path.join(__dirname, "..");

function readScript(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

function assertWrapperScript(script, { label, installerName }) {
  assert.match(script, new RegExp(`OCR_HOST_LABEL="\\$\\{OCR_HOST_LABEL:-${label}\\}"`));
  assert.match(script, new RegExp(`OCR_INSTALLER_NAME="\\$\\{OCR_INSTALLER_NAME:-${installerName}\\}"`));
  assert.match(script, /agent-cloud-install-ocr\.sh/);
  assert.match(script, /curl -fsSL "\$install_script_url" \| env/);
  assert.match(script, /exec env/);
  assert.doesNotMatch(script, /go build -o "\$OCR_INSTALL_DIR\/ocr"/);
}

function main() {
  const genericScript = readScript("scripts/agent-cloud-install-ocr.sh");
  const cursorScript = readScript("scripts/cursor-cloud-install-ocr.sh");
  const codexScript = readScript("scripts/codex-cloud-install-ocr.sh");

  assert.match(genericScript, /host-agent cloud environments/);
  assert.match(genericScript, /OCR_HOST_LABEL="\$\{OCR_HOST_LABEL:-Agent Cloud\}"/);
  assert.match(genericScript, /OCR_INSTALLER_NAME="\$\{OCR_INSTALLER_NAME:-agent-cloud-install-ocr\}"/);
  assert.match(genericScript, /go build -o "\$OCR_INSTALL_DIR\/ocr" \.\/cmd\/opencodereview/);
  assert.match(genericScript, /git clone --depth 1 --branch "\$OCR_BRANCH" "\$OCR_FORK_URL" "\$tmpdir"/);

  assertWrapperScript(cursorScript, {
    label: "Cursor Cloud",
    installerName: "cursor-cloud-install-ocr",
  });

  assertWrapperScript(codexScript, {
    label: "Codex Cloud",
    installerName: "codex-cloud-install-ocr",
  });
}

main();
