#!/usr/bin/env node
/**
 * Bump a single semver across all npm workspaces and sync internal @bndynet/chat-* ranges.
 *
 * Usage: npm run version -- <major|minor|patch>
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");

const RELEASE = process.argv[2];

const DEP_FIELDS = [
  "dependencies",
  "devDependencies",
  "peerDependencies",
  "optionalDependencies",
];

function usage() {
  console.error(
    "Usage: npm run version -- <major|minor|patch>\n\nExample: npm run version -- patch",
  );
}

function parseSemver(v) {
  const m = /^(\d+)\.(\d+)\.(\d+)$/.exec(v.trim());
  if (!m) return null;
  return { major: Number(m[1]), minor: Number(m[2]), patch: Number(m[3]) };
}

function bumpSemver(version, release) {
  const p = parseSemver(version);
  if (!p) throw new Error(`Invalid semver (expected x.y.z): ${version}`);
  if (release === "major") {
    return `${p.major + 1}.0.0`;
  }
  if (release === "minor") {
    return `${p.major}.${p.minor + 1}.0`;
  }
  if (release === "patch") {
    return `${p.major}.${p.minor}.${p.patch + 1}`;
  }
  throw new Error(`Invalid release: ${release}`);
}

function expandWorkspaceGlobs(workspaces) {
  const dirs = [];
  for (const pattern of workspaces) {
    if (!pattern.endsWith("/*")) {
      throw new Error(`Unsupported workspace pattern: ${pattern}`);
    }
    const base = path.join(rootDir, pattern.slice(0, -2));
    if (!fs.existsSync(base)) continue;
    for (const name of fs.readdirSync(base, { withFileTypes: true })) {
      if (!name.isDirectory()) continue;
      const pkgPath = path.join(base, name.name, "package.json");
      if (fs.existsSync(pkgPath)) dirs.push(pkgPath);
    }
  }
  return dirs.sort();
}

function loadJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function writeJson(file, data) {
  fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function isInternalDepName(name, internalNames) {
  return internalNames.has(name);
}

function shouldRewriteDepValue(value) {
  if (typeof value !== "string") return false;
  if (value.startsWith("file:")) return false;
  if (value.startsWith("workspace:")) return false;
  if (value === "*") return false;
  // caret/tilde/exact x.y.z
  return /^[\^~]?\d+\.\d+\.\d+/.test(value.trim());
}

function main() {
  if (!RELEASE || !["major", "minor", "patch"].includes(RELEASE)) {
    usage();
    process.exit(1);
  }

  const rootPkgPath = path.join(rootDir, "package.json");
  const rootPkg = loadJson(rootPkgPath);
  const workspaces = rootPkg.workspaces;
  if (!Array.isArray(workspaces)) {
    console.error("Root package.json must define workspaces[]");
    process.exit(1);
  }

  const pkgPaths = expandWorkspaceGlobs(workspaces);
  if (pkgPaths.length === 0) {
    console.error("No workspace package.json files found.");
    process.exit(1);
  }

  const manifests = pkgPaths.map((p) => ({
    path: p,
    json: loadJson(p),
    isLib: p.includes(`${path.sep}packages${path.sep}`),
  }));
  const internalNames = new Set(manifests.map((m) => m.json.name).filter(Boolean));

  const libVersioned = manifests
    .filter((m) => m.isLib)
    .map((m) => ({ path: m.path, name: m.json.name, version: m.json.version }))
    .filter((m) => typeof m.version === "string" && parseSemver(m.version));

  if (libVersioned.length === 0) {
    console.error("No packages/* entries with a plain x.y.z version field.");
    process.exit(1);
  }

  const libVersions = [...new Set(libVersioned.map((v) => v.version))];
  if (libVersions.length > 1) {
    console.error(
      "packages/* disagree on version. Align them first:\n",
      libVersioned.map((v) => `  ${v.name}: ${v.version}`).join("\n"),
    );
    process.exit(1);
  }

  const current = libVersions[0];
  const next = bumpSemver(current, RELEASE);

  for (const m of manifests) {
    const pkg = m.json;
    if ("version" in pkg && typeof pkg.version === "string") {
      pkg.version = next;
    }

    for (const field of DEP_FIELDS) {
      const block = pkg[field];
      if (!block || typeof block !== "object") continue;
      for (const depName of Object.keys(block)) {
        if (!isInternalDepName(depName, internalNames)) continue;
        const val = block[depName];
        if (shouldRewriteDepValue(val)) {
          block[depName] = `^${next}`;
        }
      }
    }
  }

  for (const m of manifests) {
    writeJson(m.path, m.json);
  }

  if (typeof rootPkg.version === "string" && parseSemver(rootPkg.version)) {
    rootPkg.version = next;
    writeJson(rootPkgPath, rootPkg);
  }

  console.log(`Bumped workspace version ${current} → ${next} (${RELEASE}).`);
  console.log(`Updated ${pkgPaths.length} package.json file(s).`);
}

main();
