import { getMarkdownPluginCss } from './markdown-extensions.js';

/**
 * Inject registered markdown plugin CSS into a parent node.
 * Call once per component in `connectedCallback`.
 * Returns a cleanup function for `disconnectedCallback`.
 */
export function injectPluginCss(parent: ParentNode): () => void {
  const css = getMarkdownPluginCss();
  if (!css) return () => {};

  const style = document.createElement('style');
  style.setAttribute('data-ichat-ext', '');
  style.textContent = css;
  parent.insertBefore(style, parent.firstChild);

  return () => style.remove();
}

