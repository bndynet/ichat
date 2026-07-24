# Chat UI Library — Optimization Plan

Actionable, staged plan to evolve `@bndynet/ichat` into a powerful AI UI chat component library. Each phase is self-contained and can ship independently.

---

## Phase 1 — Foundations (quality & scalability)

### 1.1 Test coverage

> **Goal:** protect existing behaviour before refactoring.

- [ ] **Unit tests for pure helpers** — `packages/chat-messages/test/`
  - `message-part-state.test.ts` — `appendMessagePart`, `findMessagePart`, `patchMessagePart`, `replaceMessagePart`, `applyMessagePartUpdate`
  - `message-collection-state.test.ts` — (extend existing) edge cases: duplicate ids, empty arrays, immutability
  - `todo-state.test.ts` — `patchTodoItem` lifecycle, stale revision rejection, terminal detection
  - `tool-call-state.test.ts` — `patchToolCallPart` state-machine transitions, invalid transitions
  - `message-part-events.test.ts` — `normalizeMessagePartUpdateEvent` malformed payloads
  - `update-results.test.ts` — all diagnostic result shapes
  - `date-separator.test.ts` — `getDateSeparatorInfo` across locales
  - `duration-format.test.ts` — `formatAssistantDurationMs` edge cases
- [ ] **Component tests for `<i-chat-input>`** — `packages/chat-input/test/`
  - send / cancel events
  - disabled state
  - voice recognition lifecycle (mock Web Speech API)
  - auto-resize behaviour
- [ ] **Component tests for `<i-chat>`** — `packages/chat/test/`
  - controlled vs uncontrolled mode
  - slot forwarding (self-avatar, peer-avatar, assistant-avatar, empty, actions, input)
  - confirmation queue (single, FIFO, clear-all)
  - `ready` promise contract
  - pending command replay on first render
  - `createRunController()` lifecycle
- [ ] **Integration tests** — SSE event stream → `tryApplyMessagePartUpdateEvent` / `tryApplyTodoItemUpdateEvent`

### 1.2 Test infrastructure

- [ ] Switch to `vitest` (faster, better DX, native ESM) or keep node-based with a proper test runner
- [ ] Add `packages/*/test/` coverage threshold (≥80% on helpers, ≥60% on components)
- [ ] CI: run tests on PR, block merge on failure

---

## Phase 2 — Performance

### 2.1 Virtual scrolling

- [ ] Integrate `@lit-labs/virtualizer` (Lit's official virtual scroller) into `<i-chat-messages>`
  - Wrap `repeat` directive with `<lit-virtualizer>`
  - Keep date-separator logic outside the virtual range (separators render unconditionally)
  - Ensure `.scrollToBottom()` still works
  - Ensure `ResizeObserver` auto-scroll still works with virtual items
  - Add `virtualScroll` config option (default on, can disable)
- [ ] Add perf benchmark: 100 / 1000 / 10000 messages render time

### 2.2 Markdown rendering

- [ ] Cache parsed markdown per text part — `Map<partId, { rawMd: string; html: string }>`
  - On `updatePart`, diff the raw markdown; if unchanged from cache, skip re-render
  - Invalidate cache on `config.allowedLinkProtocols` change
- [ ] Consider a "light mode" for streaming: render plain text until streaming stops, then do full markdown pass
  - Controlled by `config.markdownMode: 'full' | 'streaming-light'`

### 2.3 highlight.js bundle

- [ ] Make highlight.js a **peerDependency** (or optional `config.highlightJs` injection)
  - `config.highlightJs?: typeof hljs` — user passes their own instance with registered languages
  - Fallback: code blocks without highlight.js get plain `<pre><code>` (no highlighting)
- [ ] Remove `noExternal: [/.*/]` from tsup config for packages that should tree-shake (or keep it but document the bundle-size trade-off)

### 2.4 Memoized computed properties

- [ ] `<i-chat-messages>._messageRenderItems()` — cache based on `messages.length` + first/last `message.id` + first/last `message.timestamp`
- [ ] `<i-chat-messages>._labels` — cache based on `config.locale` + `config.labels` reference
- [ ] `<i-chat-message>._hasPerMessageAvatar()` — cache based on `message.avatar`

---

## Phase 3 — Developer Experience

### 3.1 Built-in SSE client

- [ ] Create `packages/chat/src/sse/` module:
  - `createChatSSEClient(url, chat, options?)` — connects to an SSE endpoint
  - Auto-parses `message.part.updated`, `todo.item.updated`, `tool-call.*` events
  - Maps OpenAI Responses-style streaming events to part updates
  - Returns `{ abort, connectionStatus }`
  - Handles reconnection with exponential backoff
- [ ] Export from `@bndynet/ichat/sse`

```typescript
// Target DX:
import { createChatSSEClient } from '@bndynet/ichat/sse';

const client = createChatSSEClient('/api/chat/stream', chat, {
  onError: (err) => chat.showError(err.message),
});
chat.addEventListener('send', (e) => {
  client.send(e.detail.content);
});
```

### 3.2 Message lifecycle hooks (middleware)

- [ ] Define `ChatMiddleware` interface:
  ```typescript
  interface ChatMiddleware {
    name: string;
    beforeSend?: (content: string) => string | Promise<string>;
    afterReceive?: (message: ChatMessage) => ChatMessage;
    beforeAppendPart?: (messageId: string, part: MessagePart) => MessagePart;
    onError?: (error: string, messageId?: string) => void;
  }
  ```
- [ ] `chat.use(middleware)` — register middleware chain
- [ ] Execute in FIFO order; short-circuit on null return

### 3.3 Type system cleanup

- [ ] Split `packages/chat/src/index.ts` into `index.ts` (user-facing) + `internals.ts` (diagnostics)
  - Keep ~20 core types in main export
  - Move 40+ diagnostic types (`*FailureReason`, `*Result`) to subpath export
- [ ] Add `@bndynet/ichat/messages` re-export path for users who want direct messages package access
- [ ] Document the public API surface explicitly in `docs/public-api.md`

### 3.4 Generic type support

- [ ] Make `<i-chat>` generic over custom part types:
  ```typescript
  interface ChatMessageExtraParts {
    [type: `x-${string}`]: unknown;
  }

  class Chat<TExtraParts extends Record<string, unknown> = {}> extends LitElement {
    messages: Array<ChatMessage & { parts: Array<MessagePart | CustomPart<TExtraParts>> }>;
  }
  ```
- [ ] Provide type helpers: `CustomPartOf<T>`, `PartOf<M, T>`

### 3.5 AbortController built into ChatRunController

- [ ] `ChatRunController` creates an internal `AbortController` on `start()`
- [ ] Expose `controller.signal` for consumers to pass to `fetch()`
- [ ] `cancel()` calls `controller.abort()` before the store mutation
- [ ] `complete()` / `fail()` / `cancel()` all clean up the controller

---

## Phase 4 — Extensibility

### 4.1 Overridable built-in part renderers

- [ ] Extend `PartRenderer` to allow matching built-in types:
  ```typescript
  interface PartRenderer {
    test: (type: string) => boolean; // now matches 'text', 'tool-call' too
    // ...
  }
  ```
- [ ] `<i-chat-part-host>` lookup order: custom registry → built-in renderers
- [ ] Allow consumers to replace the markdown-based `text` part renderer entirely

### 4.2 Async BlockRenderer

- [ ] Add optional `renderAsync` to `BlockRenderer`:
  ```typescript
  interface BlockRenderer {
    render?: (code: string, lang: string, info?: string) => string;
    renderAsync?: (code: string, lang: string, info?: string) => Promise<string>;
  }
  ```
- [ ] Fence renderer in markdown-it: if `renderAsync` exists, render a placeholder and replace when the promise resolves
- [ ] Show loading state while async renderer resolves

### 4.3 Plugin system

- [ ] Define `ChatPlugin` interface:
  ```typescript
  interface ChatPlugin {
    name: string;
    install(chat: Chat): void | (() => void); // returns optional teardown
  }
  ```
- [ ] `chat.use(plugin)` — calls `install`, collects teardown functions
- [ ] Built-in plugins: `MarkdownPlugin` (markdown-it config), `HighlightPlugin` (highlight.js injection)
- [ ] User-land examples: KaTeX math plugin, link preview plugin, code copy button plugin

---

## Phase 5 — Accessibility

### 5.1 ARIA & roles

- [ ] `<i-chat-messages>` — `role="log"`, `aria-live="polite"`, `aria-label`
- [ ] `<i-chat-message>` — `role="article"` for assistant messages
- [ ] `<i-chat-tool-call>` — `aria-expanded` on collapsible, `aria-label` on approve/reject buttons
- [ ] `<i-chat-todo>` — `role="list"`, `role="listitem"` with `aria-checked`
- [ ] `<i-chat-reasoning>` — `aria-expanded` on collapsible header
- [ ] `<i-chat-input>` — `aria-label` on textarea, voice button
- [ ] confirmation panel — `role="alertdialog"` or `role="dialog"`

### 5.2 Keyboard navigation

- [ ] `<i-chat-tool-call>` — Enter/Space to toggle collapse, Tab to approve/reject
- [ ] `<i-chat-todo>` — Enter/Space to cycle status on interactive items
- [ ] `<i-chat-reasoning>` — Enter/Space to toggle collapse
- [ ] confirmation panel — Escape to cancel, Enter to confirm, focus trap

### 5.3 Screen reader announcements

- [ ] Announce new messages (especially streaming completion) via `aria-live` region
- [ ] Announce tool-call state transitions
- [ ] Announce errors

---

## Phase 6 — Architecture Cleanup

### 6.1 `<i-chat>` decomposition

- [ ] Extract `ConfirmationController` from `<i-chat>` (ReactiveController pattern, similar to `ChatRunController`)
- [ ] Extract slot-forwarding logic into `SlotForwardingController`
- [ ] Replace `_pendingCommands` array with a `CommandQueue` class (typed, testable)
- [ ] Target: `<i-chat>` component file ≤ 300 lines

### 6.2 Remove deprecated APIs (v3)

- [ ] Remove `createStreamingController()` (use `createRunController()`)
- [ ] Remove `form-submit`, `todo-action`, `tool-action` compatibility events (use `part-action`)
- [ ] Remove `patchTodoItemInPart` alias (use `patchTodoItem`)
- [ ] Remove `updateTodoItem` / `updateToolCall` / `applyMessagePartUpdateEvent` / `applyTodoItemUpdateEvent` boolean returns (use `try*` variants)
- [ ] Remove `config.dateSeparatorLabels` (use `config.labels.dateSeparator`)

### 6.3 Re-evaluate `noExternal` bundling

- [ ] Move `markdown-it`, `dompurify`, `highlight.js` to peerDependencies
- [ ] Provide a "full" bundle (`iife`) and an "esm-only" build for tree-shaking consumers
- [ ] Document bundle size in README with badges

---

## Phase 7 — Documentation & Showcase

### 7.1 Migration guides

- [ ] v1 → v2 migration guide (`docs/migration-v1-to-v2.md`)
- [ ] v2 → v3 migration guide (planned breaking changes)

### 7.2 Storybook

- [ ] Set up Storybook 8+ with Lit support
- [ ] Stories for each component: `<i-chat>`, `<i-chat-input>`, `<i-chat-message>`, `<i-chat-tool-call>`, `<i-chat-todo>`, `<i-chat-reasoning>`
- [ ] Configurable knobs: locale, dark/light, message count, streaming simulation
- [ ] Deploy to Chromatic for visual regression testing

### 7.3 Interactive playground

- [ ] Embed a live `<i-chat>` playground on the docs site (iframe + demo code)
- [ ] Show the same demo with different framework wrappers (Vue, React, plain HTML)

---

## Priority Summary

```
Phase 1  🔴  Tests                     ← START HERE (quality foundation)
Phase 2  🔴  Performance (virtual scroll, hljs, markdown cache)
Phase 3  🟡  DX (SSE client, hooks, types)
Phase 4  🟢  Extensibility (overridable renderers, async, plugins)
Phase 5  🟡  Accessibility
Phase 6  🔵  Architecture cleanup (v3 prep)
Phase 7  🔵  Documentation & Storybook
```

Each phase produces a ship-able improvement. Phases 1-3 are the highest-impact; you'll feel the difference immediately from better perf + SSE client + test confidence.
