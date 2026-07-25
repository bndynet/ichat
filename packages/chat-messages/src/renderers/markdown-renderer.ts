import MarkdownIt from 'markdown-it';
import type hljs from 'highlight.js';
import DOMPurify from 'dompurify';
import { rendererRegistry } from './registry.js';
import { progressPlugin } from './progress-plugin.js';
import { collapsiblePlugin } from './collapsible-plugin.js';
import { normalizeAllowedLinkProtocols, uriRegexpForAllowedLinkProtocols } from '../link-protocols.js';
import { chatIconStrings } from '../icons.js';

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

/** Safe default: render code blocks without highlighting when hljs is unavailable. */
function defaultHighlight(str: string, _lang: string): string {
  return md.utils.escapeHtml(str);
}

const md = new MarkdownIt({
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
    return defaultHighlight(str, lang);
  },
});

// Keep protocol filtering in DOMPurify so per-render `allowedLinkProtocols`
// can enforce either the safe defaults or a host-provided allow list.
md.validateLink = () => true;

md.use(progressPlugin);
md.use(collapsiblePlugin);

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
let activeRenderOptions: MarkdownRenderOptions | undefined;

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
// Block renderer outputs are trusted (registered code, not user content).
// We stash them here and splice them back in after DOMPurify runs so that
// custom elements / arbitrary HTML from renderers are never stripped.
const pendingBlockHTML = new Map<string, string>();

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
    const html = customRenderer.render(token.content, lang, info);
    // Use a stable, collision-resistant placeholder id.
    const id = `_br_${idx}_${pendingBlockHTML.size}`;
    pendingBlockHTML.set(id, html);
    // <div id="..."> is kept verbatim by DOMPurify.
    return `<div id="${id}"></div>`;
  }

  return defaultFence(tokens, idx, options, env, self);
};

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

// ── Markdown content cache ────────────────────────────────────────────────────
// Avoid re-rendering unchanged markdown content during streaming updates.
const markdownContentCache = new Map<string, { rawMd: string; html: string }>();

/** Invalidate the markdown cache for a specific part or entirely. */
export function invalidateMarkdownCache(partId?: string): void {
  if (partId) {
    markdownContentCache.delete(partId);
  } else {
    markdownContentCache.clear();
  }
}

export function renderMarkdown(content: string, options?: MarkdownRenderOptions): string {
  pendingBlockHTML.clear();
  const previousOptions = activeRenderOptions;
  activeRenderOptions = options;
  activeHighlightJs = options?.highlightJs;

  try {
    const raw = md.render(content);

    let sanitized = sanitizeHtml(raw, options);

    // Splice trusted block-renderer HTML back in, bypassing DOMPurify.
    for (const [id, html] of pendingBlockHTML) {
      sanitized = sanitized.replace(`<div id="${id}"></div>`, html);
    }

    return sanitized;
  } finally {
    activeRenderOptions = previousOptions;
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
