import assert from 'node:assert/strict';
import {
  findMessagePart,
  appendMessagePart,
  replaceMessagePart,
  patchMessagePart,
  applyMessagePartUpdate,
} from '../src/message-part-state.js';
import { textPart, type ChatMessage, type MessagePart } from '../src/types.js';
import type { MessagePartUpdate } from '../src/message-part-events.js';

function test(name: string, run: () => void): void {
  try {
    run();
  } catch (error) {
    console.error(`not ok - ${name}`);
    throw error;
  }
}

function makeMsg(id: string, parts: MessagePart[] = [textPart(`body-${id}`)]): ChatMessage {
  return { id, role: 'assistant', parts, timestamp: 1000 };
}

// ── findMessagePart ────────────────────────────────────────────────────

test('findMessagePart returns message and part on match', () => {
  const part = textPart('hello');
  const msg = makeMsg('m1', [part]);
  const result = findMessagePart([msg], 'm1', part.id);

  assert.ok(result.ok);
  if (result.ok) {
    assert.equal(result.message, msg);
    assert.equal(result.part, part);
  }
});

test('findMessagePart fails with message-not-found', () => {
  const part = textPart('hello');
  const msg = makeMsg('m1', [part]);
  const result = findMessagePart([msg], 'missing-msg', part.id);

  assert.ok(!result.ok);
  if (!result.ok) {
    assert.equal(result.reason, 'message-not-found');
  }
});

test('findMessagePart fails with part-not-found', () => {
  const msg = makeMsg('m1', [textPart('hello')]);
  const result = findMessagePart([msg], 'm1', 'missing-part');

  assert.ok(!result.ok);
  if (!result.ok) {
    assert.equal(result.reason, 'part-not-found');
  }
});

test('findMessagePart finds correct part among many', () => {
  const p1 = textPart('a');
  const p2 = textPart('b');
  const p3 = textPart('c');
  const msg = makeMsg('m1', [p1, p2, p3]);
  const result = findMessagePart([msg], 'm1', p2.id);

  assert.ok(result.ok);
  if (result.ok) {
    assert.equal(result.part, p2);
  }
});

// ── appendMessagePart ──────────────────────────────────────────────────

test('appendMessagePart adds part to correct message', () => {
  const msg = makeMsg('m1', [textPart('existing')]);
  const newPart = textPart('new');
  const next = appendMessagePart([msg], 'm1', newPart);

  assert.equal(next.length, 1);
  assert.equal(next[0].parts.length, 2);
  assert.equal(next[0].parts[1], newPart);
  assert.notEqual(next, [msg]); // new array
});

test('appendMessagePart preserves other messages unchanged', () => {
  const msgA = makeMsg('a');
  const msgB = makeMsg('b');
  const arr = [msgA, msgB];
  const newPart = textPart('new');

  const next = appendMessagePart(arr, 'a', newPart);

  assert.equal(next.length, 2);
  assert.equal(next[1], msgB); // unchanged reference
  assert.notEqual(next[0], msgA); // target message is new
});

test('appendMessagePart returns copy when message not found', () => {
  const msg = makeMsg('m1');
  const newPart = textPart('new');
  const next = appendMessagePart([msg], 'missing', newPart);

  assert.equal(next.length, 1);
  assert.notEqual(next, [msg]); // new array reference
  assert.deepEqual(next[0], msg); // but content unchanged
});

test('appendMessagePart does not mutate input array', () => {
  const msg = makeMsg('m1');
  const arr = [msg];
  const frozen = [...arr];

  appendMessagePart(arr, 'm1', textPart('new'));
  assert.deepEqual(arr, frozen);
});

// ── replaceMessagePart ─────────────────────────────────────────────────

test('replaceMessagePart replaces part by id', () => {
  const oldPart = textPart('old');
  const msg = makeMsg('m1', [oldPart]);
  const newPart = textPart('new', oldPart.id); // same id

  const result = replaceMessagePart([msg], 'm1', oldPart.id, newPart);

  assert.ok(result.ok);
  if (result.ok) {
    assert.equal(result.part, newPart);
    assert.equal(result.messages[0].parts[0], newPart);
  }
});

test('replaceMessagePart fails with message-not-found', () => {
  const msg = makeMsg('m1');
  const result = replaceMessagePart([msg], 'missing', 'any-id', textPart('x'));

  assert.ok(!result.ok);
  if (!result.ok) {
    assert.equal(result.reason, 'message-not-found');
  }
});

test('replaceMessagePart fails with part-not-found', () => {
  const msg = makeMsg('m1');
  const result = replaceMessagePart([msg], 'm1', 'missing-part', textPart('x'));

  assert.ok(!result.ok);
  if (!result.ok) {
    assert.equal(result.reason, 'part-not-found');
  }
});

test('replaceMessagePart preserves other messages', () => {
  const oldPart = textPart('old');
  const msgA = makeMsg('a', [oldPart]);
  const msgB = makeMsg('b');
  const newPart = textPart('new', oldPart.id);

  const result = replaceMessagePart([msgA, msgB], 'a', oldPart.id, newPart);

  assert.ok(result.ok);
  if (result.ok) {
    assert.equal(result.messages[1], msgB);
  }
});

// ── patchMessagePart ───────────────────────────────────────────────────

test('patchMessagePart merges patch into existing part', () => {
  const original = textPart('hello');
  const msg = makeMsg('m1', [original]);

  const result = patchMessagePart([msg], 'm1', original.id, { text: 'world' });

  assert.ok(result.ok);
  if (result.ok) {
    const patched = result.messages[0].parts[0];
    if (patched.type === 'text') {
      assert.equal(patched.text, 'world');
    }
    assert.equal(patched.id, original.id);
  }
});

test('patchMessagePart fails with part-not-found', () => {
  const msg = makeMsg('m1');
  const result = patchMessagePart([msg], 'm1', 'missing', { text: 'x' });

  assert.ok(!result.ok);
  if (!result.ok) {
    assert.equal(result.reason, 'part-not-found');
  }
});

test('patchMessagePart preserves unpatched fields', () => {
  const original = textPart('hello');
  const msg = makeMsg('m1', [original]);

  const result = patchMessagePart([msg], 'm1', original.id, {});

  assert.ok(result.ok);
  if (result.ok) {
    const patched = result.messages[0].parts[0];
    if (patched.type === 'text') {
      assert.equal(patched.text, 'hello'); // unchanged
    }
  }
});

// ── applyMessagePartUpdate ─────────────────────────────────────────────

test('applyMessagePartUpdate applies patch to text part', () => {
  const part = textPart('old');
  const msg = makeMsg('m1', [part]);
  const update: MessagePartUpdate = {
    messageId: 'm1',
    partId: part.id,
    patch: { text: 'new' },
  };

  const result = applyMessagePartUpdate([msg], update);

  assert.ok(result.ok);
  if (result.ok) {
    if (result.part.type === 'text') {
      assert.equal(result.part.text, 'new');
    }
  }
});

test('applyMessagePartUpdate fails with message-not-found', () => {
  const part = textPart('old');
  const msg = makeMsg('m1', [part]);
  const update: MessagePartUpdate = {
    messageId: 'missing',
    partId: part.id,
    patch: { text: 'new' },
  };

  const result = applyMessagePartUpdate([msg], update);

  assert.ok(!result.ok);
  if (!result.ok) {
    assert.equal(result.reason, 'message-not-found');
  }
});

test('applyMessagePartUpdate fails with part-not-found', () => {
  const msg = makeMsg('m1');
  const update: MessagePartUpdate = {
    messageId: 'm1',
    partId: 'missing',
    patch: { text: 'new' },
  };

  const result = applyMessagePartUpdate([msg], update);

  assert.ok(!result.ok);
  if (!result.ok) {
    assert.equal(result.reason, 'part-not-found');
  }
});

// ── immutability ───────────────────────────────────────────────────────

test('all reducers never mutate input arrays', () => {
  const part = textPart('hello');
  const msg = makeMsg('m1', [part]);
  const arr = [msg];
  const frozen: ChatMessage[] = JSON.parse(JSON.stringify(arr));

  findMessagePart(arr, 'm1', part.id);
  assert.deepEqual(arr, frozen);

  appendMessagePart(arr, 'm1', textPart('x'));
  assert.deepEqual(arr, frozen);

  replaceMessagePart(arr, 'm1', part.id, textPart('x', part.id));
  assert.deepEqual(arr, frozen);

  patchMessagePart(arr, 'm1', part.id, { text: 'x' });
  assert.deepEqual(arr, frozen);

  applyMessagePartUpdate(arr, { messageId: 'm1', partId: part.id, patch: { text: 'x' } });
  assert.deepEqual(arr, frozen);
});
