#!/usr/bin/env node
"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const script = fs.readFileSync(
  path.join(__dirname, "run-host-agent-review.sh"),
  "utf8",
);

assert.match(script, /is_manifest\(\)/);
assert.match(script, /report_parts/);
assert.match(script, /ocr agent validate-comments/);
assert.match(script, /ocr agent report[\s\S]*--bundle "\$\{slice\}"/);
assert.match(script, /jq -s[\s\S]*comments: \(\[\.\[\]\.comments\] \| add\)/);

console.log("run-host-agent-review tests passed");
