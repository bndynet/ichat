import type { TodoItem, TodoItemPatch, TodoPart } from './types.js';

export type TodoPatchFailureReason = 'stale-revision' | 'item-not-found';

export type TodoPatchResult =
  | { ok: true; part: TodoPart }
  | { ok: false; part: TodoPart; reason: TodoPatchFailureReason };

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
export function patchTodoItemInPart(
  part: TodoPart,
  itemId: string,
  patch: TodoItemPatch,
  revision?: number,
): TodoPatchResult {
  const currentRevision = Number.isFinite(part.revision) ? part.revision : 0;
  if (revision != null && revision <= currentRevision) {
    return { ok: false, part, reason: 'stale-revision' };
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
