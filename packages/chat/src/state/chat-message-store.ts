import type {
  ChatMessage,
  MessagePart,
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
} from '@bndynet/ichat-messages';

export interface ChatMessageStoreChangeContext {
  reason: MessagesChangeReason;
  messageId?: string;
  partId?: string;
  itemId?: string;
}

export interface ChatMessageStoreChange extends ChatMessageStoreChangeContext {
  messages: ChatMessage[];
  previousMessages: ChatMessage[];
}

export interface ChatMessageStoreOptions {
  /** Read the host's current authoritative message array. */
  getMessages: () => ChatMessage[];
  /** Submit a computed change to the host for controlled/uncontrolled handling. */
  commit: (change: ChatMessageStoreChange) => void;
}

/**
 * Encapsulates pure message-array mutations without owning a second copy of
 * the collection. The host remains the single source of truth; every mutation
 * reads through `getMessages` and submits the computed result through `commit`.
 *
 * Implements {@link import('../controllers/chat-run-controller.js').ChatMessageStorePort}
 * so it can be passed directly to `ChatRunController`.
 */
export class ChatMessageStore {
  private readonly _getMessages: () => ChatMessage[];
  private readonly _commit: (change: ChatMessageStoreChange) => void;

  constructor(options: ChatMessageStoreOptions) {
    this._getMessages = options.getMessages;
    this._commit = options.commit;
  }

  // ── Public accessors ────────────────────────────────────────────

  /** The current message array (plain `ChatMessage[]`). */
  get messages(): ChatMessage[] {
    return this._getMessages();
  }

  // ── Central commit ──────────────────────────────────────────────

  private _commitMessages(
    previousMessages: ChatMessage[],
    next: ChatMessage[],
    context: ChatMessageStoreChangeContext,
  ): void {
    if (next === previousMessages) return;
    this._commit({ ...context, messages: next, previousMessages });
  }

  // ── Message-level mutations ─────────────────────────────────────

  addMessage(message: ChatMessage): void {
    const previousMessages = this.messages;
    this._commitMessages(previousMessages, addMessage(previousMessages, message), {
      reason: 'message:add',
      messageId: message.id,
    });
  }

  updateMessage(id: string, partial: Partial<ChatMessage>): void {
    const previousMessages = this.messages;
    this._commitMessages(previousMessages, patchMessageById(previousMessages, id, partial), {
      reason: 'message:update',
      messageId: id,
    });
  }

  appendPart(messageId: string, part: MessagePart): void {
    const previousMessages = this.messages;
    this._commitMessages(previousMessages, appendMessagePart(previousMessages, messageId, part), {
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
    const previousMessages = this.messages;
    const result = patchMessagePart(previousMessages, messageId, partId, patch);
    if (result.ok) {
      this._commitMessages(previousMessages, result.messages, {
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
    const previousMessages = this.messages;
    const result = applyMessagePartUpdate(previousMessages, { messageId, partId, patch });
    if (!result.ok) return { ok: false, reason: result.reason, part: result.part };

    this._commitMessages(previousMessages, result.messages, { reason: 'part:update', messageId, partId });
    return { ok: true, part: result.part };
  }

  tryUpdateToolCall(
    messageId: string,
    partId: string,
    patch: Partial<MessagePart>,
  ): ToolCallUpdateResult {
    const previousMessages = this.messages;
    const lookup = findMessagePart(previousMessages, messageId, partId);
    if (!lookup.ok) return { ok: false, reason: lookup.reason };

    const { part } = lookup;
    if (!isToolCallPart(part)) return { ok: false, reason: 'part-type-mismatch', part };

    const tcResult = patchToolCallPart(part, patch);
    if (!tcResult.ok) return { ok: false, reason: tcResult.reason, part: tcResult.part };

    const replacement = replaceMessagePart(previousMessages, messageId, partId, tcResult.part);
    if (!replacement.ok) return { ok: false, reason: replacement.reason };

    this._commitMessages(previousMessages, replacement.messages, { reason: 'tool-call:update', messageId, partId });
    return { ok: true, part: tcResult.part };
  }

  tryUpdateTodoItem(
    messageId: string,
    partId: string,
    itemId: string,
    patch: TodoItemPatch,
    revision?: number,
  ): TodoItemUpdateResult {
    const previousMessages = this.messages;
    const lookup = findMessagePart(previousMessages, messageId, partId);
    if (!lookup.ok) return { ok: false, reason: lookup.reason };

    const { part } = lookup;
    if (!isTodoPart(part)) return { ok: false, reason: 'part-type-mismatch', part };

    const todoResult = patchTodoItem(part, itemId, patch, revision);
    if (!todoResult.ok) return { ok: false, reason: todoResult.reason, part: todoResult.part };

    const replacement = replaceMessagePart(previousMessages, messageId, partId, todoResult.part);
    if (!replacement.ok) return { ok: false, reason: replacement.reason };

    this._commitMessages(previousMessages, replacement.messages, {
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
    context: ChatMessageStoreChangeContext,
  ): void {
    this._commitMessages(this.messages, next, context);
  }

  cancelMessageData(id: string, hint?: string): ChatMessage[] | null {
    const previousMessages = this.messages;
    const next = cancelMessageData(previousMessages, id, hint);
    if (next === previousMessages) return null;
    return next;
  }

  cancelMessage(id: string, hint?: string): boolean {
    const previousMessages = this.messages;
    const next = cancelMessageData(previousMessages, id, hint);
    if (next === previousMessages) return false;
    this._commitMessages(previousMessages, next, { reason: 'message:cancel', messageId: id });
    return true;
  }
}
