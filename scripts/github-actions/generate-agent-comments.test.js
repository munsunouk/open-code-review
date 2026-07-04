#!/usr/bin/env node
"use strict";

const assert = require("assert");
const {
  buildPrompt,
  callAnthropic,
  extractJsonText,
  normalizeComments,
  COMMENTS_SCHEMA,
  EVIDENCE_BEGIN,
  EVIDENCE_END,
  loadBundleDocument,
} = require("./generate-agent-comments");

const sampleBundle = {
  bundle_id: "sha256:sample",
  rules: {
    default: {
      source: "system",
      pattern: "**/*",
      content: "Always check bounds before indexing.",
    },
  },
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
assert.match(buildPrompt(sampleBundle), /Always check bounds before indexing/);
assert.ok(buildPrompt(sampleBundle).includes(EVIDENCE_BEGIN));
assert.ok(buildPrompt(sampleBundle).includes(EVIDENCE_END));
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

const manifestPath = require("path").join(
  require("os").tmpdir(),
  "ocr-manifest-test.json",
);
require("fs").writeFileSync(
  manifestPath,
  JSON.stringify({
    schema_version: "agent-review-manifest/v1",
    manifest_id: "sha256:manifest",
    bundles: [sampleBundle],
  }),
);
assert.strictEqual(loadBundleDocument(manifestPath).bundle_id, "sha256:sample");

async function testAnthropicRequestIncludesTokenCap() {
  const originalFetch = global.fetch;
  let requestBody;
  global.fetch = async (_url, init) => {
    requestBody = JSON.parse(init.body);
    return {
      ok: true,
      json: async () => ({ content: [{ type: "text", text: "{}" }] }),
    };
  };
  try {
    await callAnthropic({
      url: "https://example.test/messages",
      token: "token",
      model: "claude-test",
      prompt: "review",
    });
  } finally {
    global.fetch = originalFetch;
  }
  assert.strictEqual(requestBody.max_tokens, 8192);
}

testAnthropicRequestIncludesTokenCap()
  .then(() => {
    console.log("generate-agent-comments tests passed");
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
