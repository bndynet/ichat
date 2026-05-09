export { NiceChat } from './components/chat.js';
export { registerRenderer } from './register-renderer.js';

// Re-export commonly used types and utilities so consumers don't need
// to install the sub-packages separately.
export type {
  ChatMessage,
  ChatMessageRole,
  ChatConfig,
  BlockRenderer,
  DateSeparatorLabels,
  ChatFormSubmitDetail,
  ChatFormFieldValues,
  ChatFormDateRangeValue,
} from '@bndynet/ichat-messages';
export {
  DEFAULT_CONFIG,
  rendererRegistry,
  StreamingController,
  resolveDateSeparatorLabels,
  DATE_SEPARATOR_LABELS_EN,
  DATE_SEPARATOR_LABELS_ZH_CN,
  formatAssistantDurationMs,
} from '@bndynet/ichat-messages';
export { ChatInput } from '@bndynet/ichat-input';
export { ChatMessages } from '@bndynet/ichat-messages';
