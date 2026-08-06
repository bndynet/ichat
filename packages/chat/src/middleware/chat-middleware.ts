import type { ChatMessage, MessagePart } from "@bndynet/ichat-messages";

/**
 * Middleware hook for intercepting and transforming messages flowing through
 * `<i-chat>`. Register with `chat.use(middleware)`.
 *
 * Middleware runs in FIFO registration order.  Return `null` or `undefined`
 * from `beforeSend` to silently drop the message (no `send` event fires).
 */
export interface ChatMiddleware {
  /** Unique name for debugging and removal. */
  name: string;

  /**
   * Called before the `send` event is dispatched.
   * Transform or validate the outgoing content.
   * Return a string to replace the content, or `null`/`undefined` to block the send.
   */
  beforeSend?: (
    content: string,
  ) => string | null | undefined | Promise<string | null | undefined>;

  /**
   * Called after a new message is added to the collection.
   * Return the message (same or modified) to include, or `null` to drop it.
   */
  afterMessageAdded?: (message: ChatMessage) => ChatMessage | null;

  /**
   * Called before a part is appended to a message.
   * Return the part to include, or `null` to drop it.
   */
  beforeAppendPart?: (
    messageId: string,
    part: MessagePart,
  ) => MessagePart | null;

  /**
   * Called when an error is reported (via `showError`, `addErrorMessage`, or SSE errors).
   */
  onError?: (error: string, messageId?: string) => void;
}

/** @internal */
export interface MiddlewareChain {
  readonly middlewares: readonly ChatMiddleware[];
  use(middleware: ChatMiddleware): () => void;
  remove(name: string): boolean;
  executeBeforeSend(content: string): Promise<string | null>;
  executeAfterMessageAdded(message: ChatMessage): ChatMessage | null;
  executeBeforeAppendPart(
    messageId: string,
    part: MessagePart,
  ): MessagePart | null;
  executeOnError(error: string, messageId?: string): void;
}

export function createMiddlewareChain(): MiddlewareChain {
  const middlewares: ChatMiddleware[] = [];

  return {
    get middlewares(): readonly ChatMiddleware[] {
      return middlewares;
    },

    use(middleware: ChatMiddleware): () => void {
      middlewares.push(middleware);
      return () => {
        const idx = middlewares.indexOf(middleware);
        if (idx >= 0) middlewares.splice(idx, 1);
      };
    },

    remove(name: string): boolean {
      const idx = middlewares.findIndex((m) => m.name === name);
      if (idx < 0) return false;
      middlewares.splice(idx, 1);
      return true;
    },

    async executeBeforeSend(content: string): Promise<string | null> {
      let result: string | null = content;
      for (const mw of middlewares) {
        if (!mw.beforeSend) continue;
        const next = await mw.beforeSend(result!);
        if (next == null) return null;
        result = next;
      }
      return result;
    },

    executeAfterMessageAdded(message: ChatMessage): ChatMessage | null {
      let result: ChatMessage | null = message;
      for (const mw of middlewares) {
        if (!mw.afterMessageAdded) continue;
        const next = mw.afterMessageAdded(result!);
        if (next == null) return null;
        result = next;
      }
      return result;
    },

    executeBeforeAppendPart(
      messageId: string,
      part: MessagePart,
    ): MessagePart | null {
      let result: MessagePart | null = part;
      for (const mw of middlewares) {
        if (!mw.beforeAppendPart) continue;
        const next = mw.beforeAppendPart(messageId, result!);
        if (next == null) return null;
        result = next;
      }
      return result;
    },

    executeOnError(error: string, messageId?: string): void {
      for (const mw of middlewares) {
        mw.onError?.(error, messageId);
      }
    },
  };
}
