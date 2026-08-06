import assert from "node:assert/strict";
import { ChatMessages } from "../src/components/chat-messages.js";
import { ChatPartHost } from "../src/components/chat-part-host.js";
import { ChatTextPart } from "../src/components/chat-text-part.js";
import { ChatTodo } from "../src/components/chat-todo.js";
import { ChatToolCall } from "../src/components/chat-tool-call.js";
import {
  textPart,
  todoPart,
  type ChatMessage,
  type ChatPartActionDetail,
  type MessagePart,
  type TodoItem,
  type TodoPart,
  type ToolCallPart,
} from "../src/types.js";

function test(name: string, run: () => void): void {
  try {
    run();
  } catch (error) {
    console.error(`not ok - ${name}`);
    throw error;
  }
}

class TestElement {
  tagName: string;
  dataset: Record<string, string>;

  constructor(tagName: string, dataset: Record<string, string> = {}) {
    this.tagName = tagName;
    this.dataset = dataset;
  }
}

type CustomEventLike<TDetail> = Event & {
  detail: TDetail;
  stopped: boolean;
};

type HostInternals = ChatPartHost & {
  _onPartAction(event: Event): void;
  _handleRenderedPartUpdated(event: CustomEvent<{ changed?: boolean }>): void;
};

type TodoInternals = ChatTodo & {
  _requestStatusChange(item: TodoItem): void;
};

type ToolInternals = ChatToolCall & {
  _emit(action: "approve" | "reject"): void;
};

function installHTMLElementShim(): void {
  if ("HTMLElement" in globalThis) return;
  (globalThis as unknown as { HTMLElement: typeof TestElement }).HTMLElement =
    TestElement;
}

function eventFromPath<TDetail>(
  type: string,
  detail: TDetail,
  path: unknown[],
): CustomEventLike<TDetail> {
  let stopped = false;
  return {
    type,
    detail,
    get stopped() {
      return stopped;
    },
    stopPropagation() {
      stopped = true;
    },
    composedPath() {
      return path as EventTarget[];
    },
  } as CustomEventLike<TDetail>;
}

function sampleMessage(): {
  message: ChatMessage;
  text: MessagePart;
  todo: TodoPart;
  tool: ToolCallPart;
} {
  const text = textPart("Form lives here", { id: "text-1" });
  const todo = todoPart(
    [{ id: "task-1", title: "Capture", status: "pending" }],
    {
      id: "todo-1",
    },
  );
  const tool: ToolCallPart = {
    type: "tool-call",
    id: "tool-1",
    toolCallId: "call-1",
    toolName: "search",
    state: "input-available",
    approval: "required",
  };
  return {
    text,
    todo,
    tool,
    message: { id: "msg-1", role: "assistant", parts: [text, todo, tool] },
  };
}

function textPartUpdateEvent(changed: boolean): CustomEvent<{
  changed: boolean;
}> & {
  stopped: boolean;
} {
  let stopped = false;
  return {
    detail: { changed },
    get stopped() {
      return stopped;
    },
    stopPropagation() {
      stopped = true;
    },
  } as CustomEvent<{ changed: boolean }> & { stopped: boolean };
}

test("part host enriches embedded part-action events from child components", () => {
  installHTMLElementShim();
  const { message, todo } = sampleMessage();
  const host = new ChatPartHost() as HostInternals;
  host.message = message;
  host.parts = message.parts;
  const todoElement = new TestElement("I-CHAT-TODO", { partId: todo.id });
  const partActions: ChatPartActionDetail[] = [];

  host.addEventListener("part-action", (event) => {
    partActions.push((event as CustomEvent<ChatPartActionDetail>).detail);
  });

  const event = eventFromPath(
    "part-action",
    {
      kind: "todo",
      action: "change-status",
      itemId: "task-1",
      previousStatus: "pending",
      status: "active",
      part: todo,
    },
    [todoElement, host],
  );

  host._onPartAction(event);

  assert.equal(event.stopped, true);
  assert.equal(partActions.length, 1);
  assert.equal(partActions[0].kind, "todo");
  assert.equal(partActions[0].action, "change-status");
  assert.equal(partActions[0].messageId, message.id);
  assert.equal(partActions[0].message, message);
  assert.equal(partActions[0].partId, todo.id);
  assert.equal(partActions[0].partType, "todo");

  // Already-enriched events are skipped
  const alreadyEnriched = eventFromPath(
    "part-action",
    { kind: "todo", messageId: message.id },
    [todoElement, host],
  );
  host._onPartAction(alreadyEnriched);
  assert.equal(alreadyEnriched.stopped, false);
  assert.equal(partActions.length, 1);
});

test("part host forwards extracted rendered part updates as resize notifications", () => {
  const { message } = sampleMessage();
  const host = new ChatPartHost() as HostInternals;
  host.message = message;
  const textPartElement = new ChatTextPart();
  assert.ok(textPartElement);

  let hostUpdates = 0;
  let resizeUpdates = 0;
  host.addEventListener("chat-part-host-updated", () => {
    hostUpdates += 1;
  });
  host.addEventListener("chat-content-resize", () => {
    resizeUpdates += 1;
  });

  const event = textPartUpdateEvent(true);
  host._handleRenderedPartUpdated(event);

  assert.equal(event.stopped, true);
  assert.equal(hostUpdates, 1);
  assert.equal(resizeUpdates, 1);

  const replyHost = new ChatPartHost() as HostInternals;
  replyHost.message = { ...message, parentId: "parent-1" };
  let replyResizeUpdates = 0;
  replyHost.addEventListener("chat-content-resize", () => {
    replyResizeUpdates += 1;
  });
  replyHost._handleRenderedPartUpdated(textPartUpdateEvent(true));
  assert.equal(replyResizeUpdates, 0);
});

test("part host enriches form and tool part-action events", () => {
  installHTMLElementShim();
  const { message, text, tool } = sampleMessage();
  const host = new ChatPartHost() as HostInternals;
  host.message = message;
  host.parts = message.parts;
  const formElement = new TestElement("I-CHAT-FORM", { partId: text.id });
  const toolElement = new TestElement("I-CHAT-TOOL-CALL", { partId: tool.id });
  const partActions: ChatPartActionDetail[] = [];

  host.addEventListener("part-action", (event) => {
    partActions.push((event as CustomEvent<ChatPartActionDetail>).detail);
  });

  const formEvent = eventFromPath(
    "part-action",
    {
      kind: "form",
      action: "submit",
      formId: "search-form",
      values: { query: "todo" },
    },
    [formElement, host],
  );
  host._onPartAction(formEvent);

  assert.equal(formEvent.stopped, true);
  assert.equal(partActions[0].kind, "form");
  assert.equal(partActions[0].partId, text.id);
  assert.equal(partActions[0].partType, "text");
  assert.equal(partActions[0].messageId, message.id);

  const toolEvent = eventFromPath(
    "part-action",
    {
      kind: "tool-call",
      action: "approve",
      toolCallId: tool.toolCallId,
      part: tool,
    },
    [toolElement, host],
  );
  host._onPartAction(toolEvent);

  assert.equal(toolEvent.stopped, true);
  assert.equal(partActions[1].kind, "tool-call");
  assert.equal(partActions[1].action, "approve");
  assert.equal(partActions[1].partId, tool.id);
  assert.equal(partActions[1].partType, "tool-call");
  assert.equal(partActions[1].messageId, message.id);
});

test("todo and tool components emit part-action events", () => {
  const { todo, tool } = sampleMessage();
  const todoElement = new ChatTodo() as TodoInternals;
  const toolElement = new ChatToolCall() as ToolInternals;
  const partActions: Array<Record<string, unknown>> = [];

  todoElement.data = todo;
  todoElement.addEventListener("part-action", (event) => {
    partActions.push((event as CustomEvent).detail);
  });
  todoElement._requestStatusChange(todo.items[0]);

  assert.equal(partActions.length, 1);
  assert.equal(partActions[0].kind, "todo");
  assert.equal(partActions[0].action, "change-status");
  assert.equal(partActions[0].itemId, todo.items[0].id);
  assert.equal(partActions[0].previousStatus, "pending");
  assert.equal(partActions[0].status, "active");
  assert.equal(partActions[0].part, todo);

  todoElement.data = { ...todo, interactive: false };
  todoElement._requestStatusChange(todo.items[0]);
  assert.equal(partActions.length, 1);

  toolElement.data = tool;
  toolElement.addEventListener("part-action", (event) => {
    partActions.push((event as CustomEvent).detail);
  });
  toolElement._emit("approve");

  assert.equal(partActions.length, 2);
  assert.equal(partActions[1].kind, "tool-call");
  assert.equal(partActions[1].action, "approve");
  assert.equal(partActions[1].toolCallId, tool.toolCallId);
  assert.equal(partActions[1].part, tool);
});

test("chat messages applies valid backend part events and ignores invalid updates", () => {
  const { message, text, todo, tool } = sampleMessage();
  const messagesElement = new ChatMessages();
  messagesElement.messages = [message];

  const textUpdate = messagesElement.tryApplyMessagePartUpdateEvent({
    type: "message.part.updated",
    messageId: message.id,
    partId: text.id,
    patch: { text: "Updated body", status: "complete" },
  });

  assert.equal(textUpdate.ok, true);
  assert.equal(messagesElement.messages[0].parts[0].type, "text");
  assert.equal(
    (
      messagesElement.messages[0].parts[0] as Extract<
        MessagePart,
        { type: "text" }
      >
    ).text,
    "Updated body",
  );
  assert.equal(messagesElement.messages[0].parts[0].id, text.id);

  const beforeInvalidTool = messagesElement.messages;
  const invalidToolUpdate = messagesElement.tryApplyMessagePartUpdateEvent({
    type: "message.part.updated",
    messageId: message.id,
    partId: tool.id,
    patch: { state: "waiting" },
  });

  assert.equal(invalidToolUpdate.ok, false);
  if (!invalidToolUpdate.ok) {
    assert.equal(invalidToolUpdate.reason, "invalid-state");
  }
  assert.equal(messagesElement.messages, beforeInvalidTool);

  const beforeInvalidTodo = messagesElement.messages;
  const invalidTodoUpdate = messagesElement.tryApplyTodoItemUpdateEvent({
    type: "todo.item.updated",
    messageId: message.id,
    partId: todo.id,
    itemId: todo.items[0].id,
    status: "blocked",
  });

  assert.equal(invalidTodoUpdate.ok, false);
  if (!invalidTodoUpdate.ok) {
    assert.equal(invalidTodoUpdate.reason, "invalid-status");
  }
  assert.equal(messagesElement.messages, beforeInvalidTodo);
});
