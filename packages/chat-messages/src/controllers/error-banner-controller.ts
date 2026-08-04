import type { ReactiveController, ReactiveControllerHost } from 'lit';

/**
 * Manages a transient error banner displayed at the top of the chat area.
 *
 * Features:
 * - Show/dismiss with optional auto-dismiss timer
 * - Dispatches `error` event via the host
 * - Auto-dismisses when new streaming starts (via `clearOnStreamingStart()`)
 */
export class ErrorBannerController implements ReactiveController {
  private _host: ReactiveControllerHost & {
    dispatchEvent(event: Event): boolean;
  };

  private _text = '';
  private _dismissTimer?: ReturnType<typeof setTimeout>;

  constructor(host: ErrorBannerController['_host']) {
    this._host = host;
    host.addController(this);
  }

  get text(): string {
    return this._text;
  }

  hostDisconnected(): void {
    clearTimeout(this._dismissTimer);
    this._dismissTimer = undefined;
  }

  /** Show the error banner with an optional auto-dismiss duration in ms. */
  show(text: string, options?: { duration?: number }): void {
    clearTimeout(this._dismissTimer);
    this._text = text;
    const duration = options?.duration;
    if (duration && duration > 0) {
      this._dismissTimer = setTimeout(() => this.dismiss(), duration);
    }
    this._host.dispatchEvent(
      new CustomEvent('error', {
        detail: { message: text },
        bubbles: true,
        composed: true,
      }),
    );
    this._host.requestUpdate();
  }

  /** Dismiss the error banner immediately. */
  dismiss(): void {
    clearTimeout(this._dismissTimer);
    this._dismissTimer = undefined;
    if (this._text) {
      this._text = '';
      this._host.requestUpdate();
    }
  }

  /** Auto-dismiss when streaming starts (called from host's updated()). */
  dismissOnStreamingStart(): void {
    if (this._text) {
      this.dismiss();
    }
  }
}
