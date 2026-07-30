import assert from 'node:assert/strict';
import {
  patchTodoItem,
  isTerminalTodoItem,
  areTodoItemsTerminal,
  normalizeTodoItemUpdateEvent,
} from '../src/todo-state.js';
import { type TodoPart } from '../src/types.js';

function test(name: string, run: () => void): void {
  try {
    run();
  } catch (error) {
    console.error(`not ok - ${name}`);
    throw error;
  }
}

function makeTodoPart(overrides: Partial<TodoPart> = {}): TodoPart {
  return {
    id: 'todo-1',
    type: 'todo',
    revision: 1,
    status: 'streaming',
    items: [
      { id: 'item-1', title: 'Task 1', status: 'pending' as const },
      { id: 'item-2', title: 'Task 2', status: 'active' as const },
      { id: 'item-3', title: 'Task 3', status: 'done' as const },
    ],
    ...overrides,
  };
}

// ── isTerminalTodoItem ─────────────────────────────────────────────────

test('isTerminalTodoItem: done is terminal', () => {
  assert.equal(isTerminalTodoItem({ id: 'a', title: 'x', status: 'done' }), true);
});

test('isTerminalTodoItem: skipped is terminal', () => {
  assert.equal(isTerminalTodoItem({ id: 'a', title: 'x', status: 'skipped' }), true);
});

test('isTerminalTodoItem: pending is not terminal', () => {
  assert.equal(isTerminalTodoItem({ id: 'a', title: 'x', status: 'pending' }), false);
});

test('isTerminalTodoItem: active is not terminal', () => {
  assert.equal(isTerminalTodoItem({ id: 'a', title: 'x', status: 'active' }), false);
});

test('isTerminalTodoItem: error is not terminal', () => {
  assert.equal(isTerminalTodoItem({ id: 'a', title: 'x', status: 'error' }), false);
});

// ── areTodoItemsTerminal ───────────────────────────────────────────────

test('areTodoItemsTerminal: true when all items done/skipped', () => {
  const items = [
    { id: 'a', title: 'x', status: 'done' as const },
    { id: 'b', title: 'y', status: 'skipped' as const },
  ];
  assert.equal(areTodoItemsTerminal(items), true);
});

test('areTodoItemsTerminal: false when any item not terminal', () => {
  const items = [
    { id: 'a', title: 'x', status: 'done' as const },
    { id: 'b', title: 'y', status: 'pending' as const },
  ];
  assert.equal(areTodoItemsTerminal(items), false);
});

test('areTodoItemsTerminal: false for empty array', () => {
  assert.equal(areTodoItemsTerminal([]), false);
});

// ── patchTodoItem ──────────────────────────────────────────────────────

test('patchTodoItem patches item status', () => {
  const part = makeTodoPart();
  const result = patchTodoItem(part, 'item-1', { status: 'done' });

  assert.ok(result.ok);
  if (result.ok) {
    assert.equal(result.part.items[0].status, 'done');
    assert.equal(result.part.revision, 2); // incremented
  }
});

test('patchTodoItem patches item title', () => {
  const part = makeTodoPart();
  const result = patchTodoItem(part, 'item-1', { title: 'Updated Task' });

  assert.ok(result.ok);
  if (result.ok) {
    assert.equal(result.part.items[0].title, 'Updated Task');
  }
});

test('patchTodoItem respects explicit revision', () => {
  const part = makeTodoPart();
  const result = patchTodoItem(part, 'item-1', { status: 'done' }, 5);

  assert.ok(result.ok);
  if (result.ok) {
    assert.equal(result.part.revision, 5);
  }
});

test('patchTodoItem rejects stale revision', () => {
  const part = makeTodoPart({ revision: 5 });
  const result = patchTodoItem(part, 'item-1', { status: 'done' }, 3);

  assert.ok(!result.ok);
  if (!result.ok) {
    assert.equal(result.reason, 'stale-revision');
    // part reference should be the original
    assert.equal(result.part, part);
  }
});

test('patchTodoItem rejects duplicate revision', () => {
  const part = makeTodoPart({ revision: 5 });
  const result = patchTodoItem(part, 'item-1', { status: 'done' }, 5);

  assert.ok(!result.ok);
  if (!result.ok) {
    assert.equal(result.reason, 'stale-revision');
  }
});

test('patchTodoItem rejects invalid (non-finite) revision', () => {
  const part = makeTodoPart();
  const result = patchTodoItem(part, 'item-1', { status: 'done' }, NaN);

  assert.ok(!result.ok);
  if (!result.ok) {
    assert.equal(result.reason, 'invalid-revision');
  }
});

test('patchTodoItem rejects invalid (Infinity) revision', () => {
  const part = makeTodoPart();
  const result = patchTodoItem(part, 'item-1', { status: 'done' }, Infinity);

  assert.ok(!result.ok);
  if (!result.ok) {
    assert.equal(result.reason, 'invalid-revision');
  }
});

test('patchTodoItem rejects invalid status', () => {
  const part = makeTodoPart();
  const result = patchTodoItem(part, 'item-1', { status: 'bogus' as any });

  assert.ok(!result.ok);
  if (!result.ok) {
    assert.equal(result.reason, 'invalid-status');
  }
});

test('patchTodoItem rejects item-not-found', () => {
  const part = makeTodoPart();
  const result = patchTodoItem(part, 'nonexistent', { status: 'done' });

  assert.ok(!result.ok);
  if (!result.ok) {
    assert.equal(result.reason, 'item-not-found');
  }
});

test('patchTodoItem auto-sets status to complete when all items terminal', () => {
  // items: pending, active, done → make pending→skipped, active→done
  const part = makeTodoPart();
  // First make item-1 done
  const r1 = patchTodoItem(part, 'item-1', { status: 'done' });
  assert.ok(r1.ok);
  if (r1.ok) {
    // Now make item-2 done → all three terminal
    const r2 = patchTodoItem(r1.part, 'item-2', { status: 'done' });
    assert.ok(r2.ok);
    if (r2.ok) {
      assert.equal(r2.part.status, 'complete');
    }
  }
});

test('patchTodoItem keeps status streaming when some items still active', () => {
  const part = makeTodoPart();
  const result = patchTodoItem(part, 'item-1', { status: 'done' });

  assert.ok(result.ok);
  if (result.ok) {
    assert.equal(result.part.status, 'streaming');
  }
});

test('patchTodoItem does not mutate original part', () => {
  const part = makeTodoPart();
  const frozen: TodoPart = JSON.parse(JSON.stringify(part));

  patchTodoItem(part, 'item-1', { status: 'done' });
  assert.deepEqual(part, frozen);
});

test('patchTodoItem auto-increments revision when not provided', () => {
  const part = makeTodoPart({ revision: 0 });
  const result = patchTodoItem(part, 'item-1', { status: 'done' });

  assert.ok(result.ok);
  if (result.ok) {
    assert.equal(result.part.revision, 1);
  }
});

// ── normalizeTodoItemUpdateEvent ───────────────────────────────────────

test('normalizeTodoItemUpdateEvent parses valid update from object', () => {
  const input = {
    type: 'todo.item.updated',
    messageId: 'msg-1',
    partId: 'part-1',
    itemId: 'item-1',
    status: 'done',
    sequenceNumber: 1,
  };
  const result = normalizeTodoItemUpdateEvent(input);

  assert.ok(result.ok);
  if (result.ok) {
    assert.equal(result.update.messageId, 'msg-1');
    assert.equal(result.update.partId, 'part-1');
    assert.equal(result.update.itemId, 'item-1');
    assert.equal(result.update.patch.status, 'done');
  }
});

test('normalizeTodoItemUpdateEvent parses valid JSON string', () => {
  const input = JSON.stringify({
    type: 'todo.item.updated',
    messageId: 'msg-1',
    partId: 'part-1',
    itemId: 'item-1',
    status: 'done',
  });
  const result = normalizeTodoItemUpdateEvent(input);

  assert.ok(result.ok);
  if (result.ok) {
    assert.equal(result.update.messageId, 'msg-1');
  }
});

test('normalizeTodoItemUpdateEvent parses MessageEvent-like input', () => {
  const input = {
    data: JSON.stringify({
      type: 'todo.item.updated',
      messageId: 'msg-1',
      partId: 'part-1',
      itemId: 'item-1',
      status: 'done',
    }),
  };
  const result = normalizeTodoItemUpdateEvent(input);

  assert.ok(result.ok);
  if (result.ok) {
    assert.equal(result.update.messageId, 'msg-1');
  }
});

test('normalizeTodoItemUpdateEvent rejects non-object', () => {
  const result = normalizeTodoItemUpdateEvent(null);
  assert.ok(!result.ok);
  if (!result.ok) {
    assert.equal(result.reason, 'invalid-event');
  }
});

test('normalizeTodoItemUpdateEvent rejects wrong type', () => {
  const input = { type: 'wrong.type', messageId: 'm', partId: 'p', itemId: 'i' };
  const result = normalizeTodoItemUpdateEvent(input);

  assert.ok(!result.ok);
  if (!result.ok) {
    assert.equal(result.reason, 'invalid-event');
  }
});

test('normalizeTodoItemUpdateEvent rejects missing messageId', () => {
  const input = { type: 'todo.item.updated', partId: 'p', itemId: 'i', status: 'done' };
  const result = normalizeTodoItemUpdateEvent(input);

  assert.ok(!result.ok);
  if (!result.ok) {
    assert.equal(result.reason, 'invalid-message-id');
  }
});

test('normalizeTodoItemUpdateEvent rejects empty messageId', () => {
  const input = { type: 'todo.item.updated', messageId: '  ', partId: 'p', itemId: 'i', status: 'done' };
  const result = normalizeTodoItemUpdateEvent(input);

  assert.ok(!result.ok);
  if (!result.ok) {
    assert.equal(result.reason, 'invalid-message-id');
  }
});

test('normalizeTodoItemUpdateEvent rejects missing partId', () => {
  const input = { type: 'todo.item.updated', messageId: 'm', itemId: 'i', status: 'done' };
  const result = normalizeTodoItemUpdateEvent(input);

  assert.ok(!result.ok);
  if (!result.ok) {
    assert.equal(result.reason, 'invalid-part-id');
  }
});

test('normalizeTodoItemUpdateEvent rejects missing itemId', () => {
  const input = { type: 'todo.item.updated', messageId: 'm', partId: 'p', status: 'done' };
  const result = normalizeTodoItemUpdateEvent(input);

  assert.ok(!result.ok);
  if (!result.ok) {
    assert.equal(result.reason, 'invalid-item-id');
  }
});

test('normalizeTodoItemUpdateEvent rejects invalid status', () => {
  const input = { type: 'todo.item.updated', messageId: 'm', partId: 'p', itemId: 'i', status: 'bogus' };
  const result = normalizeTodoItemUpdateEvent(input);

  assert.ok(!result.ok);
  if (!result.ok) {
    assert.equal(result.reason, 'invalid-status');
  }
});

test('normalizeTodoItemUpdateEvent rejects non-finite revision', () => {
  const input = {
    type: 'todo.item.updated',
    messageId: 'm',
    partId: 'p',
    itemId: 'i',
    status: 'done',
    revision: NaN,
  };
  const result = normalizeTodoItemUpdateEvent(input);

  assert.ok(!result.ok);
  if (!result.ok) {
    assert.equal(result.reason, 'invalid-revision');
  }
});

test('normalizeTodoItemUpdateEvent rejects empty patch', () => {
  const input = { type: 'todo.item.updated', messageId: 'm', partId: 'p', itemId: 'i' };
  const result = normalizeTodoItemUpdateEvent(input);

  assert.ok(!result.ok);
  if (!result.ok) {
    assert.equal(result.reason, 'empty-patch');
  }
});

test('normalizeTodoItemUpdateEvent accepts title-only patch', () => {
  const input = {
    type: 'todo.item.updated',
    messageId: 'm',
    partId: 'p',
    itemId: 'i',
    title: 'New Title',
  };
  const result = normalizeTodoItemUpdateEvent(input);

  assert.ok(result.ok);
  if (result.ok) {
    assert.equal(result.update.patch.title, 'New Title');
  }
});

test('normalizeTodoItemUpdateEvent accepts description-only patch', () => {
  const input = {
    type: 'todo.item.updated',
    messageId: 'm',
    partId: 'p',
    itemId: 'i',
    description: 'New desc',
  };
  const result = normalizeTodoItemUpdateEvent(input);

  assert.ok(result.ok);
  if (result.ok) {
    assert.equal(result.update.patch.description, 'New desc');
  }
});

test('normalizeTodoItemUpdateEvent rejects non-finite sequenceNumber', () => {
  const input = {
    type: 'todo.item.updated',
    messageId: 'm',
    partId: 'p',
    itemId: 'i',
    status: 'done',
    sequenceNumber: 'not-a-number',
  };
  const result = normalizeTodoItemUpdateEvent(input);

  assert.ok(!result.ok);
  if (!result.ok) {
    assert.equal(result.reason, 'invalid-sequence-number');
  }
});
