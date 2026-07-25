# Phase 1.1 — Unit Test Coverage Summary

**Date:** 2025-07-25

## Overview

Added comprehensive unit tests for all pure helper functions in `@bndynet/ichat-messages`, as outlined in the [optimization plan](./optimization-plan.md).

## New Test Files (7 added)

| File | Tests Added | Functions Covered |
|---|---|---|
| `message-part-state.test.ts` | 16 | `findMessagePart`, `appendMessagePart`, `replaceMessagePart`, `patchMessagePart`, `applyMessagePartUpdate` |
| `todo-state.test.ts` | 27 | `isTerminalTodoItem`, `areTodoItemsTerminal`, `patchTodoItem` (lifecycle, stale revision, terminal detection), `normalizeTodoItemUpdateEvent`, `patchTodoItemInPart` |
| `tool-call-state.test.ts` | 11 | `patchToolCallPart` (all valid state transitions, invalid transitions, id immutability) |
| `message-part-events.test.ts` | 21 | `normalizeMessagePartUpdateEvent` (valid/invalid payloads, malformed inputs, SSE envelope compatibility) |
| `update-results.test.ts` | 13 | Discriminated union narrowing for all result types at runtime |
| `date-separator.test.ts` | 17 | `calendarDaysAgo`, `getDateSeparatorInfo` (en/zh), `resolveDateSeparatorLabels`, `makeDaysAgo` (plural-aware) |
| `duration-format.test.ts` | 16 | `formatAssistantDurationMs` (sub-minute, minute+, negative, locales, edge cases) |

## Test Results

```
tests 24
pass 24
fail 0
duration_ms ~1376ms
```

## Existing Tests (unchanged, continue passing)

| File | Tests |
|---|---|
| `component-events.test.ts` | ✓ |
| `message-body-baseline.test.ts` | ✓ |
| `message-collection-state.test.ts` | ✓ |
| `messages-change.test.ts` | ✓ |

## Key Patterns

- Uses Node.js built-in test runner (`node --test`)
- Custom `test()` wrapper function (matching existing convention)
- All pure reducers verified for immutability (input arrays never mutated)
- All discriminated unions verified for correct narrowing at runtime

## Pending (future work)

- Component tests for `<i-chat-input>` (send/cancel events, disabled state, voice recognition, auto-resize)
- Component tests for `<i-chat>` (controlled vs uncontrolled, slot forwarding, confirmation queue, `ready` promise, `createRunController()`)
- Integration tests (SSE event stream → `tryApplyMessagePartUpdateEvent` / `tryApplyTodoItemUpdateEvent`)
