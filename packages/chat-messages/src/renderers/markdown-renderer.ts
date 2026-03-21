import MarkdownIt from 'markdown-it';
import hljs from 'highlight.js';
import DOMPurify from 'dompurify';
import { rendererRegistry } from './registry.js';
import { timelinePlugin } from './timeline-plugin.js';
import { collapsiblePlugin } from './collapsible-plugin.js';

const md = new MarkdownIt({
  html: false,
  linkify: true,
  typographer: true,
  highlight(str: string, lang: string): string {
    if (lang && hljs.getLanguage(lang)) {
      return hljs.highlight(str, { language: lang }).value;
    }
    return '';
  },
});

md.use(timelinePlugin);
md.use(collapsiblePlugin);

// ── DOMPurify configuration ──────────────────────────────────────────────────
// Shared between the outer render pass and the inner details-body sanitisation.
const DOMPURIFY_CONFIG: Parameters<typeof DOMPurify.sanitize>[1] = {
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
  ],
};

// ── Fence block renderer ──────────────────────────────────────────────────────
// Block renderer outputs are trusted (registered code, not user content).
// We stash them here and splice them back in after DOMPurify runs so that
// custom elements / arbitrary HTML from renderers are never stripped.
const pendingBlockHTML = new Map<string, string>();

// ── Built-in fence renderer: ```details Title … ``` ──────────────────────────
// Supports an optional title extracted from the info string.
// Inner content is rendered as full markdown and sanitised separately so that
// any standard markdown elements (tables, lists, code blocks, timelines …)
// work correctly inside the collapsible body.
// NOTE: Nested *fence-based* custom renderers inside a details block are not
// supported — they will fall back to a plain highlighted code block. Plugin-
// based renderers (e.g. the timeline ordered-list syntax) work fine.
rendererRegistry.register({
  name: 'chat-details',
  test: (lang: string) => /^details\b/i.test(lang),
  render: (content: string, _lang: string, info = ''): string => {
    // Extract title: everything after the first word ("details")
    const title = info.replace(/^details\s*/i, '').trim() || 'Details';
    const safeTitle = md.utils.escapeHtml(title);

    // Render the body through the full markdown pipeline (supports timeline,
    // tables, code highlighting, etc.) then sanitise the result.
    const bodyRaw = md.render(content);
    const bodyHtml = DOMPurify.sanitize(bodyRaw, DOMPURIFY_CONFIG);

    return (
      `<details class="chat-details">\n` +
      `<summary class="chat-details__summary">${safeTitle}</summary>\n` +
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

export function renderMarkdown(content: string): string {
  pendingBlockHTML.clear();
  const raw = md.render(content);

  let sanitized = DOMPurify.sanitize(raw, DOMPURIFY_CONFIG);

  // Splice trusted block-renderer HTML back in, bypassing DOMPurify.
  for (const [id, html] of pendingBlockHTML) {
    sanitized = sanitized.replace(`<div id="${id}"></div>`, html);
  }
  pendingBlockHTML.clear();

  return sanitized;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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
