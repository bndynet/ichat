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
import type { ChatMutationOutcome } from '../src/state/mutation-outcome.js';

// ── mock store ────────────────────────────────────────────────────────

/**
 * Set `reject` to emulate a controlled host that calls `preventDefault()`:
 * lifecycle mutations then report a rejected proposal and change nothing.
 */
function createMockStore(): ChatMessageStorePort & {
  _messages: ChatMessage[];
  reject: boolean;
} {
  const messages: ChatMessage[] = [];
  const flags = { reject: false };
  const rejected: ChatMutationOutcome = { changed: true, accepted: false };
  const applied: ChatMutationOutcome = { changed: true, accepted: true };
  const noOp: ChatMutationOutcome = { changed: false, accepted: true };

  return {
    _messages: messages,
    get reject() {
      return flags.reject;
    },
    set reject(value: boolean) {
      flags.reject = value;
    },
    get messages() {
      return messages;
    },
    addMessage(msg: ChatMessage): ChatMutationOutcome {
      if (flags.reject) return rejected;
      messages.push(msg);
      return applied;
    },
    updateMessage(id: string, partial: Partial<ChatMessage>): ChatMutationOutcome {
      if (flags.reject) return rejected;
      const idx = messages.findIndex((m) => m.id === id);
      if (idx === -1) return noOp;
      Object.assign(messages[idx], partial);
      return applied;
    },
    appendPart(messageId: string, part: MessagePart) {
      const msg = messages.find((m) => m.id === messageId);
      if (msg) msg.parts = [...(msg.parts ?? []), part];
    },
    updatePart(_messageId: string, _partId: string, _patch: Partial<MessagePart>) {
      // unused by ChatRunController directly — uses tryUpdatePart
    },
    cancelMessage(id: string, hint?: string): ChatMutationOutcome {
      if (flags.reject) return rejected;
      const msg = messages.find((m) => m.id === id);
      if (!msg) return noOp;
      msg.streaming = false;
      msg.cancelled = true;
      if (hint) msg.parts = [...(msg.parts ?? []), textPart(hint)];
      return applied;
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

/** A port written against the older `void`-returning signature. */
function createLegacyVoidStore(): ChatMessageStorePort & { _messages: ChatMessage[] } {
  const inner = createMockStore();
  return {
    _messages: inner._messages,
    get messages() {
      return inner.messages;
    },
    addMessage(msg: ChatMessage) {
      inner.addMessage(msg);
    },
    updateMessage(id: string, partial: Partial<ChatMessage>) {
      inner.updateMessage(id, partial);
    },
    cancelMessage(id: string, hint?: string) {
      inner.cancelMessage(id, hint);
    },
    appendPart(messageId: string, part: MessagePart) {
      inner.appendPart(messageId, part);
    },
    updatePart(messageId: string, partId: string, patch: Partial<MessagePart>) {
      inner.updatePart(messageId, partId, patch);
    },
    tryUpdatePart(messageId: string, partId: string, patch: Partial<MessagePart>) {
      return inner.tryUpdatePart(messageId, partId, patch);
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
  const run = new ChatRunController(store, {
    onCancel: () => {
      cancelled = true;
    },
  });
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

// ── controlled-host rejection ─────────────────────────────────────────

// rejected start stays idle and claims no message
{
  const store = createMockStore();
  store.reject = true;
  const run = new ChatRunController(store);
  const outcome = run.start([textPart('', { id: 'body' })]);

  assert.equal(outcome.accepted, false);
  assert.equal(run.status, 'idle');
  assert.equal(store._messages.length, 0);
  assert.equal(run.signal.aborted, false);

  const appended = run.appendText('body', 'x');
  assert.equal(appended.ok, false);
  if (!appended.ok) assert.equal(appended.reason, 'message-not-found');

  // retryable once the host stops rejecting
  store.reject = false;
  assert.equal(run.start([textPart('', { id: 'body' })]).accepted, true);
  assert.equal(run.status, 'streaming');
  assert.equal(store._messages.length, 1);
}

// rejected complete stays streaming and keeps the signal alive
{
  const store = createMockStore();
  const run = new ChatRunController(store);
  run.start([textPart('hello', { id: 'body' })]);
  store.reject = true;

  assert.equal(run.complete().accepted, false);
  assert.equal(run.status, 'streaming');
  assert.equal(store._messages[0].streaming, true);
  assert.equal(run.signal.aborted, false);

  // streaming may continue, and completing again succeeds
  assert.ok(run.appendText('body', ' world').ok);
  store.reject = false;
  assert.equal(run.complete().accepted, true);
  assert.equal(run.status, 'completed');
  assert.equal(store._messages[0].streaming, false);
  assert.equal(getMsgText(store, 'body'), 'hello world');
  assert.equal(run.signal.aborted, true);
}

// rejected fail stays streaming and records nothing
{
  const store = createMockStore();
  const run = new ChatRunController(store);
  run.start([textPart('hello')]);
  store.reject = true;

  assert.equal(run.fail('boom').accepted, false);
  assert.equal(run.status, 'streaming');
  assert.equal(store._messages[0].error, undefined);
  assert.equal(store._messages[0].streaming, true);
  assert.equal(run.signal.aborted, false);
}

// rejected cancel must not invoke onCancel or abort the signal
{
  let cancelled = 0;
  const store = createMockStore();
  const run = new ChatRunController(store, {
    onCancel: () => {
      cancelled += 1;
    },
  });
  run.start([textPart('hello')]);
  store.reject = true;

  assert.equal(run.cancel('stopped').accepted, false);
  assert.equal(run.status, 'streaming');
  assert.equal(cancelled, 0);
  assert.equal(store._messages[0].cancelled, undefined);
  assert.equal(run.signal.aborted, false);

  store.reject = false;
  assert.equal(run.cancel('stopped').accepted, true);
  assert.equal(run.status, 'cancelled');
  assert.equal(cancelled, 1);
}

// ── a no-op is not a rejection ────────────────────────────────────────

// complete still reaches a terminal state when the message is gone
{
  const store = createMockStore();
  const run = new ChatRunController(store);
  run.start([textPart('hello')]);
  store._messages.length = 0; // host removed or cleared the message

  const outcome = run.complete();
  assert.equal(outcome.changed, false);
  assert.equal(outcome.accepted, true);
  assert.equal(run.status, 'completed');
  assert.equal(run.signal.aborted, true);
}

// cancel still reaches a terminal state when the message is gone
{
  let cancelled = false;
  const store = createMockStore();
  const run = new ChatRunController(store, {
    onCancel: () => {
      cancelled = true;
    },
  });
  run.start([textPart('hello')]);
  store._messages.length = 0;

  assert.equal(run.cancel().changed, false);
  assert.equal(run.status, 'cancelled');
  assert.equal(cancelled, true);
}

// ── signal & legacy port ──────────────────────────────────────────────

// signal is already aborted when first read after a terminal transition
{
  const store = createMockStore();
  const run = new ChatRunController(store);
  run.start([textPart('hello')]);
  run.complete();
  assert.equal(run.signal.aborted, true);
}

// a port written against the older `void` signature still transitions
{
  const store = createLegacyVoidStore();
  const run = new ChatRunController(store);
  assert.equal(run.start([textPart('hello')]).accepted, true);
  assert.equal(run.status, 'streaming');
  assert.equal(run.complete().accepted, true);
  assert.equal(run.status, 'completed');
  assert.equal(store._messages[0].streaming, false);
}

console.log('ChatRunController: all tests passed');
