import type { ToolCallPart } from './types.js';
import { isToolCallState } from './part-guards.js';

export type ToolCallPatchFailureReason = 'invalid-state';

export type ToolCallPatchResult =
  | { ok: true; part: ToolCallPart }
  | { ok: false; part: ToolCallPart; reason: ToolCallPatchFailureReason };

/**
 * Patch a tool-call part without mutating it. Identity fields remain stable so
 * streamed updates cannot accidentally replace the keyed part or protocol id.
 */
export function patchToolCallPart(
  part: ToolCallPart,
  patch: Partial<ToolCallPart>,
): ToolCallPatchResult {
  if (patch.state !== undefined && !isToolCallState(patch.state)) {
    return { ok: false, part, reason: 'invalid-state' };
  }

  return {
    ok: true,
    part: {
      ...part,
      ...patch,
      id: part.id,
      type: 'tool-call',
      toolCallId: part.toolCallId,
    },
  };
}
