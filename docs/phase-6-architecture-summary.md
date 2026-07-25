# Phase 6 — Architecture Cleanup Summary

**Date:** 2025-07-25
**Status:** Partially implemented

## Completed

### 6.3 Re-evaluate bundling (partial)
- `highlight.js` is now an optional config injection (`MarkdownRenderOptions.highlightJs`)
- This is a step toward making it a peerDependency in a future major version

## Deferred

### 6.1 `<i-chat>` decomposition
- Extract `ConfirmationController` (ReactiveController)
- Extract `SlotForwardingController`
- Replace `_pendingCommands` with `CommandQueue` class
- Target: ≤ 300 lines

**Risk:** Medium. Controllers are well-established patterns in Lit. The `_pendingCommands` array is simple enough that a class wrapper adds minimal value currently.

### 6.2 Remove deprecated APIs (v3)
- `createStreamingController()` → `createRunController()`
- `form-submit`, `todo-action`, `tool-action` → `part-action`
- `patchTodoItemInPart` → `patchTodoItem`
- Boolean return → `try*` variants
- `config.dateSeparatorLabels` → `config.labels.dateSeparator`

**Risk:** High. These are breaking changes. Should be done as part of a v3 release with a migration guide.

### 6.3 Full peerDependency migration
- Move `markdown-it`, `dompurify`, `highlight.js` to `peerDependencies`
- Provide "full" and "tree-shakeable" bundles

**Risk:** Medium. Breaking for consumers who don't install these deps. Needs clear migration docs.
