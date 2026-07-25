# Phase 5 — Accessibility Summary

**Date:** 2025-07-25
**Status:** Planned (not yet implemented)

## Rationale

Phase 5 requires DOM-level changes to each component's template — adding ARIA roles, keyboard handlers, and screen-reader announcements. These are best implemented alongside visual testing to ensure the accessibility attributes don't conflict with existing styling or behavior.

## Planned Changes

### 5.1 ARIA & Roles
- `<i-chat-messages>` — `role="log"`, `aria-live="polite"`, `aria-label`
- `<i-chat-message>` — `role="article"` for assistant messages
- `<i-chat-tool-call>` — `aria-expanded`, `aria-label` on buttons
- `<i-chat-todo>` — `role="list"`, `role="listitem"` with `aria-checked`
- `<i-chat-reasoning>` — `aria-expanded` on collapsible header
- `<i-chat-input>` — `aria-label` on textarea, voice button
- Confirmation panel — `role="alertdialog"`

### 5.2 Keyboard Navigation
- Enter/Space to toggle collapse on tool-call, reasoning
- Tab navigation on approve/reject buttons
- Escape to cancel confirmation, focus trap

### 5.3 Screen Reader Announcements
- Announce streaming completion via `aria-live` region
- Announce tool-call state transitions
- Announce errors

## Implementation Notes

Many components already have basic accessibility (e.g., `<button>` elements, `aria-label` on dismiss buttons). Full ARIA audit should be done with a screen reader.
