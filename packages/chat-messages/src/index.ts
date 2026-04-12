export { ChatMessages } from './components/chat-messages.js';
export { ChatMessageElement } from './components/chat-message.js';
export { ChatReasoning } from './components/chat-reasoning.js';

export { StreamingController } from './controllers/streaming-controller.js';

export { rendererRegistry } from './renderers/registry.js';
export {
  md,
  renderMarkdown,
  extractReasoning,
  hasUnclosedReasoning,
} from './renderers/markdown-renderer.js';
export { updateTimelineStatus } from './renderers/timeline-plugin.js';
export type { TimelineStatus } from './renderers/timeline-plugin.js';
export { collapsiblePlugin } from './renderers/collapsible-plugin.js';

export type {
  ChatMessage,
  ChatMessageRole,
  BlockRenderer,
  ChatConfig,
  DateSeparatorLabels,
  ChatFormFieldValues,
  ChatFormDateRangeValue,
  ChatFormSubmitDetail,
} from './types.js';
export { DEFAULT_CONFIG } from './types.js';

export {
  calendarDaysAgo,
  getDateSeparatorInfo,
  resolveDateSeparatorLabels,
  DATE_SEPARATOR_LABELS_EN,
  DATE_SEPARATOR_LABELS_ZH_CN,
} from './date-separator.js';
export { formatAssistantDurationMs } from './duration-format.js';
export type { DateSeparatorInfo } from './date-separator.js';
