import { LitElement, html, nothing } from 'lit';
import { html as staticHtml, unsafeStatic } from 'lit/static-html.js';
import { customElement, property } from 'lit/decorators.js';
import { ref, createRef } from 'lit/directives/ref.js';
import { repeat } from 'lit/directives/repeat.js';
import type {
  ChatFormSubmitDetail,
  ChatMessage,
  ChatPartActionDetail,
  CustomPart,
  MessagePart,
  TodoActionDetail,
  ToolActionDetail,
} from '../types.js';
import type { ChatLabels } from '../i18n.js';
import {
  createFormSubmitDetail,
  createPartActionDetail,
  createTodoActionDetail,
  createToolActionDetail,
} from '../message-events.js';
import { sanitizeHtml } from '../renderers/markdown-renderer.js';
import { partRendererRegistry } from '../renderers/part-registry.js';
import { morphHtmlInto } from '../renderers/dom-morph.js';
import { isAllowedLinkHref } from '../link-protocols.js';
import './chat-reasoning.js';
import './chat-text-part.js';
import './chat-tool-call.js';
import './chat-todo.js';

export interface ChatPartRenderContext {
  message?: ChatMessage;
  parts: MessagePart[];
  streamingTextId?: string | null;
  streamingText: string;
  streamingTextAnimating: boolean;
  speed: number;
  reasoningHeaderHtml: string;
  labels?: ChatLabels;
  allowedLinkProtocols?: readonly string[];
}

/**
 * Routes ordered message body parts to their dedicated renderers.
 *
 * This component renders into light DOM so the parent `i-chat-message` styles
 * keep applying to `.bubble`, `.content`, markdown renderers, and fallback
 * custom-part markup. Built-in text parts own their markdown morphing in
 * `<i-chat-text-part>`; string-mode custom renderers are still morphed here.
 */
@customElement('i-chat-part-host')
export class ChatPartHost extends LitElement {
  @property({ attribute: false }) message?: ChatMessage;
  @property({ attribute: false }) parts: MessagePart[] = [];
  @property({ attribute: false }) streamingTextId: string | null = null;
  @property() streamingText = '';
  @property({ type: Boolean }) streamingTextAnimating = false;
  @property({ type: Number }) speed = 3;
  @property() reasoningHeaderHtml = '';
  @property({ attribute: false }) labels?: ChatLabels;
  @property({ attribute: false }) allowedLinkProtocols?: readonly string[];

  private _customRefs = new Map<string, ReturnType<typeof createRef<HTMLDivElement>>>();
  private _customCache = new Map<string, string>();

  protected createRenderRoot(): HTMLElement | DocumentFragment {
    return this;
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.addEventListener('form-submit', this._onFormSubmit);
    this.addEventListener('todo-action', this._onTodoAction);
    this.addEventListener('tool-action', this._onToolAction);
  }

  override disconnectedCallback(): void {
    this.removeEventListener('form-submit', this._onFormSubmit);
    this.removeEventListener('todo-action', this._onTodoAction);
    this.removeEventListener('tool-action', this._onToolAction);
    super.disconnectedCallback();
  }

  getRenderContext(): ChatPartRenderContext {
    return {
      message: this.message,
      parts: this.parts,
      streamingTextId: this.streamingTextId,
      streamingText: this.streamingText,
      streamingTextAnimating: this.streamingTextAnimating,
      speed: this.speed,
      reasoningHeaderHtml: this.reasoningHeaderHtml,
      labels: this.labels,
      allowedLinkProtocols: this.allowedLinkProtocols,
    };
  }

  private _onFormSubmit = (e: Event): void => {
    if (!this.message) return;
    const ev = e as CustomEvent<Partial<ChatFormSubmitDetail>>;
    if (ev.detail?.messageId != null) return;
    if (!this._isEmbeddedEvent(e, 'I-CHAT-FORM')) return;

    e.stopPropagation();
    if (!ev.detail?.formId || !ev.detail.values) return;
    const detail = createFormSubmitDetail(this.message, {
      formId: ev.detail.formId,
      title: ev.detail.title,
      values: ev.detail.values,
    });
    this._dispatchPartAction(
      createPartActionDetail({
        kind: 'form',
        action: 'submit',
        message: this.message,
        detail,
        part: this._partFromEvent(e),
      })
    );
    // Deprecated compatibility event. Keep until a future major version so
    // existing hosts can migrate to `part-action` incrementally.
    this.dispatchEvent(
      new CustomEvent<ChatFormSubmitDetail>('form-submit', {
        detail,
        bubbles: true,
        composed: true,
      })
    );
  };

  private _onTodoAction = (e: Event): void => {
    if (!this.message) return;
    type RequestDetail = Omit<TodoActionDetail, 'messageId' | 'message'> & {
      messageId?: string;
      message?: ChatMessage;
    };
    const ev = e as CustomEvent<RequestDetail>;
    if (ev.detail?.messageId != null) return;
    if (!this._isEmbeddedEvent(e, 'I-CHAT-TODO')) return;

    e.stopPropagation();
    const detail = createTodoActionDetail(this.message, ev.detail);
    this._dispatchPartAction(
      createPartActionDetail({
        kind: 'todo',
        action: detail.action,
        message: this.message,
        detail,
        part: detail.part,
      })
    );
    // Deprecated compatibility event. Keep until a future major version so
    // existing hosts can migrate to `part-action` incrementally.
    this.dispatchEvent(
      new CustomEvent<TodoActionDetail>('todo-action', {
        detail,
        bubbles: true,
        composed: true,
      })
    );
  };

  private _onToolAction = (e: Event): void => {
    if (!this.message) return;
    type RequestDetail = Omit<ToolActionDetail, 'messageId' | 'message'> & {
      messageId?: string;
      message?: ChatMessage;
    };
    const ev = e as CustomEvent<RequestDetail>;
    if (ev.detail?.messageId != null) return;
    if (!this._isEmbeddedEvent(e, 'I-CHAT-TOOL-CALL')) return;

    e.stopPropagation();
    if (!ev.detail?.part || !ev.detail.toolCallId) return;
    const detail = createToolActionDetail(this.message, ev.detail);
    this._dispatchPartAction(
      createPartActionDetail({
        kind: 'tool-call',
        action: detail.action,
        message: this.message,
        detail,
        part: detail.part,
      })
    );
    // Deprecated compatibility event. Keep until a future major version so
    // existing hosts can migrate to `part-action` incrementally.
    this.dispatchEvent(
      new CustomEvent<ToolActionDetail>('tool-action', {
        detail,
        bubbles: true,
        composed: true,
      })
    );
  };

  private _isEmbeddedEvent(e: Event, tagName: string): boolean {
    const path = e.composedPath();
    return (
      path.includes(this) &&
      path.some((node) => node instanceof HTMLElement && node.tagName === tagName)
    );
  }

  private _partFromEvent(e: Event): MessagePart | undefined {
    for (const node of e.composedPath()) {
      if (node === this) break;
      if (!(node instanceof HTMLElement)) continue;
      const partId = node.dataset.partId;
      if (!partId) continue;
      return (this.parts ?? []).find((part) => part.id === partId);
    }
    return undefined;
  }

  private _dispatchPartAction<TDetail>(detail: ChatPartActionDetail<TDetail>): void {
    this.dispatchEvent(
      new CustomEvent<ChatPartActionDetail<TDetail>>('part-action', {
        detail,
        bubbles: true,
        composed: true,
      })
    );
  }

  private _handleRenderedPartUpdated = (e: CustomEvent<{ changed?: boolean }>): void => {
    e.stopPropagation();
    this.dispatchEvent(
      new CustomEvent('chat-part-host-updated', { bubbles: true, composed: true })
    );
    if (e.detail?.changed && !this.message?.parentId) {
      this.dispatchEvent(
        new CustomEvent('chat-content-resize', { bubbles: true, composed: true })
      );
    }
  };

  private _linkHref(rawHref: string): string | typeof nothing {
    return isAllowedLinkHref(rawHref, this.allowedLinkProtocols) ? rawHref : nothing;
  }

  private _customRef(id: string): ReturnType<typeof createRef<HTMLDivElement>> {
    let r = this._customRefs.get(id);
    if (!r) {
      r = createRef<HTMLDivElement>();
      this._customRefs.set(id, r);
    }
    return r;
  }

  private _renderPart(part: MessagePart) {
    switch (part.type) {
      case 'reasoning':
        return html`<i-chat-reasoning
          data-part-id=${part.id}
          data-part-type=${part.type}
          .content=${part.text}
          .streaming=${part.status === 'streaming'}
          .speed=${this.speed <= 0 ? 0 : Math.max(1, this.speed - 1)}
          .headerHtml=${this.reasoningHeaderHtml}
          .labels=${this.labels?.reasoning}
          .allowedLinkProtocols=${this.allowedLinkProtocols}
          @chat-reasoning-updated=${this._handleRenderedPartUpdated}
        ></i-chat-reasoning>`;
      case 'tool-call':
        return html`<i-chat-tool-call
          data-part-id=${part.id}
          data-part-type=${part.type}
          data-tool-call-id=${part.toolCallId}
          .data=${part}
          .labels=${this.labels?.toolCall}
          .allowedLinkProtocols=${this.allowedLinkProtocols}
        ></i-chat-tool-call>`;
      case 'todo':
        return html`<i-chat-todo
          data-part-id=${part.id}
          data-part-type=${part.type}
          .data=${part}
          .labels=${this.labels?.todo}
        ></i-chat-todo>`;
      case 'file': {
        if (part.mediaType.startsWith('image/')) {
          const src =
            part.url ?? (part.data ? `data:${part.mediaType};base64,${part.data}` : '');
          return src
            ? html`<div class="bubble">
                <img class="part-file-image" src=${src} alt=${part.name ?? 'image'} />
              </div>`
            : nothing;
        }
        const href = part.url ?? '';
        return html`<div class="bubble">
          <a
            class="part-file-link"
            data-part-id=${part.id}
            data-part-type=${part.type}
            href=${this._linkHref(href)}
            target="_blank"
            rel="noopener noreferrer"
            >${part.name ?? href}</a
          >
        </div>`;
      }
      case 'source':
        return html`<div class="bubble">
          <a
            class="part-source"
            data-part-id=${part.id}
            data-part-type=${part.type}
            href=${this._linkHref(part.url)}
            target="_blank"
            rel="noopener noreferrer"
            >${part.title ?? part.url}</a
          >
          ${part.snippet ? html`<div class="part-source-snippet">${part.snippet}</div>` : nothing}
        </div>`;
      case 'text': {
        const animatingHere =
          part.id === this.streamingTextId && this.streamingTextAnimating;
        const content = part.id === this.streamingTextId ? this.streamingText : part.text;
        return html`<i-chat-text-part
          data-part-id=${part.id}
          data-part-type=${part.type}
          .data=${part}
          .content=${content}
          .animating=${animatingHere}
          .allowedLinkProtocols=${this.allowedLinkProtocols}
          @chat-text-part-updated=${this._handleRenderedPartUpdated}
        ></i-chat-text-part>`;
      }
      default: {
        const renderer = partRendererRegistry.getRenderer(part.type);
        if (renderer?.element) {
          const tag = unsafeStatic(renderer.element);
          return staticHtml`<div class="bubble">
            <${tag}
              data-part-id=${part.id}
              data-part-type=${part.type}
              .data=${(part as CustomPart).data}
              .part=${part}
            ></${tag}>
          </div>`;
        }
        if (renderer?.render) {
          return html`<div class="bubble">
            <div
              class="part-custom-host"
              data-part-id=${part.id}
              data-part-type=${part.type}
              ${ref(this._customRef(part.id))}
            ></div>
          </div>`;
        }
        return html`<div class="bubble">
          <pre class="part-custom">${JSON.stringify(part, null, 2)}</pre>
        </div>`;
      }
    }
  }

  override updated(): void {
    let didMorph = false;

    const liveCustomIds = new Set<string>();
    for (const p of this.parts ?? []) {
      if (!p.type.startsWith('x-')) continue;
      const renderer = partRendererRegistry.getRenderer(p.type);
      if (!renderer || renderer.element || !renderer.render) continue;
      liveCustomIds.add(p.id);
      const el = this._customRefs.get(p.id)?.value;
      if (!el) continue;
      const newHtml = sanitizeHtml(renderer.render(p as CustomPart), {
        allowedLinkProtocols: this.allowedLinkProtocols,
      });
      if (newHtml === this._customCache.get(p.id)) continue;
      morphHtmlInto(el, newHtml);
      this._customCache.set(p.id, newHtml);
      didMorph = true;
    }

    for (const id of [...this._customCache.keys()]) {
      if (!liveCustomIds.has(id)) {
        this._customCache.delete(id);
        this._customRefs.delete(id);
      }
    }

    this.dispatchEvent(
      new CustomEvent('chat-part-host-updated', { bubbles: true, composed: true })
    );

    if (didMorph && !this.message?.parentId) {
      this.dispatchEvent(
        new CustomEvent('chat-content-resize', { bubbles: true, composed: true })
      );
    }
  }

  render() {
    return html`${repeat(
      this.parts ?? [],
      (p) => p.id,
      (p) => this._renderPart(p)
    )}`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'i-chat-part-host': ChatPartHost;
  }
}
