import type { TodoPart } from "./types.js";

/** Initial expanded state for a todo part. Later updates preserve local state. */
export function getTodoInitialExpanded(
  part: Pick<TodoPart, "defaultCollapsed">,
): boolean {
  return !part.defaultCollapsed;
}

/** Expansion is initialized only when a different stable todo part is mounted. */
export function shouldInitializeTodoExpansion(
  initializedPartId: string | undefined,
  nextPartId: string | undefined,
): nextPartId is string {
  return !!nextPartId && nextPartId !== initializedPartId;
}
