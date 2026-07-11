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
  type ToolCallPart,
} from '../src/types.js';
import { resolveLabels } from '../src/i18n.js';
import {
  createFormSubmitDetail,
  createPartActionDetail,
  createTodoActionDetail,
  createToolActionDetail,
} from '../src/message-events.js';
import {
  getTodoInitialExpanded,
  shouldInitializeTodoExpansion,
} from '../src/todo-collapse.js';
import {
  areTodoItemsTerminal,
  normalizeTodoItemUpdateEvent,
  patchTodoItem,
  patchTodoItemInPart,
} from '../src/todo-state.js';
import {
  isTodoItemStatus,
  isTodoPart,
  isToolCallPart,
  isToolCallState,
} from '../src/part-guards.js';
import { patchToolCallPart } from '../src/tool-call-state.js';
import {
  appendMessagePart,
  applyMessagePartUpdate,
  findMessagePart,
  patchMessagePart,
  replaceMessagePart,
} from '../src/message-part-state.js';
import { normalizeMessagePartUpdateEvent } from '../src/message-part-events.js';

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

test('message part collection helpers update parts immutably without the DOM', () => {
  const base: ChatMessage[] = [
    {
      id: 'm-1',
      role: 'assistant',
      parts: [textPart('Hello', { id: 'text-1', status: 'streaming' })],
    },
    {
      id: 'm-2',
      role: 'assistant',
      parts: [],
    },
  ];
  const tool: ToolCallPart = {
    type: 'tool-call',
    id: 'tool-1',
    toolCallId: 'call-1',
    toolName: 'search',
    state: 'input-available',
  };

  const appended = appendMessagePart(base, 'm-1', tool);
  assert.notEqual(appended, base);
  assert.notEqual(appended[0], base[0]);
  assert.equal(appended[1], base[1]);
  assert.equal(appended[0].parts.length, 2);
  assert.equal(base[0].parts.length, 1);

  const found = findMessagePart(appended, 'm-1', 'tool-1');
  assert.ok(found.ok);
  assert.equal(found.message.id, 'm-1');
  assert.equal(found.part, tool);

  const patched = patchMessagePart(appended, 'm-1', 'text-1', {
    status: 'complete',
  });
  assert.ok(patched.ok);
  assert.equal(patched.part.status, 'complete');
  assert.equal(appended[0].parts[0].status, 'streaming');
  assert.notEqual(patched.messages[0], appended[0]);
  assert.equal(patched.messages[1], appended[1]);

  const replacement = textPart('Updated', { id: 'text-1' });
  const replaced = replaceMessagePart(patched.messages, 'm-1', 'text-1', replacement);
  assert.ok(replaced.ok);
  assert.equal(replaced.part, replacement);
  assert.equal(replaced.messages[0].parts[0], replacement);

  const missingMessage = findMessagePart(base, 'missing', 'text-1');
  assert.equal(missingMessage.ok, false);
  if (!missingMessage.ok) {
    assert.equal(missingMessage.reason, 'message-not-found');
  }

  const missingPart = patchMessagePart(base, 'm-1', 'missing', { status: 'complete' });
  assert.equal(missingPart.ok, false);
  if (!missingPart.ok) {
    assert.equal(missingPart.reason, 'part-not-found');
  }
});

test('message part update event normalization supports generic backend patches', () => {
  const objectUpdate = normalizeMessagePartUpdateEvent({
    type: 'message.part.updated',
    messageId: 'assistant-42',
    partId: 'body',
    patch: { text: 'Hello world', status: 'complete' },
  });
  assert.equal(objectUpdate.ok, true);
  assert.deepEqual(objectUpdate.update, {
    messageId: 'assistant-42',
    partId: 'body',
    patch: { text: 'Hello world', status: 'complete' },
  });

  const stringUpdate = normalizeMessagePartUpdateEvent(
    JSON.stringify({
      messageId: 'assistant-42',
      partId: 'body',
      text: 'Streaming text',
    })
  );
  assert.equal(stringUpdate.ok, true);
  assert.deepEqual(stringUpdate.update.patch, { text: 'Streaming text' });

  const eventUpdate = normalizeMessagePartUpdateEvent({
    type: 'message.part.updated',
    data: JSON.stringify({
      messageId: 'assistant-42',
      partId: 'tool-1',
      patch: { state: 'executing' },
    }),
  });
  assert.equal(eventUpdate.ok, true);
  assert.deepEqual(eventUpdate.update.patch, { state: 'executing' });

  assert.deepEqual(
    normalizeMessagePartUpdateEvent({ type: 'todo.item.updated' }),
    { ok: false, reason: 'invalid-event' }
  );
  assert.deepEqual(
    normalizeMessagePartUpdateEvent({
      messageId: 'assistant-42',
      partId: 'body',
      patch: [],
    }),
    { ok: false, reason: 'invalid-patch' }
  );
  assert.deepEqual(
    normalizeMessagePartUpdateEvent({
      messageId: 'assistant-42',
      partId: 'body',
      patch: {},
    }),
    { ok: false, reason: 'empty-patch' }
  );
  assert.deepEqual(
    normalizeMessagePartUpdateEvent({
      messageId: 'assistant-42',
      partId: 'body',
      patch: { id: 'new-id' },
    }),
    { ok: false, reason: 'part-id-change-not-allowed' }
  );
  assert.deepEqual(
    normalizeMessagePartUpdateEvent({
      messageId: 'assistant-42',
      partId: 'body',
      patch: { type: 'file' },
    }),
    { ok: false, reason: 'part-type-change-not-allowed' }
  );
});

test('generic message part updates apply validated patches immutably', () => {
  const messages: ChatMessage[] = [
    {
      id: 'm-1',
      role: 'assistant',
      parts: [
        textPart('Hello', { id: 'body', status: 'streaming' }),
        {
          type: 'tool-call',
          id: 'tool-1',
          toolCallId: 'call-1',
          toolName: 'search',
          state: 'input-available',
        },
        {
          type: 'x-weather',
          id: 'custom-1',
          data: { temp: 21 },
        },
      ],
    },
  ];

  const textUpdate = applyMessagePartUpdate(messages, {
    messageId: 'm-1',
    partId: 'body',
    patch: { text: 'Updated', status: 'complete' },
  });
  assert.equal(textUpdate.ok, true);
  assert.equal(textUpdate.part.type, 'text');
  if (textUpdate.part.type === 'text') {
    assert.equal(textUpdate.part.text, 'Updated');
    assert.equal(textUpdate.part.status, 'complete');
  }
  assert.equal(messages[0].parts[0].status, 'streaming');
  assert.notEqual(textUpdate.messages, messages);

  const toolUpdate = applyMessagePartUpdate(textUpdate.messages, {
    messageId: 'm-1',
    partId: 'tool-1',
    patch: { state: 'executing', id: 'ignored-at-runtime' } as Partial<MessagePart>,
  });
  assert.equal(toolUpdate.ok, true);
  assert.equal(toolUpdate.part.id, 'tool-1');
  assert.equal((toolUpdate.part as ToolCallPart).state, 'executing');

  const customUpdate = applyMessagePartUpdate(toolUpdate.messages, {
    messageId: 'm-1',
    partId: 'custom-1',
    patch: { data: { temp: 23 } } as Partial<MessagePart>,
  });
  assert.equal(customUpdate.ok, true);
  assert.deepEqual((customUpdate.part as { data: unknown }).data, { temp: 23 });

  const invalidToolState = applyMessagePartUpdate(messages, {
    messageId: 'm-1',
    partId: 'tool-1',
    patch: { state: 'waiting' } as Partial<MessagePart>,
  });
  assert.equal(invalidToolState.ok, false);
  if (!invalidToolState.ok) {
    assert.equal(invalidToolState.reason, 'invalid-state');
  }

  const invalidText = applyMessagePartUpdate(messages, {
    messageId: 'm-1',
    partId: 'body',
    patch: { text: 42 } as Partial<MessagePart>,
  });
  assert.equal(invalidText.ok, false);
  if (!invalidText.ok) {
    assert.equal(invalidText.reason, 'invalid-part');
  }
});

test('todo item patching is immutable, revision-aware, and updates lifecycle status', () => {
  const base = todoPart(
    [
      { id: 'capture', title: 'Capture', status: 'done' },
      { id: 'verify', title: 'Verify', status: 'pending' },
    ],
    { id: 'todo-1', revision: 1, status: 'streaming' }
  );

  const updated = patchTodoItem(
    base,
    'verify',
    { id: 'ignored-at-runtime', title: 'Verify UI', status: 'active' } as Parameters<
      typeof patchTodoItem
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

  const stale = patchTodoItem(updated.part, 'verify', { status: 'done' }, 2);
  assert.equal(stale.ok, false);
  assert.equal(stale.reason, 'stale-revision');
  assert.equal(stale.part, updated.part);

  const missing = patchTodoItem(updated.part, 'missing', { status: 'done' }, 3);
  assert.equal(missing.ok, false);
  assert.equal(missing.reason, 'item-not-found');

  const invalidStatus = patchTodoItem(
    updated.part,
    'verify',
    { status: 'blocked' } as Parameters<typeof patchTodoItem>[2],
    3
  );
  assert.equal(invalidStatus.ok, false);
  assert.equal(invalidStatus.reason, 'invalid-status');

  const invalidRevision = patchTodoItem(updated.part, 'verify', { status: 'done' }, NaN);
  assert.equal(invalidRevision.ok, false);
  assert.equal(invalidRevision.reason, 'invalid-revision');

  const completed = patchTodoItem(updated.part, 'verify', { status: 'skipped' }, 3);
  assert.equal(completed.ok, true);
  assert.equal(completed.part.status, 'complete');

  const reopened = patchTodoItem(completed.part, 'verify', { status: 'active' }, 4);
  assert.equal(reopened.ok, true);
  assert.equal(reopened.part.status, 'streaming');

  const alias = patchTodoItemInPart(reopened.part, 'verify', { status: 'done' }, 5);
  assert.equal(alias.ok, true);

  const empty = todoPart([], { id: 'empty', revision: 1 });
  assert.equal(areTodoItemsTerminal(empty.items), false);
  const missingInEmpty = patchTodoItem(empty, 'missing', { status: 'done' }, 2);
  assert.equal(missingInEmpty.ok, false);
  assert.equal(missingInEmpty.reason, 'item-not-found');
});

test('part guards validate todo and tool-call shapes at runtime', () => {
  const todo = todoPart([{ id: 'task-1', title: 'Capture', status: 'pending' }], {
    id: 'todo-1',
  });
  const tool: ToolCallPart = {
    type: 'tool-call',
    id: 'tool-1',
    toolCallId: 'call-1',
    toolName: 'search',
    state: 'executing',
  };

  assert.equal(isTodoItemStatus('done'), true);
  assert.equal(isTodoItemStatus('blocked'), false);
  assert.equal(isTodoPart(todo), true);
  assert.equal(isTodoPart({ ...todo, revision: Number.NaN }), false);
  assert.equal(isToolCallState('output-error'), true);
  assert.equal(isToolCallState('waiting'), false);
  assert.equal(isToolCallPart(tool), true);
  assert.equal(isToolCallPart({ ...tool, state: 'waiting' }), false);
});

test('todo SSE update normalization accepts supported shapes and rejects invalid data', () => {
  const objectUpdate = normalizeTodoItemUpdateEvent({
    type: 'todo.item.updated',
    messageId: 'assistant-42',
    partId: 'plan',
    itemId: 'panel',
    status: 'done',
    revision: 3,
  });
  assert.equal(objectUpdate.ok, true);
  assert.deepEqual(objectUpdate.update, {
    messageId: 'assistant-42',
    partId: 'plan',
    itemId: 'panel',
    patch: { status: 'done' },
    revision: 3,
  });

  const stringUpdate = normalizeTodoItemUpdateEvent(
    JSON.stringify({
      messageId: 'assistant-42',
      partId: 'plan',
      itemId: 'panel',
      title: 'Build panel',
    })
  );
  assert.equal(stringUpdate.ok, true);
  assert.deepEqual(stringUpdate.update.patch, { title: 'Build panel' });

  const eventUpdate = normalizeTodoItemUpdateEvent({
    type: 'todo.item.updated',
    data: JSON.stringify({
      messageId: 'assistant-42',
      partId: 'plan',
      itemId: 'panel',
      description: 'Ready for QA',
    }),
  });
  assert.equal(eventUpdate.ok, true);
  assert.deepEqual(eventUpdate.update.patch, { description: 'Ready for QA' });

  assert.deepEqual(
    normalizeTodoItemUpdateEvent({ type: 'tool.updated' }),
    { ok: false, reason: 'invalid-event' }
  );
  assert.deepEqual(
    normalizeTodoItemUpdateEvent({
      messageId: 'assistant-42',
      partId: 'plan',
      itemId: 'panel',
      status: 'blocked',
    }),
    { ok: false, reason: 'invalid-status' }
  );
  assert.deepEqual(
    normalizeTodoItemUpdateEvent({
      messageId: 'assistant-42',
      partId: 'plan',
      itemId: 'panel',
      status: 'done',
      revision: '3',
    }),
    { ok: false, reason: 'invalid-revision' }
  );
  assert.deepEqual(
    normalizeTodoItemUpdateEvent({
      messageId: 'assistant-42',
      partId: 'plan',
      itemId: 'panel',
    }),
    { ok: false, reason: 'empty-patch' }
  );
});

test('tool-call patching validates state and preserves stable ids', () => {
  const base: ToolCallPart = {
    type: 'tool-call',
    id: 'tool-1',
    toolCallId: 'call-1',
    toolName: 'search',
    state: 'input-available',
  };

  const updated = patchToolCallPart(base, {
    id: 'ignored',
    toolCallId: 'ignored-call',
    state: 'executing',
    args: { q: 'todo' },
  } as Partial<ToolCallPart>);

  assert.equal(updated.ok, true);
  assert.equal(updated.part.id, 'tool-1');
  assert.equal(updated.part.toolCallId, 'call-1');
  assert.equal(updated.part.state, 'executing');
  assert.deepEqual(updated.part.args, { q: 'todo' });
  assert.equal(base.state, 'input-available');
  assert.notEqual(updated.part, base);

  const invalid = patchToolCallPart(base, {
    state: 'waiting',
  } as Partial<ToolCallPart>);
  assert.equal(invalid.ok, false);
  assert.equal(invalid.reason, 'invalid-state');
  assert.equal(invalid.part, base);
});

test('event helpers attach message context without changing source payloads', () => {
  const todo = todoPart([{ id: 'task-1', title: 'Capture', status: 'pending' }], {
    id: 'todo-1',
  });
  const tool = {
    type: 'tool-call',
    id: 'tool-1',
    toolCallId: 'call-1',
    toolName: 'search',
    state: 'input-available',
  } as const;
  const text = textPart('Form lives here', { id: 'text-1' });
  const message: ChatMessage = { id: 'msg-1', role: 'assistant', parts: [text, todo, tool] };

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

  const todoPartAction = createPartActionDetail({
    kind: 'todo-action',
    action: todoDetail.action,
    message,
    detail: todoDetail,
    part: todoDetail.part,
  });
  assert.equal(todoPartAction.kind, 'todo-action');
  assert.equal(todoPartAction.action, 'change-status');
  assert.equal(todoPartAction.messageId, 'msg-1');
  assert.equal(todoPartAction.partId, 'todo-1');
  assert.equal(todoPartAction.partType, 'todo');
  assert.equal(todoPartAction.detail, todoDetail);

  const values = { query: 'task', confirmed: true };
  const formDetail = createFormSubmitDetail(message, {
    formId: 'search-form',
    values,
  });

  assert.equal(formDetail.messageId, 'msg-1');
  assert.equal(formDetail.message, message);
  assert.equal(formDetail.title, '');
  assert.equal(formDetail.values, values);

  const formPartAction = createPartActionDetail({
    kind: 'form-submit',
    action: 'submit',
    message,
    detail: formDetail,
    part: text,
  });
  assert.equal(formPartAction.kind, 'form-submit');
  assert.equal(formPartAction.partId, 'text-1');
  assert.equal(formPartAction.partType, 'text');

  const toolDetail = createToolActionDetail(message, {
    action: 'approve',
    toolCallId: tool.toolCallId,
    part: tool,
  });
  assert.equal(toolDetail.messageId, 'msg-1');
  assert.equal(toolDetail.message, message);
  assert.equal(toolDetail.part, tool);
  assert.equal(toolDetail.action, 'approve');

  const toolPartAction = createPartActionDetail({
    kind: 'tool-action',
    action: toolDetail.action,
    message,
    detail: toolDetail,
    part: toolDetail.part,
  });
  assert.equal(toolPartAction.kind, 'tool-action');
  assert.equal(toolPartAction.partId, 'tool-1');
  assert.equal(toolPartAction.partType, 'tool-call');
  assert.equal(toolPartAction.detail, toolDetail);
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
