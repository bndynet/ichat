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
    beforeSend?: (content: string) => string | null | Promise<string | null>;
    afterMessageAdded?: (message: TestMessage) => TestMessage | null;
    beforeAppendPart?: (
      messageId: string,
      part: Record<string, unknown>,
    ) => Record<string, unknown> | null;
    onError?: (error: string, messageId?: string) => void;
    install?: (chat: unknown) => void | (() => void);
  }): () => void;
  removePlugin(name: string): boolean;
  addMessage(message: TestMessage): void;
  updateMessage(id: string, patch: Partial<TestMessage>): void;
  appendPart(messageId: string, part: Record<string, unknown>): void;
  updatePart(messageId: string, partId: string, patch: Record<string, unknown>): void;
  removeMessage(id: string): void;
  clear(): void;
  cancelMessage(id: string, hint?: string): void;
  cancel(hint?: string): void;
  tryUpdatePart(messageId: string, partId: string, patch: Record<string, unknown>): { ok: boolean };
  tryUpdateToolCall(
    messageId: string,
    partId: string,
    patch: Record<string, unknown>,
  ): { ok: boolean };
  tryUpdateTodoItem(
    messageId: string,
    partId: string,
    itemId: string,
    patch: Record<string, unknown>,
    revision?: number,
  ): { ok: boolean };
  tryApplyMessagePartUpdateEvent(event: Record<string, unknown>): { ok: boolean };
  tryApplyTodoItemUpdateEvent(event: Record<string, unknown>): { ok: boolean };
  createRunController(options?: { messageId?: string }): ChatRunController;
  showError(text: string, options?: { duration?: number }): void;
  addErrorMessage(error: string, text?: string): void;
  _handleSend(event: CustomEvent<{ content: string }>): Promise<void>;
};

function createChat(): TestChatElement {
  return new Ctor() as TestChatElement;
}

function sendEvent(content: string): CustomEvent<{ content: string }> {
  return {
    detail: { content },
    stopPropagation() {
      /* test event stub */
    },
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
  const initial: TestMessage[] = [
    {
      id: 'existing',
      role: 'assistant',
      parts: [],
      streaming: false,
    },
  ];

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

  assert.deepEqual(
    chat.messages.map((message) => message.id),
    ['existing', 'new'],
  );
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
  assert.deepEqual(
    change?.messages.map((message) => message.id),
    ['proposed'],
  );
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
  assert.deepEqual(
    chat.messages.map((message) => message.id),
    ['owned'],
  );

  chat.messageMode = 'uncontrolled';
  chat.addMessage({ id: 'owned-again', role: 'assistant', parts: [] });
  assert.deepEqual(
    chat.messages.map((message) => message.id),
    ['owned', 'owned-again'],
  );
}

// ── Imperative mutation matrix (Store × ownership) ──────────────────────

// removeMessage: uncontrolled commits immediately.
{
  const chat = createChat();
  chat.messages = [
    { id: 'a', role: 'assistant', parts: [] },
    { id: 'b', role: 'assistant', parts: [] },
  ];
  chat.removeMessage('a');
  assert.deepEqual(
    chat.messages.map((m) => m.id),
    ['b'],
  );
}

// removeMessage: controlled emits a proposal, does not commit.
{
  const chat = createChat();
  const changes: TestMessagesChangeDetail[] = [];
  chat.messageMode = 'controlled';
  chat.messages = [
    { id: 'a', role: 'assistant', parts: [] },
    { id: 'b', role: 'assistant', parts: [] },
  ];
  chat.addEventListener('messages-change', (event) => {
    changes.push((event as CustomEvent<TestMessagesChangeDetail>).detail);
  });

  chat.removeMessage('a');
  assert.deepEqual(
    chat.messages.map((m) => m.id),
    ['a', 'b'],
  );
  assert.equal(changes.length, 1);
  assert.equal(changes[0]?.controlled, true);
  assert.deepEqual(
    changes[0]?.messages.map((m: TestMessage) => m.id),
    ['b'],
  );
}

// clear: uncontrolled commits immediately.
{
  const chat = createChat();
  chat.messages = [
    { id: 'a', role: 'assistant', parts: [] },
    { id: 'b', role: 'assistant', parts: [] },
  ];
  chat.clear();
  assert.deepEqual(chat.messages, []);
}

// clear: controlled emits a proposal, does not commit.
{
  const chat = createChat();
  const changes: TestMessagesChangeDetail[] = [];
  chat.messageMode = 'controlled';
  chat.messages = [
    { id: 'a', role: 'assistant', parts: [] },
    { id: 'b', role: 'assistant', parts: [] },
  ];
  chat.addEventListener('messages-change', (event) => {
    changes.push((event as CustomEvent<TestMessagesChangeDetail>).detail);
  });

  chat.clear();
  assert.deepEqual(
    chat.messages.map((m) => m.id),
    ['a', 'b'],
  );
  assert.equal(changes.length, 1);
  assert.equal(changes[0]?.controlled, true);
  assert.deepEqual(changes[0]?.messages, []);
}

// cancelMessage: updates message with cancelled flag + hint in text, uncontrolled.
{
  const chat = createChat();
  chat.addMessage({
    id: 'streaming',
    role: 'assistant',
    parts: [{ type: 'text', id: 't1', text: 'generating...' }],
    streaming: true,
  });
  chat.cancelMessage('streaming', 'user cancelled');
  const msg = chat.messages[0];
  assert.equal(msg?.streaming, false);
  assert.equal(msg?.cancelled, true);
  const part = msg?.parts[0];
  assert.equal(part?.type, 'text');
  if (part?.type === 'text') assert.equal(part.text, 'generating...\n\nuser cancelled');
}

// cancelMessage: controlled emits a proposal.
{
  const chat = createChat();
  const changes: TestMessagesChangeDetail[] = [];
  chat.messageMode = 'controlled';
  chat.addEventListener('messages-change', (event) => {
    const detail = (event as CustomEvent<TestMessagesChangeDetail>).detail;
    changes.push(detail);
    chat.messages = detail.messages;
  });
  chat.addMessage({ id: 'streaming', role: 'assistant', parts: [], streaming: true });
  chat.cancelMessage('streaming');

  const lastChange = changes.at(-1)!;
  const msg = lastChange.messages[0];
  assert.equal(msg?.streaming, false);
  assert.equal(msg?.cancelled, true);
}

// cancel: finds the streaming message, uncontrolled.
{
  const chat = createChat();
  chat.addMessage({ id: 'done', role: 'assistant', parts: [], streaming: false });
  chat.addMessage({ id: 'streaming', role: 'assistant', parts: [], streaming: true });
  chat.cancel();
  assert.equal(chat.messages[0]?.streaming, false);
  assert.equal(chat.messages[0]?.cancelled, undefined);
  assert.equal(chat.messages[1]?.streaming, false);
  assert.equal(chat.messages[1]?.cancelled, true);
}

// updatePart: uncontrolled commits immediately.
{
  const chat = createChat();
  chat.addMessage({
    id: 'msg',
    role: 'assistant',
    parts: [{ type: 'text', id: 'p1', text: 'old' }],
  });
  chat.updatePart('msg', 'p1', { text: 'new' });
  const part = chat.messages[0]?.parts[0];
  assert.equal(part?.type, 'text');
  if (part?.type === 'text') assert.equal(part.text, 'new');
}

// updatePart: controlled emits a proposal, does not commit.
{
  const chat = createChat();
  const changes: TestMessagesChangeDetail[] = [];
  chat.messageMode = 'controlled';
  chat.addEventListener('messages-change', (event) => {
    changes.push((event as CustomEvent<TestMessagesChangeDetail>).detail);
  });
  chat.messages = [
    { id: 'msg', role: 'assistant', parts: [{ type: 'text', id: 'p1', text: 'old' }] },
  ];

  chat.updatePart('msg', 'p1', { text: 'new' });
  // Store returns the host messages since the proposal was not accepted.
  const part = chat.messages[0]?.parts[0];
  assert.equal(part?.type, 'text');
  if (part?.type === 'text') assert.equal(part.text, 'old');
  assert.equal(changes.length, 1);
  assert.equal(changes[0]?.controlled, true);
}

// appendPart: uncontrolled commits immediately (ownership-specific).
{
  const chat = createChat();
  chat.addMessage({ id: 'msg', role: 'assistant', parts: [] });
  chat.appendPart('msg', { type: 'text', id: 'p1', text: 'appended' });
  assert.equal(chat.messages[0]?.parts.length, 1);
  assert.equal(chat.messages[0]?.parts[0]?.id, 'p1');
}

// appendPart: controlled emits a proposal, does not commit.
{
  const chat = createChat();
  const changes: TestMessagesChangeDetail[] = [];
  chat.messageMode = 'controlled';
  chat.addEventListener('messages-change', (event) => {
    changes.push((event as CustomEvent<TestMessagesChangeDetail>).detail);
  });
  chat.messages = [{ id: 'msg', role: 'assistant', parts: [] }];

  chat.appendPart('msg', { type: 'text', id: 'p1', text: 'proposed' });
  assert.equal(chat.messages[0]?.parts.length, 0);
  assert.equal(changes.length, 1);
  assert.equal(changes[0]?.controlled, true);
  assert.deepEqual(
    changes[0]?.messages[0]?.parts.map((p: Record<string, unknown>) => p.id),
    ['p1'],
  );
}

// tryUpdatePart: controlled proposal with diagnostic result.
{
  const chat = createChat();
  chat.messageMode = 'controlled';
  chat.messages = [
    { id: 'msg', role: 'assistant', parts: [{ type: 'text', id: 'p1', text: 'old' }] },
  ];

  const result = chat.tryUpdatePart('msg', 'p1', { text: 'updated' });
  assert.equal(result.ok, true);
}

// tryUpdateToolCall: controlled, valid patch.
{
  const chat = createChat();
  chat.messageMode = 'controlled';
  chat.messages = [
    {
      id: 'msg',
      role: 'assistant',
      parts: [
        {
          type: 'tool-call',
          id: 'tc1',
          toolCallId: 'call-1',
          toolName: 'search',
          state: 'executing',
          args: {},
        },
      ],
    },
  ];

  const result = chat.tryUpdateToolCall('msg', 'tc1', {
    state: 'output-available',
    result: 'done',
  });
  assert.equal(result.ok, true);
}

// tryUpdateTodoItem: controlled, valid patch.
{
  const chat = createChat();
  chat.messageMode = 'controlled';
  chat.messages = [
    {
      id: 'msg',
      role: 'assistant',
      parts: [
        {
          type: 'todo',
          id: 'td1',
          revision: 1,
          items: [{ id: 'item1', title: 'task', status: 'pending' }],
        },
      ],
    },
  ];

  const result = chat.tryUpdateTodoItem('msg', 'td1', 'item1', { status: 'done' });
  assert.equal(result.ok, true);
}

// tryApplyMessagePartUpdateEvent: controlled, valid SSE-like payload.
{
  const chat = createChat();
  chat.messageMode = 'controlled';
  chat.messages = [
    { id: 'msg', role: 'assistant', parts: [{ type: 'text', id: 'p1', text: 'old' }] },
  ];

  const result = chat.tryApplyMessagePartUpdateEvent({
    messageId: 'msg',
    partId: 'p1',
    patch: { text: 'from-event' },
  });
  assert.equal(result.ok, true);
}

// tryApplyTodoItemUpdateEvent: controlled, valid SSE-like payload.
{
  const chat = createChat();
  chat.messageMode = 'controlled';
  chat.messages = [
    {
      id: 'msg',
      role: 'assistant',
      parts: [
        {
          type: 'todo',
          id: 'td1',
          revision: 1,
          items: [{ id: 'item1', title: 'task', status: 'pending' }],
        },
      ],
    },
  ];

  // normalizeTodoItemUpdateEvent reads status/title/description at the top
  // level (SSE event shape), not nested under a `patch` key.
  const result = chat.tryApplyTodoItemUpdateEvent({
    messageId: 'msg',
    partId: 'td1',
    itemId: 'item1',
    status: 'done',
  });
  assert.equal(result.ok, true);
}

// Sequential controlled mutations (remove → add → update) chain proposals.
{
  const chat = createChat();
  const changes: TestMessagesChangeDetail[] = [];
  chat.messageMode = 'controlled';
  chat.addEventListener('messages-change', (event) => {
    changes.push((event as CustomEvent<TestMessagesChangeDetail>).detail);
  });
  chat.messages = [
    { id: 'a', role: 'assistant', parts: [] },
    { id: 'b', role: 'assistant', parts: [] },
  ];

  chat.removeMessage('a');
  chat.addMessage({ id: 'c', role: 'assistant', parts: [] });
  chat.updateMessage('c', { streaming: true });

  assert.equal(changes.length, 3);
  assert.deepEqual(
    changes[2]?.messages.map((m: TestMessage) => m.id),
    ['b', 'c'],
  );
  assert.equal(changes[2]?.messages[1]?.streaming, true);
}

// ── Ownership × event contract ──────────────────────────────────────────

// messages-change detail carries accurate previousMessages in both modes.
{
  const chat = createChat();
  chat.messages = [{ id: 'base', role: 'assistant', parts: [] }];

  chat.addEventListener('messages-change', (event) => {
    const detail = (event as CustomEvent<TestMessagesChangeDetail>).detail;
    assert.deepEqual(
      detail.previousMessages.map((m: TestMessage) => m.id),
      ['base'],
    );
    assert.deepEqual(
      detail.messages.map((m: TestMessage) => m.id),
      ['base', 'new'],
    );
  });
  chat.addMessage({ id: 'new', role: 'assistant', parts: [] });
}

// controlled events are cancelable; uncontrolled are not.
{
  // Controlled
  const controlled = createChat();
  controlled.messageMode = 'controlled';
  let ctrlCancelable: boolean | undefined;

  controlled.addEventListener('messages-change', (event) => {
    ctrlCancelable = event.cancelable;
  });
  controlled.addMessage({ id: 'p', role: 'assistant', parts: [] });
  assert.equal(ctrlCancelable, true);

  // Uncontrolled
  const uncontrolled = createChat();
  let uncCancelable: boolean | undefined;

  uncontrolled.addEventListener('messages-change', (event) => {
    uncCancelable = event.cancelable;
  });
  uncontrolled.addMessage({ id: 'q', role: 'assistant', parts: [] });
  assert.equal(uncCancelable, false);
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
  chat.addEventListener('send', () => {
    sends += 1;
  });

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
    beforeSend: async () => {
      throw new Error('middleware failed');
    },
  });

  await assert.rejects(chat._handleSend(sendEvent('hello')), /middleware failed/);
  assert.equal(chat.busy, false);
}

// ── Middleware hook contract tests ────────────────────────────────────────

// afterMessageAdded: transforms the message before it reaches the store.
{
  const chat = createChat();
  const hooks: string[] = [];

  chat.use({
    name: 'transform-add',
    afterMessageAdded: (msg) => {
      hooks.push('afterMessageAdded');
      return { ...msg, id: `transformed-${msg.id}` };
    },
  });

  chat.addMessage({ id: 'original', role: 'assistant', parts: [] });
  assert.deepEqual(hooks, ['afterMessageAdded']);
  assert.equal(chat.messages[0]?.id, 'transformed-original');
}

// afterMessageAdded: returning null drops the message.
{
  const chat = createChat();
  const hooks: string[] = [];

  chat.use({
    name: 'drop-msg',
    afterMessageAdded: (msg) => {
      hooks.push(msg.id);
      return msg.id === 'keep' ? msg : null;
    },
  });

  chat.addMessage({ id: 'drop', role: 'assistant', parts: [] });
  chat.addMessage({ id: 'keep', role: 'assistant', parts: [] });
  assert.deepEqual(hooks, ['drop', 'keep']);
  assert.deepEqual(
    chat.messages.map((m) => m.id),
    ['keep'],
  );
}

// afterMessageAdded: multiple middleware run in FIFO order.
{
  const chat = createChat();
  const order: string[] = [];

  chat.use({
    name: 'mw1',
    afterMessageAdded: (msg) => {
      order.push('mw1');
      return msg;
    },
  });
  chat.use({
    name: 'mw2',
    afterMessageAdded: (msg) => {
      order.push('mw2');
      return msg;
    },
  });

  chat.addMessage({ id: 'test', role: 'assistant', parts: [] });
  assert.deepEqual(order, ['mw1', 'mw2']);
}

// beforeAppendPart: transforms the part before it is appended.
{
  const chat = createChat();
  const hooks: string[] = [];

  chat.use({
    name: 'transform-part',
    beforeAppendPart: (_mid, part) => {
      hooks.push('beforeAppendPart');
      if (part.type === 'text') {
        return { ...part, text: `[wrapped] ${part.text}` };
      }
      return part;
    },
  });

  chat.addMessage({ id: 'msg', role: 'assistant', parts: [] });
  chat.appendPart('msg', { type: 'text', id: 'p1', text: 'hello' });
  assert.deepEqual(hooks, ['beforeAppendPart']);

  const part = chat.messages[0]?.parts[0];
  assert.equal(part?.type, 'text');
  if (part?.type === 'text') assert.equal(part.text, '[wrapped] hello');
}

// beforeAppendPart: returning null drops the part.
{
  const chat = createChat();
  chat.use({
    name: 'drop-part',
    beforeAppendPart: (_mid, part) => (part.id === 'keep' ? part : null),
  });

  chat.addMessage({ id: 'msg', role: 'assistant', parts: [] });
  chat.appendPart('msg', { type: 'text', id: 'drop', text: 'nope' });
  chat.appendPart('msg', { type: 'text', id: 'keep', text: 'yes' });
  assert.equal(chat.messages[0]?.parts.length, 1);
  assert.equal(chat.messages[0]?.parts[0]?.id, 'keep');
}

// onError: called on showError and addErrorMessage.
{
  const chat = createChat();
  const errors: Array<{ error: string; messageId?: string }> = [];

  chat.use({
    name: 'error-logger',
    onError: (error, messageId) => {
      errors.push({ error, messageId });
    },
  });

  chat.addErrorMessage('something broke', 'details');
  assert.equal(errors.length, 1);
  assert.equal(errors[0]?.error, 'something broke');
  assert.equal(errors[0]?.messageId, undefined);

  // showError fires onError before the child-messages path.
  // In Node tests the child is not rendered, so it queues rather than
  // delegating to the child — but onError still fires.
  chat.showError('ui error');
  assert.equal(errors.length, 2);
  assert.equal(errors[1]?.error, 'ui error');
}

// onError + afterMessageAdded: both fire for addErrorMessage, in that order.
{
  const chat = createChat();
  const order: string[] = [];

  chat.use({
    name: 'combined',
    onError: () => {
      order.push('onError');
    },
    afterMessageAdded: () => {
      order.push('afterMessageAdded');
      return null;
    }, // drop
  });

  chat.addErrorMessage('err');
  assert.deepEqual(order, ['onError', 'afterMessageAdded']);
  // Message was dropped by afterMessageAdded → store is empty.
  assert.equal(chat.messages.length, 0);
}

// ── Plugin lifecycle tests ───────────────────────────────────────────────

// Plugin install: install() is called, teardown is captured.
{
  const chat = createChat();
  let installed = false;
  let tornDown = false;

  chat.use({
    name: 'lifecycle-plugin',
    install(_c) {
      installed = true;
      return () => {
        tornDown = true;
      };
    },
  });

  assert.equal(installed, true);
  assert.equal(tornDown, false);
}

// Duplicate plugin names are rejected with a warning.
{
  const chat = createChat();
  const installs: string[] = [];

  const dispose1 = chat.use({
    name: 'unique-plugin',
    install() {
      installs.push('first');
    },
  });
  const dispose2 = chat.use({
    name: 'unique-plugin',
    install() {
      installs.push('second');
    },
  });

  assert.deepEqual(installs, ['first']);
  // Second disposer is a no-op (no teardown registered for it).
  dispose2();
  assert.deepEqual(installs, ['first']);
}

// removePlugin: runs teardown and unregisters the plugin.
{
  const chat = createChat();
  let tornDown = false;

  const dispose = chat.use({
    name: 'removable',
    install() {
      return () => {
        tornDown = true;
      };
    },
  });

  const removed = chat.removePlugin('removable');
  assert.equal(removed, true);
  assert.equal(tornDown, true);

  // removePlugin for unknown name returns false.
  assert.equal(chat.removePlugin('nonexistent'), false);

  // Disposer from use() also works (calls removePlugin internally).
  // Re-install and dispose via the returned function.
  tornDown = false;
  const dispose2 = chat.use({
    name: 'removable-2',
    install() {
      return () => {
        tornDown = true;
      };
    },
  });
  dispose2();
  assert.equal(tornDown, true);
}

// Plugin middleware integration: a plugin can register middleware and
// both are cleaned up when the plugin is removed.
{
  const chat = createChat();
  const afterCalls: string[] = [];

  const dispose = chat.use({
    name: 'mw-plugin',
    install(c) {
      const unreg = c.use({
        name: 'plugin-mw',
        afterMessageAdded: (msg) => {
          afterCalls.push(msg.id);
          return msg;
        },
      });
      return () => unreg();
    },
  });

  chat.addMessage({ id: 'before-remove', role: 'assistant', parts: [] });
  assert.deepEqual(afterCalls, ['before-remove']);

  // Removing the plugin also tears down its registered middleware.
  chat.removePlugin('mw-plugin');
  chat.addMessage({ id: 'after-remove', role: 'assistant', parts: [] });
  assert.deepEqual(afterCalls, ['before-remove']);
}

// A state change while middleware is awaiting prevents the eventual send.
{
  const chat = createChat();
  const gate = deferred<string | null>();
  let sends = 0;

  chat.use({ name: 'delayed-before-send', beforeSend: () => gate.promise });
  chat.addEventListener('send', () => {
    sends += 1;
  });

  const pending = chat._handleSend(sendEvent('hello'));
  chat.disabled = true;
  gate.resolve('hello');
  await pending;

  assert.equal(sends, 0);
  assert.equal(chat.busy, false);
}
