#!/usr/bin/env node

/**
 * Mirror the repository LICENSE into every publishable package.
 *
 * `npm publish -w <pkg>` packs from `packages/<pkg>/`, so the repository-root
 * LICENSE never reaches a published tarball. npm always includes a LICENSE
 * found in the package directory, regardless of the `files` field, so copying
 * the file is enough — no per-package `package.json` change is needed.
 *
 * The copies are committed rather than generated-and-ignored, so a tarball
 * stays correct even when `npm publish` runs without a fresh build. This script
 * runs as the first step of the root build to keep them identical to the
 * repository LICENSE, which stays the single source of truth.
 *
 * Usage:
 *   node tools/copy-license.mjs
 */

import { copyFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const packagesDir = join(repoRoot, "packages");
const source = join(repoRoot, "LICENSE");

let copied = 0;
for (const entry of readdirSync(packagesDir)) {
  const packageDir = join(packagesDir, entry);
  if (!statSync(packageDir).isDirectory()) continue;
  copyFileSync(source, join(packageDir, "LICENSE"));
  copied += 1;
}

console.log(`LICENSE copied into ${copied} package(s).`);
