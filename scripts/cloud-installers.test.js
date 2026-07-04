#!/usr/bin/env node
"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const repoRoot = path.join(__dirname, "..");

function readScript(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

function main() {
  const genericScript = readScript("scripts/agent-cloud-install-ocr.sh");

  assert.match(genericScript, /host-agent cloud environments/);
  assert.match(genericScript, /OCR_HOST_LABEL="\$\{OCR_HOST_LABEL:-Agent Cloud\}"/);
  assert.match(genericScript, /OCR_INSTALLER_NAME="\$\{OCR_INSTALLER_NAME:-agent-cloud-install-ocr\}"/);
  assert.match(genericScript, /go build -o "\$OCR_INSTALL_DIR\/ocr" \.\/cmd\/opencodereview/);
  assert.match(genericScript, /git clone --depth 1 --branch "\$OCR_BRANCH" "\$OCR_FORK_URL" "\$tmpdir"/);
  assert.doesNotMatch(genericScript, /Compatibility wrapper/);
}

main();
