import type MarkdownIt from "markdown-it";
import type { BlockRenderer } from "@bndynet/ichat-messages";
import {
  renderCodeFallback,
  wrapWithCodeToggle,
  escapeHtml,
  type RendererOptions,
} from "@bndynet/ichat-messages";
import {
  DEFAULT_MERMAID_THEME,
  DEFAULT_MERMAID_CONFIG,
  isMermaidThemeName,
  type MermaidThemeName,
  type MermaidThemeOption,
} from "./mermaid-config.js";
import { buildMermaidThemeVariables } from "./mermaid-theme-tokens.js";
import { setVersionAttribute } from "./version.js";

// ── Theme (same contract as chart-renderer — documented in repo README § Host theme contract) ──

function isDarkTheme(): boolean {
  if (typeof document === "undefined") return false;
  const html = document.documentElement;
  if (html.classList.contains("dark")) return true;
  return (html.getAttribute("data-theme") ?? "").includes("dark");
}

let defaultMermaidTheme: MermaidThemeOption = DEFAULT_MERMAID_THEME;

/**
 * Overrides the theme used when a renderer or `<i-chat-mermaid>` does not set
 * `theme` / `data-mm-theme`. Existing diagrams refresh immediately.
 *
 * Use `"base"` to keep the `--chat-mermaid-*` token workflow, or `"auto"`
 * (initial default) to track the host light/dark contract.
 */
export function setDefaultMermaidTheme(theme: MermaidThemeOption): void {
  defaultMermaidTheme = theme;
  if (typeof document !== "undefined") {
    collectAllMermaidHosts().forEach((el) => el.refresh());
  }
}

/** Current default theme (`"auto"` unless changed via `setDefaultMermaidTheme`). */
export function getDefaultMermaidTheme(): MermaidThemeOption {
  return defaultMermaidTheme;
}

function resolveThemeValue(value: MermaidThemeOption): MermaidThemeName {
  if (value === "auto") return isDarkTheme() ? "dark" : "default";
  return value;
}

/** Maps the renderer's `theme` option to a concrete Mermaid theme name. */
function resolveMermaidTheme(
  option: string | null | undefined,
): MermaidThemeName {
  const value = (option ?? "").trim();
  if (value === "auto" || isMermaidThemeName(value)) {
    return resolveThemeValue(value);
  }
  return resolveThemeValue(defaultMermaidTheme);
}

/**
 * `document.querySelectorAll` does not pierce Shadow DOM; chat content lives under
 * `<i-chat-message>` (and similar) shadow roots, so theme observers must walk the tree.
 */
function collectAllMermaidHosts(): ChatMermaid[] {
  const out: ChatMermaid[] = [];

  function walk(root: Document | ShadowRoot): void {
    root.querySelectorAll("i-chat-mermaid").forEach((el) => {
      out.push(el as ChatMermaid);
    });
    root.querySelectorAll("*").forEach((node) => {
      if (node instanceof Element && node.shadowRoot) {
        walk(node.shadowRoot);
      }
    });
  }

  walk(document);
  return out;
}

let themeObserverAttached = false;

function setupMermaidThemeObserver(): void {
  if (
    typeof MutationObserver === "undefined" ||
    typeof document === "undefined"
  )
    return;
  if (themeObserverAttached) return;
  themeObserverAttached = true;
  new MutationObserver(() => {
    collectAllMermaidHosts().forEach((el) => {
      el.refresh();
    });
  }).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme", "class"],
  });
}

// ── <i-chat-mermaid> — async Mermaid via dynamic import ────────────────────────

const MERMAID_STYLES = `
  :host {
    display: block;
    max-width: 100%;
  }
  .mm-wrap {
    overflow: auto;
    max-width: 100%;
    padding: var(--chat-spacing-sm, 8px) 0;
  }
  .mm-wrap svg {
    max-width: 100%;
    height: auto;
  }
`;

let idCounter = 0;

/** Light-DOM node holding raw diagram text (attributes are unsafe for long/multiline Mermaid). */
export const MERMAID_SOURCE_CLASS = "i-chat-mermaid__src";

/** Stable short fingerprint so morphdom / attribute diffs see source changes. */
function fingerprintMermaidCode(code: string): string {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < code.length; i++) {
    h ^= code.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h.toString(36);
}

export class ChatMermaid extends HTMLElement {
  private _renderGen = 0;
  private _srcObserver: MutationObserver | null = null;
  private _mutationFlush = false;

  static get observedAttributes(): string[] {
    return ["data-mm-fp", "data-mm-theme"];
  }

  connectedCallback(): void {
    setVersionAttribute(this);
    setupMermaidThemeObserver();
    this._ensureSourceObserver();
    void this._render();
  }

  disconnectedCallback(): void {
    this._srcObserver?.disconnect();
    this._srcObserver = null;
  }

  attributeChangedCallback(): void {
    if (this.isConnected) void this._render();
  }

  /** Watch <pre> text updates when morphdom patches streaming markdown (connectedCallback does not re-run). */
  private _ensureSourceObserver(): void {
    if (this._srcObserver || typeof MutationObserver === "undefined") return;
    this._srcObserver = new MutationObserver(() =>
      this._scheduleRenderFromDom(),
    );
    this._srcObserver.observe(this, {
      childList: true,
      subtree: true,
      characterData: true,
    });
  }

  private _scheduleRenderFromDom(): void {
    if (this._mutationFlush) return;
    this._mutationFlush = true;
    queueMicrotask(() => {
      this._mutationFlush = false;
      void this._render();
    });
  }

  /** Resolved theme for this element (`data-mm-theme`, else the global default). */
  private _theme(): MermaidThemeName {
    return resolveMermaidTheme(
      this.getAttribute("data-mm-theme") ?? defaultMermaidTheme,
    );
  }

  /** Re-run render (e.g. after theme change). */
  refresh(): void {
    if (this.isConnected) void this._render();
  }

  /** Prefer `<pre class="...">` text; fall back to legacy `data-definition` attribute. */
  private _definitionText(): string {
    const fromPre = this.querySelector(
      `pre.${MERMAID_SOURCE_CLASS}`,
    )?.textContent;
    if (fromPre != null && fromPre.length > 0) return fromPre;
    return this.getAttribute("data-definition") ?? "";
  }

  private async _render(): Promise<void> {
    const gen = ++this._renderGen;
    const def = this._definitionText().trim();

    if (!this.shadowRoot) {
      const shadow = this.attachShadow({ mode: "open" });
      const style = document.createElement("style");
      style.textContent = MERMAID_STYLES;
      const slot = document.createElement("div");
      slot.className = "mm-root";
      shadow.appendChild(style);
      shadow.appendChild(slot);
    }

    const root = this.shadowRoot?.querySelector(".mm-root");
    if (!root) return;

    if (!def) {
      root.replaceChildren();
      return;
    }

    try {
      const mermaid = (await import("mermaid")).default;
      const theme = this._theme();
      mermaid.initialize({
        ...DEFAULT_MERMAID_CONFIG,
        theme,
        // `base` is the only theme designed to be parametrized: feed it the
        // CSS-variable palette. Official themes keep their complete palette
        // (Mermaid merges top-level `darkMode` only via `themeVariables`, and
        // the `dark` theme is already explicit).
        themeVariables:
          theme === "base"
            ? {
                ...DEFAULT_MERMAID_CONFIG.themeVariables,
                ...buildMermaidThemeVariables(this),
              }
            : { ...DEFAULT_MERMAID_CONFIG.themeVariables },
      });

      // `render()` returns an error SVG (e.g. "Syntax error in text") without throwing — validate first.
      const parsed = await mermaid.parse(def, { suppressErrors: true });
      if (parsed === false) {
        if (gen !== this._renderGen) return;
        root.innerHTML = renderCodeFallback("mermaid", this._definitionText());
        return;
      }

      const id = `mm-${++idCounter}-${Math.random().toString(36).slice(2, 9)}`;
      const { svg } = await mermaid.render(id, def);

      if (gen !== this._renderGen) return;

      const wrap = document.createElement("div");
      wrap.className = "mm-wrap";
      wrap.innerHTML = svg;
      root.replaceChildren(wrap);
    } catch {
      if (gen !== this._renderGen) return;
      // Incomplete streaming text or invalid syntax: show source instead of Mermaid error text.
      const source = this._definitionText();
      root.innerHTML = renderCodeFallback("mermaid", source);
    }
  }
}

if (
  typeof customElements !== "undefined" &&
  !customElements.get("i-chat-mermaid")
) {
  customElements.define("i-chat-mermaid", ChatMermaid);
}

// ── Fence renderer (sync HTML only) ─────────────────────────────────────────

function renderMermaidBlock(
  code: string,
  opts: MermaidRendererOptions = {},
): string {
  const trimmed = code.trim();
  if (!trimmed) {
    return renderCodeFallback("mermaid", code);
  }

  // Multiline / long diagrams must not live in an attribute — browsers normalize or truncate.
  const fp = fingerprintMermaidCode(code);
  // Leave the attribute off unless the caller pinned a theme, so
  // `setDefaultMermaidTheme()` also affects elements rendered before the call.
  const themeAttr = opts.theme
    ? ` data-mm-theme="${escapeHtml(opts.theme)}"`
    : "";
  const html = `<i-chat-mermaid data-mm-fp="${escapeHtml(fp)}"${themeAttr}><pre class="${MERMAID_SOURCE_CLASS}" hidden>${escapeHtml(code)}</pre></i-chat-mermaid>`;

  return opts.codeToggle !== false
    ? wrapWithCodeToggle("mermaid", code, html)
    : html;
}

// ── Public API ────────────────────────────────────────────────────────────────

export interface MermaidRendererOptions extends RendererOptions {
  /**
   * Mermaid theme. `auto` follows the host light/dark contract
   * (`<html class="dark">` / `data-theme` containing `dark`); `base` uses the
   * `--chat-mermaid-*` / `--chat-*` tokens; any official name pins that palette.
   *
   * @default undefined — the global default (`"auto"` initially, or whatever
   * `setDefaultMermaidTheme()` last set).
   */
  theme?: MermaidThemeOption;
}

/**
 * Creates a `BlockRenderer` for `mermaid` fenced code blocks.
 *
 * Rendering is **asynchronous** in the browser: the fence outputs `<i-chat-mermaid>`,
 * which loads Mermaid and injects the SVG when connected.
 *
 * @example
 * registry.register(createMermaidRenderer())
 * registry.register(createMermaidRenderer({ codeToggle: false }))
 * registry.register(createMermaidRenderer({ theme: "base" })) // --chat-mermaid-* tokens
 * registry.register(createMermaidRenderer({ theme: "forest" }))
 */
export function createMermaidRenderer(
  options: MermaidRendererOptions = {},
): BlockRenderer {
  return {
    name: "mermaid",
    mode: "trusted",
    trusted: true,
    test: (lang: string) => lang === "mermaid",
    render: (code: string) => renderMermaidBlock(code, options),
  };
}

/** Pre-built renderer with default options (code toggle on). */
export const mermaidRenderer: BlockRenderer = createMermaidRenderer();

/**
 * markdown-it plugin: handles ```mermaid fences (same behaviour as `createMermaidRenderer`).
 */
export function mermaidPlugin(
  mdInstance: MarkdownIt,
  options: MermaidRendererOptions = {},
): void {
  const originalFence =
    mdInstance.renderer.rules.fence ||
    function (tokens, idx, opts, _env, self) {
      return self.renderToken(tokens, idx, opts);
    };

  mdInstance.renderer.rules.fence = (tokens, idx, opts, env, self) => {
    const token = tokens[idx];
    if (token.info.trim() === "mermaid") {
      return renderMermaidBlock(token.content, options);
    }
    return originalFence(tokens, idx, opts, env, self);
  };
}
