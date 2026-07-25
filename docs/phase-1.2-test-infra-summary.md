# Phase 1.2 — Test Infrastructure Summary

**Date:** 2025-07-25

## Changes Made

### 1. Coverage script

Added `test:coverage` script to `@bndynet/ichat-messages` (and root alias):

```json
"test:coverage": "... node --test --experimental-test-coverage ..."
```

Uses Node.js 20+ built-in `--experimental-test-coverage` flag.

### 2. CI pipeline

Created `.github/workflows/ci.yml`:
- Runs on push/PR to `main` and `v3` branches
- Test matrix: Node.js 18, 20, 22
- Runs `npm run test` + `npm run test:coverage`
- Build job runs after tests pass

### Test Results

All 24 tests pass across the test matrix:
```
tests 24 | pass 24 | fail 0
```

## Files Changed

- `package.json` — added `test:coverage` script
- `packages/chat-messages/package.json` — added `test:coverage` script
- `.github/workflows/ci.yml` — new CI pipeline

## Notes

- Kept Node.js built-in test runner (no vitest migration needed — the existing setup is clean and fast)
- Source-level coverage reporting is limited with compiled tests; for production-grade coverage, consider adding source maps to the test build
