export { NiceChat } from './components/chat.js';

// Re-export commonly used types and utilities so consumers don't need
// to install the sub-packages separately.
export type {
  ChatMessage,
  ChatMessageRole,
  ChatConfig,
  BlockRenderer,
  DateSeparatorLabels,
} from '@bndynet/chat-messages';
export {
  DEFAULT_CONFIG,
  rendererRegistry,
  StreamingController,
  resolveDateSeparatorLabels,
  DATE_SEPARATOR_LABELS_EN,
  DATE_SEPARATOR_LABELS_ZH_CN,
  formatAssistantDurationMs,
} from '@bndynet/chat-messages';
export { ChatInput } from '@bndynet/chat-input';
export { ChatMessages } from '@bndynet/chat-messages';
