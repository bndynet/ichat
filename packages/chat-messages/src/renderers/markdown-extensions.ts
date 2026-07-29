import type MarkdownIt from 'markdown-it';
import { md } from './markdown-renderer.js';
import { invalidateMarkdownCache } from './markdown-morph.js';

export interface MarkdownPlugin {
  name: string;
  plugin: (md: MarkdownIt) => void;
  css?: string;
}

const registeredPlugins = new Map<string, MarkdownPlugin>();
let combinedCss = '';
let frozen = false;

function recomputeCss(): void {
  combinedCss = Array.from(registeredPlugins.values())
    .map((e) => e.css)
    .filter(Boolean)
    .join('\n');
}

/** Freeze the plugin registry so no new plugins can be registered. Idempotent. */
export function freezeMarkdownExtensions(): void {
  frozen = true;
}

/**
 * Register a markdown-it plugin on the shared instance.
 * Idempotent: calling again with the same name is a no-op.
 *
 * Plugins are permanent — once registered they cannot be unregistered.
 * Markdown-it plugins cannot be removed from the pipeline, so registrations
 * should happen at module-init time before any component mounts.
 *
 * @throws If called after the first iChat component has connected to the DOM.
 */
export function registerMarkdownPlugin(ext: MarkdownPlugin): void {
  if (frozen) {
    throw new Error(
      'Markdown extensions must be registered before iChat is mounted. ' +
      'Call registerCodeRenderer() or registerMarkdownPlugin() at module-init time, ' +
      'before any <i-chat> or <i-chat-messages> element is inserted into the document.',
    );
  }
  if (registeredPlugins.has(ext.name)) return;

  ext.plugin(md);
  registeredPlugins.set(ext.name, ext);
  recomputeCss();
  invalidateMarkdownCache();
}

/** Combined CSS of all registered plugins (internal use). */
export function getMarkdownPluginCss(): string {
  return combinedCss;
}
