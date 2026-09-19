import { LitElement, html, unsafeCSS, type PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { repeat } from "lit/directives/repeat.js";
import type {
  ChatMessage,
  VisibleMessageChangeDetail,
} from "@bndynet/ichat-messages";
import { getMessageText } from "@bndynet/ichat-messages";
import { setVersionAttribute } from "../version.js";
import styles from "../styles/chat-bookmarks.scss";

/**
 * Minimal surface required from the connected chat/list element.
 *
 * Both `<i-chat>` and `<i-chat-messages>` satisfy this, so `<i-chat-bookmarks>`
 * can target either — or any host-provided wrapper exposing the same shape.
 */
export interface BookmarkSource {
  readonly messages: ChatMessage[];
  scrollToMessage(id: string): boolean;
  /**
   * Optional: when present, the rail subscribes to `messages-change` for
   * automatic sync. `<i-chat>` / `<i-chat-messages>` provide these.
   */
  addEventListener?(type: string, listener: (event: Event) => void): void;
  removeEventListener?(type: string, listener: (event: Event) => void): void;
}

const GENERATING_LABEL = "Generating…";
const RAIL_ARIA_LABEL = "Message bookmarks";
const PREVIEW_MAX = 200;
const ARIA_MAX = 80;

/**
 * Floating bookmark rail: renders one short bar per `bookmark`-marked message
 * of a connected chat. Hover to preview, click to jump.
 *
 * It is a **standalone** Web Component — place it anywhere in your layout
 * (native HTML, React, Angular, Vue, …). Connect it to the chat with the
 * `for` attribute (by element id) or the `.source` property (element reference).
 *
 * @example
 * ```html
 * <i-chat id="chat-1"></i-chat>
 * <i-chat-bookmarks for="chat-1"></i-chat-bookmarks>
 * ```
 */
@customElement("i-chat-bookmarks")
export class ChatBookmarks extends LitElement {
  static styles = unsafeCSS(styles);

  /** Id of the source `<i-chat>` / `<i-chat-messages>` element (attribute `for`). */
  @property({ attribute: "for" }) for = "";

  /** Direct reference to the source element. Takes precedence over `for`. */
  @property({ type: Object }) source?: BookmarkSource;

  @state() private _bookmarks: ChatMessage[] = [];
  @state() private _visibleMessageId = "";
  @state() private _lastVisibleMessageId = "";
  /** Last bookmark the user clicked; highlighted while its message is in view. */
  @state() private _selectedId = "";
  @state() private _tip: { text: string; top: number; left: number } | null =
    null;

  private _listeningSource?: BookmarkSource;

  override connectedCallback(): void {
    super.connectedCallback();
    setVersionAttribute(this);
    this._attach();
    this._sync();
  }

  override disconnectedCallback(): void {
    this._detach();
    super.disconnectedCallback();
  }

  protected override willUpdate(changed: PropertyValues<this>): void {
    if (changed.has("source") || changed.has("for")) {
      this._attach();
      this._sync();
    }
  }

  /**
   * Re-read messages from the connected source. Use this after a **direct**
   * `chat.messages = […]` assignment, which (by design) does not emit the
   * `messages-change` event the rail otherwise listens to. Also re-resolves
   * `for` in case the source element mounted after this one.
   */
  refresh(): void {
    this._attach();
    this._sync();
  }

  private _effectiveSource(): BookmarkSource | null {
    if (this.source) return this.source;
    return this._resolveById();
  }

  private _resolveById(): BookmarkSource | null {
    const id = (this.for || "").trim();
    if (!id) return null;
    const root = this.getRootNode();
    const fromRoot =
      root instanceof Document || root instanceof ShadowRoot
        ? root.getElementById(id)
        : null;
    const el = fromRoot ?? document.getElementById(id);
    return (el as BookmarkSource | null) ?? null;
  }

  private _attach(): void {
    const src = this._effectiveSource();
    if (src === this._listeningSource) return;
    this._detach();
    if (src && typeof src.addEventListener === "function") {
      this._listeningSource = src;
      src.addEventListener("messages-change", this._onMessagesChange);
      src.addEventListener(
        "visible-message-change",
        this._onVisibleMessageChange,
      );
    }
  }

  private _detach(): void {
    if (
      this._listeningSource &&
      typeof this._listeningSource.removeEventListener === "function"
    ) {
      this._listeningSource.removeEventListener(
        "messages-change",
        this._onMessagesChange,
      );
      this._listeningSource.removeEventListener(
        "visible-message-change",
        this._onVisibleMessageChange,
      );
    }
    this._listeningSource = undefined;
  }

  private readonly _onMessagesChange = (): void => {
    this._sync();
  };

  private readonly _onVisibleMessageChange = (event: Event): void => {
    const detail = (event as CustomEvent<VisibleMessageChangeDetail>).detail;
    if (detail?.messageId) {
      this._visibleMessageId = detail.messageId;
      this._lastVisibleMessageId = detail.lastMessageId ?? detail.messageId;
    }
  };

  private _sync(): void {
    const src = this._effectiveSource();
    this._bookmarks = (src?.messages ?? []).filter((m) => !!m.bookmark);
    if (
      this._selectedId &&
      !this._bookmarks.some((m) => m.id === this._selectedId)
    ) {
      this._selectedId = "";
    }
  }

  /**
   * Id of the bookmark for the current scroll section — the last bookmarked
   * message at or before the top-most visible message.
   */
  private get _activeBookmarkId(): string {
    const messages = this._effectiveSource()?.messages;
    if (!messages?.length || !this._visibleMessageId) return "";
    const visibleIndex = messages.findIndex(
      (m) => m.id === this._visibleMessageId,
    );
    if (visibleIndex < 0) return "";
    let activeId = "";
    for (let i = 0; i <= visibleIndex; i++) {
      if (messages[i].bookmark) activeId = messages[i].id;
    }
    return activeId;
  }

  /**
   * The bookmark to highlight: the last-clicked bookmark wins while its message
   * is still inside the visible range; once it scrolls out of view (in either
   * direction), the highlight falls back to the scroll-section bookmark.
   */
  private get _highlightedId(): string {
    const messages = this._effectiveSource()?.messages ?? [];
    if (this._selectedId) {
      const selectedIndex = messages.findIndex(
        (m) => m.id === this._selectedId,
      );
      const firstIndex = messages.findIndex(
        (m) => m.id === this._visibleMessageId,
      );
      const lastIndex = messages.findIndex(
        (m) => m.id === this._lastVisibleMessageId,
      );
      if (
        selectedIndex >= 0 &&
        firstIndex >= 0 &&
        lastIndex >= 0 &&
        selectedIndex >= firstIndex &&
        selectedIndex <= lastIndex
      ) {
        return this._selectedId;
      }
    }
    return this._activeBookmarkId;
  }

  private _preview(message: ChatMessage, max: number): string {
    const b = message.bookmark;
    const base =
      b && typeof b === "object" && b.label
        ? b.label
        : message.streaming
          ? GENERATING_LABEL
          : getMessageText(message);
    const compact = base.replace(/\s+/g, " ").trim();
    return compact.length > max
      ? `${compact.slice(0, max).trimEnd()}…`
      : compact;
  }

  private _showTip(message: ChatMessage, event: Event): void {
    const item = event.currentTarget as HTMLElement | null;
    if (!item) return;
    const rect = item.getBoundingClientRect();
    this._tip = {
      text: this._preview(message, PREVIEW_MAX),
      top: rect.top + rect.height / 2,
      left: rect.right + 8,
    };
  }

  private _hideTip(): void {
    this._tip = null;
  }

  private _jump(message: ChatMessage): void {
    this._selectedId = message.id;
    // Optimistically treat the clicked message as the whole visible range so
    // the highlight appears immediately (before the smooth scroll settles).
    this._visibleMessageId = message.id;
    this._lastVisibleMessageId = message.id;
    this._effectiveSource()?.scrollToMessage(message.id);
  }

  override render() {
    const activeId = this._highlightedId;
    return html`
      <nav
        class="rail"
        role="navigation"
        aria-label=${RAIL_ARIA_LABEL}
        @mouseleave=${this._hideTip}
      >
        ${repeat(
          this._bookmarks,
          (message) => message.id,
          (message) => html`
            <button
              type="button"
              class=${`item${message.id === activeId ? " active" : ""}`}
              data-message-id=${message.id}
              aria-current=${message.id === activeId ? "location" : undefined}
              aria-label=${this._preview(message, ARIA_MAX)}
              @click=${() => this._jump(message)}
              @mouseenter=${(event: Event) => this._showTip(message, event)}
              @focus=${(event: Event) => this._showTip(message, event)}
              @blur=${this._hideTip}
            ></button>
          `,
        )}
      </nav>
      ${
        this._tip
          ? html`
              <div
                class="tip"
                role="tooltip"
                style=${`top:${this._tip.top}px;left:${this._tip.left}px`}
              >
                ${this._tip.text}
              </div>
            `
          : ""
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "i-chat-bookmarks": ChatBookmarks;
  }
}
