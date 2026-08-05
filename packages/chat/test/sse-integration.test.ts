/**
 * SSE integration tests — backend event → normalize → apply pipeline.
 *
 * Verifies the full end-to-end flow for both message part updates and
 * todo item updates: raw SSE-like payloads are normalized and applied
 * through the Chat message store, and the resulting state is checked.
 */

import assert from 'node:assert/strict';
import '../src/components/chat.js';
import type { Chat } from '../src/components/chat.js';
import { textPart, todoPart } from '@bndynet/ichat-messages';

// ── helpers ───────────────────────────────────────────────────────────

function createChat(): Chat<Record<`x-${string}`, unknown>> {
  const Ctor = customElements.get('i-chat')!;
  return new Ctor() as Chat<Record<`x-${string}`, unknown>>;
}

function textOf(chat: Chat<Record<`x-${string}`, unknown>>, msgId: string, partId: string): string {
  const msg = chat.messages.find((m) => m.id === msgId);
  const part = msg?.parts?.find((p) => p.id === partId);
  return (part as { text?: string })?.text ?? '';
}

// ── message.part.updated ──────────────────────────────────────────────

// text patch to existing part
{
  const chat = createChat();
  chat.addMessage({ id: 'msg-1', role: 'assistant', parts: [textPart('initial', { id: 'p1' })] });
  const r = chat.tryApplyMessagePartUpdateEvent({
    type: 'message.part.updated',
    messageId: 'msg-1',
    partId: 'p1',
    text: 'updated',
    sequenceNumber: 1,
  });
  assert.ok(r.ok);
  assert.equal(textOf(chat, 'msg-1', 'p1'), 'updated');
}

// explicit patch object
{
  const chat = createChat();
  chat.addMessage({ id: 'msg-1', role: 'assistant', parts: [textPart('hello', { id: 'p1' })] });
  const r = chat.tryApplyMessagePartUpdateEvent({
    type: 'message.part.updated',
    messageId: 'msg-1',
    partId: 'p1',
    patch: { text: 'from patch', status: 'complete' as const },
    sequenceNumber: 1,
  });
  assert.ok(r.ok);
  assert.equal(textOf(chat, 'msg-1', 'p1'), 'from patch');
  assert.equal(chat.messages[0].parts!.find((p) => p.id === 'p1')?.status, 'complete');
}

// JSON string payload
{
  const chat = createChat();
  chat.addMessage({ id: 'msg-1', role: 'assistant', parts: [textPart('before', { id: 'p1' })] });
  const r = chat.tryApplyMessagePartUpdateEvent(
    JSON.stringify({
      type: 'message.part.updated',
      messageId: 'msg-1',
      partId: 'p1',
      text: 'json payload',
    }),
  );
  assert.ok(r.ok);
  assert.equal(textOf(chat, 'msg-1', 'p1'), 'json payload');
}

// MessageEvent-like wrapper
{
  const chat = createChat();
  chat.addMessage({ id: 'msg-1', role: 'assistant', parts: [textPart('before', { id: 'p1' })] });
  const r = chat.tryApplyMessagePartUpdateEvent({
    data: JSON.stringify({
      type: 'message.part.updated',
      messageId: 'msg-1',
      partId: 'p1',
      text: 'from MessageEvent',
    }),
  });
  assert.ok(r.ok);
  assert.equal(textOf(chat, 'msg-1', 'p1'), 'from MessageEvent');
}

// unknown messageId
{
  const chat = createChat();
  const r = chat.tryApplyMessagePartUpdateEvent({
    type: 'message.part.updated',
    messageId: 'nope',
    partId: 'p1',
    text: 'x',
  });
  assert.equal(r.ok, false);
  if (!r.ok) assert.equal(r.reason, 'message-not-found');
}

// unknown partId
{
  const chat = createChat();
  chat.addMessage({ id: 'msg-1', role: 'assistant', parts: [textPart('hello', { id: 'p1' })] });
  const r = chat.tryApplyMessagePartUpdateEvent({
    type: 'message.part.updated',
    messageId: 'msg-1',
    partId: 'nope',
    text: 'x',
  });
  assert.equal(r.ok, false);
  if (!r.ok) assert.equal(r.reason, 'part-not-found');
}

// tool-call state update
{
  const chat = createChat();
  chat.addMessage({
    id: 'msg-1',
    role: 'assistant',
    parts: [
      {
        type: 'tool-call' as const,
        id: 'tc1',
        toolCallId: 'call_123',
        toolName: 'search',
        state: 'input-streaming' as const,
      },
    ],
  });
  const r = chat.tryApplyMessagePartUpdateEvent({
    type: 'message.part.updated',
    messageId: 'msg-1',
    partId: 'tc1',
    patch: { state: 'output-available', result: 'found' },
    sequenceNumber: 1,
  });
  assert.ok(r.ok);
  assert.equal(
    (chat.messages[0].parts!.find((p) => p.id === 'tc1') as { state?: string }).state,
    'output-available',
  );
}

// ── todo.item.updated ─────────────────────────────────────────────────

// update todo item status
{
  const chat = createChat();
  chat.addMessage({
    id: 'msg-1',
    role: 'assistant',
    parts: [
      todoPart(
        [
          { id: 'it1', title: 'A', status: 'pending' },
          { id: 'it2', title: 'B', status: 'pending' },
        ],
        { id: 'todo-1', revision: 1 },
      ),
    ],
  });
  const r = chat.tryApplyTodoItemUpdateEvent({
    type: 'todo.item.updated',
    messageId: 'msg-1',
    partId: 'todo-1',
    itemId: 'it1',
    status: 'done' as const,
    revision: 2,
  });
  assert.ok(r.ok);
  const items = (
    chat.messages[0].parts!.find((p) => p.id === 'todo-1') as {
      items?: Array<{ id: string; status: string }>;
    }
  ).items;
  assert.equal(items!.find((i) => i.id === 'it1')!.status, 'done');
}

// JSON string payload
{
  const chat = createChat();
  chat.addMessage({
    id: 'msg-1',
    role: 'assistant',
    parts: [todoPart([{ id: 'it1', title: 'T', status: 'pending' }], { id: 't1', revision: 1 })],
  });
  const r = chat.tryApplyTodoItemUpdateEvent(
    JSON.stringify({
      type: 'todo.item.updated',
      messageId: 'msg-1',
      partId: 't1',
      itemId: 'it1',
      status: 'error',
      revision: 2,
    }),
  );
  assert.ok(r.ok);
}

// MessageEvent-like wrapper
{
  const chat = createChat();
  chat.addMessage({
    id: 'msg-1',
    role: 'assistant',
    parts: [todoPart([{ id: 'it1', title: 'T', status: 'pending' }], { id: 't1', revision: 1 })],
  });
  const r = chat.tryApplyTodoItemUpdateEvent({
    data: JSON.stringify({
      type: 'todo.item.updated',
      messageId: 'msg-1',
      partId: 't1',
      itemId: 'it1',
      status: 'active' as const,
      revision: 2,
    }),
  });
  assert.ok(r.ok);
}

// stale revision
{
  const chat = createChat();
  chat.addMessage({
    id: 'msg-1',
    role: 'assistant',
    parts: [todoPart([{ id: 'it1', title: 'T', status: 'pending' }], { id: 't1', revision: 5 })],
  });
  const r = chat.tryApplyTodoItemUpdateEvent({
    type: 'todo.item.updated',
    messageId: 'msg-1',
    partId: 't1',
    itemId: 'it1',
    status: 'done' as const,
    revision: 3,
  });
  assert.equal(r.ok, false);
  if (!r.ok) assert.equal(r.reason, 'stale-revision');
}

// unknown messageId for todo
{
  const chat = createChat();
  const r = chat.tryApplyTodoItemUpdateEvent({
    type: 'todo.item.updated',
    messageId: 'nope',
    partId: 't1',
    itemId: 'it1',
    status: 'done' as const,
    revision: 1,
  });
  assert.equal(r.ok, false);
  if (!r.ok) assert.equal(r.reason, 'message-not-found');
}

// ── streaming simulation ──────────────────────────────────────────────

// full text streaming lifecycle
{
  const chat = createChat();
  chat.addMessage({
    id: 'ms',
    role: 'assistant',
    parts: [textPart('', { id: 'body', status: 'streaming' })],
    streaming: true,
  });

  const tokens = ['Hello', ', ', 'world', '!'];
  for (const token of tokens) {
    const current = textOf(chat, 'ms', 'body');
    const r = chat.tryApplyMessagePartUpdateEvent({
      type: 'message.part.updated',
      messageId: 'ms',
      partId: 'body',
      text: current + token,
      sequenceNumber: 1,
    });
    assert.ok(r.ok);
  }
  assert.equal(textOf(chat, 'ms', 'body'), 'Hello, world!');

  chat.tryApplyMessagePartUpdateEvent({
    type: 'message.part.updated',
    messageId: 'ms',
    partId: 'body',
    patch: { status: 'complete' as const },
    sequenceNumber: 2,
  });
  chat.updateMessage('ms', { streaming: false });
  assert.equal(chat.messages[0].parts!.find((p) => p.id === 'body')?.status, 'complete');
}

// tool-call streaming lifecycle
{
  const chat = createChat();
  chat.addMessage({
    id: 'tc',
    role: 'assistant',
    parts: [
      {
        type: 'tool-call' as const,
        id: 'tc1',
        toolCallId: 'c1',
        toolName: 'getWeather',
        state: 'input-streaming' as const,
      },
    ],
    streaming: true,
  });

  chat.tryApplyMessagePartUpdateEvent({
    type: 'message.part.updated',
    messageId: 'tc',
    partId: 'tc1',
    patch: { state: 'input-available' as const, args: { city: 'Paris' } },
    sequenceNumber: 1,
  });
  chat.tryApplyMessagePartUpdateEvent({
    type: 'message.part.updated',
    messageId: 'tc',
    partId: 'tc1',
    patch: { state: 'executing' as const },
    sequenceNumber: 2,
  });
  chat.tryApplyMessagePartUpdateEvent({
    type: 'message.part.updated',
    messageId: 'tc',
    partId: 'tc1',
    patch: { state: 'output-available' as const, result: '22°C' },
    sequenceNumber: 3,
  });
  chat.updateMessage('tc', { streaming: false });

  const part = chat.messages[0].parts!.find((p) => p.id === 'tc1') as {
    state?: string;
    result?: string;
  };
  assert.equal(part.state, 'output-available');
  assert.equal(part.result, '22°C');
}

console.log('SSE integration: all tests passed');
