import type MarkdownIt from 'markdown-it';
import { md } from './markdown-renderer.js';
import { invalidateMarkdownCache } from './markdown-morph.js';

export interface MarkdownPlugin {
  id: string;
  install: (md: MarkdownIt) => void;
  /** CSS injected into every relevant Shadow Root (shared constructable stylesheet). */
  styles?: string;
  /** CSS injected into `document.head` once per document (e.g. `@font-face`). */
  globalStyles?: string;
}

const registeredPlugins = new Map<string, MarkdownPlugin>();
let combinedStyles = '';
let combinedGlobalStyles = '';
let onCssChange: (() => void) | null = null;

/** Register a callback invoked whenever the combined plugin CSS changes. */
export function onPluginCssChange(cb: () => void): void {
  onCssChange = cb;
}

function recomputeCss(): void {
  combinedStyles = Array.from(registeredPlugins.values())
    .map((e) => e.styles)
    .filter(Boolean)
    .join('\n');
  combinedGlobalStyles = Array.from(registeredPlugins.values())
    .map((e) => e.globalStyles)
    .filter(Boolean)
    .join('\n');
  onCssChange?.();
}

/**
 * Register a markdown-it plugin on the shared instance.
 *
 * - Same `id` with the same object reference: silent no-op (idempotent).
 * - Same `id` with a different object: warns and keeps the first registration.
 * - Plugins are installed in registration order; fine-grained markdown-it
 *   rule ordering within a single plugin is controlled via
 *   `md.inline.ruler.before()` / `md.block.ruler.after()` etc.
 *
 * Plugins are permanent — once registered they cannot be unregistered.
 * Registration is allowed at runtime and affects subsequent markdown renders.
 */
export function registerMarkdownPlugin(ext: MarkdownPlugin): void {
  const existing = registeredPlugins.get(ext.id);
  if (existing) {
    if (existing === ext) return;
    console.warn(
      `[i-chat] Markdown plugin "${ext.id}" is already registered with a different object. ` +
      'Keeping the first registration.',
    );
    return;
  }

  ext.install(md);
  registeredPlugins.set(ext.id, ext);
  recomputeCss();
  invalidateMarkdownCache();
}

/** Combined shadow-root CSS of all registered plugins (internal use). */
export function getMarkdownPluginStyles(): string {
  return combinedStyles;
}

/** Combined global CSS of all registered plugins (internal use). */
export function getMarkdownPluginGlobalStyles(): string {
  return combinedGlobalStyles;
}
