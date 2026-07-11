import { LitElement, html, unsafeCSS, nothing, type PropertyValues } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';
import type {
  ChatFormSubmitDetail,
  ChatLinkClickDetail,
  ChatMessage,
  ChatConfig,
  BlockRenderer,
  ConfirmationLabels,
  TodoActionDetail,
} from '@bndynet/ichat-messages';
import { ChatMessages, StreamingController, resolveLabels } from '@bndynet/ichat-messages';
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
  ChatLinkClickDetail,
  TodoActionDetail,
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
 * @fires streaming-change - `{ detail: { streaming: boolean } }` when streaming state changes
 * @fires message-action - `{ detail: { action: string, message: ChatMessage } }` from message action buttons
 * @fires form-submit - `{ detail: ChatFormSubmitDetail }` when an embedded chat form is submitted (`formId`, `title`, `values`, `messageId`, `message`)
 * @fires todo-action - `{ detail: TodoActionDetail }` when a todo status icon requests a change
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

  // ── Proxy methods to <i-chat-messages> ──────────────────────────────

  addMessage(message: ChatMessage): void {
    this._messages.addMessage(message);
  }

  updateMessage(id: string, partial: Partial<ChatMessage>): void {
    this._messages.updateMessage(id, partial);
  }

  /** Append a structured body part to a message. */
  appendPart(messageId: string, part: Parameters<ChatMessages['appendPart']>[1]): void {
    this._messages.appendPart(messageId, part);
  }

  /** Patch a single body part by its `id`. */
  updatePart(
    messageId: string,
    partId: string,
    patch: Parameters<ChatMessages['updatePart']>[2]
  ): void {
    this._messages.updatePart(messageId, partId, patch);
  }

  /** Convenience wrapper around {@link updatePart} for `tool-call` parts. */
  updateToolCall(
    messageId: string,
    partId: string,
    patch: Parameters<ChatMessages['updateToolCall']>[2]
  ): void {
    this._messages.updateToolCall(messageId, partId, patch);
  }

  /** Immutably patch one todo item. Stale explicit revisions are ignored. */
  updateTodoItem(
    messageId: string,
    partId: string,
    itemId: string,
    patch: Parameters<ChatMessages['updateTodoItem']>[3],
    revision?: number,
  ): boolean {
    return this._messages.updateTodoItem(messageId, partId, itemId, patch, revision);
  }

  removeMessage(id: string): void {
    this._messages.removeMessage(id);
  }

  cancel(hint?: string): void {
    this._messages.cancel(hint);
  }

  cancelMessage(id: string, hint?: string): void {
    this._messages.cancelMessage(id, hint);
  }

  clear(): void {
    this._messages.clear();
  }

  showError(text: string, options?: { duration?: number }): void {
    this._messages.showError(text, options);
  }

  dismissError(): void {
    this._messages.dismissError();
  }

  updateTimeline(messageId: string, step: number, status: string, bid?: string): boolean {
    return this._messages.updateTimeline(messageId, step, status as Parameters<ChatMessages['updateTimeline']>[2], bid);
  }

  addErrorMessage(error: string, text = ''): void {
    this._messages.addErrorMessage(error, text);
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

  // ── Slot forwarding ────────────────────────────────────────────────
  //
  // Declarative `<slot name="x" slot="x">` under `<i-chat-messages>` / `<i-chat-input>`
  // so consumer nodes stay light-DOM children of `<i-chat>` (page / Vue CSS applies).
  // `<i-chat-messages>` reads template HTML from shadow `assignedElements()`, not clones.

  override connectedCallback(): void {
    super.connectedCallback();
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

  override firstUpdated(changed: PropertyValues): void {
    super.firstUpdated(changed);
    // Push initial property values that may have been set before first render.
    if (this._messages) {
      if (this.messages.length) this._messages.messages = this.messages;
      if (this.config && Object.keys(this.config).length) this._messages.config = this.config;
      if (this.emptyText) this._messages.emptyText = this.emptyText;
    }
  }

  // ── Lifecycle ──────────────────────────────────────────────────────

  override updated(changed: PropertyValues): void {
    if (changed.has('messages') && this._messages) {
      this._messages.messages = this.messages;
    }
    if (changed.has('config') && this._messages) {
      this._messages.config = this.config;
    }
    if (changed.has('emptyText') && this._messages) {
      this._messages.emptyText = this.emptyText;
    }
  }

  // ── Events ────────────────────────────────────────────────────────

  private _handleSend(e: CustomEvent<{ content: string }>): void {
    e.stopPropagation();
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

  private _handleStreamingChange(e: CustomEvent<{ streaming: boolean }>): void {
    e.stopPropagation();
    this._streaming = e.detail.streaming;
    if (this._input) {
      this._input.streaming = this._streaming;
    }
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
  // Property bindings (.messages, .config, .emptyText) are intentionally
  // NOT in the template.  They are pushed in `updated()` only when the
  // corresponding property on <i-chat> actually changes.  This avoids
  // overwriting <i-chat-messages> internal state when proxy methods
  // (addMessage, updateMessage, …) are used instead of the property.

  render() {
    const confirmation = this._activeConfirmation?.request;

    return html`
      <div class="chat-body">
        <i-chat-messages
          @streaming-change=${this._handleStreamingChange}
          @message-action=${this._handleMessageAction}
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
              <slot name="input" @slotchange=${this._handleInputSlotChange}></slot>
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
