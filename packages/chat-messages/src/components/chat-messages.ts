import { LitElement, html, unsafeCSS, type PropertyValues } from 'lit';
import { customElement, property, state, query } from 'lit/decorators.js';
import { repeat } from 'lit/directives/repeat.js';
import type { ChatMessage, ChatConfig } from '../types.js';
import { DEFAULT_CONFIG } from '../types.js';
import type { TimelineStatus } from '../renderers/timeline-plugin.js';
import styles from '../styles/chat-messages.scss';
import './chat-message.js';
import type { ChatMessageElement } from './chat-message.js';

@customElement('i-chat-messages')
export class ChatMessages extends LitElement {
  static styles = unsafeCSS(styles);

  @property({ type: Array }) messages: ChatMessage[] = [];
  @property({ type: Object }) config: ChatConfig = {};
  @property() emptyText = '';

  @property({ type: Boolean, reflect: true, attribute: 'streaming' })
  readonly streaming = false;

  @state() private _autoScroll = true;
  @state() private _hasNewContent = false;
  @state() private _errorBanner = '';
  @state() private _userAvatarHtml = '';
  @state() private _assistantAvatarHtml = '';
  @state() private _messageActionsHtml = '';
  @state() private _reasoningHeaderHtml = '';
  @query('.chat-messages') private _scrollContainer!: HTMLElement;
  private _resizeObserver?: ResizeObserver;
  private _observedEl?: Element;
  /** While true, ignore scroll events so CSS transitions don't flip _autoScroll. */
  private _resizeScrollLock = false;
  private _resizeDebounceTimer?: ReturnType<typeof setTimeout>;
  private _errorDismissTimer?: ReturnType<typeof setTimeout>;

  private get _config(): Required<ChatConfig> {
    return { ...DEFAULT_CONFIG, ...this.config };
  }

  override connectedCallback(): void {
    super.connectedCallback();
    // Read slot content from light DOM BEFORE the first render so the initial
    // paint already shows the custom avatar instead of the fallback letter.
    // Lit schedules the first update as a microtask; synchronous state writes
    // here are batched into that first render, eliminating the one-frame flash.
    this._readLightDomSlots();
  }

  /**
   * Read slotted elements from the host's light DOM using [slot="name"]
   * selectors.  This can be called before the shadow tree exists and is the
   * primary path that prevents the fallback-avatar flash on first render.
   */
  private _readLightDomSlots(): void {
    const slotNames = ['user-avatar', 'assistant-avatar', 'message-actions', 'reasoning-header'];
    for (const name of slotNames) {
      const nodes = Array.from(this.querySelectorAll<HTMLElement>(`[slot="${name}"]`));
      const content = nodes.map((n) => n.outerHTML).join('');
      if (content) this._applySlotTemplateHtml(name, content);
    }
  }

  override firstUpdated(changed: PropertyValues): void {
    super.firstUpdated(changed);
    // Fallback sync via shadow-DOM slot.assignedElements() in case any slotted
    // content was added after connectedCallback (e.g. dynamic insertion).
    this._syncSlotTemplatesFromAssignedNodes();
  }

  /** Secondary sync using shadow-DOM slot APIs (requires rendered shadow tree). */
  private _syncSlotTemplatesFromAssignedNodes(): void {
    const slots = this.renderRoot?.querySelectorAll<HTMLSlotElement>(
      '.template-slots slot[name]'
    );
    if (!slots) return;
    slots.forEach((slot) => {
      const name = slot.getAttribute('name');
      if (!name) return;
      const nodes = slot.assignedElements({ flatten: true });
      const content = nodes.map((n) => (n as HTMLElement).outerHTML).join('');
      if (content) this._applySlotTemplateHtml(name, content);
    });
  }

  private _applySlotTemplateHtml(name: string, content: string): void {
    switch (name) {
      case 'user-avatar':
        this._userAvatarHtml = content;
        break;
      case 'assistant-avatar':
        this._assistantAvatarHtml = content;
        break;
      case 'message-actions':
        this._messageActionsHtml = content;
        break;
      case 'reasoning-header':
        this._reasoningHeaderHtml = content;
        break;
    }
  }

  updated(changed: Map<string, unknown>): void {
    if (changed.has('messages')) {
      const nowStreaming = this.messages.some((m) => m.streaming && !m.error);
      if (nowStreaming !== this.streaming) {
        (this as Record<string, unknown>).streaming = nowStreaming;
        if (nowStreaming && this._errorBanner) {
          this.dismissError();
        }
        this.dispatchEvent(
          new CustomEvent('streaming-change', {
            detail: { streaming: nowStreaming },
            bubbles: true,
            composed: true,
          })
        );
      }
      if (this._autoScroll) {
        this._scrollToBottom();
      }
    }
    this._ensureResizeObserver();
  }

  private _handleSlotChange(name: string, e: Event): void {
    const slot = e.target as HTMLSlotElement;
    const nodes = slot.assignedElements({ flatten: true });
    const content = nodes.map((n) => (n as HTMLElement).outerHTML).join('');
    this._applySlotTemplateHtml(name, content);
  }

  private _ensureResizeObserver(): void {
    const inner = this.renderRoot.querySelector('.chat-messages-inner');
    if (inner && inner !== this._observedEl) {
      this._resizeObserver?.disconnect();
      this._resizeObserver = new ResizeObserver(() => {
        if (this._autoScroll) {
          this._resizeScrollLock = true;
          this._scrollToBottom();
          clearTimeout(this._resizeDebounceTimer);
          this._resizeDebounceTimer = setTimeout(() => {
            this._resizeScrollLock = false;
            this._scrollToBottom();
          }, 150);
        } else {
          this._hasNewContent = true;
        }
      });
      this._resizeObserver.observe(inner);
      this._observedEl = inner;
    }
    if (!inner && this._observedEl) {
      this._resizeObserver?.disconnect();
      this._observedEl = undefined;
    }
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this._resizeObserver?.disconnect();
    clearTimeout(this._resizeDebounceTimer);
    clearTimeout(this._errorDismissTimer);
  }

  private _scrollToBottom(): void {
    requestAnimationFrame(() => {
      const el = this._scrollContainer;
      if (el) {
        el.scrollTop = el.scrollHeight;
      }
      this._hasNewContent = false;
    });
  }

  private _handleScrollToBottom(): void {
    this._autoScroll = true;
    this._scrollToBottom();
  }

  private _handleScroll(): void {
    if (this._resizeScrollLock) return;
    const el = this._scrollContainer;
    if (!el) return;
    const threshold = 60;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
    this._autoScroll = atBottom;
    if (atBottom) {
      this._hasNewContent = false;
    }
  }

  addMessage(message: ChatMessage): void {
    this.messages = [...this.messages, message];
  }

  updateMessage(id: string, partial: Partial<ChatMessage>): void {
    this.messages = this.messages.map((m) =>
      m.id === id ? { ...m, ...partial } : m
    );
  }

  removeMessage(id: string): void {
    this.messages = this.messages.filter((m) => m.id !== id);
  }

  /**
   * Cancel the currently streaming message (if any).
   *
   * - Stops the typing animation immediately, keeping whatever content has
   *   been received so far.
   * - Clears the `streaming` flag so the component no longer treats the
   *   message as in-flight.
   * - Does NOT fire `message-complete`; fires `message-cancel` instead.
   *
   * @param hint  Optional markdown text appended to the message content so the
   *              user knows the response was stopped (e.g. `'*— Response stopped —*'`).
   *
   * You are responsible for aborting the network request (e.g. via
   * `AbortController.abort()`) before or after calling this method.
   */
  cancel(hint?: string): void {
    const streamingMsg = this.messages.find((m) => m.streaming && !m.error);
    if (streamingMsg) this.cancelMessage(streamingMsg.id, hint);
  }

  /**
   * Cancel a streaming message by id.
   * Prefer `cancel()` when there is only one streaming message at a time.
   *
   * @param hint  Optional markdown text appended to the message content.
   */
  cancelMessage(id: string, hint?: string): void {
    if (hint) {
      const msg = this.messages.find((m) => m.id === id);
      if (msg) {
        this.updateMessage(id, {
          content: (msg.content ? msg.content + '\n\n' : '') + hint,
        });
      }
    }
    const msgEl = this.shadowRoot?.querySelector<ChatMessageElement>(
      `i-chat-message[data-message-id="${CSS.escape(id)}"]`
    );
    // cancel() fires message-cancel which the template listener above catches
    // and calls updateMessage() automatically. If the element is not in the
    // DOM yet, fall back to a direct data update.
    if (msgEl) {
      msgEl.cancel();
    } else {
      this.updateMessage(id, { streaming: false, cancelled: true });
    }
  }

  clear(): void {
    this.messages = [];
    this._autoScroll = true;
    this._hasNewContent = false;
    this.dismissError();
  }

  /**
   * Display a transient error banner at the top of the chat area.
   * @param text    The message to display.
   * @param options.duration  Auto-dismiss after this many milliseconds. 0 = manual only (default).
   */
  showError(text: string, options?: { duration?: number }): void {
    clearTimeout(this._errorDismissTimer);
    this._errorBanner = text;
    const duration = options?.duration;
    if (duration && duration > 0) {
      this._errorDismissTimer = setTimeout(() => this.dismissError(), duration);
    }
    this.dispatchEvent(
      new CustomEvent('error', {
        detail: { message: text },
        bubbles: true,
        composed: true,
      })
    );
  }

  /**
   * Update a timeline step's status within a specific message.
   * @param messageId - The message `id` that contains the timeline.
   * @param step      - Zero-based step index.
   * @param status    - The new status to apply.
   * @param bid       - Optional block id to target a specific timeline when
   *                    the message contains more than one.
   * @returns `true` if the step was found and updated.
   */
  updateTimeline(messageId: string, step: number, status: TimelineStatus, bid?: string): boolean {
    const msgEl = this.shadowRoot?.querySelector<ChatMessageElement>(
      `i-chat-message[data-message-id="${CSS.escape(messageId)}"]`
    );
    if (!msgEl) return false;
    return msgEl.updateTimeline(step, status, bid);
  }

  /** Dismiss the error banner. */
  dismissError(): void {
    clearTimeout(this._errorDismissTimer);
    this._errorBanner = '';
  }

  /** Convenience: add a message with `role: 'assistant'` and `error` set. */
  addErrorMessage(error: string, content = ''): void {
    this.addMessage({
      id: `err-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      role: 'assistant',
      content,
      error,
      timestamp: Date.now(),
    });
  }

  render() {
    const cfg = this._config;

    return html`
      <div class="template-slots" hidden>
        <slot name="user-avatar" @slotchange=${(e: Event) => this._handleSlotChange('user-avatar', e)}></slot>
        <slot name="assistant-avatar" @slotchange=${(e: Event) => this._handleSlotChange('assistant-avatar', e)}></slot>
        <slot name="message-actions" @slotchange=${(e: Event) => this._handleSlotChange('message-actions', e)}></slot>
        <slot name="reasoning-header" @slotchange=${(e: Event) => this._handleSlotChange('reasoning-header', e)}></slot>
      </div>
      <div class="chat-messages-wrapper">
        ${this._errorBanner
          ? html`<div class="error-banner" role="alert">
              <svg class="error-banner-icon" viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
                <path fill-rule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.168 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd"/>
              </svg>
              <span class="error-banner-text">${this._errorBanner}</span>
              <button
                class="error-banner-dismiss"
                @click=${() => this.dismissError()}
                aria-label="Dismiss error"
              >
                <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14">
                  <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z"/>
                </svg>
              </button>
            </div>`
          : ''}
        <div class="chat-messages" @scroll=${this._handleScroll}>
          ${this.messages.length === 0
            ? html`<div class="chat-empty">
                <slot name="empty">
                  ${this.emptyText || 'No messages yet. Start a conversation!'}
                </slot>
              </div>`
            : html`
                <div class="chat-messages-inner">
                  ${repeat(
                    this.messages,
                    (m) => m.id,
                    (m) => html`
                      <i-chat-message
                        data-message-id=${m.id}
                        .message=${m}
                        .speed=${cfg.streamingSpeed}
                        .userAvatar=${cfg.userAvatar}
                        .assistantAvatar=${cfg.assistantAvatar}
                        .userAvatarHtml=${this._userAvatarHtml}
                        .assistantAvatarHtml=${this._assistantAvatarHtml}
                        .actionsHtml=${this._messageActionsHtml}
                        .reasoningHeaderHtml=${this._reasoningHeaderHtml}
                        @message-cancel=${(e: CustomEvent<{ id: string }>) =>
                          this.updateMessage(e.detail.id, { streaming: false, cancelled: true })}
                      ></i-chat-message>
                    `
                  )}
                </div>
              `}
        </div>
        ${this._hasNewContent
          ? html`
              <button
                class="scroll-down-btn"
                @click=${this._handleScrollToBottom}
                aria-label="Scroll to latest message"
              >
                <svg viewBox="0 0 24 24" width="20" height="20">
                  <path d="M7 10l5 5 5-5z" fill="currentColor"/>
                </svg>
              </button>
            `
          : ''}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'i-chat-messages': ChatMessages;
  }
}
