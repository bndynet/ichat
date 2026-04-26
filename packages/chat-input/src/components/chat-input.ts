import { LitElement, html, nothing, unsafeCSS } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';
import styles from '../styles/chat-input.scss';

type SpeechRecognitionCtor = new () => SpeechRecognition;

/** Minimal typing for the Web Speech API (Chromium / Safari). */
interface SpeechRecognitionResultList {
  readonly length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  readonly isFinal: boolean;
  readonly length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  readonly transcript: string;
}

interface SpeechRecognitionEvent extends Event {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  readonly error: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => void) | null;
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => void) | null;
  onend: ((this: SpeechRecognition, ev: Event) => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

/**
 * `<i-chat-input>` — A chat composer Web Component.
 *
 * Features:
 * - Stacked layout: text field on top, toolbar row below (send on the bottom-right)
 * - Auto-resizing textarea
 * - Enter to send, Shift+Enter for newline
 * - Voice input (Web Speech API) to the left of send when not streaming, if
 *   `showVoiceInput` is true and the browser supports speech recognition
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

  private static readonly _micIcon = html`
    <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" x2="12" y1="19" y2="23" />
      <line x1="8" x2="16" y1="23" y2="23" />
    </svg>
  `;

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

  /** BCP 47 language tag for speech recognition (e.g. `zh-CN`, `en-US`). Defaults to `navigator.language`. */
  @property() voiceLang = '';

  /**
   * When true (default), the voice button is shown **only if** the browser supports
   * the Web Speech API. When false, the button is never shown.
   */
  @property({ type: Boolean, reflect: true }) showVoiceInput = true;

  @state() private _value = '';
  @state() private _listening = false;
  @query('.chat-input-textarea') private _textarea!: HTMLTextAreaElement;

  private _recognition: SpeechRecognition | null = null;
  /** Textarea content captured when a voice session starts; recognition results are appended in `onresult`. */
  private _voiceSnapshot = '';

  override firstUpdated(): void {
    this._autoResize();
  }

  override disconnectedCallback(): void {
    this._stopVoiceRecognition(true);
    super.disconnectedCallback();
  }

  private static _speechRecognitionCtor(): SpeechRecognitionCtor | null {
    const w = window as Window & {
      SpeechRecognition?: SpeechRecognitionCtor;
      webkitSpeechRecognition?: SpeechRecognitionCtor;
    };
    return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
  }

  /** Whether the host browser exposes speech recognition (no button is rendered when false). */
  static isVoiceInputSupported(): boolean {
    return ChatInput._speechRecognitionCtor() !== null;
  }

  private _getOrCreateRecognition(): SpeechRecognition | null {
    if (this._recognition) return this._recognition;
    const Ctor = ChatInput._speechRecognitionCtor();
    if (!Ctor) return null;
    const r = new Ctor();
    r.continuous = true;
    r.interimResults = true;
    r.lang = this.voiceLang.trim() || navigator.language || 'en-US';

    r.onresult = (ev: SpeechRecognitionEvent) => {
      let line = '';
      for (let i = 0; i < ev.results.length; i++) {
        line += ev.results[i][0]?.transcript ?? '';
      }
      const merged = this._voiceSnapshot + line;
      this._value = merged;
      if (this._textarea) this._textarea.value = merged;
      this._autoResize();
    };

    r.onerror = () => {
      this._listening = false;
    };

    r.onend = () => {
      this._listening = false;
      this._recognition = null;
    };

    this._recognition = r;
    return r;
  }

  private _toggleVoice(): void {
    if (this.disabled || this.streaming) return;
    if (this._listening) {
      this._stopVoiceRecognition(false);
      return;
    }
    const r = this._getOrCreateRecognition();
    if (!r) return;
    r.lang = this.voiceLang.trim() || navigator.language || 'en-US';
    this._voiceSnapshot = this._value;
    try {
      r.start();
      this._listening = true;
    } catch {
      this._listening = false;
      this._recognition = null;
    }
  }

  private _stopVoiceRecognition(abort: boolean): void {
    const r = this._recognition;
    if (!r) {
      this._listening = false;
      return;
    }
    try {
      if (abort) r.abort();
      else r.stop();
    } catch {
      /* already stopped */
    }
    this._listening = false;
    if (abort) this._recognition = null;
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
    const showVoiceButton = this.showVoiceInput && ChatInput.isVoiceInputSupported();

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
                  ${showVoiceButton
                    ? html`
                        <button
                          type="button"
                          class="chat-input-btn chat-input-voice ${this._listening ? 'chat-input-voice--active' : ''}"
                          @click=${this._toggleVoice}
                          ?disabled=${this.disabled}
                          aria-label=${this._listening ? 'Stop voice input' : 'Voice input'}
                          aria-pressed=${this._listening}
                          title=${this._listening ? 'Stop dictation' : 'Voice input'}
                        >
                          ${ChatInput._micIcon}
                        </button>
                      `
                    : nothing}
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
