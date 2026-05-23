import { LitElement, html, unsafeCSS, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import type { MessagePart, ToolCallPart, ToolCallState } from '../types.js';
import type { ToolCallLabels } from '../i18n.js';
import { CHAT_LABELS_EN } from '../i18n.js';
import { renderMarkdown } from '../renderers/markdown-renderer.js';
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
 * @fires tool-action - `{ action: 'approve' | 'reject', toolCallId, part }` from
 *        the human-in-the-loop buttons (shown when `data.approval === 'required'`).
 */
@customElement('i-chat-tool-call')
export class ChatToolCall extends LitElement {
  static styles = unsafeCSS(styles);

  /** The tool-call part to render. */
  @property({ attribute: false }) data!: ToolCallPart;

  /** Localized tool-call strings; falls back to English when omitted. */
  @property({ attribute: false }) labels?: ToolCallLabels;

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
      return html`<span class="tc__icon tc__icon--running"
        ><svg class="spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round">
          <path d="M12 3a9 9 0 1 0 9 9" /></svg
      ></span>`;
    }
    if (status === 'success') {
      return html`<span class="tc__icon tc__icon--success"
        ><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="20 6 9 17 4 12" /></svg
      ></span>`;
    }
    if (status === 'error') {
      return html`<span class="tc__icon tc__icon--error"
        ><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round">
          <path d="M6 6l12 12M18 6L6 18" /></svg
      ></span>`;
    }
    return html`<span class="tc__icon tc__icon--pending"
      ><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round">
        <circle cx="12" cy="12" r="8" /></svg
    ></span>`;
  }

  private _renderResultPart(part: MessagePart) {
    if (part.type === 'text') {
      return html`<div>${unsafeHTML(renderMarkdown(part.text))}</div>`;
    }
    if (part.type === 'file' && part.mediaType.startsWith('image/')) {
      const src = part.url ?? (part.data ? `data:${part.mediaType};base64,${part.data}` : '');
      return src ? html`<img src=${src} alt=${part.name ?? 'result image'} />` : nothing;
    }
    if (part.type === 'source') {
      return html`<a href=${part.url} target="_blank" rel="noopener noreferrer"
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
            <svg viewBox="0 0 24 24" width="14" height="14"><path d="M7 10l5 5 5-5z" fill="currentColor" /></svg>
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
            ? html`<div class="tc__approval-state">✓ ${labels.approved}</div>`
            : nothing}
          ${tc.approval === 'rejected'
            ? html`<div class="tc__approval-state">✗ ${labels.rejected}</div>`
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
