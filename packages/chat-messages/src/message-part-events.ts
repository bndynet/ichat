import type { MessagePart } from './types.js';
import {
  getEventSequenceNumber,
  isNonEmptyString,
  isRecord,
  parseTypedEventPayload,
} from './typed-event-payload.js';

export interface MessagePartUpdate {
  messageId: string;
  partId: string;
  patch: Partial<MessagePart>;
  sequenceNumber?: number;
}

export type MessagePartUpdateNormalizeFailureReason =
  | 'invalid-event'
  | 'invalid-message-id'
  | 'invalid-part-id'
  | 'invalid-sequence-number'
  | 'invalid-patch'
  | 'empty-patch'
  | 'part-id-change-not-allowed'
  | 'part-type-change-not-allowed';

export type MessagePartUpdateNormalizeResult =
  | { ok: true; update: MessagePartUpdate }
  | { ok: false; reason: MessagePartUpdateNormalizeFailureReason };

function patchFromPayload(payload: Record<string, unknown>): unknown {
  if (payload.patch !== undefined) {
    return payload.patch;
  }

  const {
    type: _type,
    messageId: _messageId,
    partId: _partId,
    sequence_number: _sequenceNumber,
    sequenceNumber: _sequenceNumberCamel,
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
  const payload = parseTypedEventPayload(input, 'message.part.updated');
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

  const sequenceNumber = getEventSequenceNumber(payload);
  if (sequenceNumber === 'invalid') {
    return { ok: false, reason: 'invalid-sequence-number' };
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

  const update: MessagePartUpdate = {
    messageId: payload.messageId,
    partId: payload.partId,
    patch: patch as Partial<MessagePart>,
  };
  if (sequenceNumber !== undefined) {
    update.sequenceNumber = sequenceNumber;
  }

  return {
    ok: true,
    update,
  };
}
