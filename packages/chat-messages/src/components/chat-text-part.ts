import { LitElement, html, nothing } from 'lit';
import { customElement, property, query } from 'lit/decorators.js';
import type { TextPart } from '../types.js';
import { renderMarkdownInto } from '../renderers/markdown-morph.js';

@customElement('i-chat-text-part')
export class ChatTextPart extends LitElement {
  @property({ attribute: false }) data?: TextPart;
  @property() content = '';
  @property({ type: Boolean }) animating = false;
  @property({ attribute: false }) allowedLinkProtocols?: readonly string[];

  @query('.content') private _contentEl?: HTMLDivElement;
  private _htmlCache = '';

  protected createRenderRoot(): HTMLElement | DocumentFragment {
    return this;
  }

  override updated(): void {
    const el = this._contentEl;
    if (!el || !this.data) return;

    const result = renderMarkdownInto(el, this.content, {
      previousHtml: this._htmlCache,
      allowedLinkProtocols: this.allowedLinkProtocols,
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
