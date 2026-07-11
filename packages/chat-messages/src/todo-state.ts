import type { TodoItem, TodoItemPatch, TodoPart } from './types.js';
import { isTodoItemStatus } from './part-guards.js';
import {
  getEventSequenceNumber,
  isNonEmptyString,
  isRecord,
  parseTypedEventPayload,
} from './typed-event-payload.js';

export type TodoPatchFailureReason =
  | 'stale-revision'
  | 'item-not-found'
  | 'invalid-status'
  | 'invalid-revision';

export type TodoPatchResult =
  | { ok: true; part: TodoPart }
  | { ok: false; part: TodoPart; reason: TodoPatchFailureReason };

export interface TodoItemUpdate {
  messageId: string;
  partId: string;
  itemId: string;
  patch: TodoItemPatch;
  revision?: number;
  sequenceNumber?: number;
}

export type TodoItemUpdateNormalizeFailureReason =
  | 'invalid-event'
  | 'invalid-message-id'
  | 'invalid-part-id'
  | 'invalid-item-id'
  | 'invalid-status'
  | 'invalid-revision'
  | 'invalid-sequence-number'
  | 'empty-patch';

export type TodoItemUpdateNormalizeResult =
  | { ok: true; update: TodoItemUpdate }
  | { ok: false; reason: TodoItemUpdateNormalizeFailureReason };

/** Work items that no longer need agent activity. */
export function isTerminalTodoItem(item: Pick<TodoItem, 'status'>): boolean {
  return item.status === 'done' || item.status === 'skipped';
}

/** True when every item is terminal. Empty lists remain non-terminal. */
export function areTodoItemsTerminal(items: readonly Pick<TodoItem, 'status'>[]): boolean {
  return items.length > 0 && items.every(isTerminalTodoItem);
}

/**
 * Patch one todo item without mutating the source part. Explicit revisions are
 * monotonic; stale or duplicate revisions are ignored by returning `ok: false`.
 */
export function patchTodoItem(
  part: TodoPart,
  itemId: string,
  patch: TodoItemPatch,
  revision?: number,
): TodoPatchResult {
  const currentRevision = Number.isFinite(part.revision) ? part.revision : 0;
  if (revision != null && !Number.isFinite(revision)) {
    return { ok: false, part, reason: 'invalid-revision' };
  }
  if (revision != null && revision <= currentRevision) {
    return { ok: false, part, reason: 'stale-revision' };
  }
  if (patch.status !== undefined && !isTodoItemStatus(patch.status)) {
    return { ok: false, part, reason: 'invalid-status' };
  }

  const itemIndex = part.items.findIndex((item) => item.id === itemId);
  if (itemIndex < 0) {
    return { ok: false, part, reason: 'item-not-found' };
  }

  const items = part.items.map((item, index) =>
    index === itemIndex ? { ...item, ...patch, id: item.id } : item
  );
  const status = areTodoItemsTerminal(items)
    ? 'complete'
    : part.status === 'complete'
      ? 'streaming'
      : part.status;

  return {
    ok: true,
    part: {
      ...part,
      items,
      revision: revision ?? currentRevision + 1,
      status,
    },
  };
}

/**
 * Normalize a backend/SSE todo item update into the same shape used by
 * `updateTodoItem()`. Accepts a parsed object, a JSON string, or a MessageEvent-
 * like object with a JSON `data` payload.
 */
export function normalizeTodoItemUpdateEvent(
  input: unknown
): TodoItemUpdateNormalizeResult {
  const payload = parseTypedEventPayload(input, 'todo.item.updated');
  if (!isRecord(payload)) {
    return { ok: false, reason: 'invalid-event' };
  }

  if (
    typeof payload.type === 'string' &&
    payload.type !== 'todo.item.updated'
  ) {
    return { ok: false, reason: 'invalid-event' };
  }

  if (!isNonEmptyString(payload.messageId)) {
    return { ok: false, reason: 'invalid-message-id' };
  }
  if (!isNonEmptyString(payload.partId)) {
    return { ok: false, reason: 'invalid-part-id' };
  }
  if (!isNonEmptyString(payload.itemId)) {
    return { ok: false, reason: 'invalid-item-id' };
  }

  const sequenceNumber = getEventSequenceNumber(payload);
  if (sequenceNumber === 'invalid') {
    return { ok: false, reason: 'invalid-sequence-number' };
  }

  const patch: TodoItemPatch = {};
  if (payload.status !== undefined) {
    if (!isTodoItemStatus(payload.status)) {
      return { ok: false, reason: 'invalid-status' };
    }
    patch.status = payload.status;
  }
  if (typeof payload.title === 'string') {
    patch.title = payload.title;
  }
  if (typeof payload.description === 'string') {
    patch.description = payload.description;
  }

  if (Object.keys(patch).length === 0) {
    return { ok: false, reason: 'empty-patch' };
  }

  const revision = payload.revision;
  if (revision !== undefined) {
    if (typeof revision !== 'number' || !Number.isFinite(revision)) {
      return { ok: false, reason: 'invalid-revision' };
    }
  }

  const update: TodoItemUpdate = {
    messageId: payload.messageId,
    partId: payload.partId,
    itemId: payload.itemId,
    patch,
  };
  if (revision !== undefined) {
    update.revision = revision;
  }
  if (sequenceNumber !== undefined) {
    update.sequenceNumber = sequenceNumber;
  }

  return { ok: true, update };
}

/**
 * @deprecated Use `patchTodoItem()` instead. Kept so existing integrations can
 * upgrade without changing imports.
 */
export function patchTodoItemInPart(
  part: TodoPart,
  itemId: string,
  patch: TodoItemPatch,
  revision?: number,
): TodoPatchResult {
  return patchTodoItem(part, itemId, patch, revision);
}
