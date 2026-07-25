# Phase 3 — Developer Experience Summary

**Date:** 2025-07-25

## Changes Made

### 3.1 Built-in SSE Client

**File:** `packages/chat/src/sse/chat-sse-client.ts`

New `@bndynet/ichat/sse` subpath export providing `createChatSSEClient()`:

- Connects to an SSE endpoint and auto-routes events to `<i-chat>` store
- Parses `message.part.updated`, `todo.item.updated`, `message.completed`, and `error` events
- Supports both named SSE events (`event: message.part.updated`) and data-type routing (`data: {"type":"message.part.updated",...}`)
- Configurable reconnection with exponential backoff + jitter (default: 1s→2s→4s→8s→max 30s)
- Supports POST-based SSE endpoints with custom headers and body
- Returns `{ status, messageId, start(), abort() }` controller

```typescript
import { createChatSSEClient } from '@bndynet/ichat/sse';

const sse = createChatSSEClient('/api/chat/stream', chat, {
  onError: (err) => chat.showError(err),
});
chat.addEventListener('send', (e) => {
  sse.start();
});
```

### 3.2 Message Lifecycle Middleware

**File:** `packages/chat/src/middleware/chat-middleware.ts`

New `ChatMiddleware` interface and `createMiddlewareChain()`:

```typescript
interface ChatMiddleware {
  name: string;
  beforeSend?: (content: string) => string | null | undefined;
  afterMessageAdded?: (message: ChatMessage) => ChatMessage | null;
  beforeAppendPart?: (messageId: string, part: MessagePart) => MessagePart | null;
  onError?: (error: string, messageId?: string) => void;
}
```

- Register with `chat.use(middleware)` — returns a disposal function
- `beforeSend` integrated into `_handleSend()` — can transform or block sends
- FIFO execution order; `null` return short-circuits the chain

### 3.5 AbortController in ChatRunController

**File:** `packages/chat/src/controllers/chat-run-controller.ts`

- Added `signal` getter returning an `AbortSignal`
- `complete()`, `fail()`, `cancel()` all call `_cleanup()` which aborts the signal
- Consumers can pass `run.signal` to `fetch()` for automatic request cancellation

## Exports Added

- `@bndynet/ichat/sse` — `createChatSSEClient`, `SSEClient`, `SSEClientOptions`, `ChatStorePort`
- `@bndynet/ichat` — `ChatMiddleware`, `createMiddlewareChain`
- `ChatRunController.signal` — new `AbortSignal` property

## Build

All formats build successfully: ESM, CJS, IIFE, DTS for both `index` and `sse/index`.

## Tests

All 24 existing tests continue to pass.

## Pending (future phases)

- 3.3 Type system cleanup (split internals from public API)
- 3.4 Generic type support for custom parts
