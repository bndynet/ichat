#!/usr/bin/env node
/**
 * Reject commit messages that do not match the Conventional Commits subset this
 * repo already uses in history: `type(scope)!: subject`, with an optional body
 * separated from the header by one blank line.
 *
 * Dependency-free on purpose (no commitlint): the hook must work on a fresh
 * clone right after `npm install`, and it should not pull new packages into the
 * lockfile just to check a string. Messages that git generates itself — merge,
 * revert and `rebase --autosquash` — are passed through untouched.
 *
 * Usage: node tools/check-commit-msg.mjs <path-to-message-file>
 */

import fs from "node:fs";

const TYPES = [
  "feat",
  "fix",
  "docs",
  "style",
  "refactor",
  "perf",
  "test",
  "build",
  "ci",
  "chore",
  "revert",
];

const MAX_HEADER_LENGTH = 100;
const HEADER_PATTERN = new RegExp(
  `^(${TYPES.join("|")})(?:\\(([^()]+)\\))?(!)?: (\\S.*)$`,
);
const EMPTY_SUBJECT_PATTERN = new RegExp(
  `^(${TYPES.join("|")})(?:\\([^()]*\\))?!?:\\s*$`,
);

// Written by git, not by a human; rewriting them would break merges, reverts
// (`git revert` quotes the reverted subject) and `git rebase --autosquash`.
const GENERATED_HEADERS = [
  /^Merge (?:branch|remote-tracking branch|pull request|tag) /,
  /^Revert "/,
  /^(?:fixup|squash|amend)! /,
];

let header = "";

const file = process.argv[2];
if (!file) {
  fail("Usage: node tools/check-commit-msg.mjs <path-to-message-file>");
}

let raw;
try {
  raw = fs.readFileSync(file, "utf8");
} catch {
  fail(`Cannot read the commit message file: ${file}`);
}

// `git commit -v` and merge messages carry "#" comment lines; strip them before
// validating so the header is a line of the message rather than a helper hint.
const lines = raw.split(/\r?\n/).filter((line) => !line.startsWith("#"));
while (lines.length > 0 && lines[lines.length - 1].trim() === "") {
  lines.pop();
}

if (lines.length === 0) {
  fail("The commit message is empty.");
}

header = lines[0].trim();
const body = lines.slice(1);

if (GENERATED_HEADERS.some((pattern) => pattern.test(header))) {
  process.exit(0);
}

const problems = [];

if (header.length > MAX_HEADER_LENGTH) {
  problems.push(
    `The header is ${header.length} characters long; keep it within ${MAX_HEADER_LENGTH}.`,
  );
}

const match = HEADER_PATTERN.exec(header);
if (!match) {
  problems.push(
    EMPTY_SUBJECT_PATTERN.test(header)
      ? "The subject after the colon must not be empty."
      : 'The header must look like "type(scope): subject", e.g. "feat(bookmarks): add a standalone rail".',
  );
} else {
  const scope = match[2];
  const subject = match[4];

  if (scope !== undefined && !/^[a-z0-9][a-z0-9./-]*$/.test(scope)) {
    problems.push(
      `The scope "${scope}" must be lowercase and use only letters, digits, ".", "/" and "-".`,
    );
  }

  if (subject.endsWith(".")) {
    problems.push("The subject must not end with a period.");
  }
}

if (body.length > 0 && body[0].trim() !== "") {
  problems.push("Separate the header from the body with one blank line.");
}

if (problems.length > 0) {
  fail(problems);
}

// Valid commit: print nothing so `git commit` shows only git's own output.
process.exit(0);

function fail(problems) {
  const list = Array.isArray(problems) ? problems : [problems];

  console.error(
    [
      "",
      `✖ Invalid commit message: ${JSON.stringify(header)}`,
      "",
      ...list.map((problem) => `  - ${problem}`),
      "",
      `  Types: ${TYPES.join(", ")}`,
      '  Example: "fix(chat-messages): keep auto-scroll following while reasoning streams"',
      "",
      "  Merge, revert and autosquash messages are exempt.",
      "  Bypass this check once with: git commit --no-verify",
      "",
    ].join("\n"),
  );

  process.exit(1);
}
