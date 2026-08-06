import type {
  ChatMessage,
  MessagePart,
  MessagesChangeReason,
  MessagePartUpdateResult,
  ToolCallPart,
  ToolCallUpdateResult,
  TodoItemUpdateResult,
  MessagePartUpdateEventResult,
  TodoItemUpdateEventResult,
  TodoItemPatch,
} from "@bndynet/ichat-messages";
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
} from "@bndynet/ichat-messages";
import { acceptedNoOp, type ChatMutationOutcome } from "./mutation-outcome.js";

export interface ChatMessageStoreChangeContext {
  reason: MessagesChangeReason;
  messageId?: string;
  partId?: string;
  itemId?: string;
}

export interface ChatMessageStoreChange extends ChatMessageStoreChangeContext {
  messages: ChatMessage[];
  previousMessages: ChatMessage[];
  controlled: boolean;
}

export interface ChatMessageStoreOptions {
  /** Read the host's current authoritative message array. */
  getMessages: () => ChatMessage[];
  /** Read the host's current ownership mode. */
  getMode: () => "controlled" | "uncontrolled";
  /** Submit a computed change to the host for controlled/uncontrolled handling. */
  commit: (change: ChatMessageStoreChange) => boolean | void;
}

interface ProposalTag {
  epoch: number;
  revision: number;
}

interface PendingProposal extends ProposalTag {
  messages: ChatMessage[];
}

/**
 * Encapsulates pure message-array mutations without owning a second committed
 * copy of the collection. The host remains the single source of truth. In
 * controlled mode, one latest pending proposal is retained so sequential
 * mutations remain deterministic while a framework propagates state
 * asynchronously. A host assignment reconciles or replaces that proposal.
 *
 * Implements {@link import('../controllers/chat-run-controller.js').ChatMessageStorePort}
 * so it can be passed directly to `ChatRunController`.
 */
export class ChatMessageStore {
  private readonly _getMessages: () => ChatMessage[];
  private readonly _getMode: () => "controlled" | "uncontrolled";
  private readonly _commit: (change: ChatMessageStoreChange) => boolean | void;

  private _pendingProposal?: PendingProposal;
  private _lastHostMessages?: ChatMessage[];
  private _hasObservedHostMessages = false;
  private _wasControlled = false;
  private _proposalEpoch = 0;
  private _nextProposalRevision = 0;
  private readonly _proposalTags = new WeakMap<ChatMessage[], ProposalTag>();

  constructor(options: ChatMessageStoreOptions) {
    this._getMessages = options.getMessages;
    this._getMode = options.getMode;
    this._commit = options.commit;
  }

  // ── Public accessors ────────────────────────────────────────────

  /**
   * Current mutation snapshot. In controlled mode this may be the latest
   * accepted proposal while the host property is still propagating.
   */
  get messages(): ChatMessage[] {
    const hostMessages = this._getMessages();
    const controlled = this._getMode() === "controlled";

    if (!controlled) {
      if (this._wasControlled) this._invalidateProposalChain();
      this._wasControlled = false;
      this._observeHostMessages(hostMessages);
      return hostMessages;
    }

    if (!this._wasControlled) {
      this._invalidateProposalChain();
      this._wasControlled = true;
      this._observeHostMessages(hostMessages);
    } else {
      this._reconcileHostMessages(hostMessages);
    }

    return this._pendingProposal?.messages ?? hostMessages;
  }

  private _observeHostMessages(messages: ChatMessage[]): void {
    this._lastHostMessages = messages;
    this._hasObservedHostMessages = true;
  }

  private _invalidateProposalChain(): void {
    this._pendingProposal = undefined;
    this._proposalEpoch += 1;
    this._nextProposalRevision = 0;
  }

  private _reconcileHostMessages(hostMessages: ChatMessage[]): void {
    if (!this._hasObservedHostMessages) {
      this._observeHostMessages(hostMessages);
      return;
    }
    if (hostMessages === this._lastHostMessages) return;

    this._observeHostMessages(hostMessages);
    const pending = this._pendingProposal;
    if (!pending) return;

    const accepted = this._proposalTags.get(hostMessages);
    if (
      !accepted ||
      accepted.epoch !== pending.epoch ||
      accepted.revision > pending.revision
    ) {
      // An unrelated external replacement supersedes all pending proposals.
      this._invalidateProposalChain();
      return;
    }

    if (accepted.revision === pending.revision) {
      // The host caught up with the latest proposal; no working copy remains.
      this._invalidateProposalChain();
    }
    // An earlier proposal was accepted out of an async queue. Keep the latest
    // proposal as the working snapshot until the host catches up to it.
  }

  // ── Central commit ──────────────────────────────────────────────

  private _commitMessages(
    previousMessages: ChatMessage[],
    next: ChatMessage[],
    context: ChatMessageStoreChangeContext,
  ): ChatMutationOutcome {
    if (next === previousMessages) return acceptedNoOp();
    const controlled = this._getMode() === "controlled";

    if (!controlled) {
      this._commit({
        ...context,
        messages: next,
        previousMessages,
        controlled: false,
      });
      return { changed: true, accepted: true };
    }

    const previousProposal = this._pendingProposal;
    const proposal: PendingProposal = {
      messages: next,
      epoch: this._proposalEpoch,
      revision: ++this._nextProposalRevision,
    };
    this._pendingProposal = proposal;
    this._proposalTags.set(next, proposal);

    const accepted =
      this._commit({
        ...context,
        messages: next,
        previousMessages,
        controlled: true,
      }) !== false;

    if (!accepted && this._pendingProposal === proposal) {
      // `preventDefault()` rejects this proposal and restores the previous
      // working snapshot, if one existed.
      this._proposalTags.delete(next);
      this._pendingProposal = previousProposal;
    }

    return { changed: true, accepted };
  }

  // ── Message-level mutations ─────────────────────────────────────

  addMessage(message: ChatMessage): ChatMutationOutcome {
    const previousMessages = this.messages;
    return this._commitMessages(
      previousMessages,
      addMessage(previousMessages, message),
      {
        reason: "message:add",
        messageId: message.id,
      },
    );
  }

  updateMessage(
    id: string,
    partial: Partial<ChatMessage>,
  ): ChatMutationOutcome {
    const previousMessages = this.messages;
    return this._commitMessages(
      previousMessages,
      patchMessageById(previousMessages, id, partial),
      {
        reason: "message:update",
        messageId: id,
      },
    );
  }

  appendPart(messageId: string, part: MessagePart): ChatMutationOutcome {
    const previousMessages = this.messages;
    return this._commitMessages(
      previousMessages,
      appendMessagePart(previousMessages, messageId, part),
      {
        reason: "part:append",
        messageId,
        partId: part.id,
      },
    );
  }

  updatePart(
    messageId: string,
    partId: string,
    patch: Partial<MessagePart>,
  ): ChatMutationOutcome {
    const previousMessages = this.messages;
    const result = patchMessagePart(previousMessages, messageId, partId, patch);
    if (!result.ok) return acceptedNoOp();

    return this._commitMessages(previousMessages, result.messages, {
      reason: "part:update",
      messageId,
      partId,
    });
  }

  addErrorMessage(error: string, text = ""): ChatMutationOutcome {
    return this.addMessage({
      id: `err-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      role: "assistant",
      parts: text ? [{ type: "text", id: `err-text-${Date.now()}`, text }] : [],
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
    const result = applyMessagePartUpdate(previousMessages, {
      messageId,
      partId,
      patch,
    });
    if (!result.ok)
      return { ok: false, reason: result.reason, part: result.part };

    this._commitMessages(previousMessages, result.messages, {
      reason: "part:update",
      messageId,
      partId,
    });
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
    if (!isToolCallPart(part))
      return { ok: false, reason: "part-type-mismatch", part };

    const tcResult = patchToolCallPart(part, patch as Partial<ToolCallPart>);
    if (!tcResult.ok)
      return { ok: false, reason: tcResult.reason, part: tcResult.part };

    const replacement = replaceMessagePart(
      previousMessages,
      messageId,
      partId,
      tcResult.part,
    );
    if (!replacement.ok) return { ok: false, reason: replacement.reason };

    this._commitMessages(previousMessages, replacement.messages, {
      reason: "tool-call:update",
      messageId,
      partId,
    });
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
    if (!isTodoPart(part))
      return { ok: false, reason: "part-type-mismatch", part };

    const todoResult = patchTodoItem(part, itemId, patch, revision);
    if (!todoResult.ok)
      return { ok: false, reason: todoResult.reason, part: todoResult.part };

    const replacement = replaceMessagePart(
      previousMessages,
      messageId,
      partId,
      todoResult.part,
    );
    if (!replacement.ok) return { ok: false, reason: replacement.reason };

    this._commitMessages(previousMessages, replacement.messages, {
      reason: "todo-item:update",
      messageId,
      partId,
      itemId,
    });
    return { ok: true, part: todoResult.part };
  }

  tryApplyTodoItemUpdateEvent(event: unknown): TodoItemUpdateEventResult {
    const norm = normalizeTodoItemUpdateEvent(event);
    if (!norm.ok) return { ok: false, reason: norm.reason };

    const { messageId, partId, itemId, patch, revision } = norm.update;
    const update = this.tryUpdateTodoItem(
      messageId,
      partId,
      itemId,
      patch,
      revision,
    );
    if (!update.ok) {
      return {
        ok: false,
        reason: update.reason,
        update: norm.update,
        part: update.part,
      };
    }
    return { ok: true, update: norm.update, part: update.part };
  }

  tryApplyMessagePartUpdateEvent(event: unknown): MessagePartUpdateEventResult {
    const norm = normalizeMessagePartUpdateEvent(event);
    if (!norm.ok) return { ok: false, reason: norm.reason };

    const update = this.tryUpdatePart(
      norm.update.messageId,
      norm.update.partId,
      norm.update.patch,
    );
    if (!update.ok) {
      return {
        ok: false,
        reason: update.reason,
        update: norm.update,
        part: update.part,
      };
    }
    return { ok: true, update: norm.update, part: update.part };
  }

  // ── Cancellation (pure data only, no DOM) ───────────────────────

  /** Commit any pre-computed message array (used by host for remove/clear). */
  commitMessages(
    next: ChatMessage[],
    context: ChatMessageStoreChangeContext,
  ): ChatMutationOutcome {
    return this._commitMessages(this.messages, next, context);
  }

  cancelMessageData(id: string, hint?: string): ChatMessage[] | null {
    const previousMessages = this.messages;
    const next = cancelMessageData(previousMessages, id, hint);
    if (next === previousMessages) return null;
    return next;
  }

  cancelMessage(id: string, hint?: string): ChatMutationOutcome {
    const previousMessages = this.messages;
    return this._commitMessages(
      previousMessages,
      cancelMessageData(previousMessages, id, hint),
      {
        reason: "message:cancel",
        messageId: id,
      },
    );
  }
}
