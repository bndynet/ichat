import type {
  ChatMessage,
  MessagePart,
  MessagesChangeDetail,
  MessagesChangeReason,
  MessagePartUpdateResult,
  ToolCallUpdateResult,
  TodoItemUpdateResult,
  MessagePartUpdateEventResult,
  TodoItemUpdateEventResult,
  TodoItemPatch,
} from '@bndynet/ichat-messages';
import {
  addMessage,
  patchMessageById,
  appendMessagePart,
  patchMessagePart,
  applyMessagePartUpdate,
  findMessagePart,
  replaceMessagePart,
  patchToolCallPart,
  patchTodoItem,
  isToolCallPart,
  isTodoPart,
  normalizeMessagePartUpdateEvent,
  normalizeTodoItemUpdateEvent,
  cancelMessageData,
  buildMessagesChangeDetail,
} from '@bndynet/ichat-messages';

export type StreamingChangeCallback = (streaming: boolean) => void;

export interface ChatMessageStoreOptions {
  dispatchEvent: (event: Event) => boolean;
  onStreamingChange: StreamingChangeCallback;
  setMessages: (msgs: ChatMessage[]) => void;
  mode?: 'controlled' | 'uncontrolled';
}

/**
 * Encapsulates message-array state and all pure data-mutation methods
 * extracted from `<i-chat>`.  The host component delegates to this
 * store and keeps only DOM-touching methods (cancel, removeMessage,
 * clear, presentation proxy methods).
 *
 * Implements {@link import('./chat-run-controller.js').ChatMessageStorePort}
 * so it can be passed directly to `ChatRunController`.
 */
export class ChatMessageStore {
  private _messages: ChatMessage[] = [];
  private _mode: 'controlled' | 'uncontrolled';
  private _onStreamingChange: StreamingChangeCallback;
  private _dispatch: (event: Event) => boolean;
  private _setMessages: (msgs: ChatMessage[]) => void;

  constructor(options: ChatMessageStoreOptions) {
    this._mode = options.mode ?? 'uncontrolled';
    this._dispatch = options.dispatchEvent;
    this._onStreamingChange = options.onStreamingChange;
    this._setMessages = options.setMessages;
  }

  // ── Public accessors ────────────────────────────────────────────

  /** The current message array (plain `ChatMessage[]`). */
  get messages(): ChatMessage[] {
    return this._messages;
  }

  /** Write messages from an external source (e.g. child-originated event). */
  writeMessages(msgs: ChatMessage[]): void {
    this._messages = msgs;
  }

  get mode(): 'controlled' | 'uncontrolled' {
    return this._mode;
  }

  set mode(val: 'controlled' | 'uncontrolled') {
    this._mode = val;
  }

  // ── Streaming derivation ────────────────────────────────────────

  private _syncStreamingFromMessages(msgs: ChatMessage[]): void {
    const active = msgs.some((m) => m.streaming && !m.error);
    this._onStreamingChange(active);
  }

  // ── Central commit ──────────────────────────────────────────────

  private _commitMessages(
    next: ChatMessage[],
    context: {
      reason: MessagesChangeReason;
      messageId?: string;
      partId?: string;
      itemId?: string;
    },
  ): void {
    if (next === this._messages) return;
    const previousMessages = this._messages;

    if (this._mode === 'controlled') {
      this._syncStreamingFromMessages(next);
      this._dispatch(
        new CustomEvent<MessagesChangeDetail>('messages-change', {
          detail: {
            ...buildMessagesChangeDetail(next, previousMessages, { ...context, source: 'i-chat' }),
            controlled: true,
            committed: false,
          },
          bubbles: true,
          composed: true,
        }),
      );
      return;
    }

    // Uncontrolled: component owns the state.
    this._messages = next;
    this._setMessages(next);
    this._syncStreamingFromMessages(next);
    this._dispatch(
      new CustomEvent<MessagesChangeDetail>('messages-change', {
        detail: {
          ...buildMessagesChangeDetail(next, previousMessages, { ...context, source: 'i-chat' }),
          controlled: false,
          committed: true,
        },
        bubbles: true,
        composed: true,
      }),
    );
  }

  // ── Message-level mutations ─────────────────────────────────────

  addMessage(message: ChatMessage): void {
    this._commitMessages(addMessage(this._messages, message), {
      reason: 'message:add',
      messageId: message.id,
    });
  }

  updateMessage(id: string, partial: Partial<ChatMessage>): void {
    this._commitMessages(patchMessageById(this._messages, id, partial), {
      reason: 'message:update',
      messageId: id,
    });
  }

  appendPart(messageId: string, part: MessagePart): void {
    this._commitMessages(appendMessagePart(this._messages, messageId, part), {
      reason: 'part:append',
      messageId,
      partId: part.id,
    });
  }

  updatePart(
    messageId: string,
    partId: string,
    patch: Partial<MessagePart>,
  ): void {
    const result = patchMessagePart(this._messages, messageId, partId, patch);
    if (result.ok) {
      this._commitMessages(result.messages, {
        reason: 'part:update',
        messageId,
        partId,
      });
    }
  }

  addErrorMessage(error: string, text = ''): void {
    this.addMessage({
      id: `err-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      role: 'assistant',
      parts: text ? [{ type: 'text', id: `err-text-${Date.now()}`, text }] : [],
      error,
      timestamp: Date.now(),
    });
  }

  // ── Diagnostic / typed updates ──────────────────────────────────

  tryUpdatePart(
    messageId: string,
    partId: string,
    patch: Partial<MessagePart>,
  ): MessagePartUpdateResult {
    const result = applyMessagePartUpdate(this._messages, { messageId, partId, patch });
    if (!result.ok) return { ok: false, reason: result.reason, part: result.part };

    this._commitMessages(result.messages, { reason: 'part:update', messageId, partId });
    return { ok: true, part: result.part };
  }

  tryUpdateToolCall(
    messageId: string,
    partId: string,
    patch: Partial<MessagePart>,
  ): ToolCallUpdateResult {
    const lookup = findMessagePart(this._messages, messageId, partId);
    if (!lookup.ok) return { ok: false, reason: lookup.reason };

    const { part } = lookup;
    if (!isToolCallPart(part)) return { ok: false, reason: 'part-type-mismatch', part };

    const tcResult = patchToolCallPart(part, patch);
    if (!tcResult.ok) return { ok: false, reason: tcResult.reason, part: tcResult.part };

    const replacement = replaceMessagePart(this._messages, messageId, partId, tcResult.part);
    if (!replacement.ok) return { ok: false, reason: replacement.reason };

    this._commitMessages(replacement.messages, { reason: 'tool-call:update', messageId, partId });
    return { ok: true, part: tcResult.part };
  }

  tryUpdateTodoItem(
    messageId: string,
    partId: string,
    itemId: string,
    patch: TodoItemPatch,
    revision?: number,
  ): TodoItemUpdateResult {
    const lookup = findMessagePart(this._messages, messageId, partId);
    if (!lookup.ok) return { ok: false, reason: lookup.reason };

    const { part } = lookup;
    if (!isTodoPart(part)) return { ok: false, reason: 'part-type-mismatch', part };

    const todoResult = patchTodoItem(part, itemId, patch, revision);
    if (!todoResult.ok) return { ok: false, reason: todoResult.reason, part: todoResult.part };

    const replacement = replaceMessagePart(this._messages, messageId, partId, todoResult.part);
    if (!replacement.ok) return { ok: false, reason: replacement.reason };

    this._commitMessages(replacement.messages, {
      reason: 'todo-item:update',
      messageId,
      partId,
      itemId,
    });
    return { ok: true, part: todoResult.part };
  }

  tryApplyTodoItemUpdateEvent(
    event: unknown,
  ): TodoItemUpdateEventResult {
    const norm = normalizeTodoItemUpdateEvent(event);
    if (!norm.ok) return { ok: false, reason: norm.reason };

    const { messageId, partId, itemId, patch, revision } = norm.update;
    const update = this.tryUpdateTodoItem(messageId, partId, itemId, patch, revision);
    if (!update.ok) {
      return { ok: false, reason: update.reason, update: norm.update, part: update.part };
    }
    return { ok: true, update: norm.update, part: update.part };
  }

  tryApplyMessagePartUpdateEvent(
    event: unknown,
  ): MessagePartUpdateEventResult {
    const norm = normalizeMessagePartUpdateEvent(event);
    if (!norm.ok) return { ok: false, reason: norm.reason };

    const update = this.tryUpdatePart(norm.update.messageId, norm.update.partId, norm.update.patch);
    if (!update.ok) {
      return { ok: false, reason: update.reason, update: norm.update, part: update.part };
    }
    return { ok: true, update: norm.update, part: update.part };
  }

  // ── Cancellation (pure data only, no DOM) ───────────────────────

  /** Commit any pre-computed message array (used by host for remove/clear). */
  commitMessages(
    next: ChatMessage[],
    context: {
      reason: MessagesChangeReason;
      messageId?: string;
      partId?: string;
      itemId?: string;
    },
  ): void {
    this._commitMessages(next, context);
  }

  cancelMessageData(id: string, hint?: string): ChatMessage[] | null {
    const next = cancelMessageData(this._messages, id, hint);
    if (next === this._messages) return null;
    return next;
  }

  cancelMessage(id: string, hint?: string): boolean {
    const next = cancelMessageData(this._messages, id, hint);
    if (next === this._messages) return false;
    this._commitMessages(next, { reason: 'message:cancel', messageId: id });
    return true;
  }
}
