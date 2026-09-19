// Pre-commit gate for the two checks CI runs on every push (`.github/workflows/ci.yml`:
// `npm run format:check` and `npm run lint`). Prettier rewrites staged files in place and
// lint-staged re-stages the result, so a commit can never land unformatted.
export default {
  "*.{ts,mts,cts,js,mjs,cjs,json,md,yml,yaml,scss,css,html}":
    "prettier --write",

  // Type-aware lint rules (no-floating-promises, no-misused-promises) need the
  // tsconfig project, so scope this to the package sources eslint.config.mjs
  // covers rather than every staged file.
  "packages/*/src/**/*.ts": "eslint --fix",
};
