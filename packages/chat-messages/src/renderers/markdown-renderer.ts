import MarkdownIt from 'markdown-it';
import type hljs from 'highlight.js';
import DOMPurify from 'dompurify';
import { rendererRegistry } from './registry.js';
import { progressPlugin } from './progress-plugin.js';
import { collapsiblePlugin } from './collapsible-plugin.js';
import {
  isAllowedLinkHref,
  normalizeAllowedLinkProtocols,
  uriRegexpForAllowedLinkProtocols,
} from '../link-protocols.js';
import { chatIconStrings } from '../icons.js';
import { getSharedMd } from './md-instance.js';

export interface MarkdownRenderOptions {
  /**
   * Non-empty allow list of link protocols to keep in URI attributes (`href`, `src`, ...).
   * Values may be provided with or without the trailing colon (`myapp` / `myapp:`).
   * When omitted or empty, the safe defaults `http`, `https`, `mailto`, and `tel`
   * are used. Relative URLs and fragment links are always kept.
   */
  allowedLinkProtocols?: readonly string[];

  /**
   * Optional highlight.js instance for syntax highlighting.
   * When omitted, code blocks render as plain `<pre><code>` without highlighting.
   * Pass your own `highlight.js` import (possibly with only the languages you need)
   * to keep bundle size small.
   */
  highlightJs?: typeof hljs;
}

/** Active highlight.js instance for the current render pass (set per-render). */
let activeHighlightJs: typeof hljs | undefined;
let activeRenderOptions: MarkdownRenderOptions | undefined;
let activeRenderMode: 'full' | 'streaming' = 'full';

const md = getSharedMd(() => {
  const instance = new MarkdownIt({
    html: false,
    linkify: true,
    typographer: true,
    highlight(str: string, lang: string): string {
      const hl = activeHighlightJs;
      if (hl && lang && hl.getLanguage(lang)) {
        try {
          return hl.highlight(str, { language: lang }).value;
        } catch {
          // Fall through to escaped fallback on highlight error
        }
      }
      return instance.utils.escapeHtml(str);
    },
  });

  // Keep unsafe protocols out of the generated HTML in both full and light
  // rendering. This is substantially cheaper than running DOMPurify for every
  // streaming update and still allows host-defined schemes through options.
  instance.validateLink = (href: string) =>
    isAllowedLinkHref(href, activeRenderOptions?.allowedLinkProtocols);
  instance.use(progressPlugin);
  instance.use(collapsiblePlugin);

  return instance;
});

// ── DOMPurify configuration ──────────────────────────────────────────────────
// Shared between the outer render pass and the inner details-body sanitisation.
type DOMPurifyConfig = NonNullable<Parameters<typeof DOMPurify.sanitize>[1]>;

const DOMPURIFY_BASE_CONFIG: DOMPurifyConfig = {
  ADD_TAGS: [
    // SVG elements used by chart / custom renderers
    'svg', 'path', 'rect', 'circle', 'line', 'text',
    'g', 'defs', 'pattern', 'polyline', 'polygon', 'ellipse',
    // Native disclosure widget — safe, no script execution
    'details', 'summary',
  ],
  ADD_ATTR: [
    // SVG presentation attributes
    'viewBox', 'd', 'fill', 'stroke', 'stroke-width', 'cx', 'cy', 'r',
    'x', 'y', 'x1', 'y1', 'x2', 'y2', 'width', 'height', 'transform',
    'text-anchor', 'dominant-baseline', 'font-size', 'opacity', 'points',
    'stroke-linecap', 'stroke-linejoin',
  ],
};

const domPurifyConfigCache = new Map<string, DOMPurifyConfig>();

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function domPurifyConfig(options?: MarkdownRenderOptions): DOMPurifyConfig {
  const protocols = normalizeAllowedLinkProtocols(options?.allowedLinkProtocols);
  const key = protocols.length === 0 ? '@default' : protocols.join('|');
  const cached = domPurifyConfigCache.get(key);
  if (cached) return cached;

  const config: DOMPurifyConfig = {
    ...DOMPURIFY_BASE_CONFIG,
    ALLOWED_URI_REGEXP: uriRegexpForAllowedLinkProtocols(protocols),
  };
  domPurifyConfigCache.set(key, config);
  return config;
}

// ── Fence block renderer ──────────────────────────────────────────────────────
// Trusted renderer output is spliced back after DOMPurify. Untrusted output is
// inserted before the single terminal sanitisation pass; while streaming it is
// replaced with the escaped default code-block rendering.
interface PendingBlockHTML {
  html: string;
  trusted: boolean;
}

const pendingBlockHTML = new Map<string, PendingBlockHTML>();

// ── Built-in fence renderer: ```details Title … ``` ──────────────────────────
// Supports an optional title extracted from the info string.
// Inner content is rendered as full markdown and sanitised separately so that
// any standard markdown elements (tables, lists, code blocks, progress blocks …)
// work correctly inside the collapsible body.
// NOTE: Nested *fence-based* custom renderers inside a details block are not
// supported — they will fall back to a plain highlighted code block. Plugin-
// based renderers (e.g. the progress ordered-list syntax) work fine.
rendererRegistry.register({
  name: 'chat-details',
  trusted: true,
  test: (lang: string) => /^details\b/i.test(lang),
  render: (content: string, _lang: string, info = ''): string => {
    // Extract title: everything after the first word ("details")
    const title = info.replace(/^details\s*/i, '').trim() || 'Details';
    const safeTitle = md.utils.escapeHtml(title);

    // Render the body through the full markdown pipeline (supports progress,
    // tables, code highlighting, etc.) then sanitise the result.
    const bodyRaw = md.render(content);
    const bodyHtml = sanitizeHtml(bodyRaw, activeRenderOptions);

    return (
      `<details class="chat-details">\n` +
      `<summary class="chat-details__summary">` +
      `<span class="chat-details__title">${safeTitle}</span>` +
      `<span class="chat-details__chevron" aria-hidden="true">${chatIconStrings.chevronRight}</span>` +
      `</summary>\n` +
      `<div class="chat-details__body">${bodyHtml}</div>\n` +
      `</details>\n`
    );
  },
});

// ── Custom fence rule ─────────────────────────────────────────────────────────
const defaultFence =
  md.renderer.rules.fence ||
  function (tokens, idx, options, _env, self) {
    return self.renderToken(tokens, idx, options);
  };

md.renderer.rules.fence = (tokens, idx, options, env, self) => {
  const token = tokens[idx];
  const info = token.info.trim();
  const lang = info.split(/\s+/)[0];
  const customRenderer = rendererRegistry.getRenderer(lang);

  if (customRenderer) {
    const trusted = customRenderer.trusted === true;

    // DOMPurify is intentionally absent from the hot streaming path. Defer
    // untrusted rich output until the terminal render rather than injecting it
    // unsanitised or paying a full DOM sanitisation cost for every token.
    if (activeRenderMode === 'streaming' && !trusted) {
      return wrapCodeBlock(defaultFence(tokens, idx, options, env, self), token.content, lang);
    }

    // Async renderer: show placeholder, replace when promise resolves
    if (customRenderer.renderAsync) {
      const id = `_br_${idx}_${pendingBlockHTML.size}`;
      const placeholderHtml =
        customRenderer.render
          ? customRenderer.render(token.content, lang, info)
          : `<div class="chat-block-loading" aria-label="Loading...">
              <span class="chat-block-loading__spinner"></span>
            </div>`;
      pendingBlockHTML.set(id, { html: placeholderHtml, trusted });

      // Kick off async render — the promise resolves later
      const asyncId = `_async_${idx}_${Date.now()}`;
      pendingAsyncBlocks.set(asyncId, {
        placeholderId: id,
        promise: customRenderer.renderAsync(token.content, lang, info),
        trusted,
        renderOptions: activeRenderOptions,
      });

      return `<div id="${id}"></div>`;
    }

    // Sync renderer
    if (customRenderer.render) {
      const html = customRenderer.render(token.content, lang, info);
      const id = `_br_${idx}_${pendingBlockHTML.size}`;
      pendingBlockHTML.set(id, { html, trusted });
      return `<div id="${id}"></div>`;
    }

    // No render method — fallback to default
  }

  // Built-in code copy button: wrap every code block
  return wrapCodeBlock(defaultFence(tokens, idx, options, env, self), token.content, lang);
};

// ── Code copy button (built-in) ──────────────────────────────────────────────

const COPY_ICON = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`;

const BTN_STYLE =
  'position:absolute;top:-14px;right:1rem;z-index:1;' +
  'display:flex;align-items:center;justify-content:center;' +
  'width:28px;height:28px;padding:0;' +
  'color:var(--chat-text-secondary,#6b7280);' +
  'background:var(--chat-surface,#fff);' +
  'border:1px solid var(--chat-border,#e8e8e8);' +
  'border-radius:4px;cursor:pointer;' +
  'opacity:0;transition:opacity 0.15s;';

function wrapCodeBlock(highlighted: string, rawCode: string, lang: string): string {
  const encoded = encodeURIComponent(rawCode);
  return (
    `<div class="ichat-code-block" style="position:relative;margin:0.5em 0;overflow:visible;">` +
    `<button class="ichat-code-copy-btn" style="${BTN_STYLE}" data-code="${encoded}" data-lang="${md.utils.escapeHtml(lang)}" title="Copy code">` +
    `${COPY_ICON}` +
    `</button>` +
    highlighted +
    `</div>`
  );
}

/** Pending async block renderers that will resolve after the initial render. */
interface PendingAsyncBlock {
  placeholderId: string;
  promise: Promise<string>;
  trusted: boolean;
  renderOptions?: MarkdownRenderOptions;
}

const pendingAsyncBlocks = new Map<string, PendingAsyncBlock>();

/**
 * Resolve all pending async block renderers and replace their placeholders.
 * Call this after `renderMarkdown` to swap loading spinners with final content.
 */
export async function resolveAsyncBlocks(container: HTMLElement): Promise<void> {
  for (const [, { placeholderId, promise, trusted, renderOptions }] of pendingAsyncBlocks) {
    try {
      const resolvedHtml = await promise;
      const html = trusted ? resolvedHtml : sanitizeHtml(resolvedHtml, renderOptions);
      const placeholder = container.querySelector(`#${CSS.escape(placeholderId)}`);
      if (placeholder) {
        placeholder.outerHTML = html;
      }
    } catch {
      const placeholder = container.querySelector(`#${CSS.escape(placeholderId)}`);
      if (placeholder) {
        placeholder.outerHTML = '<div class="chat-block-error">Render failed</div>';
      }
    }
  }
  pendingAsyncBlocks.clear();
}

/**
 * The underlying markdown-it instance.
 * Use `md.use(plugin)` to register markdown-it plugins directly.
 */
export { md };

/**
 * Sanitise a trusted-but-not-guaranteed HTML string with the same DOMPurify
 * config used for markdown output. Used by string-mode custom part renderers.
 */
export function sanitizeHtml(html: string, options?: MarkdownRenderOptions): string {
  return DOMPurify.sanitize(html, domPurifyConfig(options));
}

export function renderMarkdown(content: string, options?: MarkdownRenderOptions): string {
  pendingBlockHTML.clear();
  const previousOptions = activeRenderOptions;
  const previousMode = activeRenderMode;
  activeRenderOptions = options;
  activeRenderMode = 'full';
  activeHighlightJs = options?.highlightJs;

  try {
    let raw = md.render(content);

    // Untrusted renderer HTML joins the regular markdown output before the one
    // terminal DOMPurify pass. This keeps sanitisation safe and avoids one pass
    // per block.
    for (const [id, block] of pendingBlockHTML) {
      if (!block.trusted) {
        raw = raw.replace(`<div id="${id}"></div>`, block.html);
      }
    }

    let sanitized = sanitizeHtml(raw, options);

    // Only explicitly trusted renderer output bypasses DOMPurify.
    for (const [id, block] of pendingBlockHTML) {
      if (block.trusted) {
        sanitized = sanitized.replace(`<div id="${id}"></div>`, block.html);
      }
    }

    return sanitized;
  } finally {
    activeRenderOptions = previousOptions;
    activeRenderMode = previousMode;
    activeHighlightJs = undefined;
    pendingBlockHTML.clear();
  }
}

/**
 * Streaming-optimised markdown rendering: markdown-it + block-renderer splice
 * **without** DOMPurify sanitisation. Unsafe URI protocols are rejected by
 * markdown-it, raw HTML stays disabled, and untrusted block renderers fall back
 * to escaped code until the terminal render. Explicitly trusted renderers may
 * render rich HTML during streaming. Callers should use `innerHTML` directly
 * instead of `renderMarkdownInto()` morphing.
 *
 * Once streaming stops, run the full `renderMarkdown()` + `renderMarkdownInto()`
 * pipeline for the clean terminal render.
 *
 * @internal Not exported as public API — used internally by `i-chat-text-part`.
 */
export function renderMarkdownLight(content: string, options?: MarkdownRenderOptions): string {
  pendingBlockHTML.clear();
  const previousOptions = activeRenderOptions;
  const previousMode = activeRenderMode;
  activeRenderOptions = options;
  activeRenderMode = 'streaming';
  activeHighlightJs = options?.highlightJs;

  try {
    const raw = md.render(content);

    // Splice trusted block-renderer HTML back in (same as full path).
    let result = raw;
    for (const [id, block] of pendingBlockHTML) {
      result = result.replace(`<div id="${id}"></div>`, block.html);
    }

    // DOMPurify remains terminal-only. The light path is safe because raw HTML
    // is disabled, links are protocol-filtered, and only trusted renderer HTML
    // reaches this splice step.
    return result;
  } finally {
    activeRenderOptions = previousOptions;
    activeRenderMode = previousMode;
    activeHighlightJs = undefined;
    pendingBlockHTML.clear();
  }
}

/** Allow optional whitespace before `>` and case-insensitive tag names so model output still matches. */
function reasoningTagToOpenRe(tag: string): RegExp {
  return new RegExp(escapeRegExp(tag).replace(/>$/, '\\s*>'), 'i');
}

function reasoningTagToCloseRe(tag: string): RegExp {
  return new RegExp(escapeRegExp(tag).replace(/>$/, '\\s*>'), 'i');
}

function extractReasoningWithRegex(
  content: string,
  openRe: RegExp,
  closeRe: RegExp
): { reasoning: string; content: string } | null {
  openRe.lastIndex = 0;
  const openMatch = openRe.exec(content);
  if (!openMatch || openMatch.index === undefined) return null;

  const openEnd = openMatch.index + openMatch[0].length;
  const afterOpen = content.slice(openEnd);
  closeRe.lastIndex = 0;
  const closeMatch = closeRe.exec(afterOpen);

  if (closeMatch && closeMatch.index !== undefined) {
    const reasoning = afterOpen.slice(0, closeMatch.index).trim();
    const afterClose = afterOpen.slice(closeMatch.index + closeMatch[0].length);
    const mainContent = (content.slice(0, openMatch.index) + afterClose).trim();
    return { reasoning, content: mainContent };
  }

  const reasoning = afterOpen.trim();
  const mainContent = content.slice(0, openMatch.index).trim();
  return { reasoning, content: mainContent };
}

/**
 * Split reasoning from main assistant content. Uses case-insensitive matching and allows
 * optional whitespace in tags so variants like `<think>` still strip correctly.
 */
export function extractReasoning(
  content: string,
  tags = { open: '<redacted_thinking>', close: '</redacted_thinking>' }
): { reasoning: string; content: string } {
  const openRe = reasoningTagToOpenRe(tags.open);
  const closeRe = reasoningTagToCloseRe(tags.close);
  const result = extractReasoningWithRegex(content, openRe, closeRe);
  if (result) return result;

  return { reasoning: '', content };
}

/** True if `content` has an opening reasoning tag but no closing tag yet (streaming). */
export function hasUnclosedReasoning(
  content: string,
  tags: { open: string; close: string }
): boolean {
  const openRe = reasoningTagToOpenRe(tags.open);
  const closeRe = reasoningTagToCloseRe(tags.close);
  openRe.lastIndex = 0;
  const openMatch = openRe.exec(content);
  if (!openMatch) return false;
  const afterOpen = content.slice(openMatch.index + openMatch[0].length);
  closeRe.lastIndex = 0;
  return !closeRe.test(afterOpen);
}
