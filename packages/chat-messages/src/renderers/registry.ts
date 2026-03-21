import type { BlockRenderer } from '../types.js';

class RendererRegistry {
  private _renderers = new Map<string, BlockRenderer>();

  register(renderer: BlockRenderer): void {
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
