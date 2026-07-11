import assert from 'node:assert/strict';
import {
  BUILT_IN_MESSAGE_PART_TYPES,
  getMessageText,
  isBuiltInMessagePartType,
  isCustomMessagePartType,
  reasoningPart,
  textPart,
  todoPart,
  type ChatMessage,
  type MessagePart,
  type TodoPart,
} from '../src/types.js';
import { resolveLabels } from '../src/i18n.js';
import {
  createFormSubmitDetail,
  createTodoActionDetail,
} from '../src/message-events.js';
import {
  getTodoInitialExpanded,
  shouldInitializeTodoExpansion,
} from '../src/todo-collapse.js';
import { patchTodoItemInPart } from '../src/todo-state.js';

function test(name: string, run: () => void): void {
  try {
    run();
  } catch (error) {
    console.error(`not ok - ${name}`);
    throw error;
  }
}

test('message body exposes the expected first-class part types', () => {
  assert.deepEqual([...BUILT_IN_MESSAGE_PART_TYPES], [
    'text',
    'reasoning',
    'tool-call',
    'todo',
    'file',
    'source',
  ]);

  for (const type of BUILT_IN_MESSAGE_PART_TYPES) {
    assert.equal(isBuiltInMessagePartType(type), true);
  }

  assert.equal(isBuiltInMessagePartType('x-weather'), false);
  assert.equal(isCustomMessagePartType('x-weather'), true);
  assert.equal(isCustomMessagePartType('todo'), false);
});

test('part factories preserve explicit stable ids and getMessageText stays text-only', () => {
  const text = textPart('Hello', {
    id: 'text-1',
    status: 'streaming',
    metadata: { channel: 'main' },
  });
  const reasoning = reasoningPart('why', { id: 'reasoning-1' });
  const todo = todoPart([{ id: 'task-1', title: 'Ship it', status: 'pending' }], {
    id: 'todo-1',
    title: 'Plan',
    revision: 3,
    defaultCollapsed: true,
    interactive: false,
  });

  assert.equal(text.id, 'text-1');
  assert.equal(text.status, 'streaming');
  assert.deepEqual(text.metadata, { channel: 'main' });
  assert.equal(reasoning.id, 'reasoning-1');
  assert.equal(todo.id, 'todo-1');
  assert.equal(todo.revision, 3);
  assert.equal(todo.defaultCollapsed, true);
  assert.equal(todo.interactive, false);

  const generatedA = textPart('A');
  const generatedB = textPart('B');
  assert.match(generatedA.id, /^text-\d+$/);
  assert.match(generatedB.id, /^text-\d+$/);
  assert.notEqual(generatedA.id, generatedB.id);

  const parts: MessagePart[] = [
    text,
    reasoning,
    {
      type: 'tool-call',
      id: 'tool-1',
      toolCallId: 'call-1',
      toolName: 'search',
      state: 'executing',
    },
    todo,
    { type: 'file', id: 'file-1', mediaType: 'application/pdf', url: '/a.pdf' },
    { type: 'source', id: 'source-1', url: 'https://example.test', title: 'Source' },
    { type: 'x-weather', id: 'custom-1', data: { temperature: 21 } },
    textPart('World', { id: 'text-2' }),
  ];

  assert.equal(getMessageText({ id: 'm-1', role: 'assistant', parts }), 'Hello\n\nWorld');
});

test('todo item patching is immutable, revision-aware, and updates lifecycle status', () => {
  const base = todoPart(
    [
      { id: 'capture', title: 'Capture', status: 'done' },
      { id: 'verify', title: 'Verify', status: 'pending' },
    ],
    { id: 'todo-1', revision: 1, status: 'streaming' }
  );

  const updated = patchTodoItemInPart(
    base,
    'verify',
    { id: 'ignored-at-runtime', title: 'Verify UI', status: 'active' } as Parameters<
      typeof patchTodoItemInPart
    >[2],
    2
  );

  assert.equal(updated.ok, true);
  assert.equal(updated.part.revision, 2);
  assert.equal(updated.part.status, 'streaming');
  assert.equal(updated.part.items[1].id, 'verify');
  assert.equal(updated.part.items[1].title, 'Verify UI');
  assert.equal(base.items[1].title, 'Verify');
  assert.notEqual(updated.part, base);
  assert.notEqual(updated.part.items, base.items);

  const stale = patchTodoItemInPart(updated.part, 'verify', { status: 'done' }, 2);
  assert.equal(stale.ok, false);
  assert.equal(stale.reason, 'stale-revision');
  assert.equal(stale.part, updated.part);

  const missing = patchTodoItemInPart(updated.part, 'missing', { status: 'done' }, 3);
  assert.equal(missing.ok, false);
  assert.equal(missing.reason, 'item-not-found');

  const completed = patchTodoItemInPart(updated.part, 'verify', { status: 'skipped' }, 3);
  assert.equal(completed.ok, true);
  assert.equal(completed.part.status, 'complete');

  const reopened = patchTodoItemInPart(completed.part, 'verify', { status: 'active' }, 4);
  assert.equal(reopened.ok, true);
  assert.equal(reopened.part.status, 'streaming');
});

test('event helpers attach message context without changing source payloads', () => {
  const todo = todoPart([{ id: 'task-1', title: 'Capture', status: 'pending' }], {
    id: 'todo-1',
  });
  const message: ChatMessage = { id: 'msg-1', role: 'assistant', parts: [todo] };

  const todoDetail = createTodoActionDetail(message, {
    action: 'change-status',
    itemId: 'task-1',
    previousStatus: 'pending',
    status: 'active',
    part: todo,
  });

  assert.equal(todoDetail.messageId, 'msg-1');
  assert.equal(todoDetail.message, message);
  assert.equal(todoDetail.part, todo);
  assert.equal(todoDetail.status, 'active');

  const values = { query: 'task', confirmed: true };
  const formDetail = createFormSubmitDetail(message, {
    formId: 'search-form',
    values,
  });

  assert.equal(formDetail.messageId, 'msg-1');
  assert.equal(formDetail.message, message);
  assert.equal(formDetail.title, '');
  assert.equal(formDetail.values, values);
});

test('todo expansion defaults only apply when a stable part id first appears', () => {
  const expanded = todoPart([], { id: 'todo-expanded' });
  const collapsed = todoPart([], { id: 'todo-collapsed', defaultCollapsed: true });

  assert.equal(getTodoInitialExpanded(expanded), true);
  assert.equal(getTodoInitialExpanded(collapsed), false);
  assert.equal(shouldInitializeTodoExpansion(undefined, collapsed.id), true);
  assert.equal(shouldInitializeTodoExpansion(collapsed.id, collapsed.id), false);
  assert.equal(shouldInitializeTodoExpansion(collapsed.id, expanded.id), true);

  const dataUpdateSameId: TodoPart = {
    ...collapsed,
    revision: collapsed.revision + 1,
    items: [{ id: 'task-1', title: 'Capture', status: 'active' }],
  };
  assert.equal(shouldInitializeTodoExpansion(collapsed.id, dataUpdateSameId.id), false);
});

test('todo labels participate in locale resolution and host overrides', () => {
  const zh = resolveLabels({ locale: 'zh-CN' });
  assert.equal(zh.todo.title, '待办事项');
  assert.equal(zh.todo.progress(2, 5), '已完成 2/5');

  const overridden = resolveLabels({
    locale: 'zh-CN',
    labels: {
      todo: {
        title: '任务',
        progress: (completed, total) => `${completed} of ${total}`,
      },
    },
  });
  assert.equal(overridden.todo.title, '任务');
  assert.equal(overridden.todo.progress(2, 5), '2 of 5');
  assert.equal(overridden.todo.pending, '未开始');
});
