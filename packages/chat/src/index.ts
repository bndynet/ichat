export { NiceChat } from './components/chat.js';

// Re-export commonly used types and utilities so consumers don't need
// to install the sub-packages separately.
export type { ChatMessage, ChatConfig, BlockRenderer } from '@bndynet/chat-messages';
export { DEFAULT_CONFIG, rendererRegistry, StreamingController } from '@bndynet/chat-messages';
export { ChatInput } from '@bndynet/chat-input';
export { ChatMessages } from '@bndynet/chat-messages';
