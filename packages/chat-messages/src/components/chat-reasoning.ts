import { LitElement, html, unsafeCSS, nothing } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import { setVersionAttribute } from '../version.js';
import type { ReasoningLabels } from '../i18n.js';
import { CHAT_LABELS_EN } from '../i18n.js';
import { renderMarkdownInto } from '../renderers/markdown-morph.js';
import { StreamingController } from '../controllers/streaming-controller.js';
import { chatIcons } from '../icons.js';
import styles from '../styles/chat-reasoning.scss';
import { chatDetailsStyles } from '../styles/chat-details-result.js';
import './chat-dots.js';
import { injectPluginCss } from '../renderers/extension-styles.js';

@customElement('i-chat-reasoning')
export class ChatReasoning extends LitElement {
  static styles = [unsafeCSS(styles), chatDetailsStyles];

  @property() content = '';
  @property({ type: Boolean }) streaming = false;
  @property({ type: Number }) speed = 2;
  @property() headerHtml = '';
  @property({ attribute: false }) allowedLinkProtocols?: readonly string[];
  /** Localized header strings; falls back to English when omitted. */
  @property({ attribute: false }) labels?: ReasoningLabels;

  private _extCleanup?: () => void;

  override connectedCallback(): void {
    super.connectedCallback();
    setVersionAttribute(this);
    this._extCleanup = injectPluginCss(this.shadowRoot!);
  }

  override disconnectedCallback(): void {
    this._extCleanup?.();
    super.disconnectedCallback();
  }

  @state() private _expanded = false;
  @query('.reasoning-body') private _bodyEl?: HTMLDivElement;
  private _bodyHtmlCache = '';
  /** Tracks last render’s streaming flag so we can detect true→false without relying on changed.get quirks. */
  private _prevStreaming = false;

  private _streamCtrl = new StreamingController(this, {
    speed: this.speed,
    onComplete: () => this.requestUpdate(),
  });

  willUpdate(changed: Map<string, unknown>): void {
    // Reply finished: collapse reasoning so the answer bubble gets focus (expand again via header click).
    if (this._prevStreaming && this.streaming === false) {
      this._expanded = false;
    }

    if (changed.has('content') || changed.has('streaming')) {
      this._streamCtrl.setContent(this.content, this.streaming);
    }
    if (changed.has('speed')) {
      this._streamCtrl.setSpeed(this.speed);
    }

    this._prevStreaming = !!this.streaming;
  }

  override updated(): void {
    const el = this._bodyEl;
    if (!el) return;

    const result = renderMarkdownInto(el, this._streamCtrl.displayedContent, {
      previousHtml: this._bodyHtmlCache,
      allowedLinkProtocols: this.allowedLinkProtocols,
    });
    this._bodyHtmlCache = result.html;
    if (!result.changed) return;

    this.dispatchEvent(
      new CustomEvent('chat-reasoning-updated', {
        detail: { changed: true },
        bubbles: true,
        composed: true,
      })
    );
  }

  private _toggle(): void {
    this._expanded = !this._expanded;
    this.dispatchEvent(
      new CustomEvent('reasoning-toggle', {
        detail: { expanded: this._expanded },
        bubbles: true,
        composed: true,
      })
    );
  }

  private _onHeaderKeydown(e: KeyboardEvent): void {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      this._toggle();
    }
  }

  render() {
    const displayed = this._streamCtrl.displayedContent;
    // Show "Thinking..." + dots while streaming and either the typewriter is running,
    // or reasoning text has not appeared yet (empty buffer but tags may already be open upstream).
    const isThinking =
      this.streaming &&
      (this._streamCtrl.isAnimating || displayed.trim().length === 0);
    // While streaming: always show the thinking body. After reply completes: collapsed until user expands.
    const bodyOpen = this.streaming || this._expanded;

    return html`
      <div class="reasoning ${this.streaming ? 'is-streaming' : 'is-complete'} ${bodyOpen ? 'is-open' : 'is-collapsed'}">
        <div
          class="reasoning-header"
          role="button"
          tabindex="0"
          aria-expanded=${bodyOpen}
          @click=${this._toggle}
          @keydown=${this._onHeaderKeydown}
        >
          ${this.headerHtml
            ? html`<span class="reasoning-header-custom ${isThinking ? 'is-thinking' : ''}">${unsafeHTML(this.headerHtml)}</span>`
            : html`<span class="reasoning-icon">${chatIcons.lightbulb({ size: 16, strokeWidth: 2 })}</span>
              <span class="reasoning-title">
                ${isThinking
                  ? (this.labels?.thinking ?? CHAT_LABELS_EN.reasoning.thinking)
                  : (this.labels?.reasoning ?? CHAT_LABELS_EN.reasoning.reasoning)}
                ${isThinking
                  ? html`<i-chat-dots
                      style="--chat-dots-color:var(--chat-reasoning-accent,var(--chat-primary,#1a73e8))"
                      label=${this.labels?.thinking ?? CHAT_LABELS_EN.reasoning.thinking}
                    ></i-chat-dots>`
                  : nothing}
              </span>`}
          <span class="reasoning-chevron ${bodyOpen ? 'expanded' : ''}">
            ${chatIcons.chevronDown({ size: 16, strokeWidth: 2.4 })}
          </span>
        </div>
        <div class="reasoning-content ${bodyOpen ? 'open' : ''}">
          <div class="reasoning-body"></div>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'i-chat-reasoning': ChatReasoning;
  }
}
