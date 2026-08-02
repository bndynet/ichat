import { defineConfig } from 'tsup';

/**
 * Node-only test/benchmark bundles live below node_modules/.cache, outside a
 * package with `type: module`. Use an explicit .mjs extension so the same
 * artifacts run consistently on Node 18, 20, and newer releases.
 */
export default defineConfig({
  format: ['esm'],
  platform: 'node',
  target: 'node18',
  splitting: false,
  // `node:test` has no protocol-less equivalent package named `test`.
  removeNodeProtocol: false,
  loader: {
    '.scss': 'text',
  },
  outExtension: () => ({ js: '.mjs' }),
});
