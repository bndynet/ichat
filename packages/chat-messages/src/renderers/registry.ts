import type { BlockRenderer } from '../types.js';

const changeListeners = new Set<() => void>();

/** @internal Subscribe to changes that can affect fenced-block output. */
export function onRendererRegistryChange(listener: () => void): () => void {
  changeListeners.add(listener);
  return () => changeListeners.delete(listener);
}

function notifyChange(): void {
  for (const listener of changeListeners) listener();
}

class RendererRegistry {
  private _renderers = new Map<string, BlockRenderer>();
  private _frozen = false;

  register(renderer: BlockRenderer): void {
    if (this._frozen) {
      throw new Error(
        `[i-chat] Cannot register block renderer "${renderer.name}" after i-chat-messages has mounted. ` +
          'Register all renderers before the first render.',
      );
    }

    const existing = this._renderers.get(renderer.name);
    if (existing === renderer) return;
    if (existing) {
      console.warn(
        `[i-chat] Block renderer "${renderer.name}" is already registered with a different object. ` +
          'Keeping the first registration.',
      );
      return;
    }

    this._renderers.set(renderer.name, renderer);
    notifyChange();
  }

  unregister(name: string): void {
    if (this._frozen) {
      console.warn(
        `[i-chat] Cannot unregister block renderer "${name}" after i-chat-messages has mounted.`,
      );
      return;
    }
    if (this._renderers.delete(name)) notifyChange();
  }

  /** Freeze the registry so no further renderers can be registered. */
  freeze(): void {
    this._frozen = true;
  }

  getRenderer(
    lang: string,
    onMatchError?: (renderer: BlockRenderer, error: unknown) => void,
  ): BlockRenderer | undefined {
    for (const renderer of this._renderers.values()) {
      try {
        if (renderer.test(lang)) return renderer;
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

  list(): BlockRenderer[] {
    return Array.from(this._renderers.values());
  }
}

export const rendererRegistry = new RendererRegistry();
