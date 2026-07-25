import { renderMarkdown, type MarkdownRenderOptions, invalidateMarkdownCache } from './markdown-renderer.js';
import { morphHtmlInto } from './dom-morph.js';

export interface RenderMarkdownIntoOptions extends MarkdownRenderOptions {
  previousHtml?: string;
  /** Optional part id for content-level caching (avoids re-render when raw markdown is unchanged). */
  partId?: string;
}

export interface RenderMarkdownIntoResult {
  changed: boolean;
  html: string;
}

/** Raw markdown → rendered HTML cache (skips expensive md.render when content is identical). */
const rawContentCache = new Map<string, string>();

/**
 * Render markdown with the shared markdown pipeline and morph the result into
 * an existing host element when it changed.
 *
 * Two-level cache:
 * 1. Raw markdown content hash — if the raw string is identical to last render,
 *    the entire pipeline (markdown-it + DOMPurify) is skipped.
 * 2. HTML comparison — if the rendered HTML matches `previousHtml`, DOM morphing
 *    is skipped.
 */
export function renderMarkdownInto(
  el: HTMLElement,
  content: string,
  options: RenderMarkdownIntoOptions = {},
): RenderMarkdownIntoResult {
  const { previousHtml = '', partId, ...renderOptions } = options;

  // Level 1: raw content cache — skip full pipeline when content unchanged
  let html: string;
  if (partId) {
    const cached = rawContentCache.get(partId);
    if (cached === content) {
      // Content unchanged — return previous HTML without re-rendering
      return { changed: false, html: previousHtml };
    }
  }

  html = renderMarkdown(content, renderOptions);

  // Update raw content cache
  if (partId) {
    rawContentCache.set(partId, content);
  }

  if (html === previousHtml) return { changed: false, html };

  morphHtmlInto(el, html);
  return { changed: true, html };
}

export { invalidateMarkdownCache };
