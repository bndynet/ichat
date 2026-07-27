import assert from 'node:assert/strict';
import { normalizeHistoryMessages } from '../src/normalize-history.js';
import { textPart, reasoningPart } from '../src/types.js';
import type { ChatMessage, MessagePart, ToolCallPart } from '../src/types.js';

function test(name: string, run: () => void): void {
  try {
    run();
  } catch (error) {
    console.error(`not ok - ${name}`);
    throw error;
  }
}

// ── helpers ────────────────────────────────────────────────────────────

function makeMsg(id: string, overrides: Partial<ChatMessage> = {}): ChatMessage {
  return {
    id,
    role: 'assistant',
    parts: [textPart(`body-${id}`)],
    timestamp: 1000,
    ...overrides,
  };
}

function makeStreamingMsg(id: string): ChatMessage {
  return makeMsg(id, { streaming: true });
}

function makeMsgWithStreamingPart(id: string): ChatMessage {
  const part = textPart(`body-${id}`);
  (part as MessagePart).status = 'streaming';
  return makeMsg(id, { parts: [part as MessagePart] });
}

function makeMsgWithPendingPart(id: string): ChatMessage {
  const part = textPart(`body-${id}`);
  (part as MessagePart).status = 'pending';
  return makeMsg(id, { parts: [part as MessagePart] });
}

// ── basic non-mutation ─────────────────────────────────────────────────

test('returns a new array reference', () => {
  const msgs = [makeMsg('a')];
  const result = normalizeHistoryMessages(msgs);
  assert.notEqual(result, msgs);
});

test('does not mutate input array elements', () => {
  const original = makeStreamingMsg('a');
  const msgs = [original];
  normalizeHistoryMessages(msgs);
  assert.equal(original.streaming, true); // unchanged
});

// ── streaming: false ───────────────────────────────────────────────────

test('sets streaming to false on streaming messages', () => {
  const msgs = [makeStreamingMsg('a')];
  const [msg] = normalizeHistoryMessages(msgs);
  assert.equal(msg.streaming, false);
});

test('marks interrupted streaming messages as cancelled', () => {
  const msgs = [makeStreamingMsg('a')];
  const [msg] = normalizeHistoryMessages(msgs);
  assert.equal(msg.cancelled, true);
});

test('preserves existing cancelled flag', () => {
  const msgs = [makeMsg('a', { cancelled: true })];
  const [msg] = normalizeHistoryMessages(msgs);
  assert.equal(msg.cancelled, true);
});

test('does not add cancelled to non-streaming terminal messages', () => {
  const msgs = [makeMsg('a')];
  const [msg] = normalizeHistoryMessages(msgs);
  assert.equal(msg.cancelled, undefined);
});

// ── terminal messages pass through ─────────────────────────────────────

test('returns the same message reference for terminal messages (no streaming fields)', () => {
  const original = makeMsg('a');
  const msgs = [original];
  const [msg] = normalizeHistoryMessages(msgs);
  assert.equal(msg, original); // same object reference — fast path
});

// ── part status normalization ──────────────────────────────────────────

test('converts streaming part status to complete (default)', () => {
  const msgs = [makeMsgWithStreamingPart('a')];
  const [msg] = normalizeHistoryMessages(msgs);
  assert.equal(msg.parts[0].status, 'complete');
});

test('converts pending part status to complete (default)', () => {
  const msgs = [makeMsgWithPendingPart('a')];
  const [msg] = normalizeHistoryMessages(msgs);
  assert.equal(msg.parts[0].status, 'complete');
});

test('uses custom interruptedStatus', () => {
  const msgs = [makeMsgWithStreamingPart('a')];
  const [msg] = normalizeHistoryMessages(msgs, { interruptedStatus: 'cancelled' });
  assert.equal(msg.parts[0].status, 'cancelled');
});

test('does not mutate complete parts', () => {
  const msgs = [makeMsg('a')]; // textPart defaults to no status (complete)
  const [msg] = normalizeHistoryMessages(msgs);
  assert.equal(msg.parts[0].status, undefined);
});

test('does not mutate error parts', () => {
  const msgs = [makeMsg('a', {
    parts: [{ id: 'p1', type: 'text', text: 'x', status: 'error' } as MessagePart],
  })];
  const [msg] = normalizeHistoryMessages(msgs);
  assert.equal(msg.parts[0].status, 'error');
});

// ── empty message removal ──────────────────────────────────────────────

test('removes messages with no parts by default', () => {
  const msgs = [
    makeMsg('a'),
    { id: 'empty', role: 'assistant' as const, parts: [] },
    makeMsg('c'),
  ];
  const result = normalizeHistoryMessages(msgs);
  assert.equal(result.length, 2);
  assert.equal(result[0].id, 'a');
  assert.equal(result[1].id, 'c');
});

test('keeps empty messages when removeEmptyMessages is false', () => {
  const msgs = [
    makeMsg('a'),
    { id: 'empty', role: 'assistant' as const, parts: [] },
  ];
  const result = normalizeHistoryMessages(msgs, { removeEmptyMessages: false });
  assert.equal(result.length, 2);
});

// ── mixed batch ────────────────────────────────────────────────────────

test('handles mixed batch: normal + streaming + empty', () => {
  const normal = makeMsg('normal');
  const streaming = makeStreamingMsg('streaming');
  const empty: ChatMessage = { id: 'empty', role: 'assistant', parts: [] };
  const withStreamingPart = makeMsgWithStreamingPart('streaming-part');

  const result = normalizeHistoryMessages([normal, streaming, empty, withStreamingPart]);

  assert.equal(result.length, 3);

  // normal — untouched reference (fast path)
  assert.equal(result[0], normal);

  // streaming — patched
  assert.equal(result[1].id, 'streaming');
  assert.equal(result[1].streaming, false);
  assert.equal(result[1].cancelled, true);

  // streaming-part — part status fixed
  assert.equal(result[2].id, 'streaming-part');
  assert.equal(result[2].streaming, false);
  assert.equal(result[2].parts[0].status, 'complete');
});

// ── order preservation ─────────────────────────────────────────────────

test('preserves message order', () => {
  const msgs = [makeMsg('a'), makeMsg('b'), makeMsg('c'), makeMsg('d')];
  const result = normalizeHistoryMessages(msgs);
  assert.deepEqual(result.map((m) => m.id), ['a', 'b', 'c', 'd']);
});

// ── stable IDs ─────────────────────────────────────────────────────────

test('preserves message IDs', () => {
  const msgs = [makeMsg('abc-123'), makeStreamingMsg('def-456')];
  const result = normalizeHistoryMessages(msgs);
  assert.equal(result[0].id, 'abc-123');
  assert.equal(result[1].id, 'def-456');
});

test('preserves part IDs', () => {
  const part = textPart('hello');
  const originalId = part.id;
  (part as MessagePart).status = 'streaming';
  const msgs = [makeMsg('a', { parts: [part as MessagePart] })];
  const [msg] = normalizeHistoryMessages(msgs);
  assert.equal(msg.parts[0].id, originalId);
});

// ── non-text parts ─────────────────────────────────────────────────────

test('normalizes reasoning part with streaming status', () => {
  const part = reasoningPart('thinking...');
  (part as MessagePart).status = 'streaming';
  const msgs = [makeMsg('a', { parts: [part as MessagePart] })];
  const [msg] = normalizeHistoryMessages(msgs);
  assert.equal(msg.parts[0].status, 'complete');
});

test('does not touch terminal tool-call parts', () => {
  const part: ToolCallPart = {
    id: 'tc-1',
    type: 'tool-call',
    toolCallId: 'call-1',
    toolName: 'search',
    state: 'output-available',
  };
  const msgs = [makeMsg('a', { parts: [part as unknown as MessagePart] })];
  const [msg] = normalizeHistoryMessages(msgs);
  assert.equal(msg.parts[0].type, 'tool-call');
  assert.equal((msg.parts[0] as ToolCallPart).state, 'output-available');
});

// ── empty array ────────────────────────────────────────────────────────

test('handles empty array', () => {
  const result = normalizeHistoryMessages([]);
  assert.equal(result.length, 0);
  assert.ok(Array.isArray(result));
});
