#!/usr/bin/env node

/**
 * Run a package's bundled Node tests under coverage and enforce thresholds.
 *
 * Node's coverage report is easy to make silently vacuous, which is why this
 * owns the test process instead of parsing a hand-written pipeline:
 *
 *   - Node drops `node_modules/**` and `coverage/**` from the report without
 *     warning. A bundle written to either place produces a report with no file
 *     rows at all, whose `all files` row still reads 100% and so satisfies any
 *     threshold. Bundle somewhere else, and never into a `coverage/` folder.
 *   - Without `--enable-source-maps` the report is attributed to the bundle
 *     rather than the `src/**` TypeScript it was built from, so the per-file
 *     numbers are unusable and the total is diluted by the test code itself.
 *
 * The `all files` row is therefore not trusted on its own: a report carrying
 * no file rows fails instead of counting as perfect coverage.
 *
 * Node versions disagree on the exact line percentage they attribute through a
 * source map, so the thresholds are floors with room to spare rather than
 * tight targets. They are calibrated against the Node version CI runs.
 *
 * Usage:
 *   node tools/coverage.mjs <bundle-dir> [--min-line N] [--min-branch N]
 *                                        [--min-func N]
 *
 * <bundle-dir> is a disposable build artifact and is deleted on exit.
 */

import { spawn } from "node:child_process";
import { readdirSync, rmSync, statSync } from "node:fs";
import { basename, join } from "node:path";

const BUNDLE_EXTENSIONS = [".mjs", ".map"];

const THRESHOLD_FLAGS = {
  "--min-line": "line",
  "--min-branch": "branch",
  "--min-func": "func",
};

function fail(message) {
  console.error(`\n❌ ${message}`);
  process.exit(1);
}

function parseArgs(argv) {
  const thresholds = { line: 0, branch: 0, func: 0 };
  let bundleDir = "";

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const threshold = THRESHOLD_FLAGS[arg];

    if (threshold) {
      const value = Number.parseFloat(argv[i + 1]);
      if (Number.isNaN(value)) {
        fail(`${arg} requires a number, got: ${argv[i + 1] ?? "(nothing)"}`);
      }
      thresholds[threshold] = value;
      i += 1;
      continue;
    }

    if (arg.startsWith("-")) fail(`Unknown option: ${arg}`);
    if (bundleDir) fail(`Unexpected extra argument: ${arg}`);
    bundleDir = arg;
  }

  if (!bundleDir) {
    fail("Usage: node tools/coverage.mjs <bundle-dir> [--min-line N]");
  }

  return { bundleDir, thresholds };
}

function collectTestBundles(bundleDir) {
  try {
    if (!statSync(bundleDir).isDirectory()) {
      fail(`Not a directory: ${bundleDir}`);
    }
  } catch {
    fail(`Bundle directory not found: ${bundleDir}`);
  }

  const bundles = readdirSync(bundleDir)
    .filter((name) => name.endsWith(".mjs"))
    .sort()
    .map((name) => join(bundleDir, name));

  if (bundles.length === 0) {
    fail(`No test bundles (*.mjs) found in ${bundleDir}`);
  }

  return bundles;
}

/**
 * Only remove a directory that still looks like the bundle we were handed, so
 * that a mistyped argument cannot delete sources.
 */
function removeBundleDir(bundleDir) {
  let entries;
  try {
    entries = readdirSync(bundleDir, { withFileTypes: true });
  } catch {
    return;
  }

  const bundlesOnly = entries.every(
    (entry) =>
      entry.isFile() &&
      BUNDLE_EXTENSIONS.some((extension) => entry.name.endsWith(extension)),
  );

  if (!bundlesOnly) {
    console.warn(
      `⚠️  Left ${bundleDir} in place: it holds more than test bundles.`,
    );
    return;
  }

  rmSync(bundleDir, { recursive: true, force: true });
}

/**
 * Node 24 drops test files from the report on its own; Node 22 counts them,
 * which inflates the total with the near-fully-executed test code. Normalise
 * the two where the flag exists (Node >= 22.5).
 */
function coverageExcludeArgs() {
  const [major, minor] = process.versions.node.split(".").map(Number);
  const supported = major > 22 || (major === 22 && minor >= 5);
  return supported ? ["--test-coverage-exclude=**/test/**"] : [];
}

function runTests(bundles) {
  const child = spawn(
    process.execPath,
    [
      "--enable-source-maps",
      "--test",
      "--experimental-test-coverage",
      ...coverageExcludeArgs(),
      ...bundles,
    ],
    { stdio: ["inherit", "pipe", "inherit"] },
  );

  let stdout = "";
  child.stdout.setEncoding("utf8");
  child.stdout.on("data", (chunk) => {
    process.stdout.write(chunk);
    stdout += chunk;
  });

  return new Promise((resolvePromise, rejectPromise) => {
    child.on("error", rejectPromise);
    child.on("close", (code) => resolvePromise({ code, stdout }));
  });
}

/**
 * Node colours the report when it thinks a human is watching, which wraps every
 * percentage in escape sequences (`\e[33m 85.83\e[34m`) that parse as NaN. The
 * echoed copy keeps its colours; only the copy we read is stripped.
 */
const ANSI_SEQUENCE = new RegExp(
  `${String.fromCharCode(27)}\\[[0-9;]*[A-Za-z]`,
  "g",
);

/**
 * Parse the table Node prints between the coverage report markers. Separator
 * rules, the column header, and directory group rows all lack a numeric line
 * percentage, which is what separates them from measured files.
 */
function parseReport(stdout) {
  let inReport = false;
  let totals = null;
  let measuredFiles = 0;

  for (const rawLine of stdout.split("\n")) {
    const reportLine = rawLine.replace(ANSI_SEQUENCE, "");

    if (reportLine.includes("start of coverage report")) {
      inReport = true;
      continue;
    }
    if (reportLine.includes("end of coverage report")) {
      inReport = false;
      continue;
    }
    if (!inReport) continue;

    const cells = reportLine.split("|").map((cell) => cell.trim());
    if (cells.length < 4) continue;

    const line = Number.parseFloat(cells[1]);
    if (Number.isNaN(line)) continue;

    if (cells[0].endsWith("all files")) {
      totals = {
        line,
        branch: Number.parseFloat(cells[2]),
        func: Number.parseFloat(cells[3]),
      };
      continue;
    }

    measuredFiles += 1;
  }

  return { totals, measuredFiles };
}

async function main() {
  const { bundleDir, thresholds } = parseArgs(process.argv.slice(2));
  const bundles = collectTestBundles(bundleDir);

  let result;
  try {
    result = await runTests(bundles);
  } finally {
    removeBundleDir(bundleDir);
  }

  if (result.code !== 0) {
    fail(`Tests failed (exit code ${result.code}); coverage not evaluated.`);
  }

  const { totals, measuredFiles } = parseReport(result.stdout);

  if (!totals) fail("No coverage report found in the test output.");

  if (measuredFiles === 0) {
    fail(
      `Coverage report lists no files, so its ${totals.line.toFixed(2)}% ` +
        `total is meaningless.\n` +
        `   Node excludes node_modules/** and coverage/** from coverage: ` +
        `move the\n   test bundle (${basename(bundleDir)}) out of both.`,
    );
  }

  const checks = [
    ["line", totals.line, thresholds.line],
    ["branch", totals.branch, thresholds.branch],
    ["function", totals.func, thresholds.func],
  ];

  const failures = checks.filter(([, actual, minimum]) => actual < minimum);
  const measured = measuredFiles === 1 ? "1 file" : `${measuredFiles} files`;

  if (failures.length > 0) {
    fail(
      `Coverage below threshold across ${measured}:\n` +
        failures
          .map(
            ([label, actual, minimum]) =>
              `   ${label}: ${actual.toFixed(2)}% < ${minimum}%`,
          )
          .join("\n"),
    );
  }

  const summary = checks
    .map(
      ([label, actual, minimum]) =>
        `${label} ${actual.toFixed(2)}% ≥ ${minimum}%`,
    )
    .join(", ");

  console.log(`\n✅ Coverage over ${measured}: ${summary}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
