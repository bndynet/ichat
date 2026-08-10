import assert from "node:assert/strict";
import {
  ASYNC_BLOCK_ATTRIBUTE,
  MAX_MARKDOWN_CACHE_CHARS,
  invalidateMarkdownCache,
  isReusableHtml,
  lookupMarkdownCache,
  markdownCacheChars,
  markdownCacheSize,
  replaceCachedMarkdownHtml,
  storeMarkdownCache,
  type MarkdownCacheOptions,
} from "../src/renderers/markdown-cache.js";
import type { HighlightJs } from "../src/types.js";

function test(name: string, run: () => void): void {
  try {
    invalidateMarkdownCache();
    run();
  } catch (error) {
    console.error(`not ok - ${name}`);
    throw error;
  }
}

const NO_OPTIONS: MarkdownCacheOptions = {};
const PLACEHOLDER_HTML = `<div id="_br_1_0" ${ASYNC_BLOCK_ATTRIBUTE}="true"><span></span></div>`;

function fakeHighlightJs(): HighlightJs {
  return {} as unknown as HighlightJs;
}

// ── Lookup: identity of the request ──────────────────────────────────────────

test("a part without an id never consults the cache", () => {
  storeMarkdownCache("p1", "hello", "<p>hello</p>", NO_OPTIONS);
  assert.deepEqual(lookupMarkdownCache(undefined, "hello", "", NO_OPTIONS), {
    reuse: "none",
  });
});

test("an unknown part id misses", () => {
  assert.deepEqual(lookupMarkdownCache("p1", "hello", "", NO_OPTIONS), {
    reuse: "none",
  });
});

test("changed content misses even for a known part id", () => {
  storeMarkdownCache("p1", "hello", "<p>hello</p>", NO_OPTIONS);
  assert.deepEqual(lookupMarkdownCache("p1", "hello there", "", NO_OPTIONS), {
    reuse: "none",
  });
});

// ── Lookup: which HTML wins ──────────────────────────────────────────────────

test("an element that already holds the render reuses its own HTML", () => {
  storeMarkdownCache("p1", "hello", "<p>hello</p>", NO_OPTIONS);
  assert.deepEqual(
    lookupMarkdownCache("p1", "hello", "<p>hello</p>", NO_OPTIONS),
    {
      reuse: "previous",
    },
  );
});

test("a fresh element instance is served the cached HTML instead of re-rendering", () => {
  storeMarkdownCache("p1", "hello", "<p>hello</p>", NO_OPTIONS);
  assert.deepEqual(lookupMarkdownCache("p1", "hello", "", NO_OPTIONS), {
    reuse: "cached",
    html: "<p>hello</p>",
  });
});

// ── Lookup: output-affecting render options ──────────────────────────────────

test("a different highlightJs instance misses", () => {
  const first = fakeHighlightJs();
  storeMarkdownCache("p1", "```js\n1\n```", "<pre>a</pre>", {
    highlightJs: first,
  });

  assert.deepEqual(
    lookupMarkdownCache("p1", "```js\n1\n```", "", { highlightJs: first }),
    {
      reuse: "cached",
      html: "<pre>a</pre>",
    },
  );
  assert.deepEqual(
    lookupMarkdownCache("p1", "```js\n1\n```", "<pre>a</pre>", {
      highlightJs: fakeHighlightJs(),
    }),
    { reuse: "none" },
    "a swapped highlighter must not reuse HTML highlighted by the previous one",
  );
});

test("gaining a highlighter misses", () => {
  storeMarkdownCache("p1", "x", "<p>x</p>", NO_OPTIONS);
  assert.deepEqual(
    lookupMarkdownCache("p1", "x", "<p>x</p>", {
      highlightJs: fakeHighlightJs(),
    }),
    {
      reuse: "none",
    },
  );
});

test("changed allowedLinkProtocols misses", () => {
  storeMarkdownCache("p1", "[a](myapp://x)", "<p>a</p>", {
    allowedLinkProtocols: ["myapp"],
  });
  assert.deepEqual(
    lookupMarkdownCache("p1", "[a](myapp://x)", "<p>a</p>", {
      allowedLinkProtocols: ["other"],
    }),
    { reuse: "none" },
  );
});

test("omitted and empty allowedLinkProtocols mean the same thing", () => {
  storeMarkdownCache("p1", "x", "<p>x</p>", { allowedLinkProtocols: [] });
  assert.deepEqual(lookupMarkdownCache("p1", "x", "<p>x</p>", NO_OPTIONS), {
    reuse: "previous",
  });
});

test("a reordered protocol list is treated as a change", () => {
  storeMarkdownCache("p1", "x", "<p>x</p>", {
    allowedLinkProtocols: ["a", "b"],
  });
  assert.deepEqual(
    lookupMarkdownCache("p1", "x", "<p>x</p>", {
      allowedLinkProtocols: ["b", "a"],
    }),
    { reuse: "none" },
  );
});

// ── Async block placeholders ─────────────────────────────────────────────────

test("HTML holding an unresolved async placeholder is not reusable", () => {
  assert.equal(isReusableHtml(PLACEHOLDER_HTML), false);
  assert.equal(isReusableHtml("<p>plain</p>"), true);
});

test("a fresh element re-renders rather than replay an unresolved placeholder", () => {
  storeMarkdownCache("p1", "```mermaid\ng\n```", PLACEHOLDER_HTML, NO_OPTIONS);
  assert.deepEqual(
    lookupMarkdownCache("p1", "```mermaid\ng\n```", "", NO_OPTIONS),
    {
      reuse: "none",
    },
  );
});

test("the element that owns the pending placeholder still reuses its own HTML", () => {
  storeMarkdownCache("p1", "```mermaid\ng\n```", PLACEHOLDER_HTML, NO_OPTIONS);
  assert.deepEqual(
    lookupMarkdownCache(
      "p1",
      "```mermaid\ng\n```",
      PLACEHOLDER_HTML,
      NO_OPTIONS,
    ),
    {
      reuse: "previous",
    },
  );
});

test("promoting resolved HTML makes the entry reusable", () => {
  storeMarkdownCache("p1", "src", PLACEHOLDER_HTML, NO_OPTIONS);
  replaceCachedMarkdownHtml("p1", "src", "<svg>resolved</svg>");
  assert.deepEqual(lookupMarkdownCache("p1", "src", "", NO_OPTIONS), {
    reuse: "cached",
    html: "<svg>resolved</svg>",
  });
});

test("promotion is ignored once the entry holds different content", () => {
  storeMarkdownCache("p1", "new content", "<p>new</p>", NO_OPTIONS);
  replaceCachedMarkdownHtml("p1", "stale content", "<svg>stale</svg>");
  assert.deepEqual(lookupMarkdownCache("p1", "new content", "", NO_OPTIONS), {
    reuse: "cached",
    html: "<p>new</p>",
  });
});

test("promotion never creates an entry", () => {
  replaceCachedMarkdownHtml("p1", "src", "<p>x</p>");
  assert.equal(markdownCacheSize(), 0);
  assert.deepEqual(lookupMarkdownCache("p1", "src", "", NO_OPTIONS), {
    reuse: "none",
  });
});

// ── Invalidation ─────────────────────────────────────────────────────────────

test("invalidating one part leaves the others", () => {
  storeMarkdownCache("p1", "a", "<p>a</p>", NO_OPTIONS);
  storeMarkdownCache("p2", "b", "<p>b</p>", NO_OPTIONS);
  invalidateMarkdownCache("p1");
  assert.deepEqual(lookupMarkdownCache("p1", "a", "", NO_OPTIONS), {
    reuse: "none",
  });
  assert.deepEqual(lookupMarkdownCache("p2", "b", "", NO_OPTIONS), {
    reuse: "cached",
    html: "<p>b</p>",
  });
});

test("invalidating everything empties the cache", () => {
  storeMarkdownCache("p1", "a", "<p>a</p>", NO_OPTIONS);
  storeMarkdownCache("p2", "b", "<p>b</p>", NO_OPTIONS);
  invalidateMarkdownCache();
  assert.equal(markdownCacheSize(), 0);
});

// ── Bounded growth ───────────────────────────────────────────────────────────

test("re-storing the same part does not grow the cache", () => {
  storeMarkdownCache("p1", "a", "<p>a</p>", NO_OPTIONS);
  storeMarkdownCache("p1", "b", "<p>b</p>", NO_OPTIONS);
  storeMarkdownCache("p1", "c", "<p>c</p>", NO_OPTIONS);
  assert.equal(markdownCacheSize(), 1);
});

/** Content + HTML of a known character cost, so budget maths stays explicit. */
function fill(partId: string, chars: number): void {
  storeMarkdownCache(
    partId,
    "c".repeat(chars / 2),
    "h".repeat(chars / 2),
    NO_OPTIONS,
  );
}

test("the character total tracks content plus HTML", () => {
  storeMarkdownCache("p1", "abc", "<p>abc</p>", NO_OPTIONS);
  assert.equal(markdownCacheChars(), 3 + "<p>abc</p>".length);
});

test("re-storing a part replaces its cost rather than adding to it", () => {
  storeMarkdownCache("p1", "abc", "<p>abc</p>", NO_OPTIONS);
  storeMarkdownCache("p1", "de", "<p>de</p>", NO_OPTIONS);
  assert.equal(markdownCacheChars(), 2 + "<p>de</p>".length);
});

test("promoting resolved HTML re-accounts for the size difference", () => {
  storeMarkdownCache("p1", "abc", "<p>abc</p>", NO_OPTIONS);
  replaceCachedMarkdownHtml("p1", "abc", "much longer resolved output");
  assert.equal(markdownCacheChars(), 3 + "much longer resolved output".length);
});

test("invalidation restores the character total", () => {
  storeMarkdownCache("p1", "abc", "<p>abc</p>", NO_OPTIONS);
  storeMarkdownCache("p2", "de", "<p>de</p>", NO_OPTIONS);
  invalidateMarkdownCache("p1");
  assert.equal(markdownCacheChars(), 2 + "<p>de</p>".length);
  invalidateMarkdownCache();
  assert.equal(markdownCacheChars(), 0);
});

test("the cache stays within its budget", () => {
  const chunk = MAX_MARKDOWN_CACHE_CHARS / 8;
  for (let i = 0; i < 24; i += 1) fill(`p${i}`, chunk);
  assert.ok(
    markdownCacheChars() <= MAX_MARKDOWN_CACHE_CHARS,
    `retained ${markdownCacheChars()} chars, budget is ${MAX_MARKDOWN_CACHE_CHARS}`,
  );
});

test("an ordinary history is not evicted at all", () => {
  // 2,000 parts of roughly 600 characters each — comfortably inside the budget,
  // so a mounted non-virtual list never re-renders for want of a cache entry.
  for (let i = 0; i < 2000; i += 1) fill(`p${i}`, 600);
  assert.equal(markdownCacheSize(), 2000);
});

test("eviction drops the least recently used part", () => {
  const chunk = MAX_MARKDOWN_CACHE_CHARS / 4;
  fill("oldest", chunk);
  fill("middle", chunk);
  fill("newest", chunk);
  fill("overflow", chunk + 4);

  assert.deepEqual(
    lookupMarkdownCache("oldest", "c".repeat(chunk / 2), "", NO_OPTIONS),
    { reuse: "none" },
    "the oldest entry should have been evicted",
  );
  assert.equal(markdownCacheSize(), 3);
});

test("a lookup refreshes recency so a revisited row survives eviction", () => {
  const chunk = MAX_MARKDOWN_CACHE_CHARS / 4;
  const content = "c".repeat(chunk / 2);
  fill("first", chunk);
  fill("second", chunk);
  fill("third", chunk);
  // Scrolling `first` back into view reads it, which must make it recent again.
  lookupMarkdownCache("first", content, "", NO_OPTIONS);
  fill("overflow", chunk + 4);

  assert.notDeepEqual(
    lookupMarkdownCache("first", content, "", NO_OPTIONS),
    { reuse: "none" },
    "the revisited entry should have survived",
  );
  assert.deepEqual(
    lookupMarkdownCache("second", content, "", NO_OPTIONS),
    { reuse: "none" },
    "second became the least recently used entry and should be gone",
  );
});

test("a single oversized part is kept rather than emptying the cache", () => {
  fill("huge", MAX_MARKDOWN_CACHE_CHARS * 2);
  assert.equal(markdownCacheSize(), 1);
});
