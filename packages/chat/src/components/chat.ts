import { LitElement, html, unsafeCSS, nothing, type PropertyValues } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';
import { setVersionAttribute } from '../version.js';
import type {
  ChatFormSubmitDetail,
  ChatPartActionDetail,
  ChatLinkClickDetail,
  ChatMessage,
  ChatConfig,
  BlockRenderer,
  ConfirmationLabels,
  TodoActionDetail,
  ToolActionDetail,
  MessagesChangeDetail,
  MessagesChangeReason,
  MessagePartUpdateResult,
  ToolCallUpdateResult,
  TodoItemUpdateResult,
  MessagePartUpdateEventResult,
  TodoItemUpdateEventResult,
} from '@bndynet/ichat-messages';
import {
  ChatMessages,
  StreamingController,
  resolveLabels,
  addMessage,
  patchMessageById,
  removeMessageById,
  clearMessages,
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
} from '@bndynet/ichat-messages';
import { ChatInput } from '@bndynet/ichat-input';
import { registerRenderer as registerBlockRenderer } from '../register-renderer.js';

import styles from '../styles/chat.scss';

void ChatMessages;
void ChatInput;

export type {
  ChatMessage,
  ChatConfig,
  BlockRenderer,
  ChatFormSubmitDetail,
  ChatPartActionDetail,
  ChatLinkClickDetail,
  TodoActionDetail,
  ToolActionDetail,
};

export type ChatConfirmationVariant = 'default' | 'danger';

export interface ChatConfirmationRequest {
  id?: string;
  title: string;
  description?: string;
  details?: unknown;
  requiredLabel?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ChatConfirmationVariant;
  payload?: unknown;
}

export type ChatConfirmationResolvedRequest = ChatConfirmationRequest & { id: string };
export type ChatConfirmationAction = 'confirm' | 'cancel';

export interface ChatConfirmationResult {
  id: string;
  action: ChatConfirmationAction;
  confirmed: boolean;
  request: ChatConfirmationResolvedRequest;
}

export interface ChatConfirmationChangeDetail {
  active: ChatConfirmationResolvedRequest | null;
  queue: ChatConfirmationResolvedRequest[];
  queueLength: number;
}

type PendingConfirmation = {
  request: ChatConfirmationResolvedRequest;
  resolve: (result: ChatConfirmationResult) => void;
};

/**
 * `<i-chat>` — A complete, drop-in chat Web Component.
 *
 * Bundles `<i-chat-messages>` and `<i-chat-input>`. Optional fenced-block
 * renderers (e.g. from `@bndynet/ichat-renderers`) should be registered with
 * `registerRenderer` from `@bndynet/ichat` before messages use those blocks.
 *
 * ## Slots
 *
 * | Slot                 | Description                                        |
 * |----------------------|----------------------------------------------------|
 * | `self-avatar`        | Custom avatar for `role: self` messages            |
 * | `peer-avatar`        | Custom avatar for `role: peer` messages            |
 * | `assistant-avatar`   | Custom avatar for assistant/system messages        |
 * | `message-actions`    | Action buttons shown on each message                |
 * | `reasoning-header`   | Custom header for reasoning/thinking blocks         |
 * | `empty`              | Content shown when there are no messages            |
 * | `actions`            | Toolbar row **inside** the default `<i-chat-input>` (left side) |
 * | `input`              | Replace the default `<i-chat-input>` entirely           |
 *
 * Voice-related props `showVoiceInput`, `voiceLang`, and `voiceListeningLabel` are forwarded to
 * the default `<i-chat-input>` (same behavior as using that element directly).
 *
 * @fires send - `{ detail: { content: string } }` when user submits a message
 * @fires cancel - Fired when user clicks cancel during streaming
 * @fires messages-change - `{ detail: MessagesChangeDetail }` after a message-collection mutation commits.
 *   Direct external `messages = […]` assignments do **not** emit this event.
 * @fires streaming-change - `{ detail: { streaming: boolean } }` when streaming state changes
 * @fires message-action - `{ detail: { action: string, message: ChatMessage } }` from message action buttons
 * @fires part-action - `{ detail: ChatPartActionDetail }` unified action from rendered message parts
 * @fires form-submit - Deprecated compatibility event for embedded form submissions; prefer `part-action`
 * @fires todo-action - Deprecated compatibility event for todo status requests; prefer `part-action`
 * @fires tool-action - Deprecated compatibility event for tool-call approval requests; prefer `part-action`
 * @fires link-click - `{ detail: ChatLinkClickDetail }` when a rendered message link is clicked; cancelable with `preventDefault()`
 * @fires confirmation-change - `{ detail: { active, queue, queueLength } }` when the active confirmation or queue changes
 * @fires confirmation-decision - `{ detail: ChatConfirmationResult }` when the user confirms or cancels the active confirmation
 *
 * @example
 * ```html
 * <i-chat></i-chat>
 * ```
 *
 * @example Custom input slot
 * ```html
 * <i-chat>
 *   <div slot="input">
 *     <my-custom-input></my-custom-input>
 *   </div>
 * </i-chat>
 * ```
 *
 * @example Default composer toolbar (`i-chat-input` actions)
 * ```html
 * <i-chat>
 *   <div slot="actions" style="display:flex;gap:8px;align-items:center">
 *     <button type="button">+</button>
 *     <span>Tools</span>
 *   </div>
 * </i-chat>
 * ```
 */
@customElement('i-chat')
export class Chat extends LitElement {
  static styles = unsafeCSS(styles);

  @property({ type: Array }) messages: ChatMessage[] = [];
  @property({ type: Object }) config: ChatConfig = {};
  @property() emptyText = '';
  /**
   * Composer placeholder. When empty (default), the localized placeholder from
   * `config.locale` / `config.labels.composer` is used; set it to override.
   */
  @property() placeholder = '';
  /** Disable the input area. */
  @property({ type: Boolean, reflect: true }) disabled = false;

  /**
   * When true (default), the default `<i-chat-input>` shows a voice button if the browser
   * supports speech recognition. When false, the voice button is never shown.
   */
  @property({ type: Boolean, reflect: true, attribute: 'show-voice-input' }) showVoiceInput = true;

  /** Passed to the default `<i-chat-input>` for speech recognition language (BCP 47). */
  @property({ attribute: 'voice-lang' }) voiceLang = '';

  /**
   * Passed to the default `<i-chat-input>` — label on the listening overlay.
   * When empty (default), the localized string from `config.locale` /
   * `config.labels.composer` is used.
   */
  @property({ attribute: 'voice-listening-label' }) voiceListeningLabel = '';

  /** Passed to the default `<i-chat-input>` — enables `console.debug` speech logs. */
  @property({ type: Boolean, reflect: true, attribute: 'voice-diagnostics' }) voiceDiagnostics = false;

  @query('i-chat-messages') private _messages!: ChatMessages;
  @query('i-chat-input') private _input!: ChatInput;

  @state() private _streaming = false;
  @state() private _hasCustomInput = false;
  @state() private _activeConfirmation: PendingConfirmation | null = null;

  /** Observes light-DOM children so slots added after first render (e.g. Vue `onMounted`) are forwarded. */
  private _lightChildObserver?: MutationObserver;
  private _confirmationQueue: PendingConfirmation[] = [];
  private _confirmationId = 0;

  // ── Top-level message-state owner (CHG-03) ────────────────────────
  //
  // Methods below write directly to `this.messages` using shared pure
  // reducers and commit through `_commitMessages`.  The child receives
  // the array via one-way `.messages` template binding.

  /**
   * Central commit point for every top-level message-collection mutation.
   * Synchronously updates `this.messages`, derives streaming state, and
   * emits exactly one `messages-change` from `<i-chat>`.
   */
  private _commitMessages(
    next: ChatMessage[],
    context: {
      reason: MessagesChangeReason;
      messageId?: string;
      partId?: string;
      itemId?: string;
    },
  ): void {
    if (next === this.messages) return;
    const previousMessages = this.messages;
    this.messages = next;
    this._syncStreamingFromMessages(next);
    this.dispatchEvent(
      new CustomEvent<MessagesChangeDetail>('messages-change', {
        detail: {
          messages: next,
          previousMessages,
          reason: context.reason,
          source: 'i-chat',
          messageId: context.messageId,
          partId: context.partId,
          itemId: context.itemId,
        },
        bubbles: true,
        composed: true,
      }),
    );
  }

  /** Derive aggregate streaming state from the current message array. */
  private _syncStreamingFromMessages(msgs: ChatMessage[]): void {
    const active = msgs.some((m) => m.streaming && !m.error);
    this._setStreamingState(active);
  }

  addMessage(message: ChatMessage): void {
    this._commitMessages(addMessage(this.messages, message), {
      reason: 'message:add',
      messageId: message.id,
    });
  }

  updateMessage(id: string, partial: Partial<ChatMessage>): void {
    this._commitMessages(patchMessageById(this.messages, id, partial), {
      reason: 'message:update',
      messageId: id,
    });
  }

  /** Append a structured body part to a message. */
  appendPart(messageId: string, part: Parameters<ChatMessages['appendPart']>[1]): void {
    this._commitMessages(appendMessagePart(this.messages, messageId, part), {
      reason: 'part:append',
      messageId,
      partId: part.id,
    });
  }

  /** Patch a single body part by its `id`. */
  updatePart(
    messageId: string,
    partId: string,
    patch: Parameters<ChatMessages['updatePart']>[2]
  ): void {
    const result = patchMessagePart(this.messages, messageId, partId, patch);
    if (result.ok) {
      this._commitMessages(result.messages, {
        reason: 'part:update',
        messageId,
        partId,
      });
    }
  }

  removeMessage(id: string): void {
    this._commitMessages(removeMessageById(this.messages, id), {
      reason: 'message:remove',
      messageId: id,
    });
    // Reply blocks live in the child — clear them there.
    if (this._messages) this._messages.clearReplyMessage(id);
  }

  clear(): void {
    this._commitMessages(clearMessages(), { reason: 'message:clear' });
    if (this._messages) {
      this._messages._clearPresentation();
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

  // ── Diagnostic / tool / todo / SSE (CHG-04) ──────────────────────
  //
  // Methods below now read `this.messages`, call the same pure helpers
  // the child uses, and commit through `_commitMessages`.  Diagnostic
  // results are identical to the pre-migration child implementations.

  /** Patch any message part and return a diagnostic result. */
  tryUpdatePart(
    messageId: string,
    partId: string,
    patch: Parameters<ChatMessages['tryUpdatePart']>[2]
  ): MessagePartUpdateResult {
    const result = applyMessagePartUpdate(this.messages, { messageId, partId, patch });
    if (!result.ok) return { ok: false, reason: result.reason, part: result.part };

    this._commitMessages(result.messages, { reason: 'part:update', messageId, partId });
    return { ok: true, part: result.part };
  }

  /** Patch a `tool-call` part and return a diagnostic result. */
  tryUpdateToolCall(
    messageId: string,
    partId: string,
    patch: Parameters<ChatMessages['tryUpdateToolCall']>[2]
  ): ToolCallUpdateResult {
    const lookup = findMessagePart(this.messages, messageId, partId);
    if (!lookup.ok) return { ok: false, reason: lookup.reason };

    const { part } = lookup;
    if (!isToolCallPart(part)) return { ok: false, reason: 'part-type-mismatch', part };

    const tcResult = patchToolCallPart(part, patch);
    if (!tcResult.ok) return { ok: false, reason: tcResult.reason, part: tcResult.part };

    const replacement = replaceMessagePart(this.messages, messageId, partId, tcResult.part);
    if (!replacement.ok) return { ok: false, reason: replacement.reason };

    this._commitMessages(replacement.messages, { reason: 'tool-call:update', messageId, partId });
    return { ok: true, part: tcResult.part };
  }

  /** Boolean compatibility wrapper around {@link tryUpdateToolCall}. */
  updateToolCall(
    messageId: string,
    partId: string,
    patch: Parameters<ChatMessages['updateToolCall']>[2]
  ): boolean {
    return this.tryUpdateToolCall(messageId, partId, patch).ok;
  }

  /** Immutably patch one todo item and return a diagnostic result. */
  tryUpdateTodoItem(
    messageId: string,
    partId: string,
    itemId: string,
    patch: Parameters<ChatMessages['tryUpdateTodoItem']>[3],
    revision?: number,
  ): TodoItemUpdateResult {
    const lookup = findMessagePart(this.messages, messageId, partId);
    if (!lookup.ok) return { ok: false, reason: lookup.reason };

    const { part } = lookup;
    if (!isTodoPart(part)) return { ok: false, reason: 'part-type-mismatch', part };

    const todoResult = patchTodoItem(part, itemId, patch, revision);
    if (!todoResult.ok) return { ok: false, reason: todoResult.reason, part: todoResult.part };

    const replacement = replaceMessagePart(this.messages, messageId, partId, todoResult.part);
    if (!replacement.ok) return { ok: false, reason: replacement.reason };

    this._commitMessages(replacement.messages, {
      reason: 'todo-item:update',
      messageId,
      partId,
      itemId,
    });
    return { ok: true, part: todoResult.part };
  }

  /** Boolean compatibility wrapper around {@link tryUpdateTodoItem}. */
  updateTodoItem(
    messageId: string,
    partId: string,
    itemId: string,
    patch: Parameters<ChatMessages['updateTodoItem']>[3],
    revision?: number,
  ): boolean {
    return this.tryUpdateTodoItem(messageId, partId, itemId, patch, revision).ok;
  }

  /** Apply a backend/SSE todo item update and return a diagnostic result. */
  tryApplyTodoItemUpdateEvent(
    event: Parameters<ChatMessages['tryApplyTodoItemUpdateEvent']>[0]
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

  /** Boolean compatibility wrapper around {@link tryApplyTodoItemUpdateEvent}. */
  applyTodoItemUpdateEvent(event: Parameters<ChatMessages['applyTodoItemUpdateEvent']>[0]): boolean {
    return this.tryApplyTodoItemUpdateEvent(event).ok;
  }

  /** Apply a backend/SSE message part update and return a diagnostic result. */
  tryApplyMessagePartUpdateEvent(
    event: Parameters<ChatMessages['tryApplyMessagePartUpdateEvent']>[0]
  ): MessagePartUpdateEventResult {
    const norm = normalizeMessagePartUpdateEvent(event);
    if (!norm.ok) return { ok: false, reason: norm.reason };

    const update = this.tryUpdatePart(norm.update.messageId, norm.update.partId, norm.update.patch);
    if (!update.ok) {
      return { ok: false, reason: update.reason, update: norm.update, part: update.part };
    }
    return { ok: true, update: norm.update, part: update.part };
  }

  /** Boolean compatibility wrapper around {@link tryApplyMessagePartUpdateEvent}. */
  applyMessagePartUpdateEvent(
    event: Parameters<ChatMessages['applyMessagePartUpdateEvent']>[0]
  ): boolean {
    return this.tryApplyMessagePartUpdateEvent(event).ok;
  }

  // ── Remaining proxy methods (CHG-05) ──────────────────────────────
  //
  // cancel / cancelMessage still delegate to the child for animation
  // freeze + data mutation.  The bridge (_handleMessagesChange) remains
  // active for these paths.

  cancel(hint?: string): void {
    this._ensureChildSynced();
    this._messages.cancel(hint);
  }

  cancelMessage(id: string, hint?: string): void {
    this._ensureChildSynced();
    this._messages.cancelMessage(id, hint);
  }

  showError(text: string, options?: { duration?: number }): void {
    this._messages.showError(text, options);
  }

  dismissError(): void {
    this._messages.dismissError();
  }

  updateProgressStep(messageId: string, step: number, status: string, bid?: string): boolean {
    return this._messages.updateProgressStep(messageId, step, status as Parameters<ChatMessages['updateProgressStep']>[2], bid);
  }

  /** Register an additional block renderer at runtime (same as `registerRenderer` from `@bndynet/ichat`). */
  registerRenderer(renderer: BlockRenderer): void {
    registerBlockRenderer(renderer);
  }

  /** Create a `StreamingController` bound to this component's message list. */
  createStreamingController(): StreamingController {
    return new StreamingController(this._messages);
  }

  /** Focus the input textarea. */
  focusInput(): void {
    if (this._activeConfirmation) return;
    this._input?.focus();
  }

  /**
   * Request a user decision before continuing a host-defined action. While a
   * confirmation is active, the composer area is replaced by the confirmation
   * panel. Requests are shown FIFO, one at a time.
   */
  requestConfirmation(request: ChatConfirmationRequest): Promise<ChatConfirmationResult> {
    const normalized: ChatConfirmationResolvedRequest = {
      ...request,
      id: request.id?.trim() || this._nextConfirmationId(),
      variant: request.variant ?? 'default',
    };

    return new Promise((resolve) => {
      const pending: PendingConfirmation = { request: normalized, resolve };
      if (this._activeConfirmation) {
        this._confirmationQueue = [...this._confirmationQueue, pending];
      } else {
        this._activeConfirmation = pending;
      }
      this._emitConfirmationChange();
    });
  }

  /** Cancel the active confirmation and any queued confirmations. */
  clearConfirmations(): void {
    this._cancelAllConfirmations();
  }

  /**
   * Add a reply block beneath the message with the given `id`.
   *
   * The composer/input is external — this only displays the reply block(s)
   * under their message(s). Each call **adds** a block, so one message can
   * stack multiple blocks and different messages can each have their own. Pass
   * the message you are replying to (or just the fields you want shown).
   * Mirrors `updateMessage(id, partial)`.
   *
   * @param id    The id of the message the reply block is attached under.
   * @param info  Optional display fields (`parts`, `avatar`, `role`, …).
   * @returns A unique key for the created block — pass it to
   *          `clearReplyMessage(key)` to remove just that block.
   */
  replyMessage(id: string, info?: Partial<ChatMessage>): string {
    return this._messages.replyMessage(id, info);
  }

  /**
   * Remove reply block(s).
   * @param idOrKey  A message `id` removes all blocks under that message; a
   *                 block `key` (returned by `replyMessage`) removes just that
   *                 block. When omitted, clears all reply blocks.
   */
  clearReplyMessage(idOrKey?: string): void {
    this._messages.clearReplyMessage(idOrKey);
  }

  // ── Message-state bridge (CHG-01) ─────────────────────────────────
  //
  // While proxy methods still delegate to <i-chat-messages>, the parent
  // synchronises the child's state back to `chat.messages` and re-emits
  // the `messages-change` event.  This ensures `chat.messages` is never
  // stale after any top-level mutation.

  /**
   * Ensure the child element is operating on the parent's current array before
   * a delegated mutation.  Without this an external `chat.messages = […]`
   * followed immediately by a proxy call could use a stale child base.
   */
  private _ensureChildSynced(): void {
    if (this._messages && this._messages.messages !== this.messages) {
      this._messages.messages = this.messages;
    }
  }

  /**
   * Adopt child-originated `messages-change`, synchronise the top-level
   * property, and re-emit from `<i-chat>`.
   *
   * Stale child mutations (where `detail.previousMessages` does not match the
   * current `this.messages`) are rejected and the parent's authoritative array
   * is pushed back down.
   */
  private _handleMessagesChange(e: CustomEvent<MessagesChangeDetail>): void {
    e.stopPropagation();
    const detail = e.detail;

    // Reject stale child mutations: if the child's base array doesn't match
    // our current messages, it was operating on stale data.
    if (detail.previousMessages !== this.messages) {
      if (this._messages) {
        this._messages.messages = this.messages;
      }
      return;
    }

    // Adopt the child's state as our own.
    this.messages = detail.messages;

    // Re-emit from <i-chat> as the authoritative source.
    this.dispatchEvent(
      new CustomEvent<MessagesChangeDetail>('messages-change', {
        detail: {
          ...detail,
          source: 'i-chat',
        },
        bubbles: true,
        composed: true,
      }),
    );
  }

  // ── Slot forwarding ────────────────────────────────────────────────
  //
  // Declarative `<slot name="x" slot="x">` under `<i-chat-messages>` / `<i-chat-input>`
  // so consumer nodes stay light-DOM children of `<i-chat>` (page / Vue CSS applies).
  // `<i-chat-messages>` reads template HTML from shadow `assignedElements()`, not clones.

  override connectedCallback(): void {
    super.connectedCallback();
    setVersionAttribute(this);
    this._syncInputSlotPresence();
    this._lightChildObserver = new MutationObserver(() => {
      this._syncInputSlotPresence();
      this.requestUpdate();
    });
    this._lightChildObserver.observe(this, { childList: true, subtree: false });
  }

  override disconnectedCallback(): void {
    this._lightChildObserver?.disconnect();
    this._lightChildObserver = undefined;
    this._cancelAllConfirmations();
    super.disconnectedCallback();
  }

  private _syncInputSlotPresence(): void {
    this._hasCustomInput = !!this.querySelector('[slot="input"]');
  }

  override firstUpdated(_changed: PropertyValues): void {
    super.firstUpdated(_changed);
    // Properties are bound in the template — no manual push needed.
  }

  // ── Lifecycle ──────────────────────────────────────────────────────

  override updated(_changed: PropertyValues): void {
    // All bindings (.messages, .config, .emptyText) are in the template.
    // Streaming state is derived from the message array during commits.
  }

  // ── Events ────────────────────────────────────────────────────────

  private _handleSend(e: CustomEvent<{ content: string }>): void {
    e.stopPropagation();
    if (this.disabled || this._streaming || this._activeConfirmation) return;
    this.dispatchEvent(
      new CustomEvent('send', {
        detail: e.detail,
        bubbles: true,
        composed: true,
      })
    );
  }

  private _handleCancel(e: Event): void {
    e.stopPropagation();
    this.dispatchEvent(
      new CustomEvent('cancel', {
        bubbles: true,
        composed: true,
      })
    );
  }

  private _setStreamingState(streaming: boolean): void {
    this._streaming = streaming;
    if (this._input) {
      this._input.streaming = streaming;
    }
  }

  private _handleStreamingChange(e: CustomEvent<{ streaming: boolean }>): void {
    e.stopPropagation();
    this._setStreamingState(e.detail.streaming);
    this.dispatchEvent(
      new CustomEvent('streaming-change', {
        detail: e.detail,
        bubbles: true,
        composed: true,
      })
    );
  }

  private _handleMessageAction(e: CustomEvent): void {
    e.stopPropagation();
    this.dispatchEvent(
      new CustomEvent('message-action', {
        detail: e.detail,
        bubbles: true,
        composed: true,
      })
    );
  }

  private _handleFormSubmit(e: CustomEvent<ChatFormSubmitDetail>): void {
    e.stopPropagation();
    this.dispatchEvent(
      new CustomEvent<ChatFormSubmitDetail>('form-submit', {
        detail: e.detail,
        bubbles: true,
        composed: true,
      })
    );
  }

  private _handlePartAction(e: CustomEvent<ChatPartActionDetail>): void {
    e.stopPropagation();
    this.dispatchEvent(
      new CustomEvent<ChatPartActionDetail>('part-action', {
        detail: e.detail,
        bubbles: true,
        composed: true,
      })
    );
  }

  private _handleInputSlotChange(e: Event): void {
    const slot = e.target as HTMLSlotElement;
    this._hasCustomInput = slot.assignedElements({ flatten: true }).length > 0;
  }

  private get _confirmationLabels(): ConfirmationLabels {
    return resolveLabels({
      locale: this.config.locale,
      labels: this.config.labels,
      dateSeparatorLabels: this.config.dateSeparatorLabels,
    }).confirmation;
  }

  private _nextConfirmationId(): string {
    this._confirmationId += 1;
    return `confirm-${Date.now().toString(36)}-${this._confirmationId.toString(36)}`;
  }

  private _emitConfirmationChange(): void {
    this.dispatchEvent(
      new CustomEvent<ChatConfirmationChangeDetail>('confirmation-change', {
        detail: {
          active: this._activeConfirmation?.request ?? null,
          queue: this._confirmationQueue.map((item) => item.request),
          queueLength: this._confirmationQueue.length,
        },
        bubbles: true,
        composed: true,
      })
    );
  }

  private _resultFor(
    item: PendingConfirmation,
    action: ChatConfirmationAction
  ): ChatConfirmationResult {
    return {
      id: item.request.id,
      action,
      confirmed: action === 'confirm',
      request: item.request,
    };
  }

  private _settleActiveConfirmation(action: ChatConfirmationAction): void {
    const item = this._activeConfirmation;
    if (!item) return;

    this._activeConfirmation = this._confirmationQueue[0] ?? null;
    this._confirmationQueue = this._confirmationQueue.slice(1);

    const result = this._resultFor(item, action);
    item.resolve(result);
    this.dispatchEvent(
      new CustomEvent<ChatConfirmationResult>('confirmation-decision', {
        detail: result,
        bubbles: true,
        composed: true,
      })
    );
    this._emitConfirmationChange();
  }

  private _cancelAllConfirmations(): void {
    const pending = [
      ...(this._activeConfirmation ? [this._activeConfirmation] : []),
      ...this._confirmationQueue,
    ];
    if (pending.length === 0) return;

    this._activeConfirmation = null;
    this._confirmationQueue = [];
    pending.forEach((item) => item.resolve(this._resultFor(item, 'cancel')));
    this._emitConfirmationChange();
  }

  private _formatConfirmationDetails(details: unknown): string {
    if (details == null) return '';
    if (typeof details === 'string') return details;
    try {
      return JSON.stringify(details, null, 2);
    } catch {
      return String(details);
    }
  }

  private _renderConfirmationDetails(request: ChatConfirmationResolvedRequest) {
    const details = this._formatConfirmationDetails(request.details);
    if (!details) return nothing;
    const labels = this._confirmationLabels;

    if (typeof request.details === 'string') {
      return html`<div class="chat-confirmation__details-text">${details}</div>`;
    }

    return html`
      <details class="chat-confirmation__details">
        <summary>${labels.details}</summary>
        <pre>${details}</pre>
      </details>
    `;
  }

  private _renderConfirmation(request: ChatConfirmationResolvedRequest) {
    const labels = this._confirmationLabels;
    const variant = request.variant ?? 'default';
    const requiredLabel = (request.requiredLabel ?? labels.required).trim();

    return html`
      <section
        class="chat-confirmation chat-confirmation--${variant}"
        role="group"
        aria-label=${request.title}
      >
        <div class="chat-confirmation__body">
          ${requiredLabel
            ? html`<div class="chat-confirmation__eyebrow">${requiredLabel}</div>`
            : nothing}
          <div class="chat-confirmation__title">${request.title}</div>
          ${request.description
            ? html`<div class="chat-confirmation__description">${request.description}</div>`
            : nothing}
          ${this._renderConfirmationDetails(request)}
        </div>
        <div class="chat-confirmation__actions">
          <button
            type="button"
            class="chat-confirmation__btn chat-confirmation__btn--cancel"
            @click=${() => this._settleActiveConfirmation('cancel')}
          >
            ${request.cancelLabel || labels.cancel}
          </button>
          <button
            type="button"
            class="chat-confirmation__btn chat-confirmation__btn--confirm"
            @click=${() => this._settleActiveConfirmation('confirm')}
          >
            ${request.confirmLabel || labels.confirm}
          </button>
        </div>
      </section>
    `;
  }

  // ── Render ────────────────────────────────────────────────────────
  //
  // `.messages` is bound one-way; <i-chat> is the sole owner.
  // `.config` and `.emptyText` are also bound here so `firstUpdated` /
  // `updated` no longer need to push them manually.

  render() {
    const confirmation = this._activeConfirmation?.request;

    return html`
      <div class="chat-body">
        <i-chat-messages
          .messages=${this.messages}
          .config=${this.config}
          .emptyText=${this.emptyText}
          @messages-change=${this._handleMessagesChange}
          @streaming-change=${this._handleStreamingChange}
          @message-action=${this._handleMessageAction}
          @part-action=${this._handlePartAction}
          @form-submit=${this._handleFormSubmit}
        >
          <slot name="empty" slot="empty"></slot>
          <slot name="self-avatar" slot="self-avatar"></slot>
          <slot name="peer-avatar" slot="peer-avatar"></slot>
          <slot name="assistant-avatar" slot="assistant-avatar"></slot>
          <slot name="message-actions" slot="message-actions"></slot>
          <slot name="reasoning-header" slot="reasoning-header"></slot>
        </i-chat-messages>
      </div>
      <div class="chat-footer">
        ${confirmation
          ? this._renderConfirmation(confirmation)
          : html`
              <slot
                name="input"
                @slotchange=${this._handleInputSlotChange}
                @send=${this._handleSend}
                @cancel=${this._handleCancel}
              ></slot>
              ${this._hasCustomInput
                ? nothing
                : html`
                    <i-chat-input
                      .placeholder=${this.placeholder}
                      .locale=${this.config.locale ?? ''}
                      .labels=${this.config.labels?.composer}
                      .streaming=${this._streaming}
                      .showVoiceInput=${this.showVoiceInput}
                      .voiceLang=${this.voiceLang}
                      .voiceListeningLabel=${this.voiceListeningLabel}
                      .voiceDiagnostics=${this.voiceDiagnostics}
                      ?disabled=${this.disabled}
                      @send=${this._handleSend}
                      @cancel=${this._handleCancel}
                    >
                      <slot name="actions" slot="actions"></slot>
                    </i-chat-input>
                  `}
            `}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'i-chat': Chat;
  }
}
