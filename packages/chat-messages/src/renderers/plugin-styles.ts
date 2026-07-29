import {
  getMarkdownPluginStyles,
  getMarkdownPluginGlobalStyles,
} from './markdown-plugins.js';

const PLUGIN_ATTR = 'data-ichat-plugin';

// ── Shared constructable stylesheet ───────────────────────────────────────────

let sharedSheet: CSSStyleSheet | null | undefined;

function getOrCreateSharedSheet(): CSSStyleSheet | null {
  if (sharedSheet !== undefined) return sharedSheet;

  const css = getMarkdownPluginStyles();
  if (!css) {
    sharedSheet = null;
    return null;
  }

  try {
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(css);
    sharedSheet = sheet;
  } catch {
    // Fallback for environments without constructable stylesheets (SSR, older browsers).
    sharedSheet = null;
  }
  return sharedSheet;
}

// ── Per-shadow-root injection (shared sheet with fallback) ────────────────────

/**
 * Inject plugin CSS into a shadow root.
 *
 * When the environment supports constructable stylesheets, a single shared
 * `CSSStyleSheet` is adopted by every shadow root — no per-instance CSS
 * duplication.  Fallback for environments without `adoptedStyleSheets`:
 * a deduplicated `<style>` element per root.
 *
 * Call once per component instance in `connectedCallback`.
 * Returns a cleanup function for `disconnectedCallback`.
 */
export function injectPluginCss(parent: ParentNode): () => void {
  const sheet = getOrCreateSharedSheet();

  if (sheet && parent instanceof ShadowRoot) {
    // Shared constructable stylesheet — adopt once per root.
    const roots = parent.adoptedStyleSheets;
    if (!roots.includes(sheet)) {
      parent.adoptedStyleSheets = [...roots, sheet];
    }
    // The sheet is shared across all instances; don't remove it on disconnect.
    return () => {};
  }

  // ── Fallback: per-root <style> element ──────────────────────────────────
  const css = getMarkdownPluginStyles();
  if (!css) return () => {};

  // Dedup: don't append if already present (e.g. Lit reconnect after DOM move).
  if (parent.querySelector(`style[${PLUGIN_ATTR}]`)) return () => {};

  const style = document.createElement('style');
  style.setAttribute(PLUGIN_ATTR, '');
  style.textContent = css;
  parent.insertBefore(style, parent.firstChild);

  return () => style.remove();
}

// ── Global injection (document.head, singleton) ───────────────────────────────

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
  const css = getMarkdownPluginGlobalStyles();
  if (!css) return;

  const style = document.createElement('style');
  style.setAttribute('data-ichat-plugin-global', '');
  style.textContent = css;
  document.head.insertBefore(style, document.head.firstChild);
  globalCssInjected = true;
}

