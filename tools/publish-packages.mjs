#!/usr/bin/env node

/**
 * Publish every non-private workspace package in dependency order, continuing
 * past failures.
 *
 * A shell chain (`npm publish -w a && npm publish -w b && …`) stops at the
 * first failure, so one misconfigured package — a new package without a trusted
 * publisher, for example — leaves every later package unpublished. This script
 * publishes each package on its own:
 *
 * - a version already on the registry is skipped, so re-running after a partial
 *   release does not fail with "cannot publish over the previously published
 *   version";
 * - a failed package does not stop unrelated packages, but its dependents are
 *   skipped, because publishing them would point at a version that does not
 *   exist;
 * - the outcome of every package is summarised at the end, and the exit code is
 *   non-zero when anything failed or was skipped for that reason, so CI still
 *   reports an incomplete release.
 *
 * Usage:
 *   node tools/publish-packages.mjs [--dry-run] [--registry <url>]
 *
 * Set `npm_config_otp` when the account requires a one-time password.
 */

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = join(dirname(fileURLToPath(import.meta.url)), "..");
const npm = process.platform === "win32" ? "npm.cmd" : "npm";

const argv = process.argv.slice(2);
const dryRun = argv.includes("--dry-run");
const registry = (() => {
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--registry") return argv[i + 1] ?? "";
    if (argv[i].startsWith("--registry=")) {
      return argv[i].slice("--registry=".length);
    }
  }
  return "";
})();
const registryArgs = registry ? ["--registry", registry] : [];

const DEPENDENCY_FIELDS = [
  "dependencies",
  "peerDependencies",
  "optionalDependencies",
];

function readJson(file) {
  return JSON.parse(readFileSync(file, "utf8"));
}

function loadPackages() {
  const packagesDir = join(rootDir, "packages");
  const manifests = readdirSync(packagesDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(packagesDir, entry.name, "package.json"))
    .filter((file) => existsSync(file));

  const packages = manifests
    .map((file) => readJson(file))
    .filter(
      (json) =>
        typeof json.name === "string" &&
        typeof json.version === "string" &&
        json.private !== true,
    )
    .map((json) => ({
      name: json.name,
      version: json.version,
      json,
    }));

  const known = new Set(packages.map((pkg) => pkg.name));
  for (const pkg of packages) {
    const deps = new Set();
    for (const field of DEPENDENCY_FIELDS) {
      for (const dep of Object.keys(pkg.json[field] ?? {})) {
        if (known.has(dep)) deps.add(dep);
      }
    }
    pkg.deps = [...deps];
    delete pkg.json;
  }
  return packages;
}

/** Kahn's algorithm; ties are broken by name so the order is deterministic. */
function dependencyOrder(packages) {
  const byName = new Map(packages.map((pkg) => [pkg.name, pkg]));
  const pending = new Set(byName.keys());
  const ordered = [];

  while (pending.size > 0) {
    const ready = [...pending]
      .filter((name) => byName.get(name).deps.every((dep) => !pending.has(dep)))
      .sort();
    if (ready.length === 0) {
      // A cycle cannot be published in any order; keep the remaining packages
      // so the summary reports them instead of hanging.
      ordered.push(...[...pending].sort().map((name) => byName.get(name)));
      break;
    }
    for (const name of ready) {
      ordered.push(byName.get(name));
      pending.delete(name);
    }
  }
  return ordered;
}

function registryError(name, result) {
  return `cannot query the registry for ${name}:\n${`${result.stdout ?? ""}${result.stderr ?? ""}`.trim()}`;
}

/** Versions already on the registry; an unknown package means "none". */
function publishedVersions(name) {
  const result = spawnSync(
    npm,
    ["view", name, "versions", "--json", ...registryArgs],
    { cwd: rootDir, encoding: "utf8" },
  );
  if (result.error) throw new Error(registryError(name, result));

  if (result.status !== 0) {
    const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;
    if (/E404|404 Not Found|is not in this registry/.test(output)) return [];
    throw new Error(registryError(name, result));
  }

  const parsed = JSON.parse(result.stdout || "[]");
  return Array.isArray(parsed) ? parsed : [parsed];
}

function publishPackage(pkg) {
  const args = [
    "publish",
    "-w",
    pkg.name,
    "--access",
    "public",
    ...registryArgs,
  ];
  if (dryRun) args.push("--dry-run");
  const result = spawnSync(npm, args, { cwd: rootDir, stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`npm publish exited with code ${result.status}`);
  }
}

const packages = dependencyOrder(loadPackages());
const outcome = new Map();
const summary = [];
let published = 0;
let alreadyPublished = 0;
let failed = 0;
let skipped = 0;

for (const pkg of packages) {
  const label = `${pkg.name}@${pkg.version}`;
  const blockedBy = pkg.deps.find((dep) =>
    ["failed", "skipped"].includes(outcome.get(dep)),
  );

  if (blockedBy) {
    outcome.set(pkg.name, "skipped");
    skipped += 1;
    summary.push({
      label,
      state: "skipped",
      reason: `dependency ${blockedBy} was not published`,
    });
    continue;
  }

  console.log(`\n=== ${label}`);

  try {
    if (publishedVersions(pkg.name).includes(pkg.version)) {
      outcome.set(pkg.name, "already");
      alreadyPublished += 1;
      console.log(
        `- skip ${label}: already on the registry${dryRun ? " (dry run)" : ""}`,
      );
      summary.push({
        label,
        state: "already",
        reason: "already on the registry",
      });
      continue;
    }

    publishPackage(pkg);
    outcome.set(pkg.name, "published");
    published += 1;
    summary.push({ label, state: "published" });
  } catch (error) {
    outcome.set(pkg.name, "failed");
    failed += 1;
    console.error(`- FAILED ${label}: ${error.message}`);
    summary.push({ label, state: "failed", reason: error.message });
  }
}

console.log("\n=== publish summary");
for (const { label, state, reason } of summary) {
  console.log(`- ${state.padEnd(9)} ${label}${reason ? ` (${reason})` : ""}`);
}

if (failed > 0 || skipped > 0) {
  if (failed > 0) console.error(`\n${failed} package(s) failed to publish.`);
  if (skipped > 0) {
    console.error(
      `${skipped} package(s) were skipped because a dependency failed.`,
    );
  }
  process.exit(1);
}

console.log(
  `\nAll ${packages.length} package(s) are on the registry ` +
    `(${published} published${dryRun ? " dry-run" : ""}, ` +
    `${alreadyPublished} already present).`,
);
