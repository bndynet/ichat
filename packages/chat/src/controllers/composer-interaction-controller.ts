/**
 * Internal FIFO controller for temporary composer interactions.
 *
 * The controller owns lifecycle and Promise settlement only. Public chat events
 * and confirmation compatibility are layered on top by later adapters.
 */

import type { ReactiveController, ReactiveControllerHost } from "lit";
import type {
  InternalComposerInteractionCancelReason,
  InternalComposerInteractionChangeDetail,
  InternalComposerInteractionRequest,
  InternalComposerInteractionRequestInput,
  InternalComposerInteractionResult,
} from "./composer-interaction-types.js";

interface PendingComposerInteraction {
  request: InternalComposerInteractionRequest;
  resolve: (result: InternalComposerInteractionResult) => void;
  signal?: AbortSignal;
  abortHandler?: () => void;
  settled: boolean;
}

export class ComposerInteractionController
  extends EventTarget
  implements ReactiveController
{
  private readonly _host: ReactiveControllerHost;
  private _idSeq = 0;
  private _active: PendingComposerInteraction | null = null;
  private _queue: PendingComposerInteraction[] = [];

  constructor(host: ReactiveControllerHost) {
    super();
    this._host = host;
    host.addController(this);
  }

  hostConnected(): void {
    /* no-op */
  }

  hostDisconnected(): void {
    this.clear("disconnected");
  }

  /** Currently displayed request, or null when the controller is idle. */
  get active(): InternalComposerInteractionRequest | null {
    return this._active?.request ?? null;
  }

  /** Immutable-by-copy snapshot of requests waiting behind the active item. */
  get queue(): InternalComposerInteractionRequest[] {
    return this._queue.map((item) => item.request);
  }

  /** Number of queued requests, excluding the active item. */
  get queueLength(): number {
    return this._queue.length;
  }

  /** Enqueue a request and resolve its deterministic completion result. */
  request(
    input: InternalComposerInteractionRequestInput,
  ): Promise<InternalComposerInteractionResult> {
    const id = input.id?.trim() || this._nextId();
    if (this._hasPendingId(id)) {
      return Promise.reject(
        new Error(`Composer interaction ID "${id}" is already pending.`),
      );
    }

    const request: InternalComposerInteractionRequest = {
      id,
      kind: input.kind,
      payload: input.payload,
      ariaLabel: input.ariaLabel,
    };

    return new Promise((resolve) => {
      const pending: PendingComposerInteraction = {
        request,
        resolve,
        signal: input.signal,
        settled: false,
      };

      if (input.signal?.aborted) {
        this._settleItem(pending, this._cancelledResult(pending, "aborted"));
        return;
      }

      if (input.signal) {
        const abortHandler = () => {
          this.cancel(id, "aborted");
        };
        pending.abortHandler = abortHandler;
        input.signal.addEventListener("abort", abortHandler, { once: true });
      }

      if (this._active) {
        this._queue = [...this._queue, pending];
      } else {
        this._active = pending;
      }

      this._emitChange();
      this._host.requestUpdate();
    });
  }

  /** Complete the active request when the supplied ID still matches it. */
  completeActive(id: string, value: unknown): boolean {
    const item = this._active;
    if (!item || item.request.id !== id) return false;

    this._active = this._queue[0] ?? null;
    this._queue = this._queue.slice(1);

    this._settleItem(item, {
      id: item.request.id,
      status: "completed",
      value,
      request: item.request,
    });
    this._emitChange();
    this._host.requestUpdate();
    return true;
  }

  /** Cancel an active or queued request by ID. */
  cancel(id: string, reason: InternalComposerInteractionCancelReason): boolean {
    const item =
      this._active?.request.id === id
        ? this._active
        : this._queue.find((candidate) => candidate.request.id === id);
    if (!item) return false;

    return this._cancelItems([item], reason) === 1;
  }

  /** Cancel every active or queued request matching the predicate. */
  cancelWhere(
    predicate: (request: InternalComposerInteractionRequest) => boolean,
    reason: InternalComposerInteractionCancelReason,
  ): number {
    const matches = [
      ...(this._active && predicate(this._active.request)
        ? [this._active]
        : []),
      ...this._queue.filter((item) => predicate(item.request)),
    ];
    return this._cancelItems(matches, reason);
  }

  /** Cancel the active request and the full queue. */
  clear(reason: InternalComposerInteractionCancelReason): number {
    return this._cancelItems(
      [...(this._active ? [this._active] : []), ...this._queue],
      reason,
    );
  }

  private _cancelItems(
    items: PendingComposerInteraction[],
    reason: InternalComposerInteractionCancelReason,
  ): number {
    if (items.length === 0) return 0;

    const targets = new Set(items);
    const activeCancelled = this._active ? targets.has(this._active) : false;
    const remainingQueue = this._queue.filter((item) => !targets.has(item));

    if (activeCancelled) {
      this._active = remainingQueue[0] ?? null;
      this._queue = remainingQueue.slice(1);
    } else {
      this._queue = remainingQueue;
    }

    let settledCount = 0;
    for (const item of items) {
      if (this._settleItem(item, this._cancelledResult(item, reason))) {
        settledCount += 1;
      }
    }

    if (settledCount > 0) {
      this._emitChange();
      this._host.requestUpdate();
    }
    return settledCount;
  }

  private _settleItem(
    item: PendingComposerInteraction,
    result: InternalComposerInteractionResult,
  ): boolean {
    if (item.settled) return false;
    item.settled = true;
    this._removeAbortListener(item);
    item.resolve(result);
    this.dispatchEvent(new CustomEvent("result", { detail: result }));
    return true;
  }

  private _cancelledResult(
    item: PendingComposerInteraction,
    reason: InternalComposerInteractionCancelReason,
  ): InternalComposerInteractionResult {
    return {
      id: item.request.id,
      status: "cancelled",
      reason,
      request: item.request,
    };
  }

  private _removeAbortListener(item: PendingComposerInteraction): void {
    if (!item.signal || !item.abortHandler) return;
    item.signal.removeEventListener("abort", item.abortHandler);
    item.abortHandler = undefined;
  }

  private _hasPendingId(id: string): boolean {
    return (
      this._active?.request.id === id ||
      this._queue.some((item) => item.request.id === id)
    );
  }

  private _nextId(): string {
    let id: string;
    do {
      this._idSeq += 1;
      id = `interaction-${Date.now().toString(36)}-${this._idSeq.toString(36)}`;
    } while (this._hasPendingId(id));
    return id;
  }

  private _emitChange(): void {
    const detail: InternalComposerInteractionChangeDetail = {
      active: this.active,
      queue: this.queue,
      queueLength: this.queueLength,
    };
    this.dispatchEvent(new CustomEvent("change", { detail }));
  }
}
