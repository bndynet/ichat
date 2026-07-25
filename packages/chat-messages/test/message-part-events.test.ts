import assert from 'node:assert/strict';
import { normalizeMessagePartUpdateEvent } from '../src/message-part-events.js';

function test(name: string, run: () => void): void {
  try {
    run();
  } catch (error) {
    console.error(`not ok - ${name}`);
    throw error;
  }
}

// ── valid payloads ─────────────────────────────────────────────────────

test('normalizeMessagePartUpdateEvent parses valid object', () => {
  const input = {
    type: 'message.part.updated',
    messageId: 'msg-1',
    partId: 'part-1',
    text: 'hello world',
    sequenceNumber: 1,
  };
  const result = normalizeMessagePartUpdateEvent(input);

  assert.ok(result.ok);
  if (result.ok) {
    assert.equal(result.update.messageId, 'msg-1');
    assert.equal(result.update.partId, 'part-1');
    assert.equal(result.update.sequenceNumber, 1);
    assert.deepEqual(result.update.patch, { text: 'hello world' });
  }
});

test('normalizeMessagePartUpdateEvent parses explicit patch object', () => {
  const input = {
    type: 'message.part.updated',
    messageId: 'msg-1',
    partId: 'part-1',
    patch: { text: 'from patch', reasoning: 'thinking' },
    sequenceNumber: 2,
  };
  const result = normalizeMessagePartUpdateEvent(input);

  assert.ok(result.ok);
  if (result.ok) {
    assert.deepEqual(result.update.patch, { text: 'from patch', reasoning: 'thinking' });
  }
});

test('normalizeMessagePartUpdateEvent parses JSON string', () => {
  const input = JSON.stringify({
    type: 'message.part.updated',
    messageId: 'msg-1',
    partId: 'part-1',
    text: 'json payload',
  });
  const result = normalizeMessagePartUpdateEvent(input);

  assert.ok(result.ok);
  if (result.ok) {
    assert.equal(result.update.messageId, 'msg-1');
  }
});

test('normalizeMessagePartUpdateEvent parses MessageEvent-like input', () => {
  const input = {
    data: JSON.stringify({
      type: 'message.part.updated',
      messageId: 'msg-1',
      partId: 'part-1',
      text: 'from event',
    }),
  };
  const result = normalizeMessagePartUpdateEvent(input);

  assert.ok(result.ok);
  if (result.ok) {
    assert.equal(result.update.messageId, 'msg-1');
  }
});

test('normalizeMessagePartUpdateEvent allows no sequenceNumber', () => {
  const input = {
    type: 'message.part.updated',
    messageId: 'msg-1',
    partId: 'part-1',
    text: 'no seq',
  };
  const result = normalizeMessagePartUpdateEvent(input);

  assert.ok(result.ok);
  if (result.ok) {
    assert.equal(result.update.sequenceNumber, undefined);
  }
});

// ── invalid: non-object input ──────────────────────────────────────────

test('normalizeMessagePartUpdateEvent rejects null', () => {
  const result = normalizeMessagePartUpdateEvent(null);
  assert.ok(!result.ok);
  if (!result.ok) {
    assert.equal(result.reason, 'invalid-event');
  }
});

test('normalizeMessagePartUpdateEvent rejects undefined', () => {
  const result = normalizeMessagePartUpdateEvent(undefined);
  assert.ok(!result.ok);
  if (!result.ok) {
    assert.equal(result.reason, 'invalid-event');
  }
});

test('normalizeMessagePartUpdateEvent rejects number', () => {
  const result = normalizeMessagePartUpdateEvent(42);
  assert.ok(!result.ok);
  if (!result.ok) {
    assert.equal(result.reason, 'invalid-event');
  }
});

test('normalizeMessagePartUpdateEvent rejects array', () => {
  const result = normalizeMessagePartUpdateEvent([1, 2, 3]);
  assert.ok(!result.ok);
  if (!result.ok) {
    assert.equal(result.reason, 'invalid-event');
  }
});

// ── invalid: wrong type ────────────────────────────────────────────────

test('normalizeMessagePartUpdateEvent rejects wrong type', () => {
  const input = { type: 'wrong.type', messageId: 'm', partId: 'p' };
  const result = normalizeMessagePartUpdateEvent(input);

  assert.ok(!result.ok);
  if (!result.ok) {
    assert.equal(result.reason, 'invalid-event');
  }
});

test('normalizeMessagePartUpdateEvent rejects empty data object (no messageId)', () => {
  const input = { data: '{}' };
  const result = normalizeMessagePartUpdateEvent(input);

  assert.ok(!result.ok);
  if (!result.ok) {
    // Empty parsed object has no messageId → falls through to invalid-message-id
    assert.equal(result.reason, 'invalid-message-id');
  }
});

// ── invalid: missing/empty identifiers ─────────────────────────────────

test('normalizeMessagePartUpdateEvent rejects missing messageId', () => {
  const input = { type: 'message.part.updated', partId: 'p', text: 'x' };
  const result = normalizeMessagePartUpdateEvent(input);

  assert.ok(!result.ok);
  if (!result.ok) {
    assert.equal(result.reason, 'invalid-message-id');
  }
});

test('normalizeMessagePartUpdateEvent rejects empty messageId', () => {
  const input = { type: 'message.part.updated', messageId: '  ', partId: 'p', text: 'x' };
  const result = normalizeMessagePartUpdateEvent(input);

  assert.ok(!result.ok);
  if (!result.ok) {
    assert.equal(result.reason, 'invalid-message-id');
  }
});

test('normalizeMessagePartUpdateEvent rejects missing partId', () => {
  const input = { type: 'message.part.updated', messageId: 'm', text: 'x' };
  const result = normalizeMessagePartUpdateEvent(input);

  assert.ok(!result.ok);
  if (!result.ok) {
    assert.equal(result.reason, 'invalid-part-id');
  }
});

test('normalizeMessagePartUpdateEvent rejects empty partId', () => {
  const input = { type: 'message.part.updated', messageId: 'm', partId: '  ', text: 'x' };
  const result = normalizeMessagePartUpdateEvent(input);

  assert.ok(!result.ok);
  if (!result.ok) {
    assert.equal(result.reason, 'invalid-part-id');
  }
});

// ── invalid: sequenceNumber ────────────────────────────────────────────

test('normalizeMessagePartUpdateEvent rejects non-numeric sequenceNumber', () => {
  const input = {
    type: 'message.part.updated',
    messageId: 'm',
    partId: 'p',
    text: 'x',
    sequenceNumber: 'abc',
  };
  const result = normalizeMessagePartUpdateEvent(input);

  assert.ok(!result.ok);
  if (!result.ok) {
    assert.equal(result.reason, 'invalid-sequence-number');
  }
});

test('normalizeMessagePartUpdateEvent rejects sequence_number as string', () => {
  const input = {
    type: 'message.part.updated',
    messageId: 'm',
    partId: 'p',
    text: 'x',
    sequence_number: 'not a number',
  };
  const result = normalizeMessagePartUpdateEvent(input);

  assert.ok(!result.ok);
  if (!result.ok) {
    assert.equal(result.reason, 'invalid-sequence-number');
  }
});

// ── invalid: patch ─────────────────────────────────────────────────────

test('normalizeMessagePartUpdateEvent rejects invalid patch (not a record)', () => {
  const input = {
    type: 'message.part.updated',
    messageId: 'm',
    partId: 'p',
    patch: 42,
  };
  const result = normalizeMessagePartUpdateEvent(input);

  assert.ok(!result.ok);
  if (!result.ok) {
    assert.equal(result.reason, 'invalid-patch');
  }
});

test('normalizeMessagePartUpdateEvent rejects empty patch (no fields)', () => {
  const input = {
    type: 'message.part.updated',
    messageId: 'm',
    partId: 'p',
  };
  const result = normalizeMessagePartUpdateEvent(input);

  assert.ok(!result.ok);
  if (!result.ok) {
    assert.equal(result.reason, 'empty-patch');
  }
});

test('normalizeMessagePartUpdateEvent rejects empty patch object', () => {
  const input = {
    type: 'message.part.updated',
    messageId: 'm',
    partId: 'p',
    patch: {},
  };
  const result = normalizeMessagePartUpdateEvent(input);

  assert.ok(!result.ok);
  if (!result.ok) {
    assert.equal(result.reason, 'empty-patch');
  }
});

// ── invalid: id/type change not allowed ────────────────────────────────

test('normalizeMessagePartUpdateEvent rejects patch with id change', () => {
  // Use explicit patch field to avoid having 'id' as a top-level key
  const input = {
    type: 'message.part.updated',
    messageId: 'm',
    partId: 'p',
    patch: { id: 'new-id', text: 'x' },
  };
  const result = normalizeMessagePartUpdateEvent(input);

  assert.ok(!result.ok);
  if (!result.ok) {
    assert.equal(result.reason, 'part-id-change-not-allowed');
  }
});

test('normalizeMessagePartUpdateEvent rejects patch with type change', () => {
  // Use explicit patch field to avoid duplicate 'type' keys
  const input = {
    type: 'message.part.updated',
    messageId: 'm',
    partId: 'p',
    patch: { type: 'text', text: 'x' },
  };
  const result = normalizeMessagePartUpdateEvent(input);

  assert.ok(!result.ok);
  if (!result.ok) {
    assert.equal(result.reason, 'part-type-change-not-allowed');
  }
});

// ── named SSE envelope compatibility ───────────────────────────────────

test('normalizeMessagePartUpdateEvent uses named SSE event type', () => {
  const input = {
    type: 'message.part.updated',
    data: JSON.stringify({
      messageId: 'msg-1',
      partId: 'part-1',
      text: 'named event',
    }),
  };
  const result = normalizeMessagePartUpdateEvent(input);

  assert.ok(result.ok);
  if (result.ok) {
    assert.equal(result.update.messageId, 'msg-1');
  }
});

test('normalizeMessagePartUpdateEvent rejects mismatched named SSE type', () => {
  const input = {
    type: 'wrong.event',
    data: JSON.stringify({
      messageId: 'msg-1',
      partId: 'part-1',
      text: 'mismatched',
    }),
  };
  const result = normalizeMessagePartUpdateEvent(input);

  assert.ok(!result.ok);
  if (!result.ok) {
    assert.equal(result.reason, 'invalid-event');
  }
});

// ── invalid JSON in data ───────────────────────────────────────────────

test('normalizeMessagePartUpdateEvent handles invalid JSON in data', () => {
  const input = { data: 'not-json' };
  const result = normalizeMessagePartUpdateEvent(input);

  assert.ok(!result.ok);
  if (!result.ok) {
    assert.equal(result.reason, 'invalid-event');
  }
});
