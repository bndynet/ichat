import { LitElement, html, unsafeCSS } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';
import styles from '../styles/chat-input.scss';

/**
 * `<i-chat-input>` — A chat composer Web Component.
 *
 * Features:
 * - Stacked layout: text field on top, toolbar row below (send on the bottom-right)
 * - Auto-resizing textarea
 * - Enter to send, Shift+Enter for newline
 * - Send / Cancel buttons depending on streaming state
 * - Fires `send` and `cancel` custom events
 *
 * Slot `actions` — bottom-left toolbar (attach / model / tools, etc.).
 *
 * @fires send - `{ detail: { content: string } }` when the user submits a message
 * @fires cancel - Fired when the user clicks the cancel button during streaming
 */
@customElement('i-chat-input')
export class ChatInput extends LitElement {
  static styles = unsafeCSS(styles);

  private static readonly _sendIcon = html`
    <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M12 19V5" />
      <path d="m5 12 7-7 7 7" />
    </svg>
  `;

  private static readonly _cancelIcon = html`
    <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor" aria-hidden="true">
      <rect x="6" y="6" width="12" height="12" rx="2" />
    </svg>
  `;

  @property() placeholder = 'Type a message…';

  /** When true the cancel button is shown instead of the send button. */
  @property({ type: Boolean, reflect: true }) streaming = false;

  /** Disable the input (greyed-out, non-interactive). */
  @property({ type: Boolean, reflect: true }) disabled = false;

  @state() private _value = '';
  @query('.chat-input-textarea') private _textarea!: HTMLTextAreaElement;

  override firstUpdated(): void {
    this._autoResize();
  }

  /** Programmatically set the textarea value. */
  setValue(value: string): void {
    this._value = value;
    if (this._textarea) {
      this._textarea.value = value;
      this._autoResize();
    }
  }

  /** Focus the textarea. */
  override focus(): void {
    this._textarea?.focus();
  }

  private _handleInput(e: Event): void {
    this._value = (e.target as HTMLTextAreaElement).value;
    this._autoResize();
  }

  private _handleKeydown(e: KeyboardEvent): void {
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
      e.preventDefault();
      this._submit();
    }
  }

  private _submit(): void {
    const content = this._value.trim();
    if (!content || this.streaming || this.disabled) return;

    this.dispatchEvent(
      new CustomEvent('send', {
        detail: { content },
        bubbles: true,
        composed: true,
      })
    );

    this._value = '';
    if (this._textarea) {
      this._textarea.value = '';
      this._autoResize();
    }
  }

  private _cancel(): void {
    this.dispatchEvent(
      new CustomEvent('cancel', {
        bubbles: true,
        composed: true,
      })
    );
  }

  private _autoResize(): void {
    const ta = this._textarea;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${ta.scrollHeight}px`;
  }

  render() {
    const canSend = this._value.trim().length > 0 && !this.streaming && !this.disabled;

    return html`
      <div class="chat-input-wrapper">
        <div class="chat-input-field">
          <textarea
            class="chat-input-textarea"
            rows="1"
            placeholder=${this.placeholder}
            ?disabled=${this.disabled}
            .value=${this._value}
            @input=${this._handleInput}
            @keydown=${this._handleKeydown}
          ></textarea>
        </div>
        <div class="chat-input-toolbar">
          <div class="chat-input-toolbar-start">
            <slot name="actions"></slot>
          </div>
          <div class="chat-input-toolbar-end">
            ${this.streaming
              ? html`
                  <button
                    class="chat-input-btn chat-input-cancel"
                    @click=${this._cancel}
                    aria-label="Cancel"
                    title="Stop generating"
                  >
                    ${ChatInput._cancelIcon}
                  </button>
                `
              : html`
                  <button
                    class="chat-input-btn chat-input-send"
                    @click=${this._submit}
                    ?disabled=${!canSend}
                    aria-label="Send"
                    title="Send message"
                  >
                    ${ChatInput._sendIcon}
                  </button>
                `}
          </div>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'i-chat-input': ChatInput;
  }
}
