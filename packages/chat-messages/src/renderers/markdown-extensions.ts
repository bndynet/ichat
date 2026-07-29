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
let frozen = false;

function recomputeCss(): void {
  combinedStyles = Array.from(registeredPlugins.values())
    .map((e) => e.styles)
    .filter(Boolean)
    .join('\n');
  combinedGlobalStyles = Array.from(registeredPlugins.values())
    .map((e) => e.globalStyles)
    .filter(Boolean)
    .join('\n');
}

/** Freeze the extension registry so no new extensions can be registered. Idempotent. */
export function freezeMarkdownExtensions(): void {
  frozen = true;
}

/**
 * Register a markdown-it extension on the shared instance.
 *
 * - Same `id` with the same object reference: silent no-op (idempotent).
 * - Same `id` with a different object: throws — prevents accidental version
 *   conflicts or duplicate registration from separate bundles.
 * - Extensions are installed in registration order; fine-grained markdown-it
 *   rule ordering within a single extension is controlled via
 *   `md.inline.ruler.before()` / `md.block.ruler.after()` etc.
 *
 * Extensions are permanent — once registered they cannot be unregistered.
 *
 * @throws If called after the first iChat component has connected to the DOM.
 * @throws If a different extension is already registered under the same `id`.
 */
export function registerMarkdownPlugin(ext: MarkdownPlugin): void {
  if (frozen) {
    console.warn(
      '[i-chat] Markdown extensions should be registered before iChat is mounted. ' +
      'Call registerMarkdownPlugin() at module-init time, ' +
      'before any <i-chat> or <i-chat-messages> element is inserted into the document.',
    );
    // Still install — late registration is better than not at all.
  }

  const existing = registeredPlugins.get(ext.id);
  if (existing) {
    if (existing === ext) return; // same object — idempotent
    console.warn(
      `[i-chat] Markdown plugin "${ext.id}" is already registered with a different object. ` +
      'This usually means two copies of the same plugin are loaded from separate bundles. ' +
      'Skipping duplicate.',
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

/** Combined global CSS of all registered extensions (internal use). */
export function getMarkdownPluginGlobalStyles(): string {
  return combinedGlobalStyles;
}
