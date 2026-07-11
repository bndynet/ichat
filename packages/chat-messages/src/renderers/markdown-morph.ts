import { renderMarkdown, type MarkdownRenderOptions } from './markdown-renderer.js';
import { morphHtmlInto } from './dom-morph.js';

export interface RenderMarkdownIntoOptions extends MarkdownRenderOptions {
  previousHtml?: string;
}

export interface RenderMarkdownIntoResult {
  changed: boolean;
  html: string;
}

/**
 * Render markdown with the shared markdown pipeline and morph the result into
 * an existing host element when it changed.
 */
export function renderMarkdownInto(
  el: HTMLElement,
  content: string,
  options: RenderMarkdownIntoOptions = {},
): RenderMarkdownIntoResult {
  const { previousHtml = '', ...renderOptions } = options;
  const html = renderMarkdown(content, renderOptions);
  if (html === previousHtml) return { changed: false, html };

  morphHtmlInto(el, html);
  return { changed: true, html };
}
