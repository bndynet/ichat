import { renderMarkdown, type MarkdownRenderOptions } from './markdown-renderer.js';
import { morphHtmlInto } from './dom-morph.js';
import { onRendererRegistryChange } from './registry.js';
import {
  invalidateMarkdownCache,
  lookupMarkdownCache,
  storeMarkdownCache,
} from './markdown-cache.js';

export { invalidateMarkdownCache, replaceCachedMarkdownHtml } from './markdown-cache.js';

export interface RenderMarkdownIntoOptions extends MarkdownRenderOptions {
  /**
   * HTML currently rendered in `el` for the *complete* `content`. A partial
   * render (e.g. the streaming light pipeline, which only covers the text
   * revealed so far) must not be passed here: on a `partId` cache hit it is
   * morphed back into `el` as-is, which would pin the DOM to truncated HTML.
   */
  previousHtml?: string;
  /** Optional part id for content-level caching (avoids re-render when raw markdown is unchanged). */
  partId?: string;
}

export interface RenderMarkdownIntoResult {
  changed: boolean;
  html: string;
  /** Whether this call executed the Markdown pipeline instead of using cached HTML. */
  rendered: boolean;
}

/**
 * Render markdown with the shared markdown pipeline and morph the result into
 * an existing host element when it changed.
 *
 * Two-level cache:
 * 1. Per-part cache of content + rendered HTML — if the content and the
 *    output-affecting render options are unchanged, the whole pipeline
 *    (markdown-it + DOMPurify) is skipped. A fresh element instance with no
 *    `previousHtml` of its own — which is what virtual scrolling produces when
 *    a row re-enters the viewport — is served the cached HTML.
 * 2. HTML comparison — if the rendered HTML matches `previousHtml`, DOM morphing
 *    is skipped.
 */
export function renderMarkdownInto(
  el: HTMLElement,
  content: string,
  options: RenderMarkdownIntoOptions = {},
): RenderMarkdownIntoResult {
  const { previousHtml = '', partId, ...renderOptions } = options;

  // Level 1: per-part cache — skip the full pipeline when nothing that affects
  // the output has changed.
  const cached = lookupMarkdownCache(partId, content, previousHtml, renderOptions);
  if (cached.reuse === 'previous') {
    // Lit may have re-rendered the template (e.g. `repeat` reconciling after a
    // history prepend), leaving a new empty DOM that needs patching.
    morphHtmlInto(el, previousHtml);
    return { changed: false, html: previousHtml, rendered: false };
  }
  if (cached.reuse === 'cached') {
    morphHtmlInto(el, cached.html);
    return { changed: true, html: cached.html, rendered: false };
  }

  const html = renderMarkdown(content, renderOptions);

  if (partId) {
    storeMarkdownCache(partId, content, html, renderOptions);
  }

  if (html === previousHtml) return { changed: false, html, rendered: true };

  morphHtmlInto(el, html);
  return { changed: true, html, rendered: true };
}

// A renderer registered at runtime must be visible the next time an existing
// text part renders, even when its raw Markdown content has not changed.
onRendererRegistryChange(() => invalidateMarkdownCache());
