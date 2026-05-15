import { LitElement, html, css, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import type { MessagePart, ToolCallPart, ToolCallState } from '../types.js';
import type { ToolCallLabels } from '../i18n.js';
import { CHAT_LABELS_EN } from '../i18n.js';
import { renderMarkdown } from '../renderers/markdown-renderer.js';

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
  static styles = css`
    :host {
      display: block;
      font-family: var(--chat-font-family, inherit);
      --_tc-bg: var(--chat-tool-bg, var(--chat-surface-alt, #f0f2f5));
      --_tc-border: var(--chat-tool-border, var(--chat-border, #e5e7eb));
      --_tc-text: var(--chat-tool-text, var(--chat-text, #1a1a2e));
      --_tc-secondary: var(--chat-tool-secondary, var(--chat-text-secondary, #6b7280));
      --_tc-primary: var(--chat-tool-primary, var(--chat-primary, #2563eb));
      --_tc-success: var(--chat-tool-success, var(--chat-success, #10b981));
      --_tc-error: var(--chat-tool-error, var(--chat-error, #ef4444));
      --_tc-code-bg: var(--chat-code-bg, #1e1e2e);
      --_tc-code-text: var(--chat-code-text, #cdd6f4);
    }
    .tc {
      border: 1px solid var(--_tc-border);
      border-radius: var(--chat-radius, 12px);
      background: var(--_tc-bg);
      margin: 6px 0;
      max-width: 560px;
      overflow: hidden;
      transition: border-color 0.25s;
    }
    .tc--success {
      border-color: color-mix(in srgb, var(--_tc-success) 55%, var(--_tc-border));
    }
    .tc--error {
      border-color: color-mix(in srgb, var(--_tc-error) 55%, var(--_tc-border));
    }
    .tc--running {
      border-color: color-mix(in srgb, var(--_tc-primary) 55%, var(--_tc-border));
    }
    summary {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 9px 12px;
      cursor: pointer;
      list-style: none;
      font-size: var(--chat-font-size-sm, 0.8125rem);
      font-weight: 600;
      color: var(--_tc-text);
      user-select: none;
    }
    summary::-webkit-details-marker {
      display: none;
    }
    .tc__icon {
      width: 18px;
      height: 18px;
      flex-shrink: 0;
      border-radius: 50%;
      display: grid;
      place-items: center;
      color: #fff;
      font-size: 11px;
    }
    .tc__icon--pending {
      background: var(--_tc-secondary);
    }
    .tc__icon--running {
      background: var(--_tc-primary);
    }
    .tc__icon--success {
      background: var(--_tc-success);
    }
    .tc__icon--error {
      background: var(--_tc-error);
    }
    .tc__icon svg {
      width: 11px;
      height: 11px;
    }
    .spin {
      animation: tc-spin 0.9s linear infinite;
    }
    @keyframes tc-spin {
      to {
        transform: rotate(360deg);
      }
    }
    .tc__name {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .tc__state {
      margin-inline-start: auto;
      font-weight: 400;
      font-size: var(--chat-font-size-sm, 0.8125rem);
      color: var(--_tc-secondary);
      flex-shrink: 0;
    }
    .tc__chevron {
      flex-shrink: 0;
      color: var(--_tc-secondary);
      transition: transform 0.2s;
    }
    details[open] .tc__chevron {
      transform: rotate(180deg);
    }
    .tc__body {
      padding: 0 12px 12px;
      font-size: var(--chat-font-size-sm, 0.8125rem);
      color: var(--_tc-text);
    }
    .tc__section {
      margin: 10px 0 4px;
      font-size: 0.7rem;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      color: var(--_tc-secondary);
    }
    pre.tc__code {
      margin: 0;
      background: var(--_tc-code-bg);
      color: var(--_tc-code-text);
      padding: 10px 12px;
      border-radius: 8px;
      overflow: auto;
      font-family: var(--chat-font-mono, ui-monospace, SFMono-Regular, Menlo, monospace);
      font-size: 0.78rem;
      line-height: 1.5;
      white-space: pre-wrap;
      word-break: break-word;
    }
    .tc__error {
      margin-top: 8px;
      color: var(--_tc-error);
    }
    .tc__result-parts > * + * {
      margin-top: 8px;
    }
    .tc__result-parts img {
      max-width: 100%;
      border-radius: 8px;
    }
    .tc__approval {
      display: flex;
      gap: 8px;
      margin-top: 12px;
    }
    .tc__btn {
      font: inherit;
      font-size: 0.8rem;
      font-weight: 600;
      border-radius: 6px;
      padding: 6px 14px;
      cursor: pointer;
      border: 1px solid var(--_tc-border);
      background: var(--chat-surface, #fff);
      color: var(--_tc-text);
      transition: opacity 0.15s, background 0.15s;
    }
    .tc__btn:hover {
      opacity: 0.85;
    }
    .tc__btn--approve {
      background: var(--_tc-primary);
      border-color: var(--_tc-primary);
      color: #fff;
    }
    .tc__approval-state {
      margin-top: 10px;
      font-size: 0.78rem;
      color: var(--_tc-secondary);
    }
  `;

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
