import { LitElement, html, unsafeCSS, nothing, type PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import { setVersionAttribute } from '../version.js';
import type {
  ChatLinkClickDetail,
  ChatMessage,
  ChatMessageRole,
  MessagePart,
  TextPart,
} from '../types.js';
import type { ChatLabels } from '../i18n.js';
import { updateProgressStepStatus, type ProgressStatus } from '../renderers/progress-plugin.js';
import { StreamingController } from '../controllers/streaming-controller.js';
import { calendarDaysAgo } from '../date-separator.js';
import { formatAssistantDurationMs } from '../duration-format.js';
import { chatIcons } from '../icons.js';
import { sanitizeInlineSvgAvatar } from '../avatar-sanitizer.js';
import styles from '../styles/chat-message.scss';
import { chatDetailsStyles } from '../styles/chat-details-result.js';
import './chat-part-host.js';
import './chat-dots.js';
import './chat-spinner.js';
import { injectPluginCss } from '../renderers/plugin-styles.js';
import { freezeMarkdownPlugins } from '../renderers/markdown-plugins.js';
import { rendererRegistry } from '../renderers/registry.js';

@customElement('i-chat-message')
export class ChatMessageElement extends LitElement {
  static styles = [unsafeCSS(styles), chatDetailsStyles];

  @property({ type: Object }) message!: ChatMessage;
  @property({ type: Number }) speed = 3;
  @property() selfAvatar = '';
  @property() peerAvatar = '';
  @property() assistantAvatar = '';
  @property() selfAvatarHtml = '';
  @property() peerAvatarHtml = '';
  @property() assistantAvatarHtml = '';
  @property() actionsHtml = '';
  @property() reasoningHeaderHtml = '';
  /**
   * Reply blocks rendered beneath this message. Each entry has a unique `key`
   * (for `clearReplyMessage(key)`) and `data` holding the replied-to message's display fields
   * (`parts`, `avatar`, `role`, …). The list passes only this message's blocks.
   */
  @property({ attribute: false }) replyTargets?: Array<{ key: string; data: Partial<ChatMessage> }>;
  /**
   * BCP 47 tag for `Intl` date/time (from parent `ChatConfig.locale`).
   * Empty → browser default locale for `toLocaleString` / `toLocaleTimeString`.
   */
  @property() locale = '';

  /**
   * Pending indicator style: `'dots'`, `'spinner'`, or `'none'`.
   * Forwarded from parent {@link ChatConfig.pendingIndicator}.
   */
  @property() pendingIndicator: 'dots' | 'spinner' | 'none' = 'dots';

  /**
   * Delay (ms) before the pending indicator appears. Forwarded from
   * parent {@link ChatConfig.pendingDelay}.
   */
  @property({ type: Number }) pendingDelay = 200;

  /** Whether the pending indicator is currently visible. */
  @state() private _showPending = false;

  /** Whether we are in the pending phase (streaming, no substantive parts).
   *  Set immediately so the part-host is hidden even before the delay timer fires. */
  @state() private _pendingActive = false;

  private _pluginCleanup?: () => void;

  override connectedCallback(): void {
    super.connectedCallback();
    setVersionAttribute(this);
    // Freeze both registries on first mount — after this point, registering
    // renderers or markdown plugins will throw a clear error.
    rendererRegistry.freeze();
    freezeMarkdownPlugins();
    this._pluginCleanup = injectPluginCss(this.shadowRoot!);
  }

  override disconnectedCallback(): void {
    this._pluginCleanup?.();
    this._cancelPendingTimer();
    super.disconnectedCallback();
  }

  override firstUpdated(changed: PropertyValues): void {
    super.firstUpdated(changed);
    // Code copy button click handler (delegated)
    this.renderRoot.addEventListener('click', this._handleCodeCopy);
  }

  private _handleCodeCopy = (e: Event): void => {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('.ichat-code-copy-btn');
    if (!btn) return;
    e.preventDefault();
    const code = decodeURIComponent(btn.getAttribute('data-code') || '');
    navigator.clipboard.writeText(code).catch(() => {});
    btn.classList.add('copied');
    btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;
    setTimeout(() => {
      btn.classList.remove('copied');
      btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`;
    }, 2000);
  };

  /**
   * Resolved UI strings forwarded from `<i-chat-messages>`. When omitted (e.g.
   * the element is used standalone), child components fall back to their own
   * English defaults.
   */
  @property({ attribute: false }) labels?: ChatLabels;
  @property({ attribute: false }) allowedLinkProtocols?: readonly string[];
  @property({ attribute: false }) highlightJs?: import('../types.js').ChatConfig['highlightJs'];

  /**
   * Single typewriter controller, bound to the message's currently-streaming
   * `text` part (`status === 'streaming'`). Non-streaming text parts render
   * their full markdown directly. A message has at most one streaming text part
   * at a time, so one controller is enough.
   */
  private _contentCtrl = new StreamingController(this, {
    speed: this.speed,
    onComplete: () => {
      if (this.message?.parentId) return;
      this.dispatchEvent(
        new CustomEvent('message-complete', {
          detail: { id: this.message?.id },
          bubbles: true,
          composed: true,
        })
      );
    },
  });

  // ── Pending indicator ──────────────────────────────────────────────

  private _pendingTimer: ReturnType<typeof setTimeout> | null = null;

  /**
   * Returns `true` when a part has real content that should suppress the
   * pending indicator. Empty text placeholders (e.g. from `run.start()`)
   * and empty reasoning blocks do NOT count as substantive.
   */
  private _hasSubstantiveParts(): boolean {
    const parts = this.message?.parts;
    if (!parts || parts.length === 0) return false;
    return parts.some((p) => {
      switch (p.type) {
        case 'text':
        case 'reasoning':
          return (p as { text?: string }).text != null && (p as { text?: string }).text!.length > 0;
        case 'todo':
          return (p as { items?: unknown[] }).items != null && (p as { items?: unknown[] }).items!.length > 0;
        case 'tool-call':
        case 'file':
        case 'source':
          return true;
        default:
          // Custom x-* parts — host-defined, treat as substantive.
          return true;
      }
    });
  }

  private _cancelPendingTimer(): void {
    if (this._pendingTimer !== null) {
      clearTimeout(this._pendingTimer);
      this._pendingTimer = null;
    }
  }

  private _startPendingTimer(): void {
    this._cancelPendingTimer();
    if (this.pendingIndicator === 'none' || this.pendingDelay <= 0) {
      this._showPending = this.pendingIndicator !== 'none';
      return;
    }
    this._pendingTimer = setTimeout(() => {
      this._pendingTimer = null;
      // Re-check conditions when timer fires — streaming may have ended
      // or parts may have arrived in the meantime.
      if (
        this.message?.streaming &&
        !this.message?.error &&
        !this._hasSubstantiveParts()
      ) {
        this._showPending = true;
      }
    }, this.pendingDelay);
  }

  private _syncPendingState(): void {
    const shouldShow =
      this.message?.streaming === true &&
      !this.message?.error &&
      !this._hasSubstantiveParts() &&
      this.pendingIndicator !== 'none';

    // _pendingActive is immediate — hides part-host right away.
    this._pendingActive = shouldShow;

    if (shouldShow && !this._showPending && this._pendingTimer === null) {
      this._startPendingTimer();
    } else if (!shouldShow) {
      this._cancelPendingTimer();
      this._showPending = false;
    }
  }

  willUpdate(changed: Map<string, unknown>): void {
    // Update speed first so _charsPerTick is correct when setContent is called below.
    if (changed.has('speed')) {
      this._contentCtrl.setSpeed(this.speed);
    }
    if (changed.has('message') && this.message) {
      // Bind the typewriter to the streaming text part (if any). The text part
      // renderer consumes the displayed content and morphs markdown in place.
      const streamingText = (this.message.parts ?? []).find(
        (p): p is TextPart => p.type === 'text' && p.status === 'streaming'
      );
      this._streamingTextId = streamingText?.id ?? null;
      const shouldAnimate =
        !!streamingText &&
        this.message.streaming === true &&
        !this.message.error &&
        this.message.role === 'assistant';
      this._contentCtrl.setContent(streamingText?.text ?? '', shouldAnimate);

      // Track streaming duration for assistant messages
      if (this.message.role === 'assistant') {
        if (this.message.duration != null) {
          // Use explicitly-provided duration
          this._duration = this.message.duration;
        } else if (this.message.streaming && !this.message.error) {
          // Streaming started: record start time (only if not already tracking)
          if (this._streamStartTime === null) {
            this._streamStartTime = Date.now();
          }
        } else if (!this.message.streaming && this._streamStartTime !== null) {
          // Streaming just finished: compute elapsed
          this._duration = Date.now() - this._streamStartTime;
          this._streamStartTime = null;
        }
      }

      // Sync pending indicator state after message/parts change.
      this._syncPendingState();
    }

    // Re-sync when pending config changes without a message change.
    if (
      (changed.has('pendingIndicator') || changed.has('pendingDelay')) &&
      !changed.has('message')
    ) {
      this._syncPendingState();
    }
  }

  private _streamStartTime: number | null = null;
  private _duration: number | null = null;
  private _progressOverrides = new Map<string, { step: number; status: ProgressStatus; bid?: string }>();
  private _pendingProgressRetry = false;

  /** Id of the `text` part currently driven by the typewriter, or `null`. */
  private _streamingTextId: string | null = null;

  private _isImageUrl(str: string): boolean {
    return /^(https?:\/\/|data:image\/)/.test(str) || /\.(png|jpe?g|gif|svg|webp)$/i.test(str);
  }

  /** True when `message.avatar` is set and non-empty after trim; used to override slot avatars. */
  private _hasPerMessageAvatar(): boolean {
    const a = this.message?.avatar;
    return a != null && String(a).trim() !== '';
  }

  /** Inline SVG markup. Per-message values are sanitized before rendering. */
  private _isInlineSvg(str: string): boolean {
    return /^<svg[\s>/]/i.test(str.trim());
  }

  /**
   * If `s` looks like raw base64 (no `data:` prefix), return a PNG data URL.
   * Prefer passing a full `data:image/...;base64,...` URL for non-PNG images.
   */
  private _tryDataUrlFromRawBase64(s: string): string | null {
    const t = s.replace(/\s/g, '');
    if (t.length < 16) return null;
    if (!/^[A-Za-z0-9+/]+=*$/.test(t)) return null;
    return `data:image/png;base64,${t}`;
  }

  private _slotAvatarHtml(role: ChatMessageRole): string {
    switch (role) {
      case 'self':
        return this.selfAvatarHtml;
      case 'peer':
        return this.peerAvatarHtml;
      case 'assistant':
      case 'system':
        return this.assistantAvatarHtml;
    }
  }

  private _defaultAvatarLabel(role: ChatMessageRole): string {
    switch (role) {
      case 'self':
        return 'U';
      case 'peer':
        return 'P';
      case 'assistant':
        return 'AI';
      case 'system':
        return 'S';
    }
  }

  private _renderAvatar(resolvedAvatar: string, role: ChatMessageRole) {
    const tplHtml = this._slotAvatarHtml(role);

    if (this._hasPerMessageAvatar()) {
      const explicit = String(this.message.avatar).trim();
      if (this._isInlineSvg(explicit)) {
        const sanitizedSvg = sanitizeInlineSvgAvatar(explicit);
        return sanitizedSvg
          ? html`<div class="avatar avatar--custom">${unsafeHTML(sanitizedSvg)}</div>`
          : html`<div class="avatar">${this._defaultAvatarLabel(role)}</div>`;
      }
      const fromB64 = this._tryDataUrlFromRawBase64(explicit);
      const imgSrc = fromB64 ?? (this._isImageUrl(explicit) ? explicit : null);
      if (imgSrc) {
        return html`<div class="avatar avatar--img"><img src=${imgSrc} alt=${role} /></div>`;
      }
      return html`<div class="avatar">${explicit}</div>`;
    }

    if (tplHtml) {
      return html`<div class="avatar avatar--custom">${unsafeHTML(tplHtml)}</div>`;
    }
    if (resolvedAvatar && this._isImageUrl(resolvedAvatar)) {
      return html`<div class="avatar avatar--img"><img src=${resolvedAvatar} alt=${role} /></div>`;
    }
    const label = resolvedAvatar || this._defaultAvatarLabel(role);
    return html`<div class="avatar">${label}</div>`;
  }

  /**
   * Reply blocks shown beneath the message, all wrapped in a single container
   * (easy to style as a grouped quote). Each block reuses `<i-chat-message>`
   * with a `parentId` set, which renders the compact quote variant so any
   * content type (charts, forms, mermaid, …) renders.
   */
  private _renderReplyBlocks() {
    const blocks = this.replyTargets;
    if (!blocks || blocks.length === 0) return nothing;
    return html`
      <div class="message-replies">
        ${blocks.map(
          (block) => html`
            <div class="message-reply">
              <i-chat-message
                inert
                data-message-id=${block.data.id}
                .message=${{ ...block.data, parentId: block.data.parentId ?? this.message?.id }}
                .locale=${this.locale}
                .labels=${this.labels}
                .allowedLinkProtocols=${this.allowedLinkProtocols}
                .highlightJs=${this.highlightJs}
                .speed=${0}
                .selfAvatar=${this.selfAvatar}
                .peerAvatar=${this.peerAvatar}
                .assistantAvatar=${this.assistantAvatar}
                .selfAvatarHtml=${this.selfAvatarHtml}
                .peerAvatarHtml=${this.peerAvatarHtml}
                .assistantAvatarHtml=${this.assistantAvatarHtml}
              ></i-chat-message>
            </div>
          `
        )}
      </div>
    `;
  }

  private _handleActionClick(e: Event): void {
    const target = (e.target as HTMLElement).closest<HTMLElement>('[data-action]');
    if (!target) return;
    this.dispatchEvent(
      new CustomEvent('message-action', {
        detail: {
          action: target.dataset.action,
          message: this.message,
        },
        bubbles: true,
        composed: true,
      })
    );
  }

  private _findAnchorFromPath(path: EventTarget[]): HTMLAnchorElement | null {
    for (const node of path) {
      if (node === this) break;
      if (node instanceof HTMLAnchorElement && node.hasAttribute('href')) return node;
      if (node instanceof Element) {
        const anchor = node.closest('a[href]');
        if (anchor instanceof HTMLAnchorElement) return anchor;
      }
    }
    return null;
  }

  private _partInfoFromPath(
    path: EventTarget[]
  ): Pick<ChatLinkClickDetail, 'partId' | 'partType'> {
    for (const node of path) {
      if (node === this) break;
      if (!(node instanceof HTMLElement)) continue;
      const partId = node.dataset.partId;
      const partType = node.dataset.partType as MessagePart['type'] | undefined;
      if (partId || partType) return { partId, partType };
    }
    return {};
  }

  private _protocolForLink(anchor: HTMLAnchorElement, rawHref: string): string {
    const explicit = /^([a-z][a-z0-9+.-]*):/i.exec(rawHref.trim());
    if (explicit) return `${explicit[1].toLowerCase()}:`;
    try {
      return new URL(anchor.href, this.ownerDocument.baseURI).protocol;
    } catch {
      return anchor.protocol ?? '';
    }
  }

  private _handleLinkClick(e: MouseEvent): void {
    if (!this.message) return;
    const path = e.composedPath();
    const owningMessage = path.find((node) => node instanceof ChatMessageElement);
    if (owningMessage && owningMessage !== this) return;
    if (
      path.some(
        (node) => node instanceof HTMLElement && node.classList.contains('message-actions')
      )
    ) {
      return;
    }

    const anchor = this._findAnchorFromPath(path);
    if (!anchor) return;

    const rawHref = anchor.getAttribute('href') ?? '';
    const detail: ChatLinkClickDetail = {
      href: anchor.href || rawHref,
      rawHref,
      protocol: this._protocolForLink(anchor, rawHref),
      text: anchor.textContent?.trim() ?? '',
      target: anchor,
      messageId: this.message.id,
      message: this.message,
      ...this._partInfoFromPath(path),
      originalEvent: e,
    };

    const linkEvent = new CustomEvent<ChatLinkClickDetail>('link-click', {
      detail,
      bubbles: true,
      composed: true,
      cancelable: true,
    });
    this.dispatchEvent(linkEvent);
    if (linkEvent.defaultPrevented) {
      e.preventDefault();
    }
  }

  /**
   * Freeze the typewriter animation without dispatching any event.
   * Buffered content is preserved and remains visible.  Use this from
   * parent components that manage cancellation data separately.
   *
   * Safe to call multiple times — subsequent calls are no-ops when the
   * message is not streaming.
   */
  freezeStreamingAnimation(): void {
    if (!this.message?.streaming) return;
    this._contentCtrl.freeze();
  }

  /**
   * Stop streaming for this message immediately.
   * The content received so far remains visible; the typing animation is
   * frozen and `message-complete` is NOT re-fired (the stream was aborted,
   * not completed normally).
   *
   * Pair this with an `AbortController.abort()` call on the network side to
   * fully cancel an in-flight request.
   */
  cancel(): void {
    if (!this.message?.streaming) return;
    this.freezeStreamingAnimation();
    // Propagate the state change so parent components (e.g. chat-messages)
    // can update their messages array and remove the streaming flag.
    this.dispatchEvent(
      new CustomEvent('message-cancel', {
        detail: { id: this.message?.id },
        bubbles: true,
        composed: true,
      })
    );
  }

  /**
   * Update a progress step's status within this message (content or reasoning).
   * The override is persisted so it survives re-renders (e.g. reasoning collapse).
   * @param step   - One-based step number.
   * @param status - The new status to apply.
   * @param bid    - Optional block id to target a specific progress block when
   *                 the message contains more than one.
   * @returns `true` if the step was found and updated.
   */
  updateProgressStep(step: number, status: ProgressStatus, bid?: string): boolean {
    const key = `${bid ?? ''}:${step}`;
    this._progressOverrides.set(key, { step, status, bid });
    const applied = this._applyProgressOverride(step, status, bid);
    if (!applied && !this._pendingProgressRetry) {
      // Progress element is not in the DOM yet (component hasn't rendered, or
      // the streaming content hasn't reached the progress block yet).
      // Enqueue a single Lit update so updated() will retry; the flag prevents
      // redundant requestUpdate() calls while a retry is already in flight.
      this._pendingProgressRetry = true;
      this.requestUpdate();
    }
    return applied;
  }

  private _applyProgressOverride(step: number, status: ProgressStatus, bid?: string): boolean {
    if (!this.shadowRoot) return false;
    if (updateProgressStepStatus(this.shadowRoot, step, status, bid)) return true;
    const reasoning = this.shadowRoot.querySelector('i-chat-reasoning');
    if (reasoning?.shadowRoot) {
      return updateProgressStepStatus(reasoning.shadowRoot, step, status, bid);
    }
    return false;
  }

  private _handlePartHostUpdated = (): void => {
    this._scheduleProgressReapply();
  };

  private _scheduleProgressReapply(): void {
    if (this._progressOverrides.size === 0) return;
    Promise.resolve().then(() => {
      for (const { step, status, bid } of this._progressOverrides.values()) {
        this._applyProgressOverride(step, status, bid);
      }
    });
  }

  override updated(_changed: Map<string, unknown>): void {
    this._pendingProgressRetry = false;
    this._scheduleProgressReapply();
  }

  /** Locale tag for Intl; `undefined` uses the runtime default (browser / environment). */
  private _timestampLocale(): string | undefined {
    const t = this.locale?.trim();
    return t || undefined;
  }

  /** Today: time only; other days: date + time (matches date-separator “today” bucket). */
  private _formatTimestamp(ts: number): string {
    const d = new Date(ts);
    const loc = this._timestampLocale();
    if (calendarDaysAgo(ts) === 0) {
      return d.toLocaleTimeString(loc, {
        hour: '2-digit',
        minute: '2-digit',
      });
    }
    return d.toLocaleString(loc, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  private _formatDuration(ms: number): string {
    return formatAssistantDurationMs(ms, this._timestampLocale());
  }

  render() {
    if (!this.message) return nothing;

    const { role, timestamp, streaming, avatar, error } = this.message;
    const resolvedAvatar =
      avatar ||
      (role === 'self'
        ? this.selfAvatar
        : role === 'peer'
          ? this.peerAvatar
          : this.assistantAvatar);

    return html`
      <div
        class="message message--${role} ${this.message.parentId ? 'message--reply' : ''} ${error
          ? 'message--error'
          : ''}"
        role=${role === 'assistant' ? 'article' : nothing}
        @click=${this._handleLinkClick}
      >
        ${this._renderAvatar(resolvedAvatar, role)}
        <div class="bubble-wrapper">
          ${error
            ? html`<div class="bubble bubble--error">
                <div class="error-indicator">
                  ${chatIcons.errorCircleFilled({ className: 'error-icon' })}
                  <span class="error-text">${error}</span>
                </div>
              </div>`
            : nothing}
          ${this._showPending
            ? html`<div
                class="pending-indicator pending-indicator--${this.pendingIndicator}"
              >
                ${this.pendingIndicator === 'spinner'
                  ? html`<i-chat-spinner
                      style="--chat-spinner-color:var(--chat-text-secondary,#909399);--chat-spinner-track:var(--chat-border,#dcdfe6)"
                      label=${this.labels?.messages?.generating ?? 'Generating response…'}
                    ></i-chat-spinner>`
                  : html`<i-chat-dots
                      style="--chat-dots-size:6px;--chat-dots-color:var(--chat-text-secondary,#909399)"
                      label=${this.labels?.messages?.generating ?? 'Generating response…'}
                    ></i-chat-dots>`}
              </div>`
            : nothing}
          ${this._pendingActive
            ? nothing
            : html`<i-chat-part-host
            .message=${this.message}
            .parts=${this.message.parts ?? []}
            .streamingTextId=${this._streamingTextId}
            .streamingText=${this._contentCtrl.displayedContent}
            .streamingTextAnimating=${this._contentCtrl.isAnimating}
            .speed=${this.speed}
            .reasoningHeaderHtml=${this.reasoningHeaderHtml}
            .labels=${this.labels}
            .allowedLinkProtocols=${this.allowedLinkProtocols}
            .highlightJs=${this.highlightJs}
            @chat-part-host-updated=${this._handlePartHostUpdated}
          ></i-chat-part-host>`}
          <div class="message-footer">
            ${timestamp && !streaming
              ? html`<div class="timestamp">${this._formatTimestamp(timestamp)}</div>`
              : nothing}
            ${role === 'assistant' && !streaming && this._duration !== null
              ? html`<div class="duration">${this._formatDuration(this._duration)}</div>`
              : nothing}
            ${this.actionsHtml && !streaming
              ? html`<div class="message-actions" @click=${this._handleActionClick}>
                  ${unsafeHTML(this.actionsHtml)}
                </div>`
              : nothing}
          </div>
          ${this._renderReplyBlocks()}
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'i-chat-message': ChatMessageElement;
  }
}
