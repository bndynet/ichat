import { LitElement, html, unsafeCSS, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import type { MessagePart, ToolCallPart, ToolCallState } from '../types.js';
import type { ToolCallLabels } from '../i18n.js';
import { CHAT_LABELS_EN } from '../i18n.js';
import { renderMarkdown } from '../renderers/markdown-renderer.js';
import { isAllowedLinkHref } from '../link-protocols.js';
import { chatIcons } from '../icons.js';
import styles from '../styles/chat-tool-call.scss';

/** Map the tool-call state to a coarse visual status used for theming. */
function statusOf(state: ToolCallState): 'pending' | 'running' | 'success' | 'error' {
  switch (state) {
    case 'output-available':
      return 'success';
    case 'output-error':
      return 'error';
    case 'executing':
    case 'input-streaming':
      return 'running';
    case 'input-available':
    default:
      return 'pending';
  }
}

function stateLabel(state: ToolCallState, labels: ToolCallLabels): string {
  switch (state) {
    case 'input-streaming':
      return labels.preparing;
    case 'input-available':
      return labels.ready;
    case 'executing':
      return labels.running;
    case 'output-available':
      return labels.success;
    case 'output-error':
      return labels.error;
    default:
      return state;
  }
}

function pretty(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

/**
 * `<i-chat-tool-call>` — renders a single {@link ToolCallPart} as a collapsible
 * card (tool name + status + collapsible arguments / result). Driven by the
 * `.data` property (an object, not an attribute) so it updates in place without
 * re-serialisation and preserves its expanded state across streaming updates.
 *
 * @fires part-action - Preferred unified action event (`kind: 'tool-call'`).
 * @fires tool-action - Deprecated compatibility event from the human-in-the-loop
 *        buttons. The owning `i-chat-part-host` enriches it with `messageId` /
 *        `message` and also emits `part-action`. Keep until a future major
 *        version so hosts can migrate incrementally.
 */
@customElement('i-chat-tool-call')
export class ChatToolCall extends LitElement {
  static styles = unsafeCSS(styles);

  /** The tool-call part to render. */
  @property({ attribute: false }) data!: ToolCallPart;

  /** Localized tool-call strings; falls back to English when omitted. */
  @property({ attribute: false }) labels?: ToolCallLabels;
  @property({ attribute: false }) allowedLinkProtocols?: readonly string[];

  private _linkHref(rawHref: string): string | typeof nothing {
    return isAllowedLinkHref(rawHref, this.allowedLinkProtocols) ? rawHref : nothing;
  }

  private _emit(action: 'approve' | 'reject'): void {
    this.dispatchEvent(
      new CustomEvent('tool-action', {
        detail: { action, toolCallId: this.data?.toolCallId, part: this.data },
        bubbles: true,
        composed: true,
      })
    );
  }

  private _renderIcon(status: 'pending' | 'running' | 'success' | 'error') {
    if (status === 'running') {
      return html`<span class="tc__icon tc__icon--running">${chatIcons.spinner({ className: 'spin' })}</span>`;
    }
    if (status === 'success') {
      return html`<span class="tc__icon tc__icon--success">${chatIcons.check()}</span>`;
    }
    if (status === 'error') {
      return html`<span class="tc__icon tc__icon--error">${chatIcons.x()}</span>`;
    }
    return html`<span class="tc__icon tc__icon--pending">${chatIcons.circle()}</span>`;
  }

  private _renderResultPart(part: MessagePart) {
    if (part.type === 'text') {
      return html`<div>${unsafeHTML(renderMarkdown(part.text, {
        allowedLinkProtocols: this.allowedLinkProtocols,
      }))}</div>`;
    }
    if (part.type === 'file' && part.mediaType.startsWith('image/')) {
      const src = part.url ?? (part.data ? `data:${part.mediaType};base64,${part.data}` : '');
      return src ? html`<img src=${src} alt=${part.name ?? 'result image'} />` : nothing;
    }
    if (part.type === 'source') {
      return html`<a
        href=${this._linkHref(part.url)}
        target="_blank"
        rel="noopener noreferrer"
        >${part.title ?? part.url}</a
      >`;
    }
    return html`<pre class="tc__code">${pretty((part as { data?: unknown }).data ?? part)}</pre>`;
  }

  render() {
    const tc = this.data;
    if (!tc) return nothing;

    const labels = this.labels ?? CHAT_LABELS_EN.toolCall;
    const status = statusOf(tc.state);
    const name = tc.title ?? tc.toolName;
    const open = status === 'running' || tc.approval === 'required';
    const hasArgs = tc.args !== undefined && tc.args !== null && pretty(tc.args).trim() !== '';
    const hasResult =
      (tc.resultParts && tc.resultParts.length > 0) ||
      (tc.result !== undefined && tc.result !== null && pretty(tc.result).trim() !== '');

    return html`
      <details class="tc tc--${status}" ?open=${open}>
        <summary>
          ${this._renderIcon(status)}
          <span class="tc__name">${name}</span>
          <span class="tc__state">
            ${stateLabel(tc.state, labels)}${tc.durationMs != null ? ` · ${formatDuration(tc.durationMs)}` : ''}
          </span>
          <span class="tc__chevron">
            ${chatIcons.chevronDown({ size: 14, strokeWidth: 2.4 })}
          </span>
        </summary>
        <div class="tc__body">
          ${hasArgs
            ? html`<div class="tc__section">${labels.argumentsSection}</div>
                <pre class="tc__code">${pretty(tc.args)}</pre>`
            : nothing}
          ${tc.error
            ? html`<div class="tc__section">${labels.errorSection}</div>
                <div class="tc__error">${tc.error}</div>`
            : nothing}
          ${hasResult
            ? html`<div class="tc__section">${labels.resultSection}</div>
                ${tc.resultParts && tc.resultParts.length > 0
                  ? html`<div class="tc__result-parts">
                      ${tc.resultParts.map((p) => this._renderResultPart(p))}
                    </div>`
                  : html`<pre class="tc__code">${pretty(tc.result)}</pre>`}`
            : nothing}
          ${tc.approval === 'required'
            ? html`<div class="tc__approval">
                <button class="tc__btn tc__btn--approve" @click=${() => this._emit('approve')}>
                  ${labels.approve}
                </button>
                <button class="tc__btn" @click=${() => this._emit('reject')}>${labels.reject}</button>
              </div>`
            : nothing}
          ${tc.approval === 'approved'
            ? html`<div class="tc__approval-state">${chatIcons.check({ className: 'tc__approval-icon', size: 14 })} ${labels.approved}</div>`
            : nothing}
          ${tc.approval === 'rejected'
            ? html`<div class="tc__approval-state">${chatIcons.x({ className: 'tc__approval-icon', size: 14 })} ${labels.rejected}</div>`
            : nothing}
        </div>
      </details>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'i-chat-tool-call': ChatToolCall;
  }
}
