import { LitElement, html, unsafeCSS, nothing, type PropertyValues } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';
import type {
  ChatFormSubmitDetail,
  ChatMessage,
  ChatConfig,
  BlockRenderer,
} from '@bndynet/chat-messages';
import { ChatMessages, StreamingController } from '@bndynet/chat-messages';
import { ChatInput } from '@bndynet/chat-input';
import { registerRenderer as registerBlockRenderer } from '../register-renderer.js';

import styles from '../styles/chat.scss';

void ChatMessages;
void ChatInput;

export type { ChatMessage, ChatConfig, BlockRenderer, ChatFormSubmitDetail };

/**
 * `<i-chat>` — A complete, drop-in chat Web Component.
 *
 * Bundles `<i-chat-messages>` and `<i-chat-input>`. Optional fenced-block
 * renderers (e.g. from `@bndynet/chat-renderers`) should be registered with
 * `registerRenderer` from `@bndynet/chat` before messages use those blocks.
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
export class NiceChat extends LitElement {
  static styles = unsafeCSS(styles);

  @property({ type: Array }) messages: ChatMessage[] = [];
  @property({ type: Object }) config: ChatConfig = {};
  @property() emptyText = '';
  @property() placeholder = 'Type a message…';
  /** Disable the input area. */
  @property({ type: Boolean, reflect: true }) disabled = false;

  /**
   * When true (default), the default `<i-chat-input>` shows a voice button if the browser
   * supports speech recognition. When false, the voice button is never shown.
   */
  @property({ type: Boolean, reflect: true, attribute: 'show-voice-input' }) showVoiceInput = true;

  /** Passed to the default `<i-chat-input>` for speech recognition language (BCP 47). */
  @property({ attribute: 'voice-lang' }) voiceLang = '';

  /** Passed to the default `<i-chat-input>` — label on the listening overlay. */
  @property({ attribute: 'voice-listening-label' }) voiceListeningLabel = 'Listening…';

  /** Passed to the default `<i-chat-input>` — enables `console.debug` speech logs. */
  @property({ type: Boolean, reflect: true, attribute: 'voice-diagnostics' }) voiceDiagnostics = false;

  @query('i-chat-messages') private _messages!: ChatMessages;
  @query('i-chat-input') private _input!: ChatInput;

  @state() private _streaming = false;
  @state() private _hasCustomInput = false;

  /** Observes light-DOM children so slots added after first render (e.g. Vue `onMounted`) are forwarded. */
  private _lightChildObserver?: MutationObserver;

  // ── Proxy methods to <i-chat-messages> ──────────────────────────────

  addMessage(message: ChatMessage): void {
    this._messages.addMessage(message);
  }

  updateMessage(id: string, partial: Partial<ChatMessage>): void {
    this._messages.updateMessage(id, partial);
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

  addErrorMessage(error: string, content = ''): void {
    this._messages.addErrorMessage(error, content);
  }

  /** Register an additional block renderer at runtime (same as `registerRenderer` from `@bndynet/chat`). */
  registerRenderer(renderer: BlockRenderer): void {
    registerBlockRenderer(renderer);
  }

  /** Create a `StreamingController` bound to this component's message list. */
  createStreamingController(): StreamingController {
    return new StreamingController(this._messages);
  }

  /** Focus the input textarea. */
  focusInput(): void {
    this._input?.focus();
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

  // ── Render ────────────────────────────────────────────────────────
  //
  // Property bindings (.messages, .config, .emptyText) are intentionally
  // NOT in the template.  They are pushed in `updated()` only when the
  // corresponding property on <i-chat> actually changes.  This avoids
  // overwriting <i-chat-messages> internal state when proxy methods
  // (addMessage, updateMessage, …) are used instead of the property.

  render() {
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
        <slot name="input" @slotchange=${this._handleInputSlotChange}></slot>
        ${this._hasCustomInput
          ? nothing
          : html`
              <i-chat-input
                .placeholder=${this.placeholder}
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
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'i-chat': NiceChat;
  }
}
