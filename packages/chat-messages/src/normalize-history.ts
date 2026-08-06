import type { ChatMessage, PartStatus } from "./types.js";

/**
 * Options for {@link normalizeHistoryMessages}.
 */
export interface NormalizeHistoryOptions {
  /**
   * Terminal status assigned to parts whose `status` is `'streaming'` or
   * `'pending'` at load time (typically because the SSE stream was
   * interrupted before the part completed).
   *
   * @default 'complete'
   */
  interruptedStatus?: PartStatus;

  /**
   * When `true`, messages with zero parts (empty loading placeholders) are
   * removed from the returned array.
   *
   * @default true
   */
  removeEmptyMessages?: boolean;
}

/**
 * Sanitise an array of {@link ChatMessage} objects loaded from an external
 * source (REST API, local storage, etc.) so that no intermediate streaming
 * state leaks into the UI.
 *
 * Specifically:
 * - Sets `streaming: false` on every message.
 * - Marks interrupted messages with `cancelled: true`.
 * - Converts part `status` values of `'streaming'` or `'pending'` to
 *   `interruptedStatus` (default `'complete'`).
 * - Optionally removes messages that have no `parts`.
 *
 * The function returns a **new** array with **new** objects — the original
 * `messages` array and its contents are never mutated.
 *
 * @example
 * ```ts
 * const history = await fetch('/api/history');
 * chat.messages = normalizeHistoryMessages(history.messages);
 * ```
 *
 * @example
 * ```ts
 * chat.messages = normalizeHistoryMessages(history.messages, {
 *   interruptedStatus: 'cancelled',
 *   removeEmptyMessages: false,
 * });
 * ```
 */
export function normalizeHistoryMessages(
  messages: ChatMessage[],
  options?: NormalizeHistoryOptions,
): ChatMessage[] {
  const { interruptedStatus = "complete", removeEmptyMessages = true } =
    options ?? {};

  const normalized = messages.map((msg) => {
    const wasStreaming = msg.streaming === true;
    const hasStreamingParts = msg.parts.some(
      (p) => p.status === "streaming" || p.status === "pending",
    );

    // Fast path: message is already terminal — return as-is (but still
    // allocated in a new array so the caller always gets a fresh reference).
    if (!wasStreaming && !hasStreamingParts) {
      return msg;
    }

    return {
      ...msg,
      streaming: false,
      cancelled: wasStreaming ? true : msg.cancelled,
      parts: msg.parts.map((part) => {
        if (part.status === "streaming" || part.status === "pending") {
          return { ...part, status: interruptedStatus };
        }
        return part;
      }),
    } as ChatMessage;
  });

  if (removeEmptyMessages) {
    return normalized.filter((msg) => msg.parts.length > 0);
  }

  return normalized;
}
