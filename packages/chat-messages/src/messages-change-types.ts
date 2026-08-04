import type { ChatMessage } from './types.js';

/**
 * Granular reason describing what kind of mutation produced a
 * {@link MessagesChangeDetail | `messages-change`} event.
 */
export type MessagesChangeReason =
  | 'message:add'
  | 'message:update'
  | 'message:remove'
  | 'message:clear'
  | 'message:cancel'
  | 'message:error'
  | 'part:append'
  | 'part:update'
  | 'tool-call:update'
  | 'todo-item:update'
  | 'event:message-part-update'
  | 'event:todo-item-update';

/**
 * Identifies which component or subsystem originated the mutation.
 */
export type MessagesChangeSource =
  | 'i-chat'
  | 'i-chat-messages'
  | 'chat-run-controller';

/**
 * Payload of the `messages-change` custom event.
 *
 * The event is dispatched after an uncontrolled message-collection mutation
 * commits or when `<i-chat>` proposes a controlled mutation.
 * `previousMessages` is the pre-mutation reference; `messages` is the newly
 * committed or proposed array. Controlled `<i-chat>` events are cancelable;
 * consumers can call `preventDefault()` to reject the proposal. Direct
 * external property assignment (e.g. `chat.messages = […]`) does **not** emit
 * this event.
 */
export interface MessagesChangeDetail {
  /** The newly committed or controlled-mode proposed array (new reference). */
  messages: ChatMessage[];
  /** The message array before the mutation was applied. */
  previousMessages: ChatMessage[];
  /** Categorised reason for the change. */
  reason: MessagesChangeReason;
  /** Which component or subsystem originated the mutation. */
  source: MessagesChangeSource;
  /** Affected message id, when applicable. */
  messageId?: string;
  /** Affected part id, when applicable. */
  partId?: string;
  /** Affected todo-item id, when applicable. */
  itemId?: string;
  /** `true` when the component is in controlled mode (CHG-08). */
  controlled?: boolean;
  /** `true` when the component committed the change to its own property. */
  committed?: boolean;
}

/**
 * Build a {@link MessagesChangeDetail} from the common parameters used by
 * both `<i-chat>` and `<i-chat-messages>` commit paths.
 */
export function buildMessagesChangeDetail(
  next: ChatMessage[],
  previousMessages: ChatMessage[],
  context: {
    reason: MessagesChangeReason;
    source: MessagesChangeSource;
    messageId?: string;
    partId?: string;
    itemId?: string;
  },
): MessagesChangeDetail {
  return {
    messages: next,
    previousMessages,
    reason: context.reason,
    source: context.source,
    messageId: context.messageId,
    partId: context.partId,
    itemId: context.itemId,
  };
}
