import { getMarkdownPluginCss } from './markdown-extensions.js';

/**
 * Inject registered markdown plugin CSS into a parent node.
 * Call once per component instance in `connectedCallback`.
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

let globalCssInjected = false;

/**
 * Inject plugin CSS into `document.head` exactly once per document.
 * Safe to call from every component instance — subsequent calls are no-ops.
 *
 * Global CSS is permanent (matches the permanent nature of plugin registration)
 * so there is no cleanup function.
 */
export function injectGlobalPluginCss(): void {
  if (globalCssInjected) return;
  const css = getMarkdownPluginCss();
  if (!css) return;

  const style = document.createElement('style');
  style.setAttribute('data-ichat-ext-global', '');
  style.textContent = css;
  document.head.insertBefore(style, document.head.firstChild);
  globalCssInjected = true;
}

