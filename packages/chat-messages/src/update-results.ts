import type { MessagePart, TodoPart, ToolCallPart } from './types.js';
import type {
  MessagePartUpdate,
  MessagePartUpdateNormalizeFailureReason,
} from './message-part-events.js';
import type {
  TodoItemUpdate,
  TodoItemUpdateNormalizeFailureReason,
  TodoPatchFailureReason,
} from './todo-state.js';
import type { ToolCallPatchFailureReason } from './tool-call-state.js';

export type PartLookupFailureReason = 'message-not-found' | 'part-not-found' | 'part-type-mismatch';

export type TodoItemUpdateFailureReason = PartLookupFailureReason | TodoPatchFailureReason;

export type TodoItemUpdateResult =
  | { ok: true; part: TodoPart }
  | { ok: false; reason: TodoItemUpdateFailureReason; part?: MessagePart };

export type TodoItemUpdateEventFailureReason =
  TodoItemUpdateNormalizeFailureReason | TodoItemUpdateFailureReason;

export type TodoItemUpdateEventResult =
  | { ok: true; update: TodoItemUpdate; part: TodoPart }
  | {
      ok: false;
      reason: TodoItemUpdateEventFailureReason;
      update?: TodoItemUpdate;
      part?: MessagePart;
    };

export type ToolCallUpdateFailureReason = PartLookupFailureReason | ToolCallPatchFailureReason;

export type ToolCallUpdateResult =
  | { ok: true; part: ToolCallPart }
  | { ok: false; reason: ToolCallUpdateFailureReason; part?: MessagePart };

export type MessagePartUpdateFailureReason =
  PartLookupFailureReason | ToolCallPatchFailureReason | 'invalid-part';

export type MessagePartUpdateResult =
  | { ok: true; part: MessagePart }
  | { ok: false; reason: MessagePartUpdateFailureReason; part?: MessagePart };

export type MessagePartUpdateEventFailureReason =
  MessagePartUpdateNormalizeFailureReason | MessagePartUpdateFailureReason;

export type MessagePartUpdateEventResult =
  | { ok: true; update: MessagePartUpdate; part: MessagePart }
  | {
      ok: false;
      reason: MessagePartUpdateEventFailureReason;
      update?: MessagePartUpdate;
      part?: MessagePart;
    };
