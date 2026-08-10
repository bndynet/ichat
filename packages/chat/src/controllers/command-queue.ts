/**
 * Typed queue for presentation commands that arrive before the first render.
 *
 * Commands are queued when `<i-chat>` children are not yet ready, then
 * replayed in FIFO order once the component has rendered.
 */

import type { ChatMessage } from "@bndynet/ichat-messages";

/** A command that was queued before the child `<i-chat-messages>` was ready. */
export type PendingCommand =
  | { kind: "show-error"; text: string; options?: { duration?: number } }
  | { kind: "dismiss-error" }
  | { kind: "reply-message"; id: string; info?: Partial<ChatMessage> }
  | { kind: "clear-reply-message"; idOrKey?: string };

export class CommandQueue {
  private _queue: PendingCommand[] = [];

  get length(): number {
    return this._queue.length;
  }

  /** Push a command onto the queue. */
  enqueue(cmd: PendingCommand): void {
    this._queue.push(cmd);
  }

  /**
   * Drain all pending commands and return them in FIFO order.
   * The queue is cleared after this call.
   */
  drain(): PendingCommand[] {
    const commands = this._queue;
    this._queue = [];
    return commands;
  }

  /** Remove commands of the given kinds (used for error deduplication). */
  removeByKind(...kinds: Array<PendingCommand["kind"]>): void {
    this._queue = this._queue.filter((c) => !kinds.includes(c.kind));
  }

  /** Clear all pending commands without replaying them. */
  clear(): void {
    this._queue = [];
  }
}
