import type { BlockRenderer } from '@bndynet/ichat-messages';
import { rendererRegistry } from '@bndynet/ichat-messages';

/** Register a fenced-code block renderer for `<i-chat>` / `<i-chat-messages>`. */
export function registerCodeRenderer(renderer: BlockRenderer): void {
  rendererRegistry.register(renderer);
}

/**
 * @deprecated Use {@link registerCodeRenderer} instead.
 */
export const registerRenderer = registerCodeRenderer;
