#!/usr/bin/env node

/**
 * Validate that each publishable package's `npm pack` output contains the
 * expected files and does not leak internal source.
 *
 * Usage:
 *   node tools/validate-pack.mjs
 */

import { execSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const PACKAGES = [
  '@bndynet/ichat-messages',
  '@bndynet/ichat-input',
  '@bndynet/ichat',
  '@bndynet/ichat-renderers',
  '@bndynet/ichat-renderer-chart',
  '@bndynet/ichat-renderer-katex',
  '@bndynet/ichat-renderer-mermaid',
];

const REQUIRED_FILES = ['package.json', 'README.md'];
const REQUIRED_EXPORTS = ['dist/index.js', 'dist/index.d.ts'];

let failures = 0;

for (const pkg of PACKAGES) {
  const tmpDir = mkdtempSync(join(tmpdir(), `ichat-pack-${pkg.replace('/', '-')}-`));
  try {
    // Pack into temp directory
    const output = execSync(`npm pack -w ${pkg} --pack-destination "${tmpDir}"`, {
      encoding: 'utf8',
      cwd: process.cwd(),
    }).trim();
    const tarball = join(tmpDir, output);

    if (!existsSync(tarball)) {
      console.error(`FAIL ${pkg}: tarball not found at ${tarball}`);
      failures++;
      continue;
    }

    // List contents
    const contents = execSync(`tar -tf "${tarball}"`, { encoding: 'utf8' });
    const files = contents
      .split('\n')
      .filter(Boolean)
      .map((f) => f.replace(/^package\//, ''));

    // Check required files
    for (const required of REQUIRED_FILES) {
      if (!files.includes(required)) {
        console.error(`FAIL ${pkg}: missing ${required}`);
        failures++;
      }
    }

    // Check required exports
    for (const required of REQUIRED_EXPORTS) {
      if (
        !files.some(
          (f) =>
            f === required ||
            f === required.replace('.js', '.mjs') ||
            f === required.replace('.js', '.cjs'),
        )
      ) {
        console.error(`FAIL ${pkg}: missing export ${required}`);
        failures++;
      }
    }

    // Check no src/ leaked (dist-only packages)
    if (files.some((f) => f.startsWith('src/'))) {
      console.error(`FAIL ${pkg}: source directory leaked into package`);
      failures++;
    }

    // Check no tsconfig leaked
    if (files.some((f) => f.includes('tsconfig'))) {
      console.error(`FAIL ${pkg}: tsconfig leaked into package`);
      failures++;
    }

    console.log(`OK   ${pkg} (${files.length} files)`);
  } catch (err) {
    console.error(`FAIL ${pkg}: ${err}`);
    failures++;
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
}

if (failures > 0) {
  console.error(`\n${failures} package(s) failed validation`);
  process.exit(1);
}

console.log(`\nAll ${PACKAGES.length} packages passed validation`);
