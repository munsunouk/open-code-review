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
    if (script.includes("/tmp/comments.json")) {
      return script;
    }
  }

  throw new Error(`post review script not found in ${workflowPath}`);
}

function mockFs(resultText, stderrText) {
  return {
    readFileSync(file) {
      if (file === "/tmp/comments.json") return resultText;
      if (file === "/tmp/agent-stderr.log") return stderrText;
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
        listReviews: async () => ({
          data: options.existingReview
            ? [{ id: 12345, body: "<!-- ocr-review-run:1-1 -->\nexisting review" }]
            : [],
          headers: {},
        }),
        listReviewComments: async () => {
          if (options.listReviewCommentsError) {
            const error = new Error(options.listReviewCommentsError);
            error.status = options.listReviewCommentsStatus || 500;
            throw error;
          }
          return { data: options.reviewComments || [], headers: {} };
        },
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
        listComments: async () => ({ data: options.existingIssueComments || [], headers: {} }),
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
    process: {
      env: {
        ...process.env,
        OCR_MAX_RETRIES: "0",
        OCR_SUCCESS_DELAY: "0",
        OCR_FAILURE_DELAY: "0",
        OCR_READ_SUCCESS_DELAY: "0",
        OCR_LOW_REMAINING_SPACING: "0",
        ...(options.env || {}),
      },
    },
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

async function testUnknownPostedIdsAreSummarized(workflowPath) {
  const result = {
    comments: [
      {
        path: "src/app.js",
        content: "Unconfirmed inline content must remain visible in the summary.",
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
    bulkError: "server accepted review but response was lost",
    existingReview: true,
    listReviewCommentsError: "read API unavailable",
  });

  assert.strictEqual(github.createReviewCalls.length, 1);
  assert.strictEqual(github.issueComments.length, 1);
  const body = github.issueComments[0].body;
  assert.match(body, /Successfully posted: 0 comment\(s\)/);
  assert.match(body, /Failed to post: 1 comment\(s\)/);
  assert.match(body, /Unconfirmed inline content must remain visible/);
  assert.match(body, /posting status unknown/);
}

async function testSummaryTagTrustsOnlyActionsBot(workflowPath) {
  const result = {
    comments: [{
      path: "docs/no-line.md",
      content: "Summary-only content.",
      existing_code: "",
      suggestion_code: "",
      start_line: 0,
      end_line: 0,
    }],
    warnings: [],
  };
  const tag = "<!-- ocr-summary-run:1-1 -->";
  const cases = [
    { user: { type: "User", login: "fork-user" }, wantCreated: 1 },
    { user: { type: "Bot", login: "renovate[bot]" }, wantCreated: 1 },
    { user: { type: "Bot", login: "github-actions[bot]" }, wantCreated: 0 },
  ];

  for (const tc of cases) {
    const github = await runPostReviewScript(workflowPath, {
      fs: mockFs(JSON.stringify(result), ""),
      bulkError: "batch review failed",
      existingIssueComments: [{ user: tc.user, body: `${tag}\nexisting summary` }],
    });
    assert.strictEqual(
      github.issueComments.length,
      tc.wantCreated,
      `${workflowPath}: ${tc.user.login} summary suppression mismatch`
    );
  }
}

function testExistingReviewRetryHasGuard(workflowPath) {
  const content = fs.readFileSync(workflowPath, "utf8");
  assert.ok(
    content.includes("Could not list posted review comments") &&
      content.includes("Skipping inline retry to avoid duplicates"),
    "existing-review retry path should guard getPostedCommentIds failures"
  );
}

function testSummaryTagIsStable(workflowPath) {
  const content = fs.readFileSync(workflowPath, "utf8");
  assert.ok(
    !content.includes("SUMMARY_NONCE") &&
      content.includes("const SUMMARY_TAG = `<!-- ocr-summary-run:${RUN_TAG} -->`;"),
    "summary idempotency tag should be stable for a run attempt"
  );
}

async function main() {
  for (const workflowPath of workflowFiles) {
    testExistingReviewRetryHasGuard(workflowPath);
    testSummaryTagIsStable(workflowPath);
    await testSummaryTagTrustsOnlyActionsBot(workflowPath);
    await testFailedInlineCommentsAreSummarized(workflowPath);
    await testErrorCommentUsesSafeFence(workflowPath);
    await testUnknownPostedIdsAreSummarized(workflowPath);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
