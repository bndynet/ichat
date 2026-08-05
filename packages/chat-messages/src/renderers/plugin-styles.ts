import {
  getMarkdownPluginStyles,
  getMarkdownPluginGlobalStyles,
  onPluginCssChange,
} from './markdown-plugins.js';

const PLUGIN_ATTR = 'data-ichat-plugin';
const GLOBAL_PLUGIN_ATTR = 'data-ichat-plugin-global';

// ── Track injected <style> elements so they stay in sync ─────────────────────

const trackedStyles = new Set<HTMLStyleElement>();

onPluginCssChange(() => {
  if (typeof document === 'undefined') return;

  const css = getMarkdownPluginStyles();
  for (const style of trackedStyles) {
    style.textContent = css;
  }
  // Also refresh global styles
  const globalCss = getMarkdownPluginGlobalStyles();
  let globalStyle = document.head.querySelector(`style[${GLOBAL_PLUGIN_ATTR}]`) as HTMLStyleElement | null;
  if (globalCss) {
    if (!globalStyle) {
      globalStyle = document.createElement('style');
      globalStyle.setAttribute(GLOBAL_PLUGIN_ATTR, '');
      document.head.insertBefore(globalStyle, document.head.firstChild);
    }
    globalStyle.textContent = globalCss;
  } else {
    globalStyle?.remove();
  }
});

// ── Per-shadow-root injection ────────────────────────────────────────────────

/**
 * Inject plugin CSS into a shadow root.
 *
 * Uses a per-root `<style>` element.  When new plugins register after the
 * first injection, all existing `<style>` elements are automatically updated
 * via the {@link onPluginCssChange} callback.
 *
 * Call once per component instance in `connectedCallback`.
 * Returns a cleanup function for `disconnectedCallback`.
 */
export function injectPluginCss(parent: ParentNode): () => void {
  const css = getMarkdownPluginStyles();

  let style = parent.querySelector(`style[${PLUGIN_ATTR}]`) as HTMLStyleElement | null;

  if (!style) {
    style = document.createElement('style');
    style.setAttribute(PLUGIN_ATTR, '');
    parent.insertBefore(style, parent.firstChild);
  }

  // Track the root even while CSS is empty so a plugin registered after this
  // component mounted can populate the style element in place.
  trackedStyles.add(style);
  style.textContent = css;
  return () => {
    trackedStyles.delete(style!);
    style!.remove();
  };
}

// ── Global injection (document.head) ──────────────────────────────────────────

/**
 * Inject plugin CSS into `document.head`.  Updates the existing `<style>`
 * element when plugins register after the first injection (e.g. lazy-loaded
 * renderer packages).
 *
 * Safe to call from every component instance — idempotent.
 * Global CSS is permanent so there is no cleanup function.
 */
export function injectGlobalPluginCss(): void {
  const css = getMarkdownPluginGlobalStyles();

  let style = document.head.querySelector(`style[${GLOBAL_PLUGIN_ATTR}]`) as HTMLStyleElement | null;

  if (!css) {
    style?.remove();
    return;
  }

  if (!style) {
    style = document.createElement('style');
    style.setAttribute(GLOBAL_PLUGIN_ATTR, '');
    document.head.insertBefore(style, document.head.firstChild);
  }

  style.textContent = css;
}
