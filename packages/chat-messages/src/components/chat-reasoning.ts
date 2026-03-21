import { LitElement, html, unsafeCSS, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import { renderMarkdown } from '../renderers/markdown-renderer.js';
import { StreamingController } from '../controllers/streaming-controller.js';
import styles from '../styles/chat-reasoning.scss';
import { chatDetailsStyles } from '../styles/chat-details-result.js';

@customElement('chat-reasoning')
export class ChatReasoning extends LitElement {
  static styles = [unsafeCSS(styles), chatDetailsStyles];

  @property() content = '';
  @property({ type: Boolean }) streaming = false;
  @property({ type: Number }) speed = 2;
  @property() headerHtml = '';
  @state() private _expanded = false;
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
    const hasContent = displayed.trim().length > 0;
    // While streaming: always show the thinking body. After reply completes: collapsed until user expands.
    const bodyOpen = this.streaming || this._expanded;

    return html`
      <div class="reasoning">
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
            : html`<span class="reasoning-icon">💭</span>
              <span class="reasoning-title">
                ${isThinking ? 'Thinking...' : 'Reasoning'}
                ${isThinking
                  ? html`<span class="reasoning-thinking">
                      <span class="dot"></span>
                      <span class="dot"></span>
                      <span class="dot"></span>
                    </span>`
                  : nothing}
              </span>`}
          <span class="reasoning-chevron ${bodyOpen ? 'expanded' : ''}">
            <svg viewBox="0 0 24 24"><path d="M7 10l5 5 5-5z"/></svg>
          </span>
        </div>
        <div class="reasoning-content ${bodyOpen ? 'open' : ''}">
          <div class="reasoning-body">
            ${hasContent ? unsafeHTML(renderMarkdown(displayed)) : ''}
          </div>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'chat-reasoning': ChatReasoning;
  }
}
