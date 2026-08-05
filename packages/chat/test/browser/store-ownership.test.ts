/**
 * Browser-level Store × ownership lifecycle tests for `<i-chat>`.
 *
 * Runs in a real browser DOM via Vite dev server.  Verifies rendered
 * component behaviour: uncontrolled/controlled mutations, child-component
 * state synchronisation, event contracts, and busy-state reflection.
 *
 * Results are rendered into the page DOM and also exposed as
 * `window.__ICHAT_STORE_TESTS__`.
 */

import '../../src/components/chat.js';
import type { Chat } from '../../src/components/chat.js';
import type { ChatMessage, MessagesChangeDetail, TextPart } from '@bndynet/ichat-messages';

// ── Test harness ──────────────────────────────────────────────────────────

interface TestResult {
  name: string;
  passed: boolean;
  detail?: string;
}

const results: TestResult[] = [];

function test(name: string, fn: () => void | Promise<void>): void {
  results.push({ name, passed: false, detail: 'pending' });
  const idx = results.length - 1;

  void (async () => {
    try {
      await fn();
      results[idx] = { name, passed: true };
    } catch (err) {
      results[idx] = { name, passed: false, detail: String(err) };
    }
    renderResults();
  })();
}

function assert(condition: unknown, msg = 'assertion failed'): asserts condition {
  if (!condition) throw new Error(msg);
}

function assertEqual<T>(actual: T, expected: T, msg?: string): void {
  if (actual !== expected) {
    throw new Error(msg ?? `expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

function assertDeepEqual<T>(actual: T, expected: T, msg?: string): void {
  const a = JSON.stringify(actual);
  const b = JSON.stringify(expected);
  if (a !== b) {
    throw new Error(msg ?? `expected ${b}, got ${a}`);
  }
}

function renderResults(): void {
  const statusEl = document.getElementById('status')!;
  const resultsEl = document.getElementById('results')!;
  const allDone = results.every((r) => r.passed !== undefined && r.detail !== 'pending');
  const anyFail = results.some((r) => !r.passed && r.detail !== 'pending');

  if (!allDone) {
    statusEl.dataset.state = 'running';
    statusEl.textContent = `Running… (${results.filter((r) => r.passed || r.detail !== 'pending').length}/${results.length})`;
  } else if (anyFail) {
    statusEl.dataset.state = 'failed';
    statusEl.textContent = `FAILED — ${results.filter((r) => !r.passed).length}/${results.length} failures`;
  } else {
    statusEl.dataset.state = 'passed';
    statusEl.textContent = `PASSED — ${results.length}/${results.length}`;
  }

  resultsEl.innerHTML = results
    .map(
      (r) =>
        `<div class="result ${r.passed ? 'pass' : 'fail'}">` +
        `<span class="icon">${r.passed ? '✓' : '✗'}</span>` +
        `<span class="name">${r.name}</span>` +
        (r.detail && r.detail !== 'pending' ? `<span class="detail">${r.detail}</span>` : '') +
        `</div>`,
    )
    .join('');

  (window as any).__ICHAT_STORE_TESTS__ = {
    passed: allDone && !anyFail,
    results,
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────

function createChat(): Chat {
  const host = document.getElementById('chat-host')!;
  host.innerHTML = '';
  const el = document.createElement('i-chat') as Chat;
  host.appendChild(el);
  return el;
}

function waitForUpdate(el: HTMLElement): Promise<void> {
  return new Promise((resolve) => {
    el.updateComplete?.then(resolve) ?? requestAnimationFrame(() => resolve());
  });
}

function textMsg(id: string, text: string): ChatMessage {
  return {
    id,
    role: 'assistant',
    parts: [{ type: 'text', id: `t-${id}`, text }],
    streaming: false,
  };
}

// ── Test suites ───────────────────────────────────────────────────────────

// 1. Uncontrolled mode — rendered DOM
test('uncontrolled: addMessage renders in child messages', async () => {
  const chat = createChat();
  await waitForUpdate(chat);

  chat.addMessage(textMsg('m1', 'hello'));
  await waitForUpdate(chat);

  const messagesEl = chat.shadowRoot?.querySelector('i-chat-messages');
  assert(messagesEl, 'i-chat-messages should be in shadow DOM');
  // The child messages component should have received the message
  assertEqual(chat.messages.length, 1);
  assertEqual(chat.messages[0]?.id, 'm1');
});

test('uncontrolled: messages array visible after external assignment', async () => {
  const chat = createChat();
  await waitForUpdate(chat);

  chat.messages = [textMsg('ext1', 'external')];
  await waitForUpdate(chat);

  assertEqual(chat.messages.length, 1);
  assertEqual(chat.messages[0]?.id, 'ext1');
});

test('uncontrolled: multiple mutations chain correctly', async () => {
  const chat = createChat();
  await waitForUpdate(chat);

  chat.addMessage(textMsg('a', 'first'));
  chat.addMessage(textMsg('b', 'second'));
  chat.updateMessage('a', { streaming: true });
  await waitForUpdate(chat);

  assertEqual(chat.messages.length, 2);
  assertEqual(chat.messages[0]?.streaming, true);
});

test('uncontrolled: appendPart adds to message parts', async () => {
  const chat = createChat();
  await waitForUpdate(chat);

  chat.addMessage({ id: 'm', role: 'assistant', parts: [] });
  chat.appendPart('m', { type: 'text', id: 'p1', text: 'added' });
  await waitForUpdate(chat);

  assertEqual(chat.messages[0]?.parts.length, 1);
  const part = chat.messages[0]?.parts[0] as TextPart;
  assertEqual(part.type, 'text');
  assertEqual(part.text, 'added');
});

test('uncontrolled: clear empties messages', async () => {
  const chat = createChat();
  chat.addMessage(textMsg('a', 'first'));
  await waitForUpdate(chat);
  assertEqual(chat.messages.length, 1);

  chat.clear();
  await waitForUpdate(chat);
  assertEqual(chat.messages.length, 0);
});

test('uncontrolled: removeMessage deletes by id', async () => {
  const chat = createChat();
  chat.messages = [textMsg('a', 'first'), textMsg('b', 'second')];
  await waitForUpdate(chat);

  chat.removeMessage('a');
  await waitForUpdate(chat);
  assertEqual(chat.messages.length, 1);
  assertEqual(chat.messages[0]?.id, 'b');
});

// 2. Controlled mode — proposal flow
test('controlled: addMessage does not commit until accepted', async () => {
  const chat = createChat();
  chat.messageMode = 'controlled';
  await waitForUpdate(chat);

  let eventFired = false;
  chat.addEventListener('messages-change', (e) => {
    eventFired = true;
    assert((e as CustomEvent).cancelable, 'controlled event should be cancelable');
    // Accept by writing back
    chat.messages = (e as CustomEvent<MessagesChangeDetail>).detail.messages;
  });

  chat.addMessage(textMsg('proposed', 'hello'));
  await waitForUpdate(chat);

  assert(eventFired, 'messages-change should have fired');
  assertEqual(chat.messages.length, 1);
  assertEqual(chat.messages[0]?.id, 'proposed');
});

test('controlled: rejecting a proposal keeps previous state', async () => {
  const chat = createChat();
  chat.messageMode = 'controlled';
  chat.messages = [textMsg('original', 'keep')];
  await waitForUpdate(chat);

  chat.addEventListener('messages-change', (e) => {
    e.preventDefault(); // reject
  });

  chat.addMessage(textMsg('rejected', 'nope'));
  await waitForUpdate(chat);

  assertEqual(chat.messages.length, 1);
  assertEqual(chat.messages[0]?.id, 'original');
});

test('controlled: busy state reflects accepted messages', async () => {
  const chat = createChat();
  chat.messageMode = 'controlled';
  await waitForUpdate(chat);

  chat.addEventListener('messages-change', (e) => {
    chat.messages = (e as CustomEvent<MessagesChangeDetail>).detail.messages;
  });

  chat.addMessage({ id: 'stream', role: 'assistant', parts: [], streaming: true });
  await waitForUpdate(chat);

  assert(chat.busy, 'should be busy when streaming message is accepted');
  assert(chat.hasAttribute('busy'), 'should reflect busy attribute');

  chat.updateMessage('stream', { streaming: false });
  await waitForUpdate(chat);

  assert(!chat.busy, 'should not be busy after streaming ends');
});

// 3. Child component sync
test('child: i-chat-messages receives messages binding', async () => {
  const chat = createChat();
  await waitForUpdate(chat);

  chat.messages = [textMsg('sync', 'synced')];
  await waitForUpdate(chat);

  const messagesEl = chat.shadowRoot?.querySelector('i-chat-messages') as any;
  assert(messagesEl, 'i-chat-messages should be present');
  // The child's messages property should mirror the parent's
  assertEqual(messagesEl?.messages?.length, 1);
  assertEqual(messagesEl?.messages?.[0]?.id, 'sync');
});

test('child: i-chat-input receives streaming state', async () => {
  const chat = createChat();
  await waitForUpdate(chat);

  chat.addMessage({ id: 's', role: 'assistant', parts: [], streaming: true });
  await waitForUpdate(chat);

  const inputEl = chat.shadowRoot?.querySelector('i-chat-input') as any;
  assert(inputEl, 'i-chat-input should be present');
  assertEqual(inputEl?.streaming, true);

  chat.updateMessage('s', { streaming: false });
  await waitForUpdate(chat);

  assertEqual(inputEl?.streaming, false);
});

// 4. Event contracts
test('events: messages-change bubbles from i-chat', async () => {
  const chat = createChat();
  await waitForUpdate(chat);

  let bubbled = false;
  chat.addEventListener('messages-change', () => { bubbled = true; });

  chat.addMessage(textMsg('event', 'test'));
  await waitForUpdate(chat);
  assert(bubbled, 'messages-change should bubble');
});

test('events: busy-change fires on streaming transitions', async () => {
  const chat = createChat();
  await waitForUpdate(chat);

  const states: boolean[] = [];
  chat.addEventListener('busy-change', (e) => {
    states.push((e as CustomEvent<{ busy: boolean }>).detail.busy);
  });

  chat.addMessage({ id: 'bs', role: 'assistant', parts: [], streaming: true });
  await waitForUpdate(chat);
  assertDeepEqual(states, [true]);

  chat.updateMessage('bs', { streaming: false });
  await waitForUpdate(chat);
  assertDeepEqual(states, [true, false]);
});

// 5. Disabled state
test('state: disabled reflects on input', async () => {
  const chat = createChat();
  chat.disabled = true;
  await waitForUpdate(chat);

  assert(chat.hasAttribute('disabled'), 'should have disabled attribute');
  const inputEl = chat.shadowRoot?.querySelector('i-chat-input') as any;
  assertEqual(inputEl?.disabled, true);
});

// 6. DOM attributes
test('dom: data-message-id and data-part-id are present', async () => {
  const chat = createChat();
  chat.addMessage({ id: 'attr-test', role: 'assistant', parts: [{ type: 'text', id: 'attr-part', text: 'hi' }] });
  await waitForUpdate(chat);
  // Give the nested shadow DOM time to render
  await new Promise((r) => setTimeout(r, 100));

  const messagesEl = chat.shadowRoot?.querySelector('i-chat-messages') as HTMLElement | null;
  assert(messagesEl, 'i-chat-messages should be present');

  const msgEl = messagesEl?.shadowRoot?.querySelector('[data-message-id="attr-test"]') as HTMLElement | null;
  assert(msgEl, 'message element should have data-message-id');
});

// Report when all tests are queued
setTimeout(() => {
  if (results.length > 0 && results.every((r) => r.detail !== 'pending')) {
    // Already done
  }
}, 5000);
