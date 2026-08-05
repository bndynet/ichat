import { LitElement, html, nothing } from 'lit';
import { customElement, property, query } from 'lit/decorators.js';
import { setVersionAttribute } from '../version.js';
import type { RendererErrorDetail, TextPart } from '../types.js';
import { renderMarkdownInto, type RenderMarkdownIntoOptions } from '../renderers/markdown-morph.js';
import {
  renderMarkdownLight,
  resolveAsyncBlocks,
  type MarkdownRenderOptions,
} from '../renderers/markdown-renderer.js';
import { streamingRenderDelayMs } from '../streaming-render-policy.js';

@customElement('i-chat-text-part')
export class ChatTextPart extends LitElement {
  @property({ attribute: false }) data?: TextPart;
  @property() content = '';
  @property({ type: Boolean }) animating = false;
  @property({ attribute: false }) allowedLinkProtocols?: readonly string[];
  @property({ attribute: false }) highlightJs?: RenderMarkdownIntoOptions['highlightJs'];

  @query('.content') private _contentEl?: HTMLDivElement;
  private _htmlCache = '';
  /**
   * `_htmlCache` holds a streaming light render, which covers only the text
   * revealed so far. It must not be reused as the terminal render baseline.
   */
  private _htmlCacheIsPartial = false;
  private _streamingPartId?: string;
  private _lastStreamingRenderAt = Number.NEGATIVE_INFINITY;
  private _streamingRenderTimer?: number;
  private _asyncRendererController?: AbortController;

  override connectedCallback(): void {
    super.connectedCallback();
    setVersionAttribute(this);
  }

  override disconnectedCallback(): void {
    this._clearStreamingRenderTimer();
    this._cancelAsyncRender();
    super.disconnectedCallback();
  }

  protected createRenderRoot(): HTMLElement | DocumentFragment {
    return this;
  }

  override updated(): void {
    const el = this._contentEl;
    if (!el || !this.data) return;

    const partId = this.data.id;
    const markdownOptions: MarkdownRenderOptions = {
      allowedLinkProtocols: this.allowedLinkProtocols,
      highlightJs: this.highlightJs,
      onRendererError: (detail) => this._dispatchRendererError({ ...detail, partId }),
    };

    // ── Streaming light mode ──────────────────────────────────────────
    // During streaming every token grows the full text, so morphdom diff
    // has zero reuse value. The light pipeline keeps raw HTML disabled,
    // rejects unsafe URI protocols, and defers untrusted renderer HTML, so it
    // can avoid DOMPurify here. We run markdown-it and set innerHTML directly.
    // Once streaming stops we fall through to the full pipeline below for
    // the clean terminal render.
    if (this.data.status === 'streaming') {
      this._cancelAsyncRender();
      if (this._streamingPartId !== this.data.id) {
        this._resetStreamingRenderSchedule(this.data.id);
      }

      const now = performance.now();
      const delay = streamingRenderDelayMs(this.content.length, now, this._lastStreamingRenderAt);
      if (delay > 0) {
        this._scheduleStreamingRender(delay);
        return;
      }

      this._clearStreamingRenderTimer();
      this._lastStreamingRenderAt = now;
      const html = renderMarkdownLight(this.content, markdownOptions);
      this._htmlCache = html;
      this._htmlCacheIsPartial = true;
      el.innerHTML = html;
      this.dispatchEvent(
        new CustomEvent('chat-text-part-updated', {
          detail: { changed: true },
          bubbles: true,
          composed: true,
        }),
      );
      return;
    }

    // ── Full pipeline (terminal) ─────────────────────────────────────
    this._resetStreamingRenderSchedule();
    const candidateController = new AbortController();
    let result: ReturnType<typeof renderMarkdownInto>;
    try {
      result = renderMarkdownInto(el, this.content, {
        previousHtml: this._htmlCacheIsPartial ? '' : this._htmlCache,
        ...markdownOptions,
        rendererSignal: candidateController.signal,
        partId,
      });
    } catch (error) {
      candidateController.abort();
      throw error;
    }
    this._htmlCache = result.html;
    this._htmlCacheIsPartial = false;
    if (result.rendered) {
      this._asyncRendererController?.abort();
      this._asyncRendererController = candidateController;
      void this._resolveAsyncRenderers(el, candidateController);
    } else {
      candidateController.abort();
    }

    if (!result.changed) return;

    this.dispatchEvent(
      new CustomEvent('chat-text-part-updated', {
        detail: { changed: true },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private _scheduleStreamingRender(delay: number): void {
    if (this._streamingRenderTimer !== undefined) return;
    this._streamingRenderTimer = window.setTimeout(() => {
      this._streamingRenderTimer = undefined;
      if (this.isConnected && this.data?.status === 'streaming') {
        this.requestUpdate();
      }
    }, Math.ceil(delay));
  }

  private _clearStreamingRenderTimer(): void {
    if (this._streamingRenderTimer === undefined) return;
    window.clearTimeout(this._streamingRenderTimer);
    this._streamingRenderTimer = undefined;
  }

  private _resetStreamingRenderSchedule(partId?: string): void {
    this._clearStreamingRenderTimer();
    this._streamingPartId = partId;
    this._lastStreamingRenderAt = Number.NEGATIVE_INFINITY;
  }

  private _cancelAsyncRender(): void {
    this._asyncRendererController?.abort();
    this._asyncRendererController = undefined;
  }

  private async _resolveAsyncRenderers(
    el: HTMLDivElement,
    controller: AbortController,
  ): Promise<void> {
    const result = await resolveAsyncBlocks(el, { signal: controller.signal });
    if (
      controller.signal.aborted ||
      this._asyncRendererController !== controller ||
      !this.isConnected ||
      this._contentEl !== el
    ) {
      return;
    }
    this._asyncRendererController = undefined;
    if (!result.changed) return;

    this._htmlCache = el.innerHTML;
    this.dispatchEvent(
      new CustomEvent('chat-text-part-updated', {
        detail: { changed: true },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private _dispatchRendererError(detail: RendererErrorDetail): void {
    this.dispatchEvent(
      new CustomEvent<RendererErrorDetail>('chat-renderer-error', {
        detail,
        bubbles: true,
        composed: true,
      }),
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
