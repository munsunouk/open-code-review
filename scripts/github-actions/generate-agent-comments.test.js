#!/usr/bin/env node
"use strict";

const assert = require("assert");
const {
  buildPrompt,
  extractJsonText,
  normalizeComments,
  COMMENTS_SCHEMA,
} = require("./generate-agent-comments");

const sampleBundle = {
  bundle_id: "sha256:sample",
  files: [
    {
      path: "main.go",
      reviewable: true,
      rule_id: "default",
      patch: "@@ -1 +1 @@\n-var ok = false\n+var ok = true\n",
    },
    {
      path: "skip.go",
      reviewable: false,
      patch: "",
    },
  ],
};

assert.match(buildPrompt(sampleBundle), /sha256:sample/);
assert.match(buildPrompt(sampleBundle), /main.go/);
assert.doesNotMatch(buildPrompt(sampleBundle), /skip.go/);

assert.deepStrictEqual(
  JSON.parse(extractJsonText('{"comments":[]}')),
  { comments: [] },
);
assert.deepStrictEqual(
  JSON.parse(extractJsonText("```json\n{\"comments\":[]}\n```")),
  { comments: [] },
);

const normalized = normalizeComments(sampleBundle, {
  schema_version: COMMENTS_SCHEMA,
  bundle_id: "sha256:sample",
  summary: { files_reviewed: 1, issues_found: 0 },
  comments: [],
  warnings: [],
});
assert.strictEqual(normalized.bundle_id, "sha256:sample");
assert.strictEqual(normalized.summary.files_reviewed, 1);

assert.throws(
  () =>
    normalizeComments(sampleBundle, {
      schema_version: COMMENTS_SCHEMA,
      bundle_id: "sha256:other",
      comments: [],
    }),
  /bundle_id mismatch/,
);

console.log("generate-agent-comments tests passed");
