#!/usr/bin/env node
"use strict";

const assert = require("assert");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const repoRoot = path.join(__dirname, "..", "..");
const workflowFiles = [
  ".github/workflows/ocr-review.yml",
  "examples/github_actions/ocr-review.yml",
];

function extractPostReviewScript(workflowPath) {
  const text = fs.readFileSync(path.join(repoRoot, workflowPath), "utf8");
  const lines = text.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const marker = line.match(/^(\s*)script:\s*\|\s*$/);
    if (!marker) continue;

    const blockIndent = marker[1].length + 2;
    const block = [];
    for (let j = i + 1; j < lines.length; j++) {
      const current = lines[j];
      if (current.trim() === "") {
        block.push("");
        continue;
      }
      const indent = current.match(/^ */)[0].length;
      if (indent < blockIndent) break;
      block.push(current.slice(blockIndent));
    }

    const script = block.join("\n");
    if (script.includes("/tmp/ocr-result.json")) {
      return script;
    }
  }

  throw new Error(`post review script not found in ${workflowPath}`);
}

function mockFs(resultText, stderrText) {
  return {
    readFileSync(file) {
      if (file === "/tmp/ocr-result.json") return resultText;
      if (file === "/tmp/ocr-stderr.log") return stderrText;
      throw new Error(`unexpected read: ${file}`);
    },
  };
}

function mockGithub(options) {
  const createReviewCalls = [];
  const issueComments = [];

  return {
    createReviewCalls,
    issueComments,
    rest: {
      pulls: {
        get: async () => ({ data: { head: { sha: "head-sha" } } }),
        listReviewComments: async () => ({ data: [], headers: {} }),
        createReview: async (params) => {
          createReviewCalls.push(params);
          if (createReviewCalls.length === 1 && options.bulkError) {
            throw new Error(options.bulkError);
          }
          if (createReviewCalls.length > 1 && options.individualError) {
            throw new Error(options.individualError);
          }
          return { data: {} };
        },
      },
      issues: {
        listComments: async () => ({ data: [], headers: {} }),
        createComment: async (params) => {
          issueComments.push(params);
          return { data: {} };
        },
      },
    },
  };
}

async function runPostReviewScript(workflowPath, options) {
  const script = extractPostReviewScript(workflowPath);
  const github = mockGithub(options);
  const context = {
    repo: { owner: "owner", repo: "repo" },
    issue: { number: 123 },
    eventName: "pull_request_target",
    runId: 1,
    runAttempt: 1,
    payload: { pull_request: { head: { sha: "head-sha" }, number: 123 } },
  };
  const sandbox = {
    github,
    context,
    crypto,
    process,
    setTimeout,
    clearTimeout,
    Promise,
    console: { log() {} },
    require(name) {
      if (name === "fs") return options.fs;
      if (name === "crypto") return crypto;
      throw new Error(`unexpected require: ${name}`);
    },
  };

  await vm.runInNewContext(`(async () => {\n${script}\n})()`, sandbox, {
    timeout: 5000,
  });

  return github;
}

async function testFailedInlineCommentsAreSummarized(workflowPath) {
  const result = {
    comments: [
      {
        path: "docs/no-line.md",
        content:
          "No-line content with a fenced block:\n\n```js\nconsole.log('still visible');\n```",
        existing_code: "",
        suggestion_code: "",
        start_line: 0,
        end_line: 0,
      },
      {
        path: "src/app.js",
        content: "Failed inline content must remain visible in the PR summary.",
        existing_code: "oldCall();",
        suggestion_code: "newCall();",
        start_line: 10,
        end_line: 10,
      },
    ],
    warnings: [],
  };

  const github = await runPostReviewScript(workflowPath, {
    fs: mockFs(JSON.stringify(result), ""),
    bulkError: 'Unprocessable Entity: "Line could not be resolved"',
    individualError: 'Unprocessable Entity: "Line could not be resolved"',
  });

  assert.strictEqual(github.createReviewCalls.length, 2);
  assert.strictEqual(github.issueComments.length, 1);
  const body = github.issueComments[0].body;
  assert.match(body, /No-line content with a fenced block/);
  assert.match(body, /Failed inline content must remain visible/);
  assert.match(body, /Line could not be resolved/);
}

async function testErrorCommentUsesSafeFence(workflowPath) {
  const github = await runPostReviewScript(workflowPath, {
    fs: mockFs("not json", "stderr includes a fence\n```js\nbroken();\n```"),
  });

  assert.strictEqual(github.issueComments.length, 1);
  const body = github.issueComments[0].body;
  assert.match(body, /\n````\nstderr includes a fence/);
}

function testSummaryTagIdempotencyMatcher() {
  const tag = "<!-- ocr-summary-run:42-1:deadbeef -->";
  const matcher = (comments, id, requireActionsBot = false) =>
    comments.some((c) => {
      if (requireActionsBot && !(c.user && c.user.type === "Bot" && String(c.user.login || "").endsWith("[bot]"))) {
        return false;
      }
      const body = c.body || "";
      if (id.startsWith("<!--")) {
        return body.startsWith(id);
      }
      const escaped = id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const tagRe = new RegExp("<!--\\s*" + escaped + "\\s*-->");
      return tagRe.test(body);
    });

  assert.strictEqual(
    matcher(
      [{ user: { type: "Bot", login: "github-actions[bot]" }, body: `${tag}\nsummary` }],
      tag,
      true
    ),
    true,
    "bot-authored summary tag at body start should match"
  );
  assert.strictEqual(
    matcher(
      [{ user: { type: "User", login: "fork-user" }, body: `${tag}\nsummary` }],
      tag,
      true
    ),
    false,
    "fork user comment must not suppress summary posting"
  );
}

function testExistingReviewRetryHasGuard(workflowPath) {
  const content = fs.readFileSync(workflowPath, "utf8");
  assert.ok(
    content.includes("Could not list posted review comments") &&
      content.includes("Skipping inline retry to avoid duplicates"),
    "existing-review retry path should guard getPostedCommentIds failures"
  );
}

async function main() {
  testSummaryTagIdempotencyMatcher();
  for (const workflowPath of workflowFiles) {
    testExistingReviewRetryHasGuard(workflowPath);
    await testFailedInlineCommentsAreSummarized(workflowPath);
    await testErrorCommentUsesSafeFence(workflowPath);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
