export { Chat } from './components/chat.js';
export type {
  ChatConfirmationAction,
  ChatConfirmationChangeDetail,
  ChatConfirmationRequest,
  ChatConfirmationResolvedRequest,
  ChatConfirmationResult,
  ChatConfirmationVariant,
  ChatMessageMode,
} from './components/chat.js';
export { ChatRunController } from './controllers/chat-run-controller.js';
export type {
  ChatRunStatus,
  ChatRunOptions,
} from './controllers/chat-run-controller.js';
export type { ChatMiddleware } from './middleware/chat-middleware.js';
export type { ChatPlugin } from './middleware/chat-plugin.js';
export { createMiddlewareChain } from './middleware/chat-middleware.js';
export type {
  MessagesChangeDetail,
  MessagesChangeReason,
  MessagesChangeSource,
} from '@bndynet/ichat-messages';
import type { BlockRenderer, PartRenderer } from '@bndynet/ichat-messages';
import { rendererRegistry, partRendererRegistry } from '@bndynet/ichat-messages';

/** Register a fenced-code block renderer for `<i-chat>` / `<i-chat-messages>`. */
export function registerCodeRenderer(renderer: BlockRenderer): void {
  rendererRegistry.register(renderer);
}

/**
 * @deprecated Use {@link registerCodeRenderer} instead.
 */
export const registerRenderer = registerCodeRenderer;

/** Register a renderer for host-defined `x-*` custom parts. */
export function registerPartRenderer(renderer: PartRenderer): void {
  partRendererRegistry.register(renderer);
}

// Re-export markdown plugin API so consumers can register plugins
// from the top-level @bndynet/ichat package.
export {
  registerMarkdownPlugin,
  freezeMarkdownPlugins,
} from '@bndynet/ichat-messages';
export type { MarkdownPlugin } from '@bndynet/ichat-messages';

// Re-export commonly used types and utilities so consumers don't need
// to install the sub-packages separately.
export type {
  ChatMessage,
  ChatMessageRole,
  HighlightJs,
  ChatConfig,
  BlockRenderer,
  BlockRendererContext,
  RendererErrorDetail,
  RendererErrorKind,
  RendererErrorPhase,
  PartRenderer,
  DateSeparatorLabels,
  ChatPartActionDetail,
  ChatPartActionKind,
  MessagePart,
  PartBase,
  PartStatus,
  BuiltInMessagePartType,
  TaskStatus,
  TextPart,
  ReasoningPart,
  ToolCallPart,
  ToolCallState,
  FilePart,
  SourcePart,
  TodoItemStatus,
  TodoItem,
  TodoItemPatch,
  TodoPart,
  TodoPartOptions,
  CustomPart,
  CustomPartOf,
  PartOf,
  ExtendedMessagePart,
  PartFactoryOptions,
  ChatLabels,
  ComposerLabels,
  ReasoningLabels,
  ToolCallLabels,
  TodoLabels,
  MessagesLabels,
  ConfirmationLabels,
  DeepPartial,
  PluralForms,
  ChatLinkClickDetail,
  MarkdownRenderOptions,
} from '@bndynet/ichat-messages';
export {
  DEFAULT_CONFIG,
  BUILT_IN_MESSAGE_PART_TYPES,
  getMessageText,
  isBuiltInMessagePartType,
  isCustomMessagePartType,
  textPart,
  reasoningPart,
  todoPart,
  nextPartId,
  areTodoItemsTerminal,
  isTerminalTodoItem,
  normalizeTodoItemUpdateEvent,
  patchTodoItem,
  TODO_ITEM_STATUSES,
  TOOL_CALL_STATES,
  isMessagePart,
  isTodoItem,
  isTodoItemStatus,
  isTodoPart,
  isToolCallPart,
  isToolCallState,
  patchToolCallPart,
  appendMessagePart,
  applyMessagePartUpdate,
  findMessagePart,
  normalizeMessagePartUpdateEvent,
  patchMessagePart,
  replaceMessagePart,
  getTodoInitialExpanded,
  shouldInitializeTodoExpansion,
  createPartActionDetail,
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
  normalizeHistoryMessages,
} from '@bndynet/ichat-messages';
export type {
  ChatPartRenderContext,
  MessagePartUpdate,
  MessagePartUpdateApplyResult,
  MessagePartUpdateEventFailureReason,
  MessagePartUpdateEventResult,
  MessagePartUpdateFailureReason,
  MessagePartUpdateNormalizeFailureReason,
  MessagePartUpdateNormalizeResult,
  MessagePartUpdateResult,
  MessagePartLookupFailureReason,
  MessagePartLookupResult,
  MessagePartPatchResult,
  MessagePartReplaceResult,
  TodoItemUpdate,
  TodoItemUpdateNormalizeFailureReason,
  TodoItemUpdateNormalizeResult,
  TodoPatchFailureReason,
  TodoPatchResult,
  ToolCallPatchFailureReason,
  ToolCallPatchResult,
  PartLookupFailureReason,
  TodoItemUpdateEventFailureReason,
  TodoItemUpdateEventResult,
  TodoItemUpdateFailureReason,
  TodoItemUpdateResult,
  ToolCallUpdateFailureReason,
  ToolCallUpdateResult,
  NormalizeHistoryOptions,
} from '@bndynet/ichat-messages';
export { ChatInput } from '@bndynet/ichat-input';
export { ChatMessages, ChatPartHost, ChatToolCall, ChatTodo } from '@bndynet/ichat-messages';
