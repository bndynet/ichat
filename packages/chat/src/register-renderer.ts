import type { BlockRenderer } from '@bndynet/ichat-messages';
import { rendererRegistry } from '@bndynet/ichat-messages';

/** Register a fenced-code block renderer for `<i-chat>` / `<i-chat-messages>` without importing `@bndynet/ichat-messages` directly. */
export function registerRenderer(renderer: BlockRenderer): void {
  rendererRegistry.register(renderer);
}
