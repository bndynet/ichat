# Project Roadmap

Project-level follow-up work for `@bndynet/ichat`. Keep this checklist current: when an item lands, mark or move it in the same change. Add new sections as other areas grow.

## Completed

### Message Body & Parts

- [x] Centralize todo state updates in pure helpers. `patchTodoItem()` owns todo item validation, revision checks, immutable updates, and lifecycle status updates. `updateTodoItem()` and backend event handling route through the same reducer.
- [x] Centralize tool-call state updates in a pure helper. `patchToolCallPart()` validates tool-call state and preserves stable identity fields.
- [x] Add runtime guards for structured parts. `isTodoPart()`, `isTodoItemStatus()`, `isToolCallPart()`, and `isToolCallState()` protect update paths that receive external data.
- [x] Normalize todo backend/SSE updates. `normalizeTodoItemUpdateEvent()` accepts parsed objects, JSON strings, and MessageEvent-like payloads before applying `updateTodoItem()`.
- [x] Document deprecated compatibility surfaces. Legacy event/API surfaces are kept for existing integrations and should only be removed in a future major version.
- [x] Add diagnostic update results. `tryUpdateTodoItem()`, `tryUpdateToolCall()`, and `tryApplyTodoItemUpdateEvent()` return structured failure reasons while the older boolean methods remain compatible.
- [x] Extract message part collection updates into pure helpers. `appendMessagePart()`, `findMessagePart()`, `patchMessagePart()`, and `replaceMessagePart()` now cover collection updates outside the DOM.
- [x] Generalize backend event normalization. `message.part.updated` now covers text, tool-call, file/source metadata, and custom `x-*` part patches while `todo.item.updated` remains item-specific.
- [x] Add component-level event tests. The suite now covers child todo/tool events, `i-chat-part-host` event enrichment, unified `part-action`, deprecated compatibility events, and invalid backend events that must not mutate state.

## Backlog

### Message Body & Parts

- [ ] Revisit action kind names for a future major version. Current kinds (`'form-submit'`, `'todo-action'`, `'tool-action'`) are migration-friendly; a future breaking release could move to cleaner domain names such as `'form'`, `'todo'`, and `'tool-call'`.
- [ ] Run an accessibility pass over interactive parts. Recheck todo status controls, collapsible headers, tool approval buttons, keyboard behavior, and aria labels.

## Compatibility & Deprecation

These surfaces remain supported for compatibility. New integrations should use the preferred API, and removal should only happen in a future major version with migration notes.

| Deprecated surface | Preferred surface | Notes |
|--------------------|-------------------|-------|
| `patchTodoItemInPart()` | `patchTodoItem()` | Compatibility alias; no behavior difference. |
| `form-submit` event | `part-action` with `kind: 'form-submit'` | Still emitted after message context enrichment. |
| `todo-action` event | `part-action` with `kind: 'todo-action'` | Still emitted for interactive todo status requests. |
| `tool-action` event | `part-action` with `kind: 'tool-action'` | Still emitted for tool-call approval requests. |
| `config.dateSeparatorLabels` | `config.labels.dateSeparator` | Still merged for backward compatibility. |
