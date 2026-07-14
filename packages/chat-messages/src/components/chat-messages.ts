import { LitElement, html, unsafeCSS, type PropertyValues } from 'lit';
import { customElement, property, state, query } from 'lit/decorators.js';
import { repeat } from 'lit/directives/repeat.js';
import type {
  ChatMessage,
  ChatConfig,
  MessagePart,
  TodoItemPatch,
  ToolCallPart,
} from '../types.js';
import { DEFAULT_CONFIG, textPart } from '../types.js';
import { isTodoPart, isToolCallPart } from '../part-guards.js';
import { patchTodoItem, normalizeTodoItemUpdateEvent } from '../todo-state.js';
import { patchToolCallPart } from '../tool-call-state.js';
import {
  applyMessagePartUpdate,
  appendMessagePart,
  findMessagePart,
  patchMessagePart,
  replaceMessagePart,
} from '../message-part-state.js';
import { normalizeMessagePartUpdateEvent } from '../message-part-events.js';
import { getDateSeparatorInfo } from '../date-separator.js';
import { resolveLabels, type ChatLabels } from '../i18n.js';
import type { ProgressStatus } from '../renderers/progress-plugin.js';
import type {
  MessagePartUpdateEventResult,
  MessagePartUpdateResult,
  TodoItemUpdateEventResult,
  TodoItemUpdateResult,
  ToolCallUpdateResult,
} from '../update-results.js';
import { chatIcons } from '../icons.js';
import styles from '../styles/chat-messages.scss';
import './chat-message.js';
import type { ChatMessageElement } from './chat-message.js';

/**
 * Message list container. Bubbles `streaming-change`, `message-action` (from actions template),
 * **`part-action`** plus deprecated compatibility **`form-submit`**,
 * **`todo-action`**, and **`tool-action`** events from rendered message parts.
 * Embedded event details include `messageId` / `message` after
 * `i-chat-part-host` enriches them.
 */
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
  @state() private _selfAvatarHtml = '';
  @state() private _peerAvatarHtml = '';
  @state() private _assistantAvatarHtml = '';
  @state() private _messageActionsHtml = '';
  @state() private _reasoningHeaderHtml = '';
  /** Active reply blocks. Multiple blocks may share the same `id` (stacked under one message). */
  @state() private _replies: Array<{ key: string; id: string; data: Partial<ChatMessage> }> = [];
  /** Monotonic counter for unique reply-block keys. */
  private _replyKeySeq = 0;
  @query('.chat-messages') private _scrollContainer!: HTMLElement;
  private _resizeObserver?: ResizeObserver;
  private _observedEl?: Element;
  /** While true, ignore scroll events so CSS transitions don't flip _autoScroll. */
  private _resizeScrollLock = false;
  private _resizeDebounceTimer?: ReturnType<typeof setTimeout>;
  private _errorDismissTimer?: ReturnType<typeof setTimeout>;
  /** Invalidates in-flight multi-pass scroll when a newer scroll is requested. */
  private _scrollToBottomSeq = 0;

  private get _config() {
    return { ...DEFAULT_CONFIG, ...this.config };
  }

  /** Fully-resolved UI strings (built-ins from `locale` + host `labels` overrides). */
  private get _labels(): ChatLabels {
    return resolveLabels({
      locale: this.config.locale ?? DEFAULT_CONFIG.locale,
      labels: this.config.labels,
      dateSeparatorLabels: this.config.dateSeparatorLabels,
    });
  }

  /** Flat list of separators + messages for rendering (date divider when bucket changes). */
  private _messageRenderItems(): Array<
    | { kind: 'sep'; key: string; label: string }
    | { kind: 'msg'; key: string; message: ChatMessage }
  > {
    const items: Array<
      | { kind: 'sep'; key: string; label: string }
      | { kind: 'msg'; key: string; message: ChatMessage }
    > = [];
    const sepLabels = this._labels.dateSeparator;
    const onlyToday =
      this.messages.length > 0 &&
      this.messages.every((m) => {
        const ts = m.timestamp ?? Date.now();
        return getDateSeparatorInfo(ts, sepLabels).key === 'today';
      });
    let prevKey: string | undefined;
    for (const m of this.messages) {
      const ts = m.timestamp ?? Date.now();
      const { key, label } = getDateSeparatorInfo(ts, sepLabels);
      if (prevKey === undefined || key !== prevKey) {
        if (!(onlyToday && key === 'today')) {
          items.push({ kind: 'sep', key: `sep-${m.id}`, label });
        }
        prevKey = key;
      }
      items.push({ kind: 'msg', key: m.id, message: m });
    }
    return items;
  }

  override connectedCallback(): void {
    super.connectedCallback();
  }

  override firstUpdated(changed: PropertyValues): void {
    super.firstUpdated(changed);
    // Single source of truth: shadow `<slot>` assignment (works standalone and when
    // `<i-chat>` forwards with `<slot name="x" slot="x">` — slottables stay on `<i-chat>`).
    this._syncSlotTemplatesFromAssignedNodes();
  }

  /**
   * Reads template HTML from `.template-slots` shadow slots via `assignedElements`.
   * Do not use `host.querySelectorAll('[slot=…]')` — forwarded slottables are not
   * light-DOM children of `<i-chat-messages>` when nested under `<i-chat>`.
   */
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
      this._applySlotTemplateHtml(name, content);
    });
  }

  private _applySlotTemplateHtml(name: string, content: string): void {
    switch (name) {
      case 'self-avatar':
        this._selfAvatarHtml = content;
        break;
      case 'peer-avatar':
        this._peerAvatarHtml = content;
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

  /**
   * Scroll the message list to the latest content. Uses several passes because
   * nested shadow/custom elements (e.g. `i-chat-form`, mermaid) often finish
   * layout after the first frame — a single rAF can leave `_autoScroll` true
   * while the viewport is still above new content (scroll-down button hidden).
   */
  private _scrollToBottom(): void {
    const seq = ++this._scrollToBottomSeq;
    const apply = (): void => {
      if (seq !== this._scrollToBottomSeq || !this.isConnected) return;
      const el = this._scrollContainer;
      if (el) el.scrollTop = el.scrollHeight;
    };

    requestAnimationFrame(() => {
      apply();
      requestAnimationFrame(() => {
        apply();
        queueMicrotask(apply);
        requestAnimationFrame(() => {
          apply();
          if (seq !== this._scrollToBottomSeq) return;
          setTimeout(apply, 0);
        });
      });
    });
    this._hasNewContent = false;
  }

  /** `i-chat-message` morphdom / embedded widgets may resize without `messages` changing. */
  private _onChatContentResize = (): void => {
    if (this._autoScroll) {
      this._scrollToBottom();
    }
  };

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

  /**
   * Append a structured body part to a message (e.g. a streaming text segment,
   * a reasoning block, or a tool call). Creates the `parts` array if absent.
   */
  appendPart(messageId: string, part: MessagePart): void {
    this.messages = appendMessagePart(this.messages, messageId, part);
  }

  /**
   * Patch a single part by its `id`. Shallow-merges `patch` into the matching
   * part; stateful elements (e.g. `<i-chat-tool-call>`) are preserved because
   * parts are rendered keyed by `id`.
   */
  updatePart(messageId: string, partId: string, patch: Partial<MessagePart>): void {
    const result = patchMessagePart(this.messages, messageId, partId, patch);
    if (result.ok) {
      this.messages = result.messages;
    }
  }

  /**
   * Patch any message part and return a diagnostic result when the update is
   * ignored. Tool-call parts keep their stricter state validation.
   */
  tryUpdatePart(
    messageId: string,
    partId: string,
    patch: Partial<MessagePart>
  ): MessagePartUpdateResult {
    const result = applyMessagePartUpdate(this.messages, { messageId, partId, patch });
    if (!result.ok) {
      return { ok: false, reason: result.reason, part: result.part };
    }

    this.messages = result.messages;
    return { ok: true, part: result.part };
  }

  /**
   * Patch a `tool-call` part and return a diagnostic result when the update is
   * ignored (missing message/part, wrong part type, invalid state, etc.).
   */
  tryUpdateToolCall(
    messageId: string,
    partId: string,
    patch: Partial<ToolCallPart>
  ): ToolCallUpdateResult {
    const lookup = findMessagePart(this.messages, messageId, partId);
    if (!lookup.ok) return { ok: false, reason: lookup.reason };

    const { part } = lookup;
    if (!isToolCallPart(part)) {
      return { ok: false, reason: 'part-type-mismatch', part };
    }

    const result = patchToolCallPart(part, patch);
    if (!result.ok) {
      return { ok: false, reason: result.reason, part: result.part };
    }

    const replacement = replaceMessagePart(this.messages, messageId, partId, result.part);
    if (!replacement.ok) return { ok: false, reason: replacement.reason };

    this.messages = replacement.messages;
    return { ok: true, part: result.part };
  }

  /**
   * Boolean compatibility wrapper around {@link tryUpdateToolCall}.
   */
  updateToolCall(messageId: string, partId: string, patch: Partial<ToolCallPart>): boolean {
    return this.tryUpdateToolCall(messageId, partId, patch).ok;
  }

  /**
   * Immutably patch one todo item and return a diagnostic result when the
   * update is ignored. Explicit revisions remain monotonic.
   */
  tryUpdateTodoItem(
    messageId: string,
    partId: string,
    itemId: string,
    patch: TodoItemPatch,
    revision?: number,
  ): TodoItemUpdateResult {
    const lookup = findMessagePart(this.messages, messageId, partId);
    if (!lookup.ok) return { ok: false, reason: lookup.reason };

    const { part } = lookup;
    if (!isTodoPart(part)) {
      return { ok: false, reason: 'part-type-mismatch', part };
    }

    const result = patchTodoItem(part, itemId, patch, revision);
    if (!result.ok) {
      return { ok: false, reason: result.reason, part: result.part };
    }

    const replacement = replaceMessagePart(this.messages, messageId, partId, result.part);
    if (!replacement.ok) return { ok: false, reason: replacement.reason };

    this.messages = replacement.messages;
    return { ok: true, part: result.part };
  }

  /**
   * Boolean compatibility wrapper around {@link tryUpdateTodoItem}.
   */
  updateTodoItem(
    messageId: string,
    partId: string,
    itemId: string,
    patch: TodoItemPatch,
    revision?: number,
  ): boolean {
    return this.tryUpdateTodoItem(messageId, partId, itemId, patch, revision).ok;
  }

  /**
   * Apply a backend/SSE todo item update and return a diagnostic result when it
   * is ignored. The event is normalized, then routed through
   * {@link tryUpdateTodoItem} so remote updates and UI actions share the same
   * validation and reducer.
   */
  tryApplyTodoItemUpdateEvent(event: unknown): TodoItemUpdateEventResult {
    const result = normalizeTodoItemUpdateEvent(event);
    if (!result.ok) return { ok: false, reason: result.reason };

    const { messageId, partId, itemId, patch, revision } = result.update;
    const update = this.tryUpdateTodoItem(messageId, partId, itemId, patch, revision);
    if (!update.ok) {
      return {
        ok: false,
        reason: update.reason,
        update: result.update,
        part: update.part,
      };
    }
    return { ok: true, update: result.update, part: update.part };
  }

  /**
   * Boolean compatibility wrapper around {@link tryApplyTodoItemUpdateEvent}.
   */
  applyTodoItemUpdateEvent(event: unknown): boolean {
    return this.tryApplyTodoItemUpdateEvent(event).ok;
  }

  /**
   * Apply a backend/SSE message part update and return a diagnostic result when
   * it is ignored. Use this for text streaming, tool-call state, file/source
   * metadata, and custom `x-*` part patches.
   */
  tryApplyMessagePartUpdateEvent(event: unknown): MessagePartUpdateEventResult {
    const result = normalizeMessagePartUpdateEvent(event);
    if (!result.ok) return { ok: false, reason: result.reason };

    const update = this.tryUpdatePart(
      result.update.messageId,
      result.update.partId,
      result.update.patch
    );
    if (!update.ok) {
      return {
        ok: false,
        reason: update.reason,
        update: result.update,
        part: update.part,
      };
    }
    return { ok: true, update: result.update, part: update.part };
  }

  /**
   * Boolean compatibility wrapper around {@link tryApplyMessagePartUpdateEvent}.
   */
  applyMessagePartUpdateEvent(event: unknown): boolean {
    return this.tryApplyMessagePartUpdateEvent(event).ok;
  }

  removeMessage(id: string): void {
    this.messages = this.messages.filter((m) => m.id !== id);
    this.clearReplyMessage(id);
  }

  /**
   * Add a reply block beneath the message with the given `id`.
   *
   * The composer/input is provided by the host; this only renders the reply
   * block(s) under their message(s). Each call **adds** a new block, so a
   * single message can stack multiple blocks and different messages can each
   * have their own. Mirrors the `updateMessage(id, partial)` convention.
   *
   * @param id    The id of the message the reply block is attached under.
   * @param info  Optional fields to display (`parts`, `avatar`, `role`, …).
   *              You can pass the whole `ChatMessage` you are replying to.
   * @returns A unique key for the created block — pass it to
   *          `clearReplyMessage(key)` to remove just that block.
   */
  replyMessage(id: string, info?: Partial<ChatMessage>): string {
    const key = `reply-${++this._replyKeySeq}`;
    this._replies = [...this._replies, { key, id, data: { ...info } }];
    return key;
  }

  /**
   * Remove reply block(s).
   * @param idOrKey  A message `id` removes **all** blocks under that message; a
   *                 block `key` (returned by `replyMessage`) removes just that
   *                 block. When omitted, clears all reply blocks. No-op when
   *                 there is nothing to remove.
   */
  clearReplyMessage(idOrKey?: string): void {
    if (idOrKey == null) {
      if (this._replies.length === 0) return;
      this._replies = [];
      return;
    }
    const next = this._replies.filter((r) => r.id !== idOrKey && r.key !== idOrKey);
    if (next.length !== this._replies.length) this._replies = next;
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
        // Append the hint to the last text part, or add a new one.
        const parts = msg.parts ?? [];
        let lastTextIdx = -1;
        for (let i = parts.length - 1; i >= 0; i--) {
          if (parts[i].type === 'text') {
            lastTextIdx = i;
            break;
          }
        }
        if (lastTextIdx >= 0) {
          const target = parts[lastTextIdx] as Extract<MessagePart, { type: 'text' }>;
          const nextParts = parts.slice();
          nextParts[lastTextIdx] = { ...target, text: `${target.text}\n\n${hint}` };
          this.updateMessage(id, { parts: nextParts });
        } else {
          this.updateMessage(id, { parts: [...parts, textPart(hint)] });
        }
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
    this._replies = [];
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
   * Update a progress step's status within a specific message.
   * @param messageId - The message `id` that contains the progress block.
   * @param step      - One-based step number.
   * @param status    - The new status to apply.
   * @param bid       - Optional block id to target a specific progress block when
   *                    the message contains more than one.
   * @returns `true` if the step was found and updated.
   */
  updateProgressStep(messageId: string, step: number, status: ProgressStatus, bid?: string): boolean {
    const msgEl = this.shadowRoot?.querySelector<ChatMessageElement>(
      `i-chat-message[data-message-id="${CSS.escape(messageId)}"]`
    );
    if (!msgEl) return false;
    return msgEl.updateProgressStep(step, status, bid);
  }

  /** Dismiss the error banner. */
  dismissError(): void {
    clearTimeout(this._errorDismissTimer);
    this._errorBanner = '';
  }

  /**
   * Convenience: add a message with `role: 'assistant'` and `error` set.
   * @param text  Optional markdown body shown beneath the error indicator.
   */
  addErrorMessage(error: string, text = ''): void {
    this.addMessage({
      id: `err-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      role: 'assistant',
      parts: text ? [textPart(text)] : [],
      error,
      timestamp: Date.now(),
    });
  }

  render() {
    const cfg = this._config;
    const labels = this._labels;

    const replyBlocks = new Map<string, Array<{ key: string; data: Partial<ChatMessage> }>>();
    for (const r of this._replies) {
      const list = replyBlocks.get(r.id);
      if (list) list.push({ key: r.key, data: r.data });
      else replyBlocks.set(r.id, [{ key: r.key, data: r.data }]);
    }

    return html`
      <div class="template-slots" hidden>
        <slot name="self-avatar" @slotchange=${(e: Event) => this._handleSlotChange('self-avatar', e)}></slot>
        <slot name="peer-avatar" @slotchange=${(e: Event) => this._handleSlotChange('peer-avatar', e)}></slot>
        <slot name="assistant-avatar" @slotchange=${(e: Event) => this._handleSlotChange('assistant-avatar', e)}></slot>
        <slot name="message-actions" @slotchange=${(e: Event) => this._handleSlotChange('message-actions', e)}></slot>
        <slot name="reasoning-header" @slotchange=${(e: Event) => this._handleSlotChange('reasoning-header', e)}></slot>
      </div>
      <div class="chat-messages-wrapper">
        ${this._errorBanner
          ? html`<div class="error-banner" role="alert">
              ${chatIcons.alertTriangleFilled({ className: 'error-banner-icon' })}
              <span class="error-banner-text">${this._errorBanner}</span>
              <button
                class="error-banner-dismiss"
                @click=${() => this.dismissError()}
                aria-label=${labels.messages.dismissError}
              >
                ${chatIcons.x({ size: 14, strokeWidth: 2.4 })}
              </button>
            </div>`
          : ''}
        <div class="chat-messages" @scroll=${this._handleScroll}>
          ${this.messages.length === 0
            ? html`<div class="chat-empty">
                <slot name="empty">
                  ${this.emptyText || labels.messages.empty}
                </slot>
              </div>`
            : html`
                <div
                  class="chat-messages-inner"
                  @chat-content-resize=${this._onChatContentResize}
                >
                  ${repeat(
                    this._messageRenderItems(),
                    (item) => item.key,
                    (item) =>
                      item.kind === 'sep'
                        ? html`
                            <div class="chat-date-separator" role="separator" aria-label=${item.label}>
                              <span class="chat-date-separator-line"></span>
                              <span class="chat-date-separator-label">${item.label}</span>
                              <span class="chat-date-separator-line"></span>
                            </div>
                          `
                        : html`
                            <i-chat-message
                              data-message-id=${item.message.id}
                              .message=${item.message}
                              .locale=${cfg.locale}
                              .labels=${labels}
                              .allowedLinkProtocols=${cfg.allowedLinkProtocols}
                              .speed=${cfg.streamingSpeed}
                              .selfAvatar=${cfg.selfAvatar}
                              .peerAvatar=${cfg.peerAvatar}
                              .assistantAvatar=${cfg.assistantAvatar}
                              .selfAvatarHtml=${this._selfAvatarHtml}
                              .peerAvatarHtml=${this._peerAvatarHtml}
                              .assistantAvatarHtml=${this._assistantAvatarHtml}
                              .actionsHtml=${this._messageActionsHtml}
                              .reasoningHeaderHtml=${this._reasoningHeaderHtml}
                              .replyTargets=${replyBlocks.get(item.message.id)}
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
                aria-label=${labels.messages.scrollToLatest}
              >
                ${chatIcons.chevronDown({ size: 20, strokeWidth: 2.4 })}
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
