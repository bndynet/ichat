import { rendererRegistry } from '@bndynet/ichat-messages';
import { mermaidRenderer } from './mermaid-renderer.js';

// Auto-register on import — no manual setup needed.
rendererRegistry.register(mermaidRenderer);

export {
  ChatMermaid,
  MERMAID_SOURCE_CLASS,
  mermaidRenderer,
  mermaidPlugin,
  createMermaidRenderer,
} from './mermaid-renderer.js';

export { CHAT_MERMAID_TOKEN_NAMES } from './mermaid-theme-tokens.js';
export type { ChatMermaidTokenName } from './mermaid-theme-tokens.js';

export type { RendererOptions } from './utils.js';
export { CHAT_TOGGLE_SOURCE_CLASS, renderCodeFallback, wrapWithCodeToggle } from './utils.js';
