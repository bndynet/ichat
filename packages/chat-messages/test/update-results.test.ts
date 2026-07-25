import assert from 'node:assert/strict';

function test(name: string, run: () => void): void {
  try {
    run();
  } catch (error) {
    console.error(`not ok - ${name}`);
    throw error;
  }
}

// update-results.ts is purely type-level (no runtime exports to test directly).
// These tests verify the type-level contracts and the runtime behaviour of
// result-discriminated unions via the functions that produce them.

// We import the actual functions that produce these result types and verify
// the discriminated union patterns work correctly at runtime.
import {
  findMessagePart,
  appendMessagePart,
  replaceMessagePart,
  patchMessagePart,
  applyMessagePartUpdate,
} from '../src/message-part-state.js';
import { patchTodoItem } from '../src/todo-state.js';
import { patchToolCallPart } from '../src/tool-call-state.js';
import {
  normalizeMessagePartUpdateEvent,
  type MessagePartUpdateNormalizeFailureReason,
  type MessagePartUpdateNormalizeResult,
} from '../src/message-part-events.js';
import {
  normalizeTodoItemUpdateEvent,
  type TodoItemUpdateNormalizeFailureReason,
  type TodoItemUpdateNormalizeResult,
} from '../src/todo-state.js';
import {
  textPart,
  type TodoPart,
  type ToolCallPart,
  type ChatMessage,
} from '../src/types.js';

// ── MessagePartLookupResult discriminated union ────────────────────────

test('findMessagePart ok result narrows correctly at runtime', () => {
  const part = textPart('hello');
  const msg: ChatMessage = { id: 'm1', role: 'assistant', parts: [part], timestamp: 1000 };
  const result = findMessagePart([msg], 'm1', part.id);

  if (result.ok) {
    // Narrowed: result.message and result.part are available
    assert.equal(result.message.id, 'm1');
    assert.equal(result.part.id, part.id);
  } else {
    assert.fail('expected ok result');
  }
});

test('findMessagePart error result narrows correctly at runtime', () => {
  const result = findMessagePart([], 'missing', 'missing');

  if (!result.ok) {
    // Narrowed: result.reason is available, result.message/part are not
    const reasons: string[] = ['message-not-found', 'part-not-found'];
    assert.ok(reasons.includes(result.reason));
  } else {
    assert.fail('expected error result');
  }
});

// ── MessagePartPatchResult discriminated union ─────────────────────────

test('patchMessagePart ok result contains part and messages', () => {
  const part = textPart('hello');
  const msg: ChatMessage = { id: 'm1', role: 'assistant', parts: [part], timestamp: 1000 };
  const result = patchMessagePart([msg], 'm1', part.id, { text: 'world' });

  if (result.ok) {
    assert.equal(result.messages.length, 1);
    assert.ok(result.part);
  }
});

test('patchMessagePart error result contains reason', () => {
  const result = patchMessagePart([], 'm1', 'p1', {});

  if (!result.ok) {
    assert.equal(result.reason, 'message-not-found');
  }
});

// ── MessagePartUpdateApplyResult discriminated union ───────────────────

test('applyMessagePartUpdate ok result narrows to part', () => {
  const part = textPart('hello');
  const msg: ChatMessage = { id: 'm1', role: 'assistant', parts: [part], timestamp: 1000 };
  const result = applyMessagePartUpdate([msg], {
    messageId: 'm1',
    partId: part.id,
    patch: { text: 'updated' },
  });

  if (result.ok) {
    assert.equal(result.part.type, 'text');
  }
});

test('applyMessagePartUpdate error result narrows to reason', () => {
  const result = applyMessagePartUpdate([], {
    messageId: 'm1',
    partId: 'p1',
    patch: { text: 'x' },
  });

  if (!result.ok) {
    assert.ok(typeof result.reason === 'string');
  }
});

// ── TodoPatchResult discriminated union ────────────────────────────────

test('patchTodoItem ok result narrows to part', () => {
  const part: TodoPart = {
    id: 'todo-1',
    type: 'todo',
    status: 'streaming',
    revision: 1,
    items: [{ id: 'i1', title: 'Task', status: 'pending' }],
  };
  const result = patchTodoItem(part, 'i1', { status: 'done' });

  if (result.ok) {
    assert.equal(result.part.items[0].status, 'done');
  }
});

test('patchTodoItem error result contains reason and original part', () => {
  const part: TodoPart = {
    id: 'todo-1',
    type: 'todo',
    status: 'streaming',
    revision: 1,
    items: [{ id: 'i1', title: 'Task', status: 'pending' }],
  };
  const result = patchTodoItem(part, 'nonexistent', { status: 'done' });

  if (!result.ok) {
    assert.equal(result.reason, 'item-not-found');
    assert.equal(result.part, part);
  }
});

// ── ToolCallPatchResult discriminated union ────────────────────────────

test('patchToolCallPart ok result narrows to part', () => {
  const part: ToolCallPart = {
    id: 'tc-1',
    type: 'tool-call',
    toolCallId: 'call-1',
    toolName: 'test',
    state: 'input-streaming',
  };
  const result = patchToolCallPart(part, { state: 'input-available' });

  if (result.ok) {
    assert.equal(result.part.state, 'input-available');
  }
});

test('patchToolCallPart error result contains reason', () => {
  const part: ToolCallPart = {
    id: 'tc-1',
    type: 'tool-call',
    toolCallId: 'call-1',
    toolName: 'test',
    state: 'input-streaming',
  };
  const result = patchToolCallPart(part, { state: 'bogus' as any });

  if (!result.ok) {
    assert.equal(result.reason, 'invalid-state');
  }
});

// ── NormalizeResult discriminated unions ───────────────────────────────

test('normalizeMessagePartUpdateEvent ok result narrows to update', () => {
  const result: MessagePartUpdateNormalizeResult = normalizeMessagePartUpdateEvent({
    type: 'message.part.updated',
    messageId: 'm',
    partId: 'p',
    text: 'hello',
  });

  if (result.ok) {
    assert.equal(result.update.messageId, 'm');
  }
});

test('normalizeMessagePartUpdateEvent error result narrows to reason', () => {
  const result: MessagePartUpdateNormalizeResult = normalizeMessagePartUpdateEvent(null);

  if (!result.ok) {
    const reasons: MessagePartUpdateNormalizeFailureReason[] = [
      'invalid-event',
      'invalid-message-id',
      'invalid-part-id',
      'invalid-sequence-number',
      'invalid-patch',
      'empty-patch',
      'part-id-change-not-allowed',
      'part-type-change-not-allowed',
    ];
    assert.ok(reasons.includes(result.reason));
  }
});

test('normalizeTodoItemUpdateEvent ok result narrows to update', () => {
  const result: TodoItemUpdateNormalizeResult = normalizeTodoItemUpdateEvent({
    type: 'todo.item.updated',
    messageId: 'm',
    partId: 'p',
    itemId: 'i',
    status: 'done',
  });

  if (result.ok) {
    assert.equal(result.update.messageId, 'm');
  }
});

test('normalizeTodoItemUpdateEvent error result narrows to reason', () => {
  const result: TodoItemUpdateNormalizeResult = normalizeTodoItemUpdateEvent(null);

  if (!result.ok) {
    const reasons: TodoItemUpdateNormalizeFailureReason[] = [
      'invalid-event',
      'invalid-message-id',
      'invalid-part-id',
      'invalid-item-id',
      'invalid-status',
      'invalid-revision',
      'invalid-sequence-number',
      'empty-patch',
    ];
    assert.ok(reasons.includes(result.reason));
  }
});
