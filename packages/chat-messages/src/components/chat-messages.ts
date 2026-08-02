import { LitElement, html, unsafeCSS, type PropertyValues } from 'lit';
import { customElement, property, state, query } from 'lit/decorators.js';
import { repeat } from 'lit/directives/repeat.js';
import type { LitVirtualizer } from '@lit-labs/virtualizer/LitVirtualizer.js';
import { setVersionAttribute } from '../version.js';
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
import type {
  MessagesChangeDetail,
  MessagesChangeReason,
} from '../messages-change-types.js';
import {
  addMessage,
  patchMessageById,
  removeMessageById,
  clearMessages,
  cancelMessageData,
} from '../message-collection-state.js';
import styles from '../styles/chat-messages.scss';
import './chat-message.js';
import type { ChatMessageElement } from './chat-message.js';
import { injectPluginCss, injectGlobalPluginCss } from '../renderers/plugin-styles.js';
import { freezeMarkdownPlugins } from '../renderers/markdown-plugins.js';
import { rendererRegistry } from '../renderers/registry.js';
import {
  buildMessageRenderItems,
  findMessageRenderIndex,
  findPartRenderIndex,
  type MessageRenderItem,
} from '../message-render-items.js';

interface MessageListScrollAnchor {
  atBottom: boolean;
  messageId?: string;
  offsetPx: number;
  scrollTop: number;
}

/**
 * Message list container. Bubbles `streaming-change`, `message-action` (from actions template),
 * **`part-action`** plus deprecated compatibility **`form-submit`**,
 * **`todo-action`**, and **`tool-action`** events from rendered message parts.
 * Embedded event details include `messageId` / `message` after
 * `i-chat-part-host` enriches them.
 *
 * @fires messages-change - Dispatched after any internal message-collection mutation commits.
 *   Detail: {@link MessagesChangeDetail}. Direct external `messages = […]` assignments do
 *   **not** emit this event.
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
  @state() private _virtualizerReady = false;
  @state() private _virtualizerFailed = false;
  /** Active reply blocks. Multiple blocks may share the same `id` (stacked under one message). */
  @state() private _replies: Array<{ key: string; id: string; data: Partial<ChatMessage> }> = [];
  /** Monotonic counter for unique reply-block keys. */
  private _replyKeySeq = 0;
  @query('.chat-messages') private _scrollContainer!: HTMLElement;
  @query('lit-virtualizer') private _virtualizer?: LitVirtualizer<MessageRenderItem>;
  private _resizeObserver?: ResizeObserver;
  private _observedEl?: Element;
  /** While true, ignore scroll events so CSS transitions don't flip _autoScroll. */
  private _resizeScrollLock = false;
  private _resizeDebounceTimer?: ReturnType<typeof setTimeout>;
  private _errorDismissTimer?: ReturnType<typeof setTimeout>;
  /** Invalidates in-flight multi-pass scroll when a newer scroll is requested. */
  private _scrollToBottomSeq = 0;
  /** Preserves the visible message when the renderer switches in either direction. */
  private _pendingModeScrollAnchor?: MessageListScrollAnchor;
  private _modeScrollRestoreSeq = 0;
  private _modeScrollRestoreLock = false;
  private _modeScrollRestorePromise?: Promise<void>;
  private _virtualizerLoadPromise?: Promise<void>;

  private get _config() {
    return { ...DEFAULT_CONFIG, ...this.config };
  }

  /** Fully-resolved UI strings (built-ins from `locale` + host `labels` overrides). */
  private get _labels(): ChatLabels {
    const locale = this.config.locale ?? DEFAULT_CONFIG.locale;
    const labelsRef = this.config.labels;

    // Memoization: cache key based on locale + the actual overrides reference.
    if (
      this.__labelsCache &&
      this.__labelsCache.locale === locale &&
      this.__labelsCache.labels === labelsRef
    ) {
      return this.__labelsCache.value;
    }

    const value = resolveLabels({
      locale,
      labels: labelsRef,
    });

    this.__labelsCache = { locale, labels: labelsRef, value };
    return value;
  }
  private __labelsCache?: {
    locale: string;
    labels: ChatConfig['labels'];
    value: ChatLabels;
  };

  /** Flat list of separators + messages for rendering (date divider when bucket changes). */
  private _messageRenderItems(): MessageRenderItem[] {
    const msgs = this.messages;
    const separatorLabels = this._labels.dateSeparator;

    // Memoization: use the messages array reference as cache key.
    // Since every mutation produces a new array (immutability), part-level
    // changes inside a message (e.g. todo status updates) also invalidate.
    if (
      this.__renderItemsCache &&
      this.__renderItemsCache.ref === msgs &&
      this.__renderItemsCache.labels === separatorLabels
    ) {
      return this.__renderItemsCache.value;
    }

    const items = buildMessageRenderItems(msgs, separatorLabels);
    this.__renderItemsCache = { ref: msgs, labels: separatorLabels, value: items };
    return items;
  }
  private __renderItemsCache?: {
    ref: readonly ChatMessage[];
    labels: ChatLabels['dateSeparator'];
    value: MessageRenderItem[];
  };

  private _renderConfig: ChatConfig & typeof DEFAULT_CONFIG = { ...DEFAULT_CONFIG };
  private _renderLabels = resolveLabels({ locale: DEFAULT_CONFIG.locale });
  private _renderReplyBlocks = new Map<
    string,
    Array<{ key: string; data: Partial<ChatMessage> }>
  >();
  private readonly _messageItemKey = (item: MessageRenderItem): string => item.key;

  private readonly _renderMessageItem = (item: MessageRenderItem) => {
    if (item.kind === 'sep') {
      return html`
        <div class="chat-date-separator" role="separator" aria-label=${item.label}>
          <span class="chat-date-separator-line"></span>
          <span class="chat-date-separator-label">${item.label}</span>
          <span class="chat-date-separator-line"></span>
        </div>
      `;
    }

    const cfg = this._renderConfig;
    const labels = this._renderLabels;
    return html`
      <i-chat-message
        data-message-id=${item.message.id}
        .message=${item.message}
        .locale=${cfg.locale}
        .labels=${labels}
        .allowedLinkProtocols=${cfg.allowedLinkProtocols}
        .highlightJs=${cfg.highlightJs}
        .speed=${cfg.streamingSpeed}
        .selfAvatar=${cfg.selfAvatar}
        .peerAvatar=${cfg.peerAvatar}
        .assistantAvatar=${cfg.assistantAvatar}
        .selfAvatarHtml=${this._selfAvatarHtml}
        .peerAvatarHtml=${this._peerAvatarHtml}
        .assistantAvatarHtml=${this._assistantAvatarHtml}
        .actionsHtml=${this._messageActionsHtml}
        .reasoningHeaderHtml=${this._reasoningHeaderHtml}
        .pendingIndicator=${cfg.pendingIndicator}
        .pendingDelay=${cfg.pendingDelay}
        .replyTargets=${this._renderReplyBlocks.get(item.message.id)}
        @message-cancel=${(event: CustomEvent<{ id: string }>) =>
          this.updateMessage(event.detail.id, { streaming: false, cancelled: true })}
      ></i-chat-message>
    `;
  };

  private _pluginCleanup?: () => void;

  override connectedCallback(): void {
    super.connectedCallback();
    setVersionAttribute(this);
    if (this.config.virtualScroll) void this._ensureVirtualizerLoaded();
    // Freeze both registries on first mount — after this point, registering
    // renderers or markdown plugins will throw a clear error.
    rendererRegistry.freeze();
    freezeMarkdownPlugins();
    this._pluginCleanup = injectPluginCss(this.shadowRoot!);
    // Global CSS is injected once per document, never removed.
    injectGlobalPluginCss();
  }

  protected override willUpdate(changed: PropertyValues<this>): void {
    if (changed.has('config')) {
      const previousConfig = changed.get('config');
      if (
        previousConfig !== undefined &&
        Boolean(previousConfig.virtualScroll) !== Boolean(this.config.virtualScroll)
      ) {
        const anchor = this._captureModeScrollAnchor();
        if (anchor) this._pendingModeScrollAnchor = anchor;
        this._modeScrollRestoreSeq += 1;
      }
      if (this.config.virtualScroll) void this._ensureVirtualizerLoaded();
    }
  }

  private _ensureVirtualizerLoaded(): Promise<void> {
    if (this._virtualizerReady || this._virtualizerFailed) {
      return Promise.resolve();
    }
    if (!this._virtualizerLoadPromise) {
      this._virtualizerLoadPromise = import('@lit-labs/virtualizer')
        .then(() => {
          this._virtualizerReady = true;
        })
        .catch((error: unknown) => {
          this._virtualizerFailed = true;
          // The regular keyed list remains available as a no-config fallback.
          console.warn('[i-chat] Virtual scrolling could not be loaded; using the regular list.', error);
        });
    }
    return this._virtualizerLoadPromise;
  }

  override disconnectedCallback(): void {
    this._pluginCleanup?.();
    super.disconnectedCallback();
    this._resizeObserver?.disconnect();
    clearTimeout(this._resizeDebounceTimer);
    clearTimeout(this._errorDismissTimer);
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

  override updated(changed: PropertyValues<this>): void {
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
      } else if (this.config.virtualScroll && this._virtualizerReady) {
        // The regular list gets this signal from its ResizeObserver. Virtual
        // rows have no stable inner element to observe, so mirror it here.
        this._hasNewContent = true;
      }
    }
    this._ensureResizeObserver();
    this._scheduleModeScrollRestore();
  }

  private _scheduleModeScrollRestore(): void {
    if (!this._pendingModeScrollAnchor || this._modeScrollRestorePromise) return;
    const restore = this._restoreModeScrollAnchor();
    this._modeScrollRestorePromise = restore;
    const complete = (): void => {
      if (this._modeScrollRestorePromise !== restore) return;
      this._modeScrollRestorePromise = undefined;
      // A second config change may have arrived while the first anchor was
      // restoring. Process it serially so the two scroll operations cannot race.
      this._scheduleModeScrollRestore();
    };
    void restore.then(complete, complete);
  }

  private _captureModeScrollAnchor(): MessageListScrollAnchor | undefined {
    const scroller = this._scrollContainer;
    if (!scroller) return undefined;

    const scrollerRect = scroller.getBoundingClientRect();
    const firstVisible = Array.from(
      this.renderRoot.querySelectorAll<HTMLElement>('i-chat-message[data-message-id]'),
    ).find((message) => {
      const rect = message.getBoundingClientRect();
      return rect.bottom > scrollerRect.top && rect.top < scrollerRect.bottom;
    });
    const messageId = firstVisible?.dataset.messageId;
    const offsetPx = firstVisible
      ? firstVisible.getBoundingClientRect().top - scrollerRect.top
      : 0;

    return {
      atBottom: scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight < 60,
      messageId,
      offsetPx,
      scrollTop: scroller.scrollTop,
    };
  }

  private async _restoreModeScrollAnchor(): Promise<void> {
    const anchor = this._pendingModeScrollAnchor;
    if (!anchor) return;
    const seq = this._modeScrollRestoreSeq;

    if (this.config.virtualScroll && !this._virtualizerFailed) {
      await this._ensureVirtualizerLoaded();
    }
    await this.updateComplete;
    if (seq !== this._modeScrollRestoreSeq || this._pendingModeScrollAnchor !== anchor) return;

    const scroller = this._scrollContainer;
    if (!scroller) return;
    this._pendingModeScrollAnchor = undefined;

    if (anchor.atBottom) {
      this._autoScroll = true;
      this._scrollToBottom();
      return;
    }

    this._modeScrollRestoreLock = true;
    const previousScrollBehavior = scroller.style.scrollBehavior;
    scroller.style.scrollBehavior = 'auto';

    try {
      let target: HTMLElement | null = null;
      if (anchor.messageId) {
        const selector = `i-chat-message[data-message-id="${CSS.escape(anchor.messageId)}"]`;
        target = this.renderRoot.querySelector<HTMLElement>(selector);

        if (!target && this.config.virtualScroll && this._virtualizerReady) {
          const index = findMessageRenderIndex(this._messageRenderItems(), anchor.messageId);
          const virtualizer = this._virtualizer;
          if (index >= 0 && virtualizer) {
            // The parent update only creates `<lit-virtualizer>`; its own
            // controller and item proxy become available on the child update.
            await virtualizer.updateComplete;
            for (let attempt = 0; attempt < 60; attempt += 1) {
              if (
                virtualizer.clientHeight > 0 &&
                this.renderRoot.querySelector('i-chat-message[data-message-id]')
              ) {
                break;
              }
              await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
              if (seq !== this._modeScrollRestoreSeq) return;
            }
            let proxy = virtualizer.element(index);
            for (let attempt = 0; attempt < 60 && !proxy; attempt += 1) {
              await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
              if (seq !== this._modeScrollRestoreSeq) return;
              proxy = virtualizer.element(index);
            }
            proxy?.scrollIntoView({ behavior: 'auto', block: 'start' });
            const layoutComplete = virtualizer.layoutComplete;
            if (layoutComplete) {
              await Promise.race([
                layoutComplete.catch(() => undefined),
                new Promise<void>((resolve) => setTimeout(resolve, 1000)),
              ]);
            }
            for (let attempt = 0; attempt < 24 && !target; attempt += 1) {
              if (attempt > 0 && attempt % 4 === 0) {
                virtualizer.element(index)?.scrollIntoView({ behavior: 'auto', block: 'start' });
              }
              await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
              if (seq !== this._modeScrollRestoreSeq) return;
              target = this.renderRoot.querySelector<HTMLElement>(selector);
            }
          }
        }
      }

      if (target) {
        // Re-apply the pixel offset while the virtualizer replaces estimates
        // with measured row heights. One correction is not enough for a large
        // jump with variable-height content.
        for (let attempt = 0; attempt < 4; attempt += 1) {
          const delta =
            target.getBoundingClientRect().top -
            scroller.getBoundingClientRect().top -
            anchor.offsetPx;
          scroller.scrollTop += delta;
          const layoutComplete = this._virtualizer?.layoutComplete;
          if (layoutComplete) {
            await Promise.race([
              layoutComplete.catch(() => undefined),
              new Promise<void>((resolve) => setTimeout(resolve, 250)),
            ]);
          }
          await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
        }
      } else {
        // Message IDs can disappear during the same update. Absolute position
        // is the least surprising fallback in that edge case.
        scroller.scrollTop = anchor.scrollTop;
      }
      this._autoScroll = false;
      this._hasNewContent = false;
    } finally {
      requestAnimationFrame(() => {
        if (scroller.isConnected) scroller.style.scrollBehavior = previousScrollBehavior;
        requestAnimationFrame(() => {
          this._modeScrollRestoreLock = false;
        });
      });
    }
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
      if (!el) return;

      if (this._virtualizerReady && this.config.virtualScroll) {
        const lastIndex = this._messageRenderItems().length - 1;
        if (lastIndex >= 0) {
          this._virtualizer?.element(lastIndex)?.scrollIntoView({ block: 'end' });
        }
      }
      el.scrollTop = el.scrollHeight;
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

    const layoutComplete = this._virtualizer?.layoutComplete;
    if (layoutComplete) {
      void layoutComplete.then(() => requestAnimationFrame(apply)).catch(() => undefined);
    }
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
    if (this._resizeScrollLock || this._modeScrollRestoreLock) return;
    const el = this._scrollContainer;
    if (!el) return;
    const threshold = 60;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
    this._autoScroll = atBottom;
    if (atBottom) {
      this._hasNewContent = false;
    }
  }

  /**
   * Central commit point for every message-collection mutation.
   *
   * Captures the previous array, assigns the next one, and dispatches exactly
   * one `messages-change` event.  If `next === this.messages` the call is a
   * no-op (no event, no assignment).  Direct external property writes (e.g.
   * `el.messages = […]`) do **not** flow through here, so they never emit.
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
    const detail: MessagesChangeDetail = {
      messages: next,
      previousMessages,
      reason: context.reason,
      source: 'i-chat-messages',
      messageId: context.messageId,
      partId: context.partId,
      itemId: context.itemId,
    };
    this.dispatchEvent(
      new CustomEvent<MessagesChangeDetail>('messages-change', {
        detail,
        bubbles: true,
        composed: true,
      }),
    );
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

  /**
   * Append a structured body part to a message (e.g. a streaming text segment,
   * a reasoning block, or a tool call). Creates the `parts` array if absent.
   */
  appendPart(messageId: string, part: MessagePart): void {
    this._commitMessages(appendMessagePart(this.messages, messageId, part), {
      reason: 'part:append',
      messageId,
      partId: part.id,
    });
  }

  /**
   * Patch a single part by its `id`. Shallow-merges `patch` into the matching
   * part; stateful elements (e.g. `<i-chat-tool-call>`) are preserved because
   * parts are rendered keyed by `id`.
   */
  updatePart(messageId: string, partId: string, patch: Partial<MessagePart>): void {
    const result = patchMessagePart(this.messages, messageId, partId, patch);
    if (result.ok) {
      this._commitMessages(result.messages, {
        reason: 'part:update',
        messageId,
        partId,
      });
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

    this._commitMessages(result.messages, {
      reason: 'part:update',
      messageId,
      partId,
    });
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

    this._commitMessages(replacement.messages, {
      reason: 'tool-call:update',
      messageId,
      partId,
    });
    return { ok: true, part: result.part };
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

    this._commitMessages(replacement.messages, {
      reason: 'todo-item:update',
      messageId,
      partId,
      itemId,
    });
    return { ok: true, part: result.part };
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

  removeMessage(id: string): void {
    this._commitMessages(removeMessageById(this.messages, id), {
      reason: 'message:remove',
      messageId: id,
    });
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
   * Freezes the typewriter animation and commits cancelled data via the
   * shared `cancelMessageData` reducer.  Does NOT emit `message-complete`.
   * The consumer is responsible for aborting the network request.
   *
   * @param hint  Optional markdown text appended to the message content.
   */
  cancel(hint?: string): void {
    const streamingMsg = this.messages.find((m) => m.streaming && !m.error);
    if (streamingMsg) this.cancelMessage(streamingMsg.id, hint);
  }

  /**
   * Cancel a streaming message by id.  No-op when the id does not exist
   * or the message is already in a terminal state.
   *
   * @param hint  Optional markdown text appended to the message content.
   */
  cancelMessage(id: string, hint?: string): void {
    // 1. Freeze the typewriter animation if the row is rendered.
    this.freezeMessageAnimation(id);

    // 2. Compute cancelled data in one shot via shared pure reducer.
    const next = cancelMessageData(this.messages, id, hint);
    if (next === this.messages) return; // no-op: id not found or already terminal

    // 3. Commit.
    this._commitMessages(next, { reason: 'message:cancel', messageId: id });
  }

  /**
   * Freeze the typewriter animation for a specific message row without
   * writing to `messages` or emitting any event.  Safe to call when the
   * row has not yet rendered (no-op).  Used by `<i-chat>` during cancel
   * to separate animation control from data mutation.
   *
   * @returns `true` if a visible row was found and frozen.
   */
  freezeMessageAnimation(id: string): boolean {
    const msgEl = this.shadowRoot?.querySelector<ChatMessageElement>(
      `i-chat-message[data-message-id="${CSS.escape(id)}"]`
    );
    if (!msgEl) return false;
    msgEl.freezeStreamingAnimation();
    return true;
  }

  /**
   * Scroll a message into view by its ID.
   *
   * Queries the rendered `i-chat-message` element with the matching
   * `data-message-id` attribute and calls `scrollIntoView` on it.
   *
   * With virtual scrolling, the data item may not be mounted yet; in that case
   * the scroll is scheduled through the virtualizer and the method still
   * returns `true` synchronously.
   *
   * @returns `true` if the message exists and scrolling was performed or scheduled.
   */
  scrollToMessage(id: string): boolean {
    const selector = `i-chat-message[data-message-id="${CSS.escape(id)}"]`;
    const messageElement = this.shadowRoot?.querySelector(selector);
    if (messageElement) {
      this._beginProgrammaticNavigation();
      messageElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      this._highlightElement(messageElement);
      return true;
    }

    const index = findMessageRenderIndex(this._messageRenderItems(), id);
    if (index < 0 || !this.config.virtualScroll || this._virtualizerFailed) return false;
    this._beginProgrammaticNavigation();
    void this._scrollVirtualItem(index, 'start', () =>
      this.shadowRoot?.querySelector(selector) ?? null);
    return true;
  }

  /**
   * Scroll a message part into view by its part ID.
   *
   * Queries any element inside the shadow root with the matching
   * `data-part-id` attribute and calls `scrollIntoView` on it.
   *
   * @returns `true` if the part exists and scrolling was performed or scheduled.
   */
  scrollToPart(partId: string): boolean {
    const partElement = this._findRenderedPart(partId);
    if (partElement) {
      this._beginProgrammaticNavigation();
      partElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      this._highlightElement(partElement);
      return true;
    }

    const index = findPartRenderIndex(this._messageRenderItems(), partId);
    if (index < 0 || !this.config.virtualScroll || this._virtualizerFailed) return false;
    this._beginProgrammaticNavigation();
    void this._scrollVirtualItem(
      index,
      'nearest',
      () => this._findRenderedPart(partId),
      true,
    );
    return true;
  }

  private _beginProgrammaticNavigation(): void {
    // Cancel delayed passes from a previous automatic bottom anchor. Without
    // this, a late virtualizer layout can undo an explicit navigation request.
    this._scrollToBottomSeq += 1;
    this._autoScroll = false;
  }

  private async _scrollVirtualItem(
    index: number,
    block: ScrollLogicalPosition,
    findTarget: () => Element | null,
    alignMountedTarget = false,
  ): Promise<void> {
    await this._ensureVirtualizerLoaded();
    await this.updateComplete;

    if (!this._virtualizerReady) {
      const fallbackTarget = findTarget();
      fallbackTarget?.scrollIntoView({ behavior: 'smooth', block });
      if (fallbackTarget) this._highlightElement(fallbackTarget);
      return;
    }

    const virtualizer = this._virtualizer;
    const proxy = virtualizer?.element(index);
    if (!virtualizer || !proxy) return;
    // Large jumps with variable-height estimates can leave a smooth native
    // scroll short of the requested virtual item. Materialise deterministically;
    // already-rendered targets still use the smooth path above.
    proxy.scrollIntoView({ behavior: 'auto', block });

    const layoutComplete = virtualizer.layoutComplete;
    if (layoutComplete) {
      await Promise.race([
        layoutComplete.catch(() => undefined),
        new Promise<void>((resolve) => setTimeout(resolve, 1000)),
      ]);
    }

    // Smooth scrolling and estimated variable heights can require a few frames
    // before the requested child is materialised.
    for (let attempt = 0; attempt < 24; attempt += 1) {
      if (attempt > 0 && attempt % 4 === 0) {
        virtualizer.element(index)?.scrollIntoView({ behavior: 'auto', block });
      }
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      let target = findTarget();
      if (target) {
        if (alignMountedTarget) {
          const targetUpdateComplete = (
            target as Element & { updateComplete?: Promise<unknown> }
          ).updateComplete;
          if (targetUpdateComplete) await targetUpdateComplete.catch(() => undefined);
          target = findTarget() ?? target;

          // The part may be created before its markdown establishes the final
          // row height. Re-align through the virtualizer's measurement passes.
          for (let alignAttempt = 0; alignAttempt < 4; alignAttempt += 1) {
            target.scrollIntoView({ behavior: 'auto', block });
            const targetLayoutComplete = virtualizer.layoutComplete;
            if (targetLayoutComplete) {
              await Promise.race([
                targetLayoutComplete.catch(() => undefined),
                new Promise<void>((resolve) => setTimeout(resolve, 250)),
              ]);
            }
            await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
          }
        }
        this._highlightElement(target);
        return;
      }
    }
  }

  private _findRenderedPart(partId: string): Element | null {
    if (!this.shadowRoot) return null;
    const selector = `[data-part-id="${CSS.escape(partId)}"]`;
    return this._queryOpenShadowRoots(this.shadowRoot, selector);
  }

  private _queryOpenShadowRoots(root: ParentNode, selector: string): Element | null {
    const directMatches = Array.from(root.querySelectorAll(selector));
    const measurable = directMatches.find((element) => {
      const rect = element.getBoundingClientRect();
      return rect.width > 0 || rect.height > 0;
    });
    if (measurable) return measurable;
    if (directMatches[0]) return directMatches[0];
    for (const element of root.querySelectorAll('*')) {
      if (element.shadowRoot) {
        const nested = this._queryOpenShadowRoots(element.shadowRoot, selector);
        if (nested) return nested;
      }
    }
    return null;
  }

  /**
   * Apply a brief background highlight to the target element so the user
   * can immediately identify the scrolled-to content.
   *
   * The animation is driven by the `.scroll-highlight` CSS class (see
   * `chat-messages.scss`).  The class self-removes on `animationend`.
   */
  private _highlightElement(el: Element): void {
    let highlighted = el;
    let root = el.getRootNode();
    while (root instanceof ShadowRoot) {
      if (root.host.tagName === 'I-CHAT-MESSAGE') {
        highlighted = root.host;
        break;
      }
      root = root.host.getRootNode();
    }
    highlighted.classList.add('scroll-highlight');
    highlighted.addEventListener(
      'animationend',
      () => highlighted.classList.remove('scroll-highlight'),
      { once: true },
    );
  }

  clear(): void {
    this._commitMessages(clearMessages(), { reason: 'message:clear' });
    this._clearPresentation();
  }

  /**
   * Reset presentation-only state (scroll, new-content indicator, reply
   * blocks, error banner) without touching the message array.  Called by
   * `<i-chat>` after it has already committed a top-level clear so the
   * child does not emit a duplicate `messages-change`.
   *
   * @internal — not part of the public standalone API.
   */
  _clearPresentation(): void {
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
    const renderItems = this._messageRenderItems();

    const replyBlocks = new Map<string, Array<{ key: string; data: Partial<ChatMessage> }>>();
    for (const r of this._replies) {
      const list = replyBlocks.get(r.id);
      if (list) list.push({ key: r.key, data: r.data });
      else replyBlocks.set(r.id, [{ key: r.key, data: r.data }]);
    }
    this._renderConfig = cfg;
    this._renderLabels = labels;
    this._renderReplyBlocks = replyBlocks;

    const virtualRequested = cfg.virtualScroll && !this._virtualizerFailed;
    const virtualEnabled = virtualRequested && this._virtualizerReady;

    return html`
      <div class="template-slots" hidden>
        <slot name="self-avatar" @slotchange=${(e: Event) => this._handleSlotChange('self-avatar', e)}></slot>
        <slot name="peer-avatar" @slotchange=${(e: Event) => this._handleSlotChange('peer-avatar', e)}></slot>
        <slot name="assistant-avatar" @slotchange=${(e: Event) => this._handleSlotChange('assistant-avatar', e)}></slot>
        <slot name="message-actions" @slotchange=${(e: Event) => this._handleSlotChange('message-actions', e)}></slot>
        <slot name="reasoning-header" @slotchange=${(e: Event) => this._handleSlotChange('reasoning-header', e)}></slot>
      </div>
      <div class="chat-messages-wrapper" role="log" aria-live="polite" aria-label=${labels.messages.chatMessages}>
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
        ${this.messages.length === 0
          ? html`
              <div class="chat-messages" @scroll=${this._handleScroll}>
                <div class="chat-empty">
                  <slot name="empty">
                    ${this.emptyText || labels.messages.empty}
                  </slot>
                </div>
              </div>
            `
          : virtualRequested && !virtualEnabled
            ? html`
                <div
                  class="chat-messages chat-messages-loading"
                  aria-busy="true"
                  aria-label=${labels.messages.chatMessages}
                  @scroll=${this._handleScroll}
                ></div>
              `
            : virtualEnabled
              ? html`
                  <lit-virtualizer
                    class="chat-messages chat-messages-inner--virtual"
                    data-virtualized="true"
                    style="min-height: 0"
                    scroller
                    .items=${renderItems}
                    .renderItem=${this._renderMessageItem}
                    .keyFunction=${this._messageItemKey}
                    @scroll=${this._handleScroll}
                    @chat-content-resize=${this._onChatContentResize}
                  ></lit-virtualizer>
                `
              : html`
                  <div class="chat-messages" @scroll=${this._handleScroll}>
                    <div
                      class="chat-messages-inner"
                      @chat-content-resize=${this._onChatContentResize}
                    >
                      ${repeat(
                        renderItems,
                        this._messageItemKey,
                        this._renderMessageItem,
                      )}
                    </div>
                  </div>
                `}
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
