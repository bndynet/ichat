import { LitElement, html, unsafeCSS, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import type {
  ChatLinkClickDetail,
  ChatMessage,
  ChatMessageRole,
  MessagePart,
  TextPart,
} from '../types.js';
import type { ChatLabels } from '../i18n.js';
import { updateTimelineStatus, type TimelineStatus } from '../renderers/timeline-plugin.js';
import { StreamingController } from '../controllers/streaming-controller.js';
import { calendarDaysAgo } from '../date-separator.js';
import { formatAssistantDurationMs } from '../duration-format.js';
import styles from '../styles/chat-message.scss';
import { chatDetailsStyles } from '../styles/chat-details-result.js';
import './chat-part-host.js';

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
   * Resolved UI strings forwarded from `<i-chat-messages>`. When omitted (e.g.
   * the element is used standalone), child components fall back to their own
   * English defaults.
   */
  @property({ attribute: false }) labels?: ChatLabels;
  @property({ attribute: false }) allowedLinkProtocols?: readonly string[];

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
    }
  }

  private _streamStartTime: number | null = null;
  private _duration: number | null = null;
  private _timelineOverrides = new Map<string, { step: number; status: TimelineStatus; bid?: string }>();
  private _pendingTimelineRetry = false;

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

  /** Inline SVG markup (trusted, same model as slot avatars). */
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
        return html`<div class="avatar avatar--custom">${unsafeHTML(explicit)}</div>`;
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
    this._contentCtrl.freeze();
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
   * Update a timeline step's status within this message (content or reasoning).
   * The override is persisted so it survives re-renders (e.g. reasoning collapse).
   * @param step   - Zero-based step index.
   * @param status - The new status to apply.
   * @param bid    - Optional block id to target a specific timeline when
   *                 the message contains more than one.
   * @returns `true` if the step was found and updated.
   */
  updateTimeline(step: number, status: TimelineStatus, bid?: string): boolean {
    const key = `${bid ?? ''}:${step}`;
    this._timelineOverrides.set(key, { step, status, bid });
    const applied = this._applyTimelineOverride(step, status, bid);
    if (!applied && !this._pendingTimelineRetry) {
      // Timeline element is not in the DOM yet (component hasn't rendered, or
      // the streaming content hasn't reached the timeline block yet).
      // Enqueue a single Lit update so updated() will retry; the flag prevents
      // redundant requestUpdate() calls while a retry is already in flight.
      this._pendingTimelineRetry = true;
      this.requestUpdate();
    }
    return applied;
  }

  private _applyTimelineOverride(step: number, status: TimelineStatus, bid?: string): boolean {
    if (!this.shadowRoot) return false;
    if (updateTimelineStatus(this.shadowRoot, step, status, bid)) return true;
    const reasoning = this.shadowRoot.querySelector('i-chat-reasoning');
    if (reasoning?.shadowRoot) {
      return updateTimelineStatus(reasoning.shadowRoot, step, status, bid);
    }
    return false;
  }

  private _handlePartHostUpdated = (): void => {
    this._scheduleTimelineReapply();
  };

  private _scheduleTimelineReapply(): void {
    if (this._timelineOverrides.size === 0) return;
    Promise.resolve().then(() => {
      for (const { step, status, bid } of this._timelineOverrides.values()) {
        this._applyTimelineOverride(step, status, bid);
      }
    });
  }

  override updated(_changed: Map<string, unknown>): void {
    this._pendingTimelineRetry = false;
    this._scheduleTimelineReapply();
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
        @click=${this._handleLinkClick}
      >
        ${this._renderAvatar(resolvedAvatar, role)}
        <div class="bubble-wrapper">
          ${error
            ? html`<div class="bubble bubble--error">
                <div class="error-indicator">
                  <svg class="error-icon" viewBox="0 0 20 20" fill="currentColor" width="18" height="18">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clip-rule="evenodd"/>
                  </svg>
                  <span class="error-text">${error}</span>
                </div>
              </div>`
            : nothing}
          <i-chat-part-host
            .message=${this.message}
            .parts=${this.message.parts ?? []}
            .streamingTextId=${this._streamingTextId}
            .streamingText=${this._contentCtrl.displayedContent}
            .streamingTextAnimating=${this._contentCtrl.isAnimating}
            .speed=${this.speed}
            .reasoningHeaderHtml=${this.reasoningHeaderHtml}
            .labels=${this.labels}
            .allowedLinkProtocols=${this.allowedLinkProtocols}
            @chat-part-host-updated=${this._handlePartHostUpdated}
          ></i-chat-part-host>
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
