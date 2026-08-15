#!/usr/bin/env node

/**
 * Mirror the repository LICENSE into every publishable package.
 *
 * `npm publish -w <pkg>` packs from `packages/<pkg>/`, so the repository-root
 * LICENSE never reaches a published tarball. npm always includes a LICENSE
 * found in the package directory, regardless of the `files` field, so copying
 * the file is enough — no per-package `package.json` change is needed.
 *
 * The copies are build output and are gitignored, exactly like `dist`: the
 * repository LICENSE stays the single source of truth, and this script runs as
 * the first step of the root build so a tarball is never assembled without it.
 * Publishing without building is already impossible for a different reason —
 * `dist` would be missing too — so nothing is lost by not committing them.
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
