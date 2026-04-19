import type { BlockRenderer } from '@bndynet/chat-messages';
import { rendererRegistry } from '@bndynet/chat-messages';

/** Register a fenced-code block renderer for `<i-chat>` / `<i-chat-messages>` without importing `@bndynet/chat-messages` directly. */
export function registerRenderer(renderer: BlockRenderer): void {
  rendererRegistry.register(renderer);
}
