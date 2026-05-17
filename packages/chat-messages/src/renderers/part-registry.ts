import type { PartRenderer } from '../types.js';

/**
 * Registry of {@link PartRenderer}s for host-defined `x-*` custom parts.
 * Mirrors {@link RendererRegistry} (fenced-block renderers) but matches on the
 * part `type` instead of a fenced-code language.
 */
class PartRendererRegistry {
  private _renderers = new Map<string, PartRenderer>();

  register(renderer: PartRenderer): void {
    this._renderers.set(renderer.name, renderer);
  }

  unregister(name: string): void {
    this._renderers.delete(name);
  }

  getRenderer(type: string): PartRenderer | undefined {
    for (const renderer of this._renderers.values()) {
      if (renderer.test(type)) return renderer;
    }
    return undefined;
  }

  list(): PartRenderer[] {
    return Array.from(this._renderers.values());
  }
}

export const partRendererRegistry = new PartRendererRegistry();
