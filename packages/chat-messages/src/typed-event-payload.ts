export function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim() !== '';
}

function parseJsonPayload(input: string): unknown {
  try {
    return JSON.parse(input) as unknown;
  } catch {
    return undefined;
  }
}

/**
 * Parse a backend event payload from a parsed object, JSON string, or
 * MessageEvent-like object. When a named SSE envelope and `data.type` are both
 * present, they must agree with the expected event type. The browser's default
 * `message` event remains compatible with data-only streams that route by
 * `data.type`.
 */
export function parseTypedEventPayload(input: unknown, expectedType: string): unknown {
  if (typeof input === 'string') {
    return parseJsonPayload(input);
  }

  if (isRecord(input) && typeof input.data === 'string') {
    const eventType = typeof input.type === 'string' ? input.type : undefined;
    const hasNamedEventType = eventType !== undefined && eventType !== 'message';
    const payload = parseJsonPayload(input.data);
    if (!isRecord(payload)) {
      return undefined;
    }

    const payloadType = typeof payload.type === 'string' ? payload.type : undefined;
    if (hasNamedEventType && eventType !== expectedType) {
      return undefined;
    }
    if (payloadType !== undefined && payloadType !== expectedType) {
      return undefined;
    }
    if (hasNamedEventType && payloadType !== undefined && eventType !== payloadType) {
      return undefined;
    }

    return payloadType === undefined && eventType === expectedType
      ? { ...payload, type: eventType }
      : payload;
  }

  return input;
}

export function getEventSequenceNumber(
  payload: Record<string, unknown>,
): number | undefined | 'invalid' {
  const sequenceNumber = payload.sequence_number ?? payload.sequenceNumber;
  if (sequenceNumber === undefined) {
    return undefined;
  }
  return typeof sequenceNumber === 'number' && Number.isFinite(sequenceNumber)
    ? sequenceNumber
    : 'invalid';
}
