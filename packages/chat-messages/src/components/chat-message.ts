import { LitElement, html, unsafeCSS, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import { ref, createRef } from 'lit/directives/ref.js';
import morphdom from 'morphdom';
import type {
  ChatFormFieldValues,
  ChatFormSubmitDetail,
  ChatMessage,
  ChatMessageRole,
} from '../types.js';
import { renderMarkdown } from '../renderers/markdown-renderer.js';
import { updateTimelineStatus, type TimelineStatus } from '../renderers/timeline-plugin.js';
import { StreamingController } from '../controllers/streaming-controller.js';
import { calendarDaysAgo } from '../date-separator.js';
import { formatAssistantDurationMs } from '../duration-format.js';
import styles from '../styles/chat-message.scss';
import { chatDetailsStyles } from '../styles/chat-details-result.js';
import './chat-reasoning.js';

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
   * BCP 47 tag for `Intl` date/time (from parent `ChatConfig.locale`).
   * Empty → browser default locale for `toLocaleString` / `toLocaleTimeString`.
   */
  @property() locale = '';

  private _contentCtrl = new StreamingController(this, {
    speed: this.speed,
    onComplete: () => {
      this.dispatchEvent(
        new CustomEvent('message-complete', {
          detail: { id: this.message?.id },
          bubbles: true,
          composed: true,
        })
      );
    },
  });

  /**
   * Enrich `form-submit` from `i-chat-form` with `messageId` / `message`.
   *
   * Note: With Shadow DOM, `event.target` for a bubbling `composed` event may be
   * **retargeted** to this host, so we detect the source via `composedPath()` instead
   * of `target === i-chat-form`. Re-dispatched events include `messageId` and are skipped.
   */
  private _onFormSubmit = (e: Event): void => {
    if (!this.message) return;
    const ev = e as CustomEvent<
      Partial<ChatFormSubmitDetail> & {
        formId: string;
        title: string;
        values: ChatFormFieldValues;
      }
    >;
    // Our own re-dispatch — let it bubble (already has message / messageId).
    if (ev.detail?.messageId != null) return;

    const path = e.composedPath();
    if (!path.includes(this)) return;
    const fromEmbeddedForm = path.some(
      (n) => n instanceof HTMLElement && n.tagName === 'I-CHAT-FORM'
    );
    if (!fromEmbeddedForm) return;

    e.stopPropagation();
    const detail: ChatFormSubmitDetail = {
      formId: ev.detail.formId,
      title: ev.detail.title ?? '',
      values: ev.detail.values,
      messageId: this.message.id,
      message: this.message,
    };
    this.dispatchEvent(
      new CustomEvent<ChatFormSubmitDetail>('form-submit', {
        detail,
        bubbles: true,
        composed: true,
      })
    );
  };

  override connectedCallback(): void {
    super.connectedCallback();
    this.addEventListener('form-submit', this._onFormSubmit);
  }

  override disconnectedCallback(): void {
    this.removeEventListener('form-submit', this._onFormSubmit);
    super.disconnectedCallback();
  }

  willUpdate(changed: Map<string, unknown>): void {
    // Update speed first so _charsPerTick is correct when setContent is called below.
    if (changed.has('speed')) {
      this._contentCtrl.setSpeed(this.speed);
    }
    if (changed.has('message') && this.message) {
      const r = this.message.reasoning;
      this._parsedReasoning = r ?? '';
      this._parsedContent = this.message.content;
      // Show reasoning when the field is present: non-empty text, or streaming with an empty buffer
      // (e.g. SSE reasoning track started before the first chunk). Omit `reasoning` entirely for answer-only.
      this._showReasoning =
        r !== undefined &&
        (r.length > 0 ||
          (this.message.streaming === true && this.message.role === 'assistant'));

      const shouldAnimate =
        this.message.streaming && !this.message.error && this.message.role === 'assistant';
      this._contentCtrl.setContent(this._parsedContent, shouldAnimate);

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

  private _parsedReasoning = '';
  private _parsedContent = '';
  private _showReasoning = false;
  private _streamStartTime: number | null = null;
  private _duration: number | null = null;
  private _timelineOverrides = new Map<string, { step: number; status: TimelineStatus; bid?: string }>();
  private _pendingTimelineRetry = false;

  /** Ref to the `.content` div so we can morph it directly without tearing down custom elements. */
  private _contentRef = createRef<HTMLDivElement>();
  /** Last HTML string written into the content div via morphdom – used to skip no-op patches. */
  private _cachedContentHtml = '';

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

  override updated(_changed: Map<string, unknown>): void {
    this._pendingTimelineRetry = false;

    // ── morphdom content patch ──────────────────────────────────────────────
    // Instead of using unsafeHTML (which replaces the entire DOM subtree on
    // every Lit update), we patch only the changed nodes via morphdom.
    // This preserves custom elements such as <i-chart> when their attributes
    // haven't changed, preventing ECharts from re-initializing at 60 fps and
    // causing the chart-flicker that occurs during the streaming animation.
    const contentEl = this._contentRef.value;
    if (contentEl) {
      const newHtml = renderMarkdown(this._contentCtrl.displayedContent);
      if (newHtml !== this._cachedContentHtml) {
        const temp = document.createElement('div');
        temp.innerHTML = newHtml;
        morphdom(contentEl, temp, {
          childrenOnly: true,
          onBeforeElUpdated(fromEl, toEl) {
            // Skip custom elements whose attributes are all unchanged.
            // Tag names with a hyphen are custom elements (web components).
            if (fromEl.tagName.includes('-') && fromEl.tagName === toEl.tagName) {
              const fa = fromEl.attributes;
              const ta = toEl.attributes;
              if (fa.length === ta.length) {
                let same = true;
                for (let i = 0; i < ta.length; i++) {
                  if (fromEl.getAttribute(ta[i].name) !== ta[i].value) {
                    same = false;
                    break;
                  }
                }
                if (same) return false;
              }
            }
            return true;
          },
        });
        this._cachedContentHtml = newHtml;
      }
    }

    // ── timeline re-apply ───────────────────────────────────────────────────
    if (this._timelineOverrides.size === 0) return;
    // Re-apply after child components (e.g. chat-reasoning) have also updated,
    // since their re-render would otherwise overwrite direct DOM mutations.
    Promise.resolve().then(() => {
      for (const { step, status, bid } of this._timelineOverrides.values()) {
        this._applyTimelineOverride(step, status, bid);
      }
    });
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
    const isAnimating = this._contentCtrl.isAnimating;
    const resolvedAvatar =
      avatar ||
      (role === 'self'
        ? this.selfAvatar
        : role === 'peer'
          ? this.peerAvatar
          : this.assistantAvatar);
    const hasMainBody = (this._parsedContent ?? '').trim().length > 0;

    return html`
      <div class="message message--${role} ${error ? 'message--error' : ''}">
        ${this._renderAvatar(resolvedAvatar, role)}
        <div class="bubble-wrapper">
          ${this._showReasoning
            ? html`<i-chat-reasoning
                .content=${this._parsedReasoning}
                .streaming=${!!streaming}
                .speed=${this.speed <= 0 ? 0 : Math.max(1, this.speed - 1)}
                .headerHtml=${this.reasoningHeaderHtml}
              ></i-chat-reasoning>`
            : nothing}
          ${error
            ? html`<div class="bubble bubble--error">
                <div class="error-indicator">
                  <svg class="error-icon" viewBox="0 0 20 20" fill="currentColor" width="18" height="18">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clip-rule="evenodd"/>
                  </svg>
                  <span class="error-text">${error}</span>
                </div>
                ${hasMainBody
                  ? html`<div class="content" ${ref(this._contentRef)}></div>`
                  : nothing}
              </div>`
            : hasMainBody
              ? html`<div class="bubble">
                  <div class="content ${isAnimating ? 'typing-cursor' : ''}" ${ref(this._contentRef)}></div>
                </div>`
              : nothing}
          <div class="message-footer">
            ${timestamp && !streaming
              ? html`<div class="timestamp">${this._formatTimestamp(timestamp)}</div>`
              : nothing}
            ${role === 'assistant' && !streaming && this._duration !== null
              ? html`<div class="duration">${this._formatDuration(this._duration)}</div>`
              : nothing}
            ${this.actionsHtml && role === 'assistant' && !streaming
              ? html`<div class="message-actions" @click=${this._handleActionClick}>
                  ${unsafeHTML(this.actionsHtml)}
                </div>`
              : nothing}
          </div>
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
