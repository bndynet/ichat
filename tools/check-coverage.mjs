#!/usr/bin/env node

/**
 * Parse Node --experimental-test-coverage output from stdin and enforce
 * coverage thresholds.  Coverage runs on bundled output so the thresholds
 * are intentionally broad (≥85% overall).
 *
 * Usage:
 *   npm run test:coverage -w @bndynet/ichat-messages 2>&1 | node tools/check-coverage.mjs
 */

import { createInterface } from 'node:readline';

const THRESHOLD_PCT = 85; // overall line coverage minimum

async function main() {
  const rl = createInterface({ input: process.stdin });

  let inReport = false;
  let allFilesLine = '';

  for await (const line of rl) {
    // Pass through to stdout for visibility
    console.log(line);

    if (line.startsWith('# start of coverage report')) {
      inReport = true;
      continue;
    }
    if (line.startsWith('# end of coverage report')) {
      inReport = false;
      continue;
    }
    if (inReport && (line.includes('all files') || line.includes('all…'))) {
      allFilesLine = line;
    }
  }

  if (!allFilesLine) {
    console.error('❌ No coverage report found in output.');
    process.exit(1);
  }

  // Parse: "# all files | 100.00 | 100.00 | 100.00 |"
  const parts = allFilesLine.split('|').map(s => s.trim()).filter(Boolean);
  const label = parts[0]; // "all files"
  const linePct = parseFloat(parts[1]);

  if (Number.isNaN(linePct)) {
    console.error(`❌ Could not parse coverage percentage from: ${allFilesLine}`);
    process.exit(1);
  }

  if (linePct < THRESHOLD_PCT) {
    console.error(
      `❌ Coverage ${linePct.toFixed(2)}% is below threshold ${THRESHOLD_PCT}%`,
    );
    process.exit(1);
  }

  console.log(`\n✅ Coverage ${linePct.toFixed(2)}% meets threshold ${THRESHOLD_PCT}%`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
