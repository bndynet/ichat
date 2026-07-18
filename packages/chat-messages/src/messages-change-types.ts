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
 * The event is dispatched after a message-collection mutation commits.
 * `previousMessages` is the pre-mutation reference; `messages` is the
 * newly committed array.  Direct external property assignment (e.g.
 * `chat.messages = […]`) does **not** emit this event.
 */
export interface MessagesChangeDetail {
  /** The newly committed message array (new reference). */
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
