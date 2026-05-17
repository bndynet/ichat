export { Chat } from './components/chat.js';
export { registerRenderer } from './register-renderer.js';
export { registerPartRenderer } from './register-part-renderer.js';

// Re-export commonly used types and utilities so consumers don't need
// to install the sub-packages separately.
export type {
  ChatMessage,
  ChatMessageRole,
  ChatConfig,
  BlockRenderer,
  PartRenderer,
  DateSeparatorLabels,
  ChatFormSubmitDetail,
  ChatFormFieldValues,
  ChatFormDateRangeValue,
  MessagePart,
  PartBase,
  PartStatus,
  TextPart,
  ReasoningPart,
  ToolCallPart,
  ToolCallState,
  FilePart,
  SourcePart,
  CustomPart,
  PartFactoryOptions,
  ChatLabels,
  ComposerLabels,
  ReasoningLabels,
  ToolCallLabels,
  MessagesLabels,
  DeepPartial,
  PluralForms,
} from '@bndynet/ichat-messages';
export {
  DEFAULT_CONFIG,
  getMessageText,
  textPart,
  reasoningPart,
  nextPartId,
  rendererRegistry,
  partRendererRegistry,
  StreamingController,
  resolveDateSeparatorLabels,
  makeDaysAgo,
  DATE_SEPARATOR_LABELS_EN,
  DATE_SEPARATOR_LABELS_ZH_CN,
  resolveLabels,
  CHAT_LABELS_EN,
  CHAT_LABELS_ZH_CN,
  formatAssistantDurationMs,
} from '@bndynet/ichat-messages';
export { ChatInput } from '@bndynet/ichat-input';
export { ChatMessages, ChatToolCall } from '@bndynet/ichat-messages';
