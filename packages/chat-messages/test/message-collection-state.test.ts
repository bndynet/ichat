import assert from 'node:assert/strict';
import {
  addMessage,
  patchMessageById,
  removeMessageById,
  clearMessages,
  cancelMessageData,
} from '../src/message-collection-state.js';
import { textPart, type ChatMessage } from '../src/types.js';

function test(name: string, run: () => void): void {
  try {
    run();
  } catch (error) {
    console.error(`not ok - ${name}`);
    throw error;
  }
}

function makeMsg(id: string, overrides: Partial<ChatMessage> = {}): ChatMessage {
  return {
    id,
    role: 'assistant' as const,
    parts: [textPart(`body-${id}`)],
    timestamp: 1000,
    ...overrides,
  };
}

// ── addMessage ──────────────────────────────────────────────────────────

test('addMessage appends and preserves existing references', () => {
  const a = makeMsg('a');
  const b = makeMsg('b');
  const arr = [a];

  const next = addMessage(arr, b);

  assert.equal(next.length, 2);
  assert.equal(next[0], a); // same reference
  assert.equal(next[1], b);
  assert.notEqual(next, arr); // new array
});

// ── patchMessageById ────────────────────────────────────────────────────

test('patchMessageById replaces only the target message', () => {
  const a = makeMsg('a');
  const b = makeMsg('b');
  const arr = [a, b];

  const next = patchMessageById(arr, 'a', { role: 'self' });

  assert.equal(next.length, 2);
  assert.equal(next[1], b); // unchanged reference
  assert.notEqual(next[0], a); // patched message is new
  assert.equal(next[0].role, 'self');
  assert.equal(next[0].id, 'a'); // id preserved
});

test('patchMessageById returns original array when id not found', () => {
  const a = makeMsg('a');
  const arr = [a];

  const next = patchMessageById(arr, 'missing', { role: 'self' });

  assert.equal(next, arr); // same reference — no-op
});

// ── removeMessageById ───────────────────────────────────────────────────

test('removeMessageById removes the target and preserves others', () => {
  const a = makeMsg('a');
  const b = makeMsg('b');
  const arr = [a, b];

  const next = removeMessageById(arr, 'a');

  assert.equal(next.length, 1);
  assert.equal(next[0], b); // same reference
});

test('removeMessageById returns original array when id not found', () => {
  const a = makeMsg('a');
  const arr = [a];

  const next = removeMessageById(arr, 'missing');

  assert.equal(next, arr); // same reference — no-op
});

// ── clearMessages ───────────────────────────────────────────────────────

test('clearMessages returns empty array', () => {
  assert.equal(clearMessages().length, 0);
});

// ── cancelMessageData ────────────────────────────────────────────────────

test('cancelMessageData sets streaming:false and cancelled:true', () => {
  const msg = makeMsg('m1', { streaming: true });
  const arr = [msg];

  const next = cancelMessageData(arr, 'm1');

  assert.equal(next.length, 1);
  assert.equal(next[0].streaming, false);
  assert.equal(next[0].cancelled, true);
});

test('cancelMessageData appends hint to last text part', () => {
  const msg = makeMsg('m1', {
    streaming: true,
    parts: [textPart('hello world')],
  });
  const arr = [msg];

  const next = cancelMessageData(arr, 'm1', '*— stopped —*');

  assert.equal(next.length, 1);
  const parts = next[0].parts!;
  assert.equal(parts.length, 1);
  const text = (parts[0] as { type: 'text'; text: string }).text;
  assert.ok(text.includes('hello world'));
  assert.ok(text.includes('*— stopped —*'));
});

test('cancelMessageData creates new text part for hint when none exists', () => {
  const msg: ChatMessage = {
    id: 'm1',
    role: 'assistant',
    parts: [{ type: 'reasoning', id: 'r1', text: 'thinking...' }],
    streaming: true,
    timestamp: 1000,
  };
  const arr = [msg];

  const next = cancelMessageData(arr, 'm1', '*— stopped —*');

  assert.equal(next.length, 1);
  const parts = next[0].parts!;
  assert.equal(parts.length, 2);
  assert.equal(parts[0].type, 'reasoning');
  assert.equal(parts[1].type, 'text');
  assert.ok(((parts[1] as { type: 'text'; text: string }).text).includes('*— stopped —*'));
});

test('cancelMessageData returns original array when message not found', () => {
  const msg = makeMsg('m1', { streaming: true });
  const arr = [msg];

  const next = cancelMessageData(arr, 'missing');

  assert.equal(next, arr);
});

test('cancelMessageData is idempotent on already cancelled message', () => {
  const msg = makeMsg('m1', { streaming: false, cancelled: true });
  const arr = [msg];

  const next = cancelMessageData(arr, 'm1');

  assert.equal(next, arr); // no change
});

test('cancelMessageData is idempotent on errored message', () => {
  const msg = makeMsg('m1', { streaming: true, error: 'fail' });
  const arr = [msg];

  const next = cancelMessageData(arr, 'm1');

  assert.equal(next, arr); // no change — error takes precedence
});

test('cancelMessageData with hint is idempotent on repeated calls', () => {
  const msg = makeMsg('m1', {
    streaming: true,
    parts: [textPart('hello')],
  });
  const arr = [msg];

  const first = cancelMessageData(arr, 'm1', '*— stopped —*');
  // After first cancel, streaming is false — second call should be no-op
  const second = cancelMessageData(first, 'm1', '*— stopped —*');

  assert.equal(second, first);
});

test('cancelMessageData preserves other messages unchanged', () => {
  const a = makeMsg('a', { streaming: true });
  const b = makeMsg('b', { streaming: false });
  const arr = [a, b];

  const next = cancelMessageData(arr, 'a');

  assert.equal(next.length, 2);
  assert.equal(next[1], b); // unchanged reference
  assert.equal(next[0].cancelled, true);
});

// ── immutability ──────────────────────────────────────────────────────

test('pure reducers never mutate input arrays', () => {
  const a = makeMsg('a');
  const b = makeMsg('b');
  const arr = [a, b];
  const frozen = [...arr];

  addMessage(arr, makeMsg('c'));
  assert.deepEqual(arr, frozen);

  patchMessageById(arr, 'a', { role: 'self' });
  assert.deepEqual(arr, frozen);

  removeMessageById(arr, 'a');
  assert.deepEqual(arr, frozen);

  cancelMessageData(arr, 'a', 'hint');
  assert.deepEqual(arr, frozen);
});
