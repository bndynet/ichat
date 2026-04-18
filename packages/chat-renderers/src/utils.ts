/**
 * Escapes HTML special characters to prevent XSS when inserting raw strings
 * into HTML attributes or text nodes.
 */
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ── Shared renderer options ───────────────────────────────────────────────────

/**
 * Options accepted by all `createXxxRenderer()` factory functions.
 */
export interface RendererOptions {
  /**
   * Overlay a small "view source / view rendered" toggle icon on successfully
   * rendered components (chart, kpi, form, …).
   *
   * Default: `true`.  Set to `false` to hide the icon entirely.
   */
  codeToggle?: boolean;
}

// ── SVG icons for the toggle button ──────────────────────────────────────────

const CODE_ICON = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>`;
const EYE_ICON  = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;

// ── <i-chat-code-toggle> custom element ─────────────────────────────────────────

/** Light-DOM holder for fence source (attributes cannot hold long / multiline code reliably). */
export const CHAT_TOGGLE_SOURCE_CLASS = 'i-chat-toggle__src';

// Theme `--chat-*`: `chat-host-tokens.scss` is `@use`d into chat-messages / chat-message / chat-reasoning styles.

const TOGGLE_STYLES = `
  :host {
    display: block;
    position: relative;
  }

  /* ── Toggle button ──────────────────────────────────────────────────────── */
  .toggle-btn {
    position: absolute;
    top: 6px;
    right: 6px;
    z-index: 10;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    padding: 0;
    border: 1px solid var(--chat-border);
    border-radius: var(--chat-radius-sm);
    background: var(--chat-surface-alt);
    color: var(--chat-text-secondary);
    cursor: pointer;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.15s, background 0.15s, color 0.15s, border-color 0.15s;
  }
  :host(:hover) .toggle-btn,
  :host([data-view="code"]) .toggle-btn {
    opacity: 1;
    pointer-events: auto;
  }
  .toggle-btn:hover {
    background: var(--chat-primary-light);
    border-color: var(--chat-primary);
    color: var(--chat-primary);
  }

  /* ── Code view panel ────────────────────────────────────────────────────── */
  .code-view {
    display: none;
    position: relative;
    box-sizing: border-box;
    overflow-y: auto;
    margin: 0;
    padding: var(--chat-spacing-xs) var(--chat-spacing-sm);
    border-radius: var(--chat-radius-sm);
    background: var(--chat-code-bg);
    border: 1px solid var(--chat-border);
    font-family: var(--chat-font-mono);
    font-size: var(--chat-font-size-sm);
    line-height: 1.6;
    tab-size: 2;
    white-space: pre;
    word-break: break-all;
    box-shadow: var(--chat-shadow-sm);
  }
  .code-view code {
    color: var(--chat-code-text);
    background: transparent;
    padding: 0;
    font-size: inherit;
    font-family: inherit;
  }

  /* ── View toggle via host attribute ──────────────────────────────────────── */
  :host([data-view="code"]) .rendered-view { display: none; }
  :host([data-view="code"]) .code-view     { display: block; }
`;

class ChatCodeToggle extends HTMLElement {
  private _shadowCodeEl: HTMLElement | null = null;
  private _srcObserver: MutationObserver | null = null;
  private _mutationFlush = false;

  connectedCallback(): void {
    if (!this.shadowRoot) {
      this._initShadow();
    }
    this._syncCodeFromLightDom();
    this._ensureSrcObserver();
  }

  disconnectedCallback(): void {
    this._srcObserver?.disconnect();
    this._srcObserver = null;
  }

  private _initShadow(): void {
    const shadow = this.attachShadow({ mode: 'open' });

    // ── Style ──
    const styleEl = document.createElement('style');
    styleEl.textContent = TOGGLE_STYLES;

    const renderedView = document.createElement('div');
    renderedView.className = 'rendered-view';
    renderedView.appendChild(document.createElement('slot'));

    const codeView = document.createElement('pre');
    codeView.className = 'code-view chat-code-fallback';
    const codeEl = document.createElement('code');
    codeView.appendChild(codeEl);
    this._shadowCodeEl = codeEl;

    const btn = document.createElement('button');
    btn.className = 'toggle-btn';
    btn.type = 'button';
    btn.title = 'View source';
    btn.setAttribute('aria-label', 'View source');
    btn.innerHTML = CODE_ICON;

    btn.addEventListener('click', () => {
      const isCode = this.getAttribute('data-view') === 'code';
      if (isCode) {
        codeView.style.height = '';
        this.removeAttribute('data-view');
        btn.title = 'View source';
        btn.setAttribute('aria-label', 'View source');
        btn.innerHTML = CODE_ICON;
      } else {
        // Snapshot the rendered height before hiding it, so the code panel
        // occupies exactly the same space — no layout jump on toggle.
        codeView.style.height = renderedView.offsetHeight + 'px';
        this.setAttribute('data-view', 'code');
        btn.title = 'View rendered';
        btn.setAttribute('aria-label', 'View rendered');
        btn.innerHTML = EYE_ICON;
      }
    });

    shadow.appendChild(styleEl);
    shadow.appendChild(renderedView);
    shadow.appendChild(codeView);
    shadow.appendChild(btn);
  }

  /** Prefer hidden `<pre class="…">`; fall back to legacy `data-code` attribute. */
  private _syncCodeFromLightDom(): void {
    const code =
      this.querySelector(`pre.${CHAT_TOGGLE_SOURCE_CLASS}`)?.textContent ??
      this.getAttribute('data-code') ??
      '';
    if (this._shadowCodeEl) {
      this._shadowCodeEl.textContent = code;
    }
  }

  /** Keep shadow code view in sync when morphdom patches the light-DOM `<pre>` (streaming). */
  private _ensureSrcObserver(): void {
    if (this._srcObserver || typeof MutationObserver === 'undefined') return;
    this._srcObserver = new MutationObserver(() => {
      if (this._mutationFlush) return;
      this._mutationFlush = true;
      queueMicrotask(() => {
        this._mutationFlush = false;
        this._syncCodeFromLightDom();
      });
    });
    this._srcObserver.observe(this, { childList: true, subtree: true, characterData: true });
  }
}

if (!customElements.get('i-chat-code-toggle')) {
  customElements.define('i-chat-code-toggle', ChatCodeToggle);
}

// ── Public helpers ────────────────────────────────────────────────────────────

/**
 * Wraps a successfully rendered HTML string in a `<i-chat-code-toggle>` element.
 * The element overlays a small icon that lets the user switch between the rich
 * rendered view and the raw source code.
 */
export function wrapWithCodeToggle(lang: string, code: string, renderedHtml: string): string {
  // Do not put `code` in a `data-code` attribute — long / multiline values truncate in practice.
  return (
    `<i-chat-code-toggle data-lang="${escapeHtml(lang)}">` +
    `<pre class="${CHAT_TOGGLE_SOURCE_CLASS}" hidden>${escapeHtml(code)}</pre>` +
    `${renderedHtml}` +
    `</i-chat-code-toggle>`
  );
}

/**
 * Renders `code` as a scrollable `<pre><code>` block (max-height 200 px).
 *
 * Used as a graceful fallback when a fence block cannot be parsed — displaying
 * the raw source is more useful to developers than a bare error string.
 *
 * All styles use `var(--chat-*)`. Tokens are defined in `chat-host-tokens.scss`
 * (@bndynet/chat-messages); override on `<i-chat-messages>`, `<i-chat>`, or any ancestor.
 */
export function renderCodeFallback(_lang: string, code: string): string {
  const escaped = escapeHtml(code);

  const preStyle = [
    'position:relative',
    'max-height:200px',
    'overflow-y:auto',
    'margin:0',
    'padding:var(--chat-spacing-xs) var(--chat-spacing-sm)',
    'border-radius:var(--chat-radius-sm)',
    'background:var(--chat-code-bg)',
    'border:1px solid var(--chat-border)',
    'font-family:var(--chat-font-mono)',
    'font-size:var(--chat-font-size-sm)',
    'line-height:1.6',
    'tab-size:2',
    'white-space:pre',
    'word-break:break-all',
    'box-shadow:var(--chat-shadow-sm)',
  ].join(';');

  const codeStyle = [
    'color:var(--chat-code-text)',
    'background:transparent',
    'padding:0',
    'font-size:inherit',
    'font-family:inherit',
  ].join(';');

  return `<pre class="chat-code-fallback" style="${preStyle}"><code style="${codeStyle}">${escaped}</code></pre>`;
}
