import { LitElement, html, nothing } from 'lit';
import { customElement, property, query } from 'lit/decorators.js';
import { setVersionAttribute } from '../version.js';
import type { TextPart } from '../types.js';
import { renderMarkdownInto, type RenderMarkdownIntoOptions } from '../renderers/markdown-morph.js';
import { renderMarkdownLight, type MarkdownRenderOptions } from '../renderers/markdown-renderer.js';

@customElement('i-chat-text-part')
export class ChatTextPart extends LitElement {
  @property({ attribute: false }) data?: TextPart;
  @property() content = '';
  @property({ type: Boolean }) animating = false;
  @property({ attribute: false }) allowedLinkProtocols?: readonly string[];
  @property({ attribute: false }) highlightJs?: RenderMarkdownIntoOptions['highlightJs'];

  @query('.content') private _contentEl?: HTMLDivElement;
  private _htmlCache = '';

  override connectedCallback(): void {
    super.connectedCallback();
    setVersionAttribute(this);
  }

  protected createRenderRoot(): HTMLElement | DocumentFragment {
    return this;
  }

  override updated(): void {
    const el = this._contentEl;
    if (!el || !this.data) return;

    const markdownOptions: MarkdownRenderOptions = {
      allowedLinkProtocols: this.allowedLinkProtocols,
      highlightJs: this.highlightJs,
    };

    // ── Streaming light mode ──────────────────────────────────────────
    // During streaming every token grows the full text, so morphdom diff
    // has zero reuse value. The light pipeline keeps raw HTML disabled,
    // rejects unsafe URI protocols, and defers untrusted renderer HTML, so it
    // can avoid DOMPurify here. We run markdown-it and set innerHTML directly.
    // Once streaming stops we fall through to the full pipeline below for
    // the clean terminal render.
    if (this.data.status === 'streaming') {
      const html = renderMarkdownLight(this.content, markdownOptions);
      this._htmlCache = html;
      el.innerHTML = html;
      this.dispatchEvent(
        new CustomEvent('chat-text-part-updated', {
          detail: { changed: true },
          bubbles: true,
          composed: true,
        })
      );
      return;
    }

    // ── Full pipeline (terminal) ─────────────────────────────────────
    const result = renderMarkdownInto(el, this.content, {
      previousHtml: this._htmlCache,
      ...markdownOptions,
      partId: this.data?.id,
    });
    this._htmlCache = result.html;
    if (!result.changed) return;

    this.dispatchEvent(
      new CustomEvent('chat-text-part-updated', {
        detail: { changed: true },
        bubbles: true,
        composed: true,
      })
    );
  }

  render() {
    const part = this.data;
    if (!part) return nothing;
    return html`<div class="bubble">
      <div
        class="content ${this.animating ? 'typing-cursor' : ''}"
        data-part-id=${part.id}
        data-part-type=${part.type}
      ></div>
    </div>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'i-chat-text-part': ChatTextPart;
  }
}
