import type MarkdownIt from 'markdown-it';
import { md, invalidateMarkdownCache } from './markdown-renderer.js';

export interface MarkdownPlugin {
  name: string;
  plugin: (md: MarkdownIt) => void;
  css?: string;
  cleanup?: () => void;
}

const registeredPlugins = new Map<string, MarkdownPlugin>();
let combinedCss = '';

function recomputeCss(): void {
  combinedCss = Array.from(registeredPlugins.values())
    .map((e) => e.css)
    .filter(Boolean)
    .join('\n');
}

/**
 * Register a markdown-it plugin on the shared instance.
 * Idempotent: calling again with the same name is a no-op.
 */
export function registerMarkdownPlugin(ext: MarkdownPlugin): () => void {
  if (registeredPlugins.has(ext.name)) return () => {};

  ext.plugin(md);
  registeredPlugins.set(ext.name, ext);
  recomputeCss();
  invalidateMarkdownCache();

  return () => {
    registeredPlugins.delete(ext.name);
    ext.cleanup?.();
    recomputeCss();
    invalidateMarkdownCache();
  };
}

/** Combined CSS of all registered plugins (internal use). */
export function getMarkdownPluginCss(): string {
  return combinedCss;
}
