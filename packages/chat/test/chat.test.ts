/**
 * API-surface tests for `<i-chat>`.
 *
 * Verifies module imports, custom element registration, constructor,
 * default property values, and key method signatures.
 *
 * Rendered slots, confirmations, and child lifecycle behavior still require a
 * browser environment such as Playwright or @web/test-runner.
 */

import assert from 'node:assert/strict';
import type { ChatMessage, MessagesChangeDetail } from '@bndynet/ichat-messages';
import { textPart } from '@bndynet/ichat-messages';
import type { ChatRunController } from '../src/controllers/chat-run-controller.js';
import '../src/components/chat.js';

type TestMessage = ChatMessage;

type TestMessagesChangeDetail = MessagesChangeDetail & {
  controlled: boolean;
  committed: boolean;
};

type TestChatElement = HTMLElement & {
  busy: boolean;
  disabled: boolean;
  messageMode: string;
  showVoiceInput: boolean;
  messages: TestMessage[];
  config: Record<string, unknown>;
  ready: Promise<void>;
  use(middleware: {
    name: string;
    beforeSend: (content: string) => string | null | Promise<string | null>;
  }): () => void;
  addMessage(message: TestMessage): void;
  updateMessage(id: string, patch: Partial<TestMessage>): void;
  createRunController(options?: { messageId?: string }): ChatRunController;
  _handleSend(event: CustomEvent<{ content: string }>): Promise<void>;
};

function createChat(): TestChatElement {
  return new Ctor() as TestChatElement;
}

function sendEvent(content: string): CustomEvent<{ content: string }> {
  return {
    detail: { content },
    stopPropagation() { /* test event stub */ },
  } as unknown as CustomEvent<{ content: string }>;
}

function deferred<T>(): {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason?: unknown) => void;
} {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

// Module & registration
assert.ok(customElements.get('i-chat'), 'i-chat should be registered');

const Ctor = customElements.get('i-chat')!;
const el = new Ctor() as TestChatElement & Record<string, unknown>;

assert.doesNotThrow(() => new Ctor(), 'constructor should not throw');

// Default property values
assert.equal(el.messageMode, 'uncontrolled');
assert.equal(el.disabled, false);
assert.equal(el.busy, false);
assert.equal(el.showVoiceInput, true);

// Config exists
const cfg = el.config as Record<string, unknown> | undefined;
assert.ok(cfg, 'config should exist');

// Methods exist
assert.equal(typeof el.addMessage, 'function');
assert.equal(typeof el.updateMessage, 'function');
assert.equal(typeof el.appendPart, 'function');
assert.equal(typeof el.removeMessage, 'function');
assert.equal(typeof el.clear, 'function');
assert.equal(typeof el.cancel, 'function');
assert.equal(typeof el.cancelMessage, 'function');
assert.equal(typeof el.focusInput, 'function');
assert.equal(typeof el.showError, 'function');
assert.equal(typeof el.dismissError, 'function');
assert.equal(typeof el.requestConfirmation, 'function');
assert.equal(typeof el.clearConfirmations, 'function');
assert.equal(typeof el.createRunController, 'function');
assert.equal(typeof el.use, 'function');
assert.equal('registerCodeRenderer' in el, false);
assert.equal('registerRenderer' in el, false);

// ready returns a Promise
assert.ok(el.ready instanceof Promise, 'ready should be a Promise');

// Public `messages` is the single source of truth for Store mutations.
{
  const chat = createChat();
  const initial: TestMessage[] = [{
    id: 'existing',
    role: 'assistant',
    parts: [],
    streaming: false,
  }];

  chat.messages = initial;
  chat.updateMessage('existing', { streaming: true });

  assert.equal(chat.messages.length, 1);
  assert.equal(chat.messages[0]?.id, 'existing');
  assert.equal(chat.messages[0]?.streaming, true);
}

// Adding after an external assignment preserves the externally-owned history.
{
  const chat = createChat();
  chat.messages = [{ id: 'existing', role: 'assistant', parts: [] }];

  chat.addMessage({ id: 'new', role: 'assistant', parts: [] });

  assert.deepEqual(chat.messages.map((message) => message.id), ['existing', 'new']);
}

// Controlled mode is read live, including before first connection/render.
{
  const chat = createChat();
  let change: TestMessagesChangeDetail | undefined;

  chat.messageMode = 'controlled';
  chat.addEventListener('messages-change', (event) => {
    change = (event as CustomEvent<TestMessagesChangeDetail>).detail;
  });
  chat.addMessage({ id: 'proposed', role: 'assistant', parts: [] });

  assert.deepEqual(chat.messages, []);
  assert.equal(change?.controlled, true);
  assert.equal(change?.committed, false);
  assert.deepEqual(change?.messages.map((message) => message.id), ['proposed']);
}

// Derived busy state follows the state actually accepted by a controlled host.
{
  const rejected = createChat();
  rejected.messageMode = 'controlled';
  rejected.addEventListener('messages-change', (event) => {
    assert.equal(event.cancelable, true);
    event.preventDefault();
  });
  rejected.addMessage({ id: 'rejected-stream', role: 'assistant', parts: [], streaming: true });
  assert.equal(rejected.busy, false);

  const accepted = createChat();
  accepted.messageMode = 'controlled';
  accepted.addEventListener('messages-change', (event) => {
    accepted.messages = (event as CustomEvent<TestMessagesChangeDetail>).detail.messages;
  });
  accepted.addMessage({ id: 'accepted-stream', role: 'assistant', parts: [], streaming: true });
  assert.equal(accepted.busy, true);
}

// Controlled proposals chain correctly before an asynchronous host write-back.
{
  const chat = createChat();
  const changes: TestMessagesChangeDetail[] = [];
  chat.messageMode = 'controlled';
  chat.addEventListener('messages-change', (event) => {
    changes.push((event as CustomEvent<TestMessagesChangeDetail>).detail);
  });

  chat.addMessage({ id: 'async', role: 'assistant', parts: [], streaming: true });
  chat.updateMessage('async', { streaming: false });

  assert.deepEqual(chat.messages, []);
  assert.equal(changes.length, 2);
  assert.equal(changes[1]?.previousMessages, changes[0]?.messages);
  assert.equal(changes[1]?.messages[0]?.streaming, false);

  // The host is one proposal behind. The next mutation must still use the
  // latest proposal instead of reverting to this older public snapshot.
  chat.messages = changes[0]!.messages;
  chat.addMessage({ id: 'after-lag', role: 'assistant', parts: [] });
  assert.deepEqual(
    changes[2]?.messages.map((message) => message.id),
    ['async', 'after-lag'],
  );
  assert.equal(changes[2]?.messages[0]?.streaming, false);
}

// An unrelated external history replacement supersedes pending proposals.
{
  const chat = createChat();
  const changes: TestMessagesChangeDetail[] = [];
  chat.messageMode = 'controlled';
  chat.addEventListener('messages-change', (event) => {
    changes.push((event as CustomEvent<TestMessagesChangeDetail>).detail);
  });

  chat.addMessage({ id: 'pending', role: 'assistant', parts: [] });
  chat.messages = [{ id: 'external', role: 'assistant', parts: [] }];
  chat.addMessage({ id: 'after-replace', role: 'assistant', parts: [] });

  assert.deepEqual(
    changes.at(-1)?.messages.map((message) => message.id),
    ['external', 'after-replace'],
  );
}

// Rejecting one proposal restores the previous accepted working snapshot.
{
  const chat = createChat();
  const changes: TestMessagesChangeDetail[] = [];
  let rejectNext = false;
  chat.messageMode = 'controlled';
  chat.addEventListener('messages-change', (event) => {
    changes.push((event as CustomEvent<TestMessagesChangeDetail>).detail);
    if (rejectNext) event.preventDefault();
  });

  chat.addMessage({ id: 'kept', role: 'assistant', parts: [], streaming: true });
  rejectNext = true;
  chat.updateMessage('kept', { streaming: false });
  assert.equal(chat.busy, true);
  rejectNext = false;
  chat.addMessage({ id: 'after-rejection', role: 'assistant', parts: [] });

  assert.deepEqual(
    changes.at(-1)?.messages.map((message) => message.id),
    ['kept', 'after-rejection'],
  );
  assert.equal(changes.at(-1)?.messages[0]?.streaming, true);
}

// ChatRunController streams against the pending controlled snapshot while the
// host applies only the final proposal asynchronously.
{
  const chat = createChat();
  const changes: TestMessagesChangeDetail[] = [];
  chat.messageMode = 'controlled';
  chat.addEventListener('messages-change', (event) => {
    changes.push((event as CustomEvent<TestMessagesChangeDetail>).detail);
  });

  const run = chat.createRunController({ messageId: 'controlled-run' });
  run.start([textPart('', { id: 'body' })]);
  assert.equal(run.appendText('body', 'Hello').ok, true);
  assert.equal(run.appendText('body', ' world').ok, true);
  run.complete();

  const finalMessages = changes.at(-1)!.messages;
  const finalMessage = finalMessages[0]!;
  const finalPart = finalMessage.parts[0];
  assert.equal(finalPart?.type, 'text');
  if (finalPart?.type === 'text') assert.equal(finalPart.text, 'Hello world');
  assert.equal(finalMessage.streaming, false);

  chat.messages = finalMessages;
  assert.equal(chat.messages, finalMessages);
  assert.equal(chat.busy, false);
}

// Runtime mode switches affect the very next mutation without Store syncing.
{
  const chat = createChat();
  chat.addMessage({ id: 'owned', role: 'assistant', parts: [] });

  chat.messageMode = 'controlled';
  chat.addMessage({ id: 'not-committed', role: 'assistant', parts: [] });
  assert.deepEqual(chat.messages.map((message) => message.id), ['owned']);

  chat.messageMode = 'uncontrolled';
  chat.addMessage({ id: 'owned-again', role: 'assistant', parts: [] });
  assert.deepEqual(chat.messages.map((message) => message.id), ['owned', 'owned-again']);
}

// An async beforeSend middleware holds the busy lock and blocks re-entry.
{
  const chat = createChat();
  const gate = deferred<string | null>();
  const busyChanges: boolean[] = [];
  let sends = 0;

  chat.use({ name: 'async-before-send', beforeSend: () => gate.promise });
  chat.addEventListener('busy-change', (event) => {
    busyChanges.push((event as CustomEvent<{ busy: boolean }>).detail.busy);
  });
  chat.addEventListener('send', () => { sends += 1; });

  const first = chat._handleSend(sendEvent('first'));
  assert.equal(chat.busy, true);

  await chat._handleSend(sendEvent('second'));
  assert.equal(sends, 0);

  gate.resolve('first');
  await first;

  assert.equal(sends, 1);
  assert.equal(chat.busy, false);
  assert.deepEqual(busyChanges, [true, false]);
}

// Starting a run synchronously from `send` hands busy off to streaming
// without a false transition in between.
{
  const chat = createChat();
  const busyChanges: boolean[] = [];

  chat.addEventListener('busy-change', (event) => {
    busyChanges.push((event as CustomEvent<{ busy: boolean }>).detail.busy);
  });
  chat.addEventListener('send', () => {
    chat.addMessage({
      id: 'assistant-1',
      role: 'assistant',
      parts: [],
      streaming: true,
    });
  });

  await chat._handleSend(sendEvent('hello'));
  assert.equal(chat.busy, true);
  assert.deepEqual(busyChanges, [true]);

  chat.updateMessage('assistant-1', { streaming: false });
  assert.equal(chat.busy, false);
  assert.deepEqual(busyChanges, [true, false]);
}

// Rejected middleware must release the busy lock.
{
  const chat = createChat();
  chat.use({
    name: 'rejecting-before-send',
    beforeSend: async () => { throw new Error('middleware failed'); },
  });

  await assert.rejects(chat._handleSend(sendEvent('hello')), /middleware failed/);
  assert.equal(chat.busy, false);
}

// A state change while middleware is awaiting prevents the eventual send.
{
  const chat = createChat();
  const gate = deferred<string | null>();
  let sends = 0;

  chat.use({ name: 'delayed-before-send', beforeSend: () => gate.promise });
  chat.addEventListener('send', () => { sends += 1; });

  const pending = chat._handleSend(sendEvent('hello'));
  chat.disabled = true;
  gate.resolve('hello');
  await pending;

  assert.equal(sends, 0);
  assert.equal(chat.busy, false);
}
