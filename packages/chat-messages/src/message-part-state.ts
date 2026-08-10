import type { ChatMessage, MessagePart, ToolCallPart } from "./types.js";
import { isMessagePart, isToolCallPart } from "./part-guards.js";
import type { MessagePartUpdate } from "./message-part-events.js";
import { patchToolCallPart } from "./tool-call-state.js";
import type {
  MessagePartUpdateFailureReason,
  PartLookupFailureReason,
} from "./update-results.js";

export type MessagePartLookupFailureReason = Extract<
  PartLookupFailureReason,
  "message-not-found" | "part-not-found"
>;

export type MessagePartLookupResult =
  | { ok: true; message: ChatMessage; part: MessagePart }
  | { ok: false; reason: MessagePartLookupFailureReason };

export type MessagePartReplaceResult =
  | { ok: true; messages: ChatMessage[]; part: MessagePart }
  | {
      ok: false;
      messages: ChatMessage[];
      reason: MessagePartLookupFailureReason;
    };

export type MessagePartUpdateApplyResult =
  | { ok: true; messages: ChatMessage[]; part: MessagePart }
  | {
      ok: false;
      messages: ChatMessage[];
      reason: MessagePartUpdateFailureReason;
      part?: MessagePart;
    };

export type MessagePartPatchResult = MessagePartUpdateApplyResult;

/**
 * The target is gone rather than the patch being wrong. This races with
 * removing a message while an update is in flight, so it is expected rather
 * than a caller mistake.
 */
const PART_LOOKUP_FAILURES: ReadonlySet<MessagePartUpdateFailureReason> =
  new Set(["message-not-found", "part-not-found", "part-type-mismatch"]);

export function findMessagePart(
  messages: readonly ChatMessage[],
  messageId: string,
  partId: string,
): MessagePartLookupResult {
  const message = messages.find((candidate) => candidate.id === messageId);
  if (!message) return { ok: false, reason: "message-not-found" };

  const part = message.parts.find((candidate) => candidate.id === partId);
  if (!part) return { ok: false, reason: "part-not-found" };

  return { ok: true, message, part };
}

export function appendMessagePart(
  messages: readonly ChatMessage[],
  messageId: string,
  part: MessagePart,
): ChatMessage[] {
  let didAppend = false;
  const nextMessages = messages.map((message) => {
    if (message.id !== messageId) return message;
    didAppend = true;
    return { ...message, parts: [...message.parts, part] };
  });

  return didAppend ? nextMessages : [...messages];
}

export function replaceMessagePart(
  messages: readonly ChatMessage[],
  messageId: string,
  partId: string,
  nextPart: MessagePart,
): MessagePartReplaceResult {
  const lookup = findMessagePart(messages, messageId, partId);
  if (!lookup.ok) {
    return { ok: false, messages: [...messages], reason: lookup.reason };
  }

  const nextMessages = messages.map((message) => {
    if (message.id !== messageId) return message;
    return {
      ...message,
      parts: message.parts.map((part) =>
        part.id === partId ? nextPart : part,
      ),
    };
  });

  return { ok: true, messages: nextMessages, part: nextPart };
}

/**
 * Shallow-merge `patch` into the identified part under the same validation
 * `applyMessagePartUpdate` performs: `id` and `type` are preserved, the result
 * must still be a well-formed part, and tool-call parts go through their state
 * machine.
 *
 * Callers that need to react to a rejection should use `applyMessagePartUpdate`
 * (or `tryUpdatePart`) instead. Because this variant exists for callers that
 * discard the result, an invalid patch is reported to the console — silently
 * dropping it would leave a caller bug invisible. A missing message or part is
 * not reported, since that races with ordinary message removal.
 */
export function patchMessagePart(
  messages: readonly ChatMessage[],
  messageId: string,
  partId: string,
  patch: Partial<MessagePart>,
): MessagePartPatchResult {
  const result = applyMessagePartUpdate(messages, { messageId, partId, patch });

  if (!result.ok && !PART_LOOKUP_FAILURES.has(result.reason)) {
    console.warn(
      `[i-chat] Ignored an invalid patch for part "${partId}" of message "${messageId}": ` +
        `${result.reason}. Use tryUpdatePart() to receive this result instead.`,
    );
  }

  return result;
}

export function applyMessagePartUpdate(
  messages: readonly ChatMessage[],
  update: MessagePartUpdate,
): MessagePartUpdateApplyResult {
  const lookup = findMessagePart(messages, update.messageId, update.partId);
  if (!lookup.ok) {
    return { ok: false, messages: [...messages], reason: lookup.reason };
  }

  const { part } = lookup;
  let nextPart: MessagePart;
  if (isToolCallPart(part)) {
    const result = patchToolCallPart(
      part,
      update.patch as Partial<ToolCallPart>,
    );
    if (!result.ok) {
      return {
        ok: false,
        messages: [...messages],
        reason: result.reason,
        part: result.part,
      };
    }
    if (!isToolCallPart(result.part)) {
      return {
        ok: false,
        messages: [...messages],
        reason: "invalid-part",
        part: result.part,
      };
    }
    nextPart = result.part;
  } else {
    nextPart = {
      ...part,
      ...update.patch,
      id: part.id,
      type: part.type,
    } as MessagePart;
    if (!isMessagePart(nextPart)) {
      return {
        ok: false,
        messages: [...messages],
        reason: "invalid-part",
        part,
      };
    }
  }

  const replacement = replaceMessagePart(
    messages,
    update.messageId,
    update.partId,
    nextPart,
  );
  if (!replacement.ok) {
    return {
      ok: false,
      messages: replacement.messages,
      reason: replacement.reason,
    };
  }

  return {
    ok: true,
    messages: replacement.messages,
    part: replacement.part,
  };
}
