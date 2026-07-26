/**
 * ConfirmationController — manages the confirmation dialog queue lifecycle.
 *
 * Handles FIFO queuing, resolve/reject, event emission, and ID generation.
 * The host component owns the Lit `@state()` field and render methods.
 */

import type { ReactiveController, ReactiveControllerHost } from 'lit';
import type {
  ChatConfirmationRequest,
  ChatConfirmationResolvedRequest,
  ChatConfirmationAction,
  ChatConfirmationResult,
  ChatConfirmationChangeDetail,
} from '../components/chat.js';

export type PendingConfirmation = {
  request: ChatConfirmationResolvedRequest;
  resolve: (result: ChatConfirmationResult) => void;
};

export class ConfirmationController implements ReactiveController {
  private _host: ReactiveControllerHost & {
    dispatchEvent(event: Event): boolean;
    requestUpdate(): void;
  };

  private _idSeq = 0;
  private _queue: PendingConfirmation[] = [];

  /** The currently active (displayed) confirmation, or null. */
  active: PendingConfirmation | null = null;

  constructor(host: ConfirmationController['_host']) {
    this._host = host;
    host.addController(this);
  }

  hostConnected(): void { /* no-op */ }
  hostDisconnected(): void {
    this.cancelAll();
  }

  /** The active request (or null), for template binding. */
  get activeRequest(): ChatConfirmationResolvedRequest | null {
    return this.active?.request ?? null;
  }

  /** Queue length. */
  get queueLength(): number {
    return this._queue.length;
  }

  // ── Public API ───────────────────────────────────────────────────

  /**
   * Enqueue a confirmation request. If no confirmation is active, the
   * returned promise will be shown immediately; otherwise it waits in
   * the FIFO queue.
   */
  request(req: ChatConfirmationRequest): Promise<ChatConfirmationResult> {
    const normalized: ChatConfirmationResolvedRequest = {
      ...req,
      id: req.id?.trim() || this._nextId(),
      variant: req.variant ?? 'default',
    };

    return new Promise((resolve) => {
      const pending: PendingConfirmation = { request: normalized, resolve };
      if (this.active) {
        this._queue = [...this._queue, pending];
      } else {
        this.active = pending;
      }
      this._emitChange();
      this._host.requestUpdate();
    });
  }

  /**
   * Resolve the active confirmation with the given action and advance
   * the queue.
   */
  settle(action: ChatConfirmationAction): void {
    const item = this.active;
    if (!item) return;

    this.active = this._queue[0] ?? null;
    this._queue = this._queue.slice(1);

    const result = this._resultFor(item, action);
    item.resolve(result);
    this._host.dispatchEvent(
      new CustomEvent<ChatConfirmationResult>('confirmation-decision', {
        detail: result,
        bubbles: true,
        composed: true,
      })
    );
    this._emitChange();
    this._host.requestUpdate();
  }

  /** Cancel the active confirmation and drain the queue. */
  cancelAll(): void {
    const pending = [
      ...(this.active ? [this.active] : []),
      ...this._queue,
    ];
    if (pending.length === 0) return;

    this.active = null;
    this._queue = [];
    pending.forEach((item) => item.resolve(this._resultFor(item, 'cancel')));
    this._emitChange();
    this._host.requestUpdate();
  }

  // ── Internals ────────────────────────────────────────────────────

  private _nextId(): string {
    this._idSeq += 1;
    return `confirm-${Date.now().toString(36)}-${this._idSeq.toString(36)}`;
  }

  private _resultFor(item: PendingConfirmation, action: ChatConfirmationAction): ChatConfirmationResult {
    return {
      id: item.request.id,
      action,
      confirmed: action === 'confirm',
      request: item.request,
    };
  }

  private _emitChange(): void {
    this._host.dispatchEvent(
      new CustomEvent<ChatConfirmationChangeDetail>('confirmation-change', {
        detail: {
          active: this.active?.request ?? null,
          queue: this._queue.map((item) => item.request),
          queueLength: this._queue.length,
        },
        bubbles: true,
        composed: true,
      })
    );
  }
}
