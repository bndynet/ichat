import type { ReactiveController, ReactiveControllerHost } from 'lit';

/**
 * Manages auto-scroll behaviour for a scrollable chat message list.
 *
 * Features:
 * - Auto-scrolls to bottom when new content arrives (while user is at bottom)
 * - Detects when user scrolls up (disables auto-scroll, shows "scroll to bottom" button)
 * - Multi-pass scroll for nested shadow/custom elements (mermaid, forms, etc.)
 * - ResizeObserver-based content-change detection
 */
export class ScrollController implements ReactiveController {
  private _host: ReactiveControllerHost & {
    renderRoot: HTMLElement | DocumentFragment;
    requestUpdate(): void;
  };
  private _scrollSelector: string;

  constructor(
    host: ReactiveControllerHost & {
      renderRoot: HTMLElement | DocumentFragment;
      requestUpdate(): void;
    },
    scrollSelector: string,
  ) {
    this._host = host;
    this._scrollSelector = scrollSelector;
    host.addController(this);
  }

  /** True when the user is at or near the bottom (auto-scroll enabled). */
  private _autoScroll = true;

  /** True when new content arrived while auto-scroll was disabled. */
  private _hasNewContent = false;

  /**
   * Apply state transitions and request a host update when observable state
   * actually changes.  This keeps the scroll-to-latest affordance (button
   * visibility) in sync without waiting for an unrelated render.
   */
  private _applyState(updates: { autoScroll?: boolean; hasNewContent?: boolean }): void {
    let changed = false;
    if (updates.autoScroll !== undefined && updates.autoScroll !== this._autoScroll) {
      this._autoScroll = updates.autoScroll;
      changed = true;
    }
    if (updates.hasNewContent !== undefined && updates.hasNewContent !== this._hasNewContent) {
      this._hasNewContent = updates.hasNewContent;
      changed = true;
    }
    if (changed) {
      (this._host as ReactiveControllerHost & { requestUpdate(): void }).requestUpdate();
    }
  }

  private _resizeObserver?: ResizeObserver;
  private _observedEl?: Element;

  /** While true, ignore scroll events so ResizeObserver-triggered scrolls don't flip _autoScroll. */
  private _resizeScrollLock = false;

  private _resizeDebounceTimer?: ReturnType<typeof setTimeout>;

  /** Invalidates in-flight multi-pass scroll when a newer scroll is requested. */
  private _scrollToBottomSeq = 0;

  get autoScroll(): boolean {
    return this._autoScroll;
  }

  get hasNewContent(): boolean {
    return this._hasNewContent;
  }

  hostConnected(): void {
    this._ensureResizeObserver();
  }

  hostDisconnected(): void {
    this._resizeObserver?.disconnect();
    this._resizeObserver = undefined;
    clearTimeout(this._resizeDebounceTimer);
  }

  hostUpdate(): void {
    // Re-check resize observer target on each update (DOM may have changed)
    this._ensureResizeObserver();
  }

  // ── Public API ──────────────────────────────────────────────────

  /** Scroll to bottom immediately (called when new messages arrive). */
  scrollToBottom(): void {
    const seq = ++this._scrollToBottomSeq;
    const apply = (): void => {
      if (seq !== this._scrollToBottomSeq || !(this._host as any).isConnected) return;
      const el = this._host.renderRoot?.querySelector<HTMLElement>(this._scrollSelector);
      if (el) el.scrollTop = el.scrollHeight;
    };

    // Multi-pass: nested shadow/custom elements (mermaid, forms) often
    // finish layout after the first frame.
    requestAnimationFrame(() => {
      apply();
      requestAnimationFrame(() => {
        apply();
        queueMicrotask(apply);
        requestAnimationFrame(() => {
          apply();
          if (seq !== this._scrollToBottomSeq) return;
          setTimeout(apply, 0);
        });
      });
    });
    this._applyState({ hasNewContent: false });
  }

  /** Handle scroll event from the scroll container. */
  handleScroll(): void {
    if (this._resizeScrollLock) return;
    const el = this._host.renderRoot?.querySelector<HTMLElement>(this._scrollSelector);
    if (!el) return;
    const threshold = 60;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
    this._applyState({ autoScroll: atBottom, hasNewContent: atBottom ? false : undefined });
  }

  /** Called when the "scroll to bottom" button is clicked. */
  handleScrollToBottom(): void {
    this._applyState({ autoScroll: true });
    this.scrollToBottom();
  }

  /** Called when embedded content resizes (e.g. mermaid, forms). */
  handleContentResize(): void {
    if (this._autoScroll) {
      this.scrollToBottom();
    }
  }

  /** Signal that new content arrived (called after message commit). */
  notifyContentChanged(): void {
    if (this._autoScroll) {
      this.scrollToBottom();
    } else {
      this._applyState({ hasNewContent: true });
    }
  }

  /** Reset scroll state without triggering DOM operations (for clear). */
  reset(): void {
    this._applyState({ autoScroll: true, hasNewContent: false });
  }

  // ── Internal ────────────────────────────────────────────────────

  private _ensureResizeObserver(): void {
    const inner = this._host.renderRoot?.querySelector('.chat-messages-inner');
    if (inner && inner !== this._observedEl) {
      this._resizeObserver?.disconnect();
      this._resizeObserver = new ResizeObserver(() => {
        if (this._autoScroll) {
          this._resizeScrollLock = true;
          // Sync scroll for instant response — ResizeObserver fires after layout,
          // so scrollHeight is already up-to-date.  The following scrollToBottom()
          // adds RAF multi-pass for late-arriving nested content (mermaid, forms).
          const scrollEl = this._host.renderRoot?.querySelector<HTMLElement>(this._scrollSelector);
          if (scrollEl) scrollEl.scrollTop = scrollEl.scrollHeight;
          this.scrollToBottom();
          clearTimeout(this._resizeDebounceTimer);
          this._resizeDebounceTimer = setTimeout(() => {
            this._resizeScrollLock = false;
            this.scrollToBottom();
          }, 150);
        } else {
          this._applyState({ hasNewContent: true });
        }
      });
      this._resizeObserver.observe(inner);
      this._observedEl = inner;
    }
    if (!inner && this._observedEl) {
      this._resizeObserver?.disconnect();
      this._observedEl = undefined;
    }
  }
}
