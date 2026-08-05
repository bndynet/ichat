import type { PartRenderer } from '../types.js';

/** Validates a custom element name (must contain a hyphen per the spec). */
const CUSTOM_ELEMENT_NAME_RE = /^[a-z][a-z0-9]*-[a-z0-9-]*$/i;

/**
 * Registry of {@link PartRenderer}s for host-defined `x-*` custom parts.
 * Mirrors {@link RendererRegistry} (fenced-block renderers) but matches on the
 * part `type` instead of a fenced-code language.
 */
class PartRendererRegistry {
  private _renderers = new Map<string, PartRenderer>();

  register(renderer: PartRenderer): void {
    const existing = this._renderers.get(renderer.name);
    if (existing === renderer) return;
    if (existing) {
      console.warn(
        `[i-chat] Part renderer "${renderer.name}" is already registered with a different object. ` +
        'Keeping the first registration.',
      );
      return;
    }

    // Validate custom element name if element mode is used
    if (renderer.element && !CUSTOM_ELEMENT_NAME_RE.test(renderer.element)) {
      console.warn(
        `[i-chat] Part renderer "${renderer.name}" has an invalid element name "${renderer.element}". ` +
        'Custom element names must contain a hyphen (e.g. "my-element"). Registration skipped.',
      );
      return;
    }

    this._renderers.set(renderer.name, renderer);
  }

  unregister(name: string): void {
    this._renderers.delete(name);
  }

  getRenderer(
    type: string,
    onMatchError?: (renderer: PartRenderer, error: unknown) => void,
  ): PartRenderer | undefined {
    for (const renderer of this._renderers.values()) {
      try {
        if (renderer.test(type)) return renderer;
      } catch (error) {
        try {
          onMatchError?.(renderer, error);
        } catch {
          // Diagnostics must not break matching the remaining renderers.
        }
      }
    }
    return undefined;
  }

  list(): PartRenderer[] {
    return Array.from(this._renderers.values());
  }
}

export const partRendererRegistry = new PartRendererRegistry();
