/**
 * API-surface tests for `<i-chat>`.
 *
 * Verifies module imports, custom element registration, constructor,
 * default property values, and key method signatures.
 *
 * Full component tests (controlled/uncontrolled, slots, confirmations,
 * ready promise, run controller) require a browser environment —
 * use Playwright or @web/test-runner.
 */

import assert from 'node:assert/strict';
import '../src/components/chat.js';

type TestChatElement = HTMLElement & {
  busy: boolean;
  disabled: boolean;
  messageMode: string;
  showVoiceInput: boolean;
  config: Record<string, unknown>;
  ready: Promise<void>;
  use(middleware: {
    name: string;
    beforeSend: (content: string) => string | null | Promise<string | null>;
  }): () => void;
  addMessage(message: {
    id: string;
    role: 'assistant';
    parts: [];
    streaming: boolean;
  }): void;
  updateMessage(id: string, patch: { streaming: boolean }): void;
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
assert.equal(typeof el.registerRenderer, 'function');
assert.equal(typeof el.use, 'function');

// ready returns a Promise
assert.ok(el.ready instanceof Promise, 'ready should be a Promise');

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
