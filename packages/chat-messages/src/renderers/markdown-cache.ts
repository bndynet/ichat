import type { HighlightJs } from "../types.js";

/**
 * Marker attribute on an async block placeholder. The pending async work is
 * owned by the render pass that created the placeholder, so HTML carrying this
 * attribute must never be replayed into a different element instance.
 *
 * Shared with the fence rule in `markdown-renderer.ts` so the two cannot drift.
 */
export const ASYNC_BLOCK_ATTRIBUTE = "data-chat-async-block";

/**
 * Retention budget, counted in characters of cached content plus HTML.
 *
 * A budget rather than an entry count because entry sizes differ by orders of
 * magnitude: an ordinary reply and a thousand-line code block would otherwise
 * get the same allowance. Sized so an ordinary history stays fully cached —
 * which matters for the non-virtual list, where every row is mounted and an
 * eviction forces a re-render the element did not actually need — while a
 * history of very large messages still cannot grow without bound.
 */
export const MAX_MARKDOWN_CACHE_CHARS = 4_000_000;

/** Render options that change the produced HTML. */
export interface MarkdownCacheOptions {
  allowedLinkProtocols?: readonly string[];
  highlightJs?: HighlightJs;
}

interface MarkdownCacheEntry {
  content: string;
  html: string;
  highlightJs?: HighlightJs;
  linkProtocols: string;
}

export type MarkdownCacheLookup =
  /** Caller's own `previousHtml` is current; morph that. */
  | { reuse: "previous" }
  /** Cached HTML for an element instance that has none of its own. */
  | { reuse: "cached"; html: string }
  /** Run the Markdown pipeline. */
  | { reuse: "none" };

const cache = new Map<string, MarkdownCacheEntry>();
/** Running total of `entryChars` for everything in `cache`. */
let cachedChars = 0;

function entryChars(entry: MarkdownCacheEntry): number {
  return entry.content.length + entry.html.length;
}

function remove(partId: string): void {
  const entry = cache.get(partId);
  if (!entry) return;
  cachedChars -= entryChars(entry);
  cache.delete(partId);
}

/**
 * Evict least-recently-used entries until the budget is met. The most recent
 * entry is never evicted, so a single oversized part is cached rather than
 * emptying the cache on every render.
 */
function evictToBudget(): void {
  for (const partId of cache.keys()) {
    if (cachedChars <= MAX_MARKDOWN_CACHE_CHARS || cache.size <= 1) return;
    remove(partId);
  }
}

/** `undefined` and `[]` both mean "safe defaults", so they must compare equal. */
function normalizeLinkProtocols(protocols?: readonly string[]): string {
  if (!protocols || protocols.length === 0) return "";
  return protocols.join("\u0000");
}

function optionsMatch(
  entry: MarkdownCacheEntry,
  options: MarkdownCacheOptions,
): boolean {
  return (
    entry.highlightJs === options.highlightJs &&
    entry.linkProtocols === normalizeLinkProtocols(options.allowedLinkProtocols)
  );
}

/**
 * Move a key to the most-recently-used end of the Map iteration order. Re-inserts
 * the same entry, so the character total is unaffected.
 */
function touch(partId: string, entry: MarkdownCacheEntry): void {
  cache.delete(partId);
  cache.set(partId, entry);
}

/**
 * Whether rendered HTML may be replayed into a different element instance.
 *
 * Unresolved async placeholders may not: `resolveAsyncBlocks()` consumed the
 * pending entry during the original render, so a replayed placeholder would
 * spin forever.
 */
export function isReusableHtml(html: string): boolean {
  return !html.includes(ASYNC_BLOCK_ATTRIBUTE);
}

/**
 * Decide how to satisfy a render request. A hit refreshes LRU recency.
 *
 * `previousHtml` must be a render of the *complete* content; a partial
 * (streaming) render would otherwise pin the DOM to truncated HTML.
 */
export function lookupMarkdownCache(
  partId: string | undefined,
  content: string,
  previousHtml: string,
  options: MarkdownCacheOptions,
): MarkdownCacheLookup {
  if (!partId) return { reuse: "none" };

  const entry = cache.get(partId);
  if (!entry || entry.content !== content || !optionsMatch(entry, options)) {
    return { reuse: "none" };
  }

  touch(partId, entry);

  if (previousHtml) return { reuse: "previous" };
  if (isReusableHtml(entry.html)) return { reuse: "cached", html: entry.html };
  return { reuse: "none" };
}

export function storeMarkdownCache(
  partId: string,
  content: string,
  html: string,
  options: MarkdownCacheOptions,
): void {
  remove(partId);
  const entry: MarkdownCacheEntry = {
    content,
    html,
    highlightJs: options.highlightJs,
    linkProtocols: normalizeLinkProtocols(options.allowedLinkProtocols),
  };
  cache.set(partId, entry);
  cachedChars += entryChars(entry);
  evictToBudget();
}

/**
 * Upgrade a cached entry to its post-async-resolution HTML so a later element
 * instance reuses the resolved output instead of re-running the pipeline (and
 * the async renderer) from scratch.
 *
 * Ignored when the entry has since been replaced by different content.
 */
export function replaceCachedMarkdownHtml(
  partId: string,
  content: string,
  html: string,
): void {
  const entry = cache.get(partId);
  if (!entry || entry.content !== content) return;
  cachedChars += html.length - entry.html.length;
  entry.html = html;
  evictToBudget();
}

/** Invalidate the cache for a specific part or entirely. */
export function invalidateMarkdownCache(partId?: string): void {
  if (partId) {
    remove(partId);
  } else {
    cache.clear();
    cachedChars = 0;
  }
}

/** @internal Test-only view of cache occupancy. */
export function markdownCacheSize(): number {
  return cache.size;
}

/** @internal Test-only view of the retained character total. */
export function markdownCacheChars(): number {
  return cachedChars;
}
