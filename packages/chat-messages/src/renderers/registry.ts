import type { BlockRenderer } from '../types.js';

class RendererRegistry {
  private _renderers = new Map<string, BlockRenderer>();
  private _frozen = false;

  /** Freeze the registry so no new renderers can be registered. Idempotent. */
  freeze(): void {
    this._frozen = true;
  }

  register(renderer: BlockRenderer): void {
    if (this._frozen) {
      throw new Error(
        'Markdown extensions must be registered before iChat is mounted. ' +
        'Call registerCodeRenderer() or registerMarkdownPlugin() at module-init time, ' +
        'before any <i-chat> or <i-chat-messages> element is inserted into the document.',
      );
    }
    this._renderers.set(renderer.name, renderer);
  }

  unregister(name: string): void {
    this._renderers.delete(name);
  }

  getRenderer(lang: string): BlockRenderer | undefined {
    for (const renderer of this._renderers.values()) {
      if (renderer.test(lang)) return renderer;
    }
    return undefined;
  }

  list(): BlockRenderer[] {
    return Array.from(this._renderers.values());
  }
}

export const rendererRegistry = new RendererRegistry();
