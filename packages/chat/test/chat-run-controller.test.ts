/**
 * Integration tests for ChatRunController.
 *
 * Verifies the full lifecycle: start → appendText → updatePart →
 * complete / fail / cancel, plus edge cases like signal abort and
 * no-op guards outside the streaming state.
 */

import assert from 'node:assert/strict';
import type { ChatMessage, MessagePart, TextPart } from '@bndynet/ichat-messages';
import { textPart } from '@bndynet/ichat-messages';
import { ChatRunController } from '../src/controllers/chat-run-controller.js';
import type { ChatMessageStorePort } from '../src/controllers/chat-run-controller.js';

// ── mock store ────────────────────────────────────────────────────────

function createMockStore(): ChatMessageStorePort & { _messages: ChatMessage[] } {
  const messages: ChatMessage[] = [];
  return {
    _messages: messages,
    get messages() {
      return messages;
    },
    addMessage(msg: ChatMessage) {
      messages.push(msg);
    },
    updateMessage(id: string, partial: Partial<ChatMessage>) {
      const idx = messages.findIndex((m) => m.id === id);
      if (idx !== -1) Object.assign(messages[idx], partial);
    },
    appendPart(messageId: string, part: MessagePart) {
      const msg = messages.find((m) => m.id === messageId);
      if (msg) msg.parts = [...(msg.parts ?? []), part];
    },
    updatePart(_messageId: string, _partId: string, _patch: Partial<MessagePart>) {
      // unused by ChatRunController directly — uses tryUpdatePart
    },
    cancelMessage(id: string, hint?: string) {
      const msg = messages.find((m) => m.id === id);
      if (msg) {
        msg.streaming = false;
        msg.cancelled = true;
        if (hint) msg.parts = [...(msg.parts ?? []), textPart(hint)];
      }
    },
    tryUpdatePart(messageId: string, partId: string, patch: Partial<MessagePart>) {
      const msg = messages.find((m) => m.id === messageId);
      if (!msg) return { ok: false as const, reason: 'message-not-found' as const };
      const part = msg.parts?.find((p) => p.id === partId);
      if (!part) return { ok: false as const, reason: 'part-not-found' as const };
      Object.assign(part, patch);
      return { ok: true as const, part };
    },
  };
}

function getMsgText(store: ReturnType<typeof createMockStore>, partId: string): string {
  const part = store._messages[0]?.parts?.find((p) => p.id === partId);
  return (part as TextPart)?.text ?? '';
}

// ── tests ────────────────────────────────────────────────────────────

// start
{
  const store = createMockStore();
  const run = new ChatRunController(store);
  run.start([textPart('hello', { id: 'p1' })]);
  assert.equal(run.status, 'streaming');
  assert.equal(run.messageId.length > 0, true);
  assert.equal(store._messages.length, 1);
  assert.equal(store._messages[0].role, 'assistant');
  assert.equal(store._messages[0].streaming, true);
}

// start with custom messageId
{
  const store = createMockStore();
  const run = new ChatRunController(store, { messageId: 'custom-id' });
  run.start();
  assert.equal(run.messageId, 'custom-id');
}

// start is no-op when already started
{
  const store = createMockStore();
  const run = new ChatRunController(store);
  run.start([textPart('first')]);
  run.start([textPart('second')]);
  assert.equal(store._messages.length, 1);
}

// appendText accumulates
{
  const store = createMockStore();
  const run = new ChatRunController(store);
  run.start([textPart('', { id: 'body' })]);
  run.appendText('body', 'Hello');
  run.appendText('body', ' world');
  run.appendText('body', '!');
  assert.equal(getMsgText(store, 'body'), 'Hello world!');
}

// appendText part-not-found
{
  const store = createMockStore();
  const run = new ChatRunController(store);
  run.start([textPart('', { id: 'body' })]);
  const r = run.appendText('nonexistent', 'x');
  assert.equal(r.ok, false);
  if (!r.ok) assert.equal(r.reason, 'part-not-found');
}

// appendText part-type-mismatch
{
  const store = createMockStore();
  const run = new ChatRunController(store);
  run.start([{ type: 'reasoning', id: 'r1', text: 'thinking' }]);
  const r = run.appendText('r1', 'x');
  assert.equal(r.ok, false);
  if (!r.ok) assert.equal(r.reason, 'part-type-mismatch');
}

// appendPart adds structured part
{
  const store = createMockStore();
  const run = new ChatRunController(store);
  run.start([textPart('hello')]);
  run.appendPart({ type: 'reasoning', id: 'r1', text: 'thinking...' });
  assert.equal(store._messages[0].parts!.length, 2);
}

// updatePart patches
{
  const store = createMockStore();
  const run = new ChatRunController(store);
  run.start([textPart('hello', { id: 'p1', status: 'streaming' })]);
  const r = run.updatePart('p1', { status: 'complete' });
  assert.ok(r.ok);
  assert.equal(store._messages[0].parts![0].status, 'complete');
}

// complete
{
  const store = createMockStore();
  const run = new ChatRunController(store);
  run.start([textPart('hello')]);
  run.complete();
  assert.equal(run.status, 'completed');
  assert.equal(store._messages[0].streaming, false);
}

// complete with patch
{
  const store = createMockStore();
  const run = new ChatRunController(store);
  run.start([textPart('hello')]);
  run.complete({ duration: 1234 });
  assert.equal(store._messages[0].duration, 1234);
}

// complete is no-op when done
{
  const store = createMockStore();
  const run = new ChatRunController(store);
  run.start([textPart('hello')]);
  run.complete();
  run.complete();
  assert.equal(run.status, 'completed');
}

// fail
{
  const store = createMockStore();
  const run = new ChatRunController(store);
  run.start([textPart('hello')]);
  run.fail('Network error', 'timed out');
  assert.equal(run.status, 'error');
  assert.equal(store._messages[0].error, 'Network error');
  assert.equal(store._messages[0].streaming, false);
}

// cancel with onCancel
{
  let cancelled = false;
  const store = createMockStore();
  const run = new ChatRunController(store, { onCancel: () => { cancelled = true; } });
  run.start([textPart('hello')]);
  run.cancel('*— stopped —*');
  assert.equal(run.status, 'cancelled');
  assert.equal(cancelled, true);
  assert.equal(store._messages[0].cancelled, true);
}

// signal aborted after complete
{
  const store = createMockStore();
  const run = new ChatRunController(store);
  run.start([textPart('hello')]);
  const sig = run.signal;
  assert.equal(sig.aborted, false);
  run.complete();
  assert.equal(sig.aborted, true);
}

// signal aborted after cancel
{
  const store = createMockStore();
  const run = new ChatRunController(store);
  run.start([textPart('hello')]);
  const sig = run.signal;
  run.cancel();
  assert.equal(sig.aborted, true);
}

// signal aborted after fail
{
  const store = createMockStore();
  const run = new ChatRunController(store);
  run.start([textPart('hello')]);
  const sig = run.signal;
  run.fail('boom');
  assert.equal(sig.aborted, true);
}

// methods no-op before start
{
  const store = createMockStore();
  const run = new ChatRunController(store);
  assert.equal(run.status, 'idle');
  run.appendText('x', 'y');
  run.complete();
  run.cancel();
  run.fail('x');
  assert.equal(store._messages.length, 0);
}

// methods no-op after complete
{
  const store = createMockStore();
  const run = new ChatRunController(store);
  run.start([textPart('hello', { id: 'p1' })]);
  run.complete();
  run.appendText('p1', 'more');
  run.appendPart({ type: 'reasoning', id: 'r1', text: 'x' });
  assert.equal(getMsgText(store, 'p1'), 'hello');
}

console.log('ChatRunController: all tests passed');

