import type { PartRenderer } from '@bndynet/ichat-messages';
import { partRendererRegistry } from '@bndynet/ichat-messages';

/** Register a renderer for host-defined `x-*` custom parts on `<i-chat>` / `<i-chat-messages>` without importing `@bndynet/ichat-messages` directly. */
export function registerPartRenderer(renderer: PartRenderer): void {
  partRendererRegistry.register(renderer);
}
