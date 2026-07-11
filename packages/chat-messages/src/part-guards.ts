import type {
  MessagePart,
  TodoItem,
  TodoItemStatus,
  TodoPart,
  ToolCallPart,
  ToolCallState,
} from './types.js';

export const TODO_ITEM_STATUSES = [
  'done',
  'active',
  'error',
  'pending',
  'skipped',
] as const satisfies readonly TodoItemStatus[];

export const TOOL_CALL_STATES = [
  'input-streaming',
  'input-available',
  'executing',
  'output-available',
  'output-error',
] as const satisfies readonly ToolCallState[];

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object';
}

function hasNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim() !== '';
}

export function isTodoItemStatus(value: unknown): value is TodoItemStatus {
  return (
    typeof value === 'string' &&
    (TODO_ITEM_STATUSES as readonly string[]).includes(value)
  );
}

export function isToolCallState(value: unknown): value is ToolCallState {
  return (
    typeof value === 'string' &&
    (TOOL_CALL_STATES as readonly string[]).includes(value)
  );
}

export function isTodoItem(value: unknown): value is TodoItem {
  return (
    isRecord(value) &&
    hasNonEmptyString(value.id) &&
    typeof value.title === 'string' &&
    isTodoItemStatus(value.status) &&
    (value.description === undefined || typeof value.description === 'string')
  );
}

export function isTodoPart(part: unknown): part is TodoPart {
  return (
    isRecord(part) &&
    part.type === 'todo' &&
    hasNonEmptyString(part.id) &&
    Array.isArray(part.items) &&
    part.items.every(isTodoItem) &&
    Number.isFinite(part.revision)
  );
}

export function isToolCallPart(part: unknown): part is ToolCallPart {
  return (
    isRecord(part) &&
    part.type === 'tool-call' &&
    hasNonEmptyString(part.id) &&
    hasNonEmptyString(part.toolCallId) &&
    hasNonEmptyString(part.toolName) &&
    isToolCallState(part.state)
  );
}

export function isMessagePart(part: unknown): part is MessagePart {
  if (!isRecord(part) || !hasNonEmptyString(part.id) || typeof part.type !== 'string') {
    return false;
  }
  switch (part.type) {
    case 'text':
    case 'reasoning':
      return typeof part.text === 'string';
    case 'tool-call':
      return isToolCallPart(part);
    case 'file':
      return (
        typeof part.mediaType === 'string' &&
        (part.url === undefined || typeof part.url === 'string') &&
        (part.data === undefined || typeof part.data === 'string')
      );
    case 'source':
      return (
        typeof part.url === 'string' &&
        (part.title === undefined || typeof part.title === 'string') &&
        (part.snippet === undefined || typeof part.snippet === 'string')
      );
    case 'todo':
      return isTodoPart(part);
    default:
      return part.type.startsWith('x-') && 'data' in part;
  }
}
