import type { MessagePart } from './types.js';

export interface MessagePartUpdate {
  messageId: string;
  partId: string;
  patch: Partial<MessagePart>;
}

export type MessagePartUpdateNormalizeFailureReason =
  | 'invalid-event'
  | 'invalid-message-id'
  | 'invalid-part-id'
  | 'invalid-patch'
  | 'empty-patch'
  | 'part-id-change-not-allowed'
  | 'part-type-change-not-allowed';

export type MessagePartUpdateNormalizeResult =
  | { ok: true; update: MessagePartUpdate }
  | { ok: false; reason: MessagePartUpdateNormalizeFailureReason };

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim() !== '';
}

function parseMessagePartUpdatePayload(input: unknown): unknown {
  if (typeof input === 'string') {
    try {
      return JSON.parse(input) as unknown;
    } catch {
      return undefined;
    }
  }

  if (isRecord(input) && typeof input.data === 'string') {
    const eventType = typeof input.type === 'string' ? input.type : undefined;
    try {
      const payload = JSON.parse(input.data) as unknown;
      if (
        eventType === 'message.part.updated' &&
        isRecord(payload) &&
        payload.type === undefined
      ) {
        return { ...payload, type: eventType };
      }
      return payload;
    } catch {
      return undefined;
    }
  }

  return input;
}

function patchFromPayload(payload: Record<string, unknown>): unknown {
  if (payload.patch !== undefined) {
    return payload.patch;
  }

  const {
    type: _type,
    messageId: _messageId,
    partId: _partId,
    ...patch
  } = payload;
  return patch;
}

/**
 * Normalize a backend/SSE message part update. Accepts a parsed object, a JSON
 * string, or a MessageEvent-like object with a JSON `data` payload.
 */
export function normalizeMessagePartUpdateEvent(
  input: unknown
): MessagePartUpdateNormalizeResult {
  const payload = parseMessagePartUpdatePayload(input);
  if (!isRecord(payload)) {
    return { ok: false, reason: 'invalid-event' };
  }

  if (
    typeof payload.type === 'string' &&
    payload.type !== 'message.part.updated'
  ) {
    return { ok: false, reason: 'invalid-event' };
  }

  if (!isNonEmptyString(payload.messageId)) {
    return { ok: false, reason: 'invalid-message-id' };
  }
  if (!isNonEmptyString(payload.partId)) {
    return { ok: false, reason: 'invalid-part-id' };
  }

  const patch = patchFromPayload(payload);
  if (!isRecord(patch)) {
    return { ok: false, reason: 'invalid-patch' };
  }
  if (Object.keys(patch).length === 0) {
    return { ok: false, reason: 'empty-patch' };
  }
  if (patch.id !== undefined) {
    return { ok: false, reason: 'part-id-change-not-allowed' };
  }
  if (patch.type !== undefined) {
    return { ok: false, reason: 'part-type-change-not-allowed' };
  }

  return {
    ok: true,
    update: {
      messageId: payload.messageId,
      partId: payload.partId,
      patch: patch as Partial<MessagePart>,
    },
  };
}
