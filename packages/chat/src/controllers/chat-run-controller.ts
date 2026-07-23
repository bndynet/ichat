import type { ChatMessage, MessagePart } from '@bndynet/ichat-messages';
import type { MessagePartUpdateResult } from '@bndynet/ichat-messages';

// ── public types ─────────────────────────────────────────────────────

export type ChatRunStatus =
  | 'idle'
  | 'streaming'
  | 'completed'
  | 'cancelled'
  | 'error';

export interface ChatRunOptions {
  /** Override the generated message id (default: auto-generated). */
  messageId?: string;
  role?: 'assistant';
  timestamp?: number;
  /** Called when the run is cancelled.  The consumer remains responsible for aborting the network request. */
  onCancel?: () => void;
}

// ── minimal port ────────────────────────────────────────────────────

export interface ChatMessageStorePort {
  readonly messages: ChatMessage[];
  addMessage(message: ChatMessage): void;
  updateMessage(id: string, partial: Partial<ChatMessage>): void;
  appendPart(messageId: string, part: MessagePart): void;
  updatePart(messageId: string, partId: string, patch: Partial<MessagePart>): void;
  cancelMessage(id: string, hint?: string): void;
  tryUpdatePart(messageId: string, partId: string, patch: Partial<MessagePart>): MessagePartUpdateResult;
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

  // ── lifecycle ──────────────────────────────────────────────────

  /**
   * Create the assistant placeholder message and begin streaming.
   * Must be called before any other method.
   */
  start(initialParts?: MessagePart[]): void {
    if (this._status !== 'idle') return;

    this._messageId =
      this._options.messageId ??
      `msg-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

    this._store.addMessage({
      id: this._messageId,
      role: this._options.role ?? 'assistant',
      parts: initialParts ?? [],
      streaming: true,
      timestamp: this._options.timestamp ?? Date.now(),
    });

    this._status = 'streaming';
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
   * on the message.  No-op if already in a terminal state.
   */
  complete(patch?: Partial<ChatMessage>): void {
    if (this._status !== 'streaming') return;
    this._store.updateMessage(this._messageId, {
      streaming: false,
      ...patch,
    });
    this._status = 'completed';
  }

  /**
   * Mark the run as failed.  Records the error on the message and clears
   * streaming so the composer recovers.  No-op if already terminal.
   */
  fail(error: string, text?: string): void {
    if (this._status !== 'streaming') return;
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
    });
    this._status = 'error';
  }

  /**
   * Cancel the run.  Invokes the host `onCancel` callback (if provided)
   * and then delegates to the store's cancel logic.  No-op if already
   * in a terminal state.
   */
  cancel(hint?: string): void {
    if (this._status !== 'streaming') return;
    this._options.onCancel?.();
    this._store.cancelMessage(this._messageId, hint);
    this._status = 'cancelled';
  }
}
