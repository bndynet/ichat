import type { ChatMessage, MessagePart } from './types.js';
import { textPart } from './types.js';

/**
 * Immutably append a message to the end of the collection.
 * Caller is responsible for id uniqueness — this function does not
 * deduplicate or enforce a duplicate-id policy.
 */
export function addMessage(
  messages: ChatMessage[],
  message: ChatMessage,
): ChatMessage[] {
  return [...messages, message];
}

/**
 * Immutably shallow-patch a message by `id`.
 *
 * Returns the **original** array reference when no message matches `id`,
 * avoiding unnecessary renders and `messages-change` emissions.
 * Unchanged messages keep their original references.
 */
export function patchMessageById(
  messages: ChatMessage[],
  id: string,
  patch: Partial<ChatMessage>,
): ChatMessage[] {
  const index = messages.findIndex((m) => m.id === id);
  if (index === -1) return messages;
  return messages.map((m, i) => (i === index ? { ...m, ...patch } : m));
}

/**
 * Immutably remove a message by `id`.
 *
 * Returns the **original** array reference when no message matches `id`.
 */
export function removeMessageById(
  messages: ChatMessage[],
  id: string,
): ChatMessage[] {
  const index = messages.findIndex((m) => m.id === id);
  if (index === -1) return messages;
  return messages.filter((m) => m.id !== id);
}

/**
 * Return an empty message collection (always a new reference).
 */
export function clearMessages(): ChatMessage[] {
  return [];
}

/**
 * Produce cancelled message data for a streaming message.
 *
 * - Sets `streaming: false` and `cancelled: true` on the target message.
 * - When `hint` is provided, appends it to the last text part (or creates a
 *   new text part if none exists), following the same rule as
 *   {@link ChatMessages.cancelMessage}.
 * - Returns the **original** array reference when no message matches `id` or
 *   the message is already in a terminal state (not `streaming` or already
 *   `error`).
 *
 * Animation/DOM side effects are **not** handled here — this is a pure data
 * reducer.  The caller is responsible for stopping any running typewriter
 * animation.
 */
export function cancelMessageData(
  messages: ChatMessage[],
  id: string,
  hint?: string,
): ChatMessage[] {
  const index = messages.findIndex((m) => m.id === id);
  if (index === -1) return messages;

  const msg = messages[index];
  // Idempotent: already cancelled or errored — no change.
  if (!msg.streaming || msg.error) return messages;

  let patched: ChatMessage = { ...msg, streaming: false, cancelled: true };

  if (hint) {
    const parts = patched.parts ?? [];
    let lastTextIdx = -1;
    for (let i = parts.length - 1; i >= 0; i--) {
      if (parts[i].type === 'text') {
        lastTextIdx = i;
        break;
      }
    }
    if (lastTextIdx >= 0) {
      const target = parts[lastTextIdx] as Extract<MessagePart, { type: 'text' }>;
      const nextParts = parts.slice();
      nextParts[lastTextIdx] = { ...target, text: `${target.text}\n\n${hint}` };
      patched = { ...patched, parts: nextParts };
    } else {
      patched = { ...patched, parts: [...parts, textPart(hint)] };
    }
  }

  return messages.map((m, i) => (i === index ? patched : m));
}
