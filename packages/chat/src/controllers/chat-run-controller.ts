import type { ChatMessage, MessagePart } from '@bndynet/ichat-messages';
import type { MessagePartUpdateResult } from '@bndynet/ichat-messages';
import {
  acceptedNoOp,
  normalizeOutcome,
  type ChatMutationOutcome,
} from '../state/mutation-outcome.js';

// ── public types ─────────────────────────────────────────────────────

export type ChatRunStatus = 'idle' | 'streaming' | 'completed' | 'cancelled' | 'error';

export interface ChatRunOptions {
  /** Override the generated message id (default: auto-generated). */
  messageId?: string;
  role?: 'assistant';
  timestamp?: number;
  /**
   * Called when the run is cancelled.  The consumer remains responsible for
   * aborting the network request.
   *
   * Runs after the cancellation has been committed to the store, and not at all
   * when a controlled host rejects it.
   */
  onCancel?: () => void;
}

// ── minimal port ────────────────────────────────────────────────────

/**
 * The subset of {@link import('../state/chat-message-store.js').ChatMessageStore}
 * that a run needs.
 *
 * The three mutations that drive lifecycle transitions report a
 * {@link ChatMutationOutcome} so the controller can tell an accepted write from
 * one a controlled host rejected.  `void` remains allowed for implementations
 * written against the older signature and is treated as accepted.
 */
export interface ChatMessageStorePort {
  readonly messages: ChatMessage[];
  addMessage(message: ChatMessage): ChatMutationOutcome | void;
  updateMessage(id: string, partial: Partial<ChatMessage>): ChatMutationOutcome | void;
  cancelMessage(id: string, hint?: string): ChatMutationOutcome | void;
  appendPart(messageId: string, part: MessagePart): void;
  updatePart(messageId: string, partId: string, patch: Partial<MessagePart>): void;
  tryUpdatePart(
    messageId: string,
    partId: string,
    patch: Partial<MessagePart>,
  ): MessagePartUpdateResult;
}

// ── controller ─────────────────────────────────────────────────────

/**
 * Orchestrates one AI response run through `<i-chat>`.
 *
 * Manages the message lifecycle — creates the assistant placeholder on
 * `start()`, accepts streamed part updates, and transitions to a terminal
 * state on `complete()`, `cancel()`, or `fail()`.  It never accesses the
 * shadow DOM or child message state directly; all writes go through the
 * top-level store.
 *
 * One controller represents one run.  Create a new controller for each
 * AI response.
 *
 * Lifecycle transitions only happen once the underlying store mutation is
 * accepted.  A controlled host that rejects a proposal with `preventDefault()`
 * therefore leaves the run in its previous state — a rejected `start()` stays
 * `idle` and a rejected `complete()`/`fail()`/`cancel()` stays `streaming` —
 * so the caller can inspect the returned outcome and retry.
 *
 * @example
 * ```ts
 * const run = chat.createRunController();
 * run.start([textPart('', { status: 'streaming' })]);
 * run.appendText(partId, 'Hello');
 * run.appendText(partId, ' world');
 * run.complete();
 * ```
 */
export class ChatRunController {
  private readonly _store: ChatMessageStorePort;
  private readonly _options: ChatRunOptions;

  private _messageId!: string;
  private _status: ChatRunStatus = 'idle';
  private readonly _abortController = new AbortController();

  constructor(store: ChatMessageStorePort, options: ChatRunOptions = {}) {
    this._store = store;
    this._options = options;
  }

  /** The message id managed by this run. */
  get messageId(): string {
    return this._messageId;
  }

  /** Current run status. */
  get status(): ChatRunStatus {
    return this._status;
  }

  /**
   * An `AbortSignal` that is aborted when the run is cancelled, completed,
   * or fails.  Pass this to `fetch()` or any cancellable API so in-flight
   * network requests are automatically torn down when the run ends.
   */
  get signal(): AbortSignal {
    return this._abortController.signal;
  }

  // ── lifecycle ──────────────────────────────────────────────────

  /**
   * Create the assistant placeholder message and begin streaming.
   * Must be called before any other method.
   *
   * @returns The outcome of the placeholder mutation.  When it was rejected the
   *          run stays `idle` and no message id is claimed, so `start()` can be
   *          called again.
   */
  start(initialParts?: MessagePart[]): ChatMutationOutcome {
    if (this._status !== 'idle') return acceptedNoOp();

    const messageId =
      this._options.messageId ??
      `msg-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

    const outcome = normalizeOutcome(
      this._store.addMessage({
        id: messageId,
        role: this._options.role ?? 'assistant',
        parts: initialParts ?? [],
        streaming: true,
        timestamp: this._options.timestamp ?? Date.now(),
      }),
    );
    if (!outcome.accepted) return outcome;

    this._messageId = messageId;
    this._status = 'streaming';
    return outcome;
  }

  /**
   * Append a structured part to the message (e.g. a tool-call or
   * reasoning block).
   */
  appendPart(part: MessagePart): void {
    if (this._status !== 'streaming') return;
    this._store.appendPart(this._messageId, part);
  }

  /**
   * Patch an existing part by id.
   */
  updatePart(partId: string, patch: Partial<MessagePart>): MessagePartUpdateResult {
    if (this._status !== 'streaming') {
      return { ok: false, reason: 'message-not-found' };
    }
    return this._store.tryUpdatePart(this._messageId, partId, patch);
  }

  /**
   * Append a text delta to a text part.  Reads the current text from the
   * store so it never appends to a stale snapshot.
   */
  appendText(partId: string, delta: string): MessagePartUpdateResult {
    if (this._status !== 'streaming') {
      return { ok: false, reason: 'message-not-found' };
    }
    const msg = this._store.messages.find((m) => m.id === this._messageId);
    if (!msg || !msg.parts) return { ok: false, reason: 'message-not-found' };

    const part = msg.parts.find((p) => p.id === partId);
    if (!part) return { ok: false, reason: 'part-not-found' };
    if (part.type !== 'text') return { ok: false, reason: 'part-type-mismatch', part };

    const currentText = (part as { text: string }).text ?? '';
    return this._store.tryUpdatePart(this._messageId, partId, {
      text: currentText + delta,
    });
  }

  /**
   * Mark the run as successfully completed.  Clears the streaming flag
   * on the message and aborts the signal.  No-op if already terminal.
   */
  complete(patch?: Partial<ChatMessage>): ChatMutationOutcome {
    if (this._status !== 'streaming') return acceptedNoOp();

    const outcome = normalizeOutcome(
      this._store.updateMessage(this._messageId, {
        streaming: false,
        ...patch,
      }),
    );
    if (!outcome.accepted) return outcome;

    this._status = 'completed';
    this._cleanup();
    return outcome;
  }

  /**
   * Mark the run as failed.  Records the error on the message, clears
   * streaming, and aborts the signal.  No-op if already terminal.
   */
  fail(error: string, text?: string): ChatMutationOutcome {
    if (this._status !== 'streaming') return acceptedNoOp();

    const outcome = normalizeOutcome(
      this._store.updateMessage(this._messageId, {
        streaming: false,
        error,
        ...(text
          ? {
              parts: [
                ...(this._store.messages.find((m) => m.id === this._messageId)?.parts ?? []),
                { type: 'text' as const, id: `err-${Date.now()}`, text },
              ],
            }
          : {}),
      }),
    );
    if (!outcome.accepted) return outcome;

    this._status = 'error';
    this._cleanup();
    return outcome;
  }

  /**
   * Cancel the run.  Delegates to the store's cancel logic, then invokes the
   * host `onCancel` callback and aborts the signal.  No-op if already terminal.
   */
  cancel(hint?: string): ChatMutationOutcome {
    if (this._status !== 'streaming') return acceptedNoOp();

    const outcome = normalizeOutcome(this._store.cancelMessage(this._messageId, hint));
    // `onCancel` tears down the caller's in-flight request, so it must not run
    // when a controlled host rejects the cancellation.
    if (!outcome.accepted) return outcome;

    this._status = 'cancelled';
    this._options.onCancel?.();
    this._cleanup();
    return outcome;
  }

  /** Abort the signal so in-flight requests bound to it are torn down. */
  private _cleanup(): void {
    this._abortController.abort();
  }
}
