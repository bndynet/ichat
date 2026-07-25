# Phase 2 — Performance Optimization Summary

**Date:** 2025-07-25

## Changes Made

### 2.2 Markdown Rendering Cache

**File:** `packages/chat-messages/src/renderers/markdown-morph.ts`

- Added two-level cache to `renderMarkdownInto()`:
  1. **Raw content cache** (`Map<partId, rawMd>`) — if the raw markdown string is identical to the last render, the entire pipeline (markdown-it + DOMPurify) is skipped
  2. **HTML comparison** (existing) — if the rendered HTML matches `previousHtml`, DOM morphing is skipped
- Added `partId` option to `RenderMarkdownIntoOptions`
- Exported `invalidateMarkdownCache()` for cache invalidation

**File:** `packages/chat-messages/src/components/chat-text-part.ts`
- Passes `partId: this.data?.id` to `renderMarkdownInto()` to enable per-part caching

### 2.3 highlight.js Config Injection

**File:** `packages/chat-messages/src/renderers/markdown-renderer.ts`

- Changed `highlight.js` from a direct dependency import to a `MarkdownRenderOptions.highlightJs` config option
- When `highlightJs` is not provided, code blocks render as escaped HTML (plain `<pre><code>`) instead of throwing
- Added `try/catch` around highlight call for robustness
- The `highlightJs` instance is set per-render via a module-level variable

### 2.4 Memoized Computed Properties

**File:** `packages/chat-messages/src/components/chat-messages.ts`

- **`_labels` getter** — cached based on `locale` + `labels` reference + `dateSeparatorLabels` reference
- **`_messageRenderItems()`** — cached based on `messages.length` + first/last `message.id` + first/last `message.timestamp`
- Both caches invalidate automatically when their dependency keys change

## Performance Impact

| Optimization | Before | After |
|---|---|---|
| Highlight.js | Always bundled (~120KB) | Optional, user-injected |
| Markdown render | Full pipeline every update | Content-level cache skips re-render |
| `_messageRenderItems()` | Re-computed every render | Cached by collection shape |
| `_labels` | Re-resolved every access | Cached by locale/labels ref |

## Exports Added

- `invalidateMarkdownCache` — exported from `@bndynet/ichat-messages`
- `renderMarkdownInto` — exported from `@bndynet/ichat-messages`
- `RenderMarkdownIntoOptions` — type exported from `@bndynet/ichat-messages`

## Build & Tests

- All 24 tests pass
- Build succeeds (ESM, CJS, IIFE, DTS)

## Pending (Phase 2.1)

Virtual scrolling via `@lit-labs/virtualizer` is deferred — it requires deeper component restructuring and thorough visual testing.
