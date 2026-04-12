# iChat

Monorepo of npm packages for a **Lit 3** chat UI: markdown, fenced-block renderers (charts, KPI, forms), reasoning blocks, and streaming. **Recommended:** install **`@bndynet/chat`** and use **`<i-chat>`** — one tag bundles the message list, default composer (`<i-chat-input>`), and built-in renderers. Lower-level packages exist if you compose the list and input yourself.

## Packages

| Package | Description |
|--------|-------------|
| [`@bndynet/chat`](packages/chat) | **Default.** `<i-chat>` — messages + input + chart/kpi/form renderers. Re-exports `rendererRegistry`, `StreamingController`, types, and `ChatMessages` for advanced use. |
| [`@bndynet/chat-messages`](packages/chat-messages) | Message list only (`<i-chat-messages>`, markdown pipeline, `BlockRenderer`, streaming). Use if you do **not** want `<i-chat>`. |
| [`@bndynet/chat-input`](packages/chat-input) | Composer only (`<i-chat-input>`). |
| [`@bndynet/chat-renderers`](packages/chat-renderers) | Fenced-block implementations. **Already included** by `@bndynet/chat`; install separately only with `chat-messages` when you need charts/extras without the full shell. |

**Peers:** `@bndynet/chat` expects **`echarts` ≥ 6** (charts). If you only use `@bndynet/chat-messages` + `@bndynet/chat-renderers`, also align **`markdown-it` ≥ 14** with your app.

---

## Install

**All-in-one (recommended):**

```bash
npm install @bndynet/chat echarts
```

**Message list only** (custom composer elsewhere):

```bash
npm install @bndynet/chat-messages
```

## Quick start (ES modules)

```html
<script type="module">
  import '@bndynet/chat';
</script>

<i-chat id="chat"></i-chat>

<script type="module">
  const chat = document.getElementById('chat');

  chat.addEventListener('send', (e) => {
    const text = e.detail.content;
    chat.addMessage({
      id: Date.now().toString(),
      role: 'self',
      content: text,
      timestamp: Date.now(),
    });
    // …call your API, then add assistant messages with addMessage / updateMessage
  });

  chat.addEventListener('streaming-change', (e) => {
    // Optional: e.detail.streaming mirrors assistant streaming state
  });
</script>
```

Use **`addMessage`**, **`updateMessage`**, **`removeMessage`**, **`clear`**, and **`updateTimeline`** on the same `<i-chat>` element (see below). **`createStreamingController()`** returns a helper bound to the inner list.

## Script tag (IIFE bundles)

For pages without a bundler, load the **`@bndynet/chat`** IIFE build. The global object is **`NiceChatFull`** (named exports such as **`NiceChatFull.NiceChat`**, **`NiceChatFull.rendererRegistry`**, etc.).

```html
<script src="/path/to/chat/dist/index.global.js"></script>
```

Charts and other bundled renderers are registered automatically. When developing this monorepo with `npm run demo`, the Vue demo under `apps/demo/` imports `@bndynet/chat`.

## Features

- **`<i-chat>` shell** — default textarea + send/cancel, or replace the footer with **`slot="input"`**
- **Lit 3 Web Components** — works with any framework or vanilla HTML
- **Markdown** — `markdown-it` + `highlight.js`, sanitized with DOMPurify
- **Extensible fenced blocks** — `rendererRegistry` + `BlockRenderer` (from `@bndynet/chat` or `@bndynet/chat-messages`)
- **Reasoning blocks** — collapsible “thinking” UI + streaming
- **Streaming typewriter** — progressive reveal and cursor state
- **Slots** — avatars, actions, empty state
- **Theming** — 12 base CSS custom properties; all components derive from them automatically
- **TypeScript** — declaration files for public API

## Message roles (`ChatMessageRole`)

Each `ChatMessage` has `role: 'self' | 'peer' | 'assistant' | 'system'`.

| Role | Meaning |
|------|---------|
| `self` | Message from the **current user** (viewer); aligned to the end side (typically right). |
| `peer` | Message from **another human** (e.g. DM or group); aligned to the start side (typically left), distinct from the assistant bubble until you theme it. |
| `assistant` | **AI / bot**; streaming typewriter, optional `reasoning`, duration, and `message-actions` apply only here. |
| `system` | System or informational line; same default alignment as assistant. |

**Breaking migration from earlier releases:** use `role: 'self'` instead of `'user'`. Rename `config.userAvatar` → `config.selfAvatar`, slot `user-avatar` → `self-avatar`, and add optional `peerAvatar` / slot `peer-avatar` for `role: 'peer'`. For CSS, prefer `--chat-self-*`; legacy `--chat-user-*` is still honored via fallbacks inside the components.

## `<i-chat>` — properties, methods, events

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `messages` | `ChatMessage[]` | `[]` | Bound to the inner list (also writable; prefer `addMessage` / `updateMessage` to avoid overwriting streamed state) |
| `config` | `ChatConfig` | `{}` | Avatars, locale, date separators, etc. |
| `emptyText` | `string` | `''` | Plain text when there are no messages and no `empty` slot |
| `placeholder` | `string` | `'Type a message…'` | Default `<i-chat-input>` placeholder (ignored when using `slot="input"`) |
| `disabled` | `boolean` | `false` | Disables the default composer |

**Methods (forwarded to the inner message list):** `addMessage`, `updateMessage`, `removeMessage`, `clear`, `cancel`, `cancelMessage`, `showError`, `dismissError`, `updateTimeline`, `addErrorMessage`, `registerRenderer`, `createStreamingController`, `focusInput`

**Events on `<i-chat>`:**

| Event | Detail | Notes |
|-------|--------|--------|
| `send` | `{ content: string }` | User submitted the default input (or your control inside `slot="input"` must dispatch the same event if you mimic the built-in) |
| `cancel` | — | User cancelled during streaming (default input) |
| `streaming-change` | `{ streaming: boolean }` | Any assistant message is streaming |
| `message-action` | `{ action: string, message: ChatMessage }` | From `message-actions` slot / `data-action` buttons |

Events that originate on inner rows (e.g. `message-complete` on `<i-chat-message>`) use `bubbles` + `composed` so you can listen on `<i-chat>` or `document`.

### Streaming

The default composer already switches send ↔ cancel while streaming. For extra UI, listen to `streaming-change`:

```javascript
chatEl.addEventListener('streaming-change', (e) => {
  if (e.detail.streaming) { /* … */ }
});
```

### Slots on `<i-chat>`

Message-related slots are **forwarded** with declarative `<slot name="…" slot="…">` under the inner components so your nodes **stay direct children of `<i-chat>`** (page / framework styles still apply). Put **`slot="…"`** on direct children of `<i-chat>` (same names as on a standalone `<i-chat-messages>`).

| Slot | Description |
|------|-------------|
| `self-avatar` | Avatar template for `role: 'self'` |
| `peer-avatar` | Avatar for `role: 'peer'` |
| `assistant-avatar` | Avatar for assistant / system |
| `message-actions` | Row shown on assistant messages (e.g. buttons with `data-action`) |
| `reasoning-header` | Custom header for reasoning / “thinking” blocks |
| `empty` | Content when there are no messages |
| `actions` | Bottom-left toolbar **inside** the default `<i-chat-input>` (attach, model picker, etc.) |
| `input` | **Replaces** the entire default `<i-chat-input>` — supply your own footer; dispatch `send` / handle streaming as needed |

### Slots example

```html
<i-chat id="chat" placeholder="Message…">
  <div slot="self-avatar">
    <img src="user.png" style="width:100%;height:100%;border-radius:50%;object-fit:cover" alt="" />
  </div>
  <div slot="assistant-avatar">
    <div style="background:linear-gradient(135deg,#f093fb,#f5576c);width:100%;height:100%;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;">AI</div>
  </div>
  <div slot="message-actions">
    <button type="button" data-action="copy">Copy</button>
    <button type="button" data-action="like">👍</button>
    <button type="button" data-action="dislike">👎</button>
  </div>
  <div slot="empty">
    <h2>Welcome!</h2>
    <p>Start a conversation below.</p>
  </div>
  <div slot="actions" style="display:flex;gap:8px;align-items:center">
    <button type="button">+</button>
    <span>Tools</span>
  </div>
</i-chat>
```

**Custom composer (`slot="input"`):** put a single root with `slot="input"`; the default `<i-chat-input>` is not rendered. Vue/Svelte apps that add slotted nodes after mount are supported via a `MutationObserver` on `<i-chat>`.

### Per-message `avatar`

Pass `avatar` on each `ChatMessage` when calling `addMessage` / assigning `messages`. If `avatar` is non-empty, it is used for that row instead of the matching `config` defaults (`selfAvatar`, `peerAvatar`, `assistantAvatar`) and instead of the `self-avatar` / `peer-avatar` / `assistant-avatar` slots.

Supported values: image URL, `data:image/…;base64,…`, raw base64 (defaults to PNG in the component), inline `<svg>…</svg>`, or plain text / emoji.

```javascript
chat.addMessage({
  id: 'u1',
  role: 'self',
  content: 'Hello',
  timestamp: Date.now(),
  avatar: 'https://example.com/avatar.png',
});
```

## Custom renderers

Use the **`BlockRenderer`** type and **`rendererRegistry`** from **`@bndynet/chat`** (or from `@bndynet/chat-messages` if you do not use the shell package):

```typescript
import { rendererRegistry } from '@bndynet/chat';

rendererRegistry.register({
  name: 'mermaid',
  test: (lang) => lang === 'mermaid',
  render: (code, _lang) => `<div class="mermaid">${code}</div>`,
});
```

### Charts and bundled fenced blocks

**`@bndynet/chat`** already registers chart, KPI, and form renderers from **`@bndynet/chat-renderers`**. You normally do **not** need a second registration.

If you use **`@bndynet/chat-messages`** without `@bndynet/chat`, install **`@bndynet/chat-renderers`** and call `registerChartWithRegistry(rendererRegistry)` (see that package’s README).

Optional **`markdown-it`** plugin when customizing the shared `md` instance:

```typescript
import { md } from '@bndynet/chat-messages';
import { chartPlugin } from '@bndynet/chat-renderers';

md.use(chartPlugin);
```

Fenced block in markdown:

````markdown
```chart
{"type":"bar","title":"Sales","labels":["Q1","Q2","Q3"],"values":[100,150,200]}
```
````

## Reasoning

Set `reasoning` on the assistant message (separate from `content`), e.g. when your backend streams reasoning and answer on different fields. To show the “Thinking…” state before the first reasoning token, start with `reasoning: ''` on a streaming message. If you still have tagged reasoning inside a single string, use `extractReasoning()` from `@bndynet/chat-messages` and pass the split values yourself.

```javascript
// `chat` is your `<i-chat>` element
chat.addMessage({
  id: '1',
  role: 'assistant',
  content: 'The answer is 42.',
  reasoning: 'Let me calculate step by step…',
  streaming: true,
});
```

## Timeline

Ordered lists with `[status]` prefixes are rendered as vertical timelines with step indicators.

### Markdown syntax

```markdown
1. [done] Collect requirements
2. [active] Implement API
3. [pending] Write tests
4. [error] Deploy to staging (rollback triggered)
5. [skipped] Performance benchmarking
```

Supported status keywords (case-insensitive):

| Status | Aliases |
|--------|---------|
| `done` | `complete` |
| `active` | `current` |
| `error` | `fail` |
| `pending` | `wait` |
| `skipped` | `skip` |

### Block ID (`bid`)

When a message contains multiple timelines, add a `<!-- bid:xxx -->` comment before each list to assign a unique identifier:

```markdown
<!-- bid:build -->
1. [pending] Build Docker image
2. [pending] Run test suite
3. [pending] Push to registry

<!-- bid:deploy -->
1. [pending] Deploy to staging
2. [pending] Run smoke tests
3. [pending] Promote to production
```

The comment is stripped during rendering — it only serves as metadata.

### Programmatic status updates

Use **`updateTimeline()`** on **`<i-chat>`** (same method as the inner list) to change a step’s status after the message has been rendered:

```javascript
// Single timeline (targets the first timeline in the message)
chatEl.updateTimeline(messageId, step, status);

// Multiple timelines — use bid to target the right one
chatEl.updateTimeline(messageId, 0, 'done', 'build');
chatEl.updateTimeline(messageId, 1, 'active', 'deploy');
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `messageId` | `string` | The message `id` that contains the timeline |
| `step` | `number` | Zero-based step index |
| `status` | `TimelineStatus` | `'done'` \| `'active'` \| `'error'` \| `'pending'` \| `'skipped'` |
| `bid` | `string?` | Optional block id; when omitted, targets the first timeline |

### SSE integration

Timelines that need dynamic status updates are typically generated by the **backend orchestration logic** (agent frameworks, pipelines), not by the AI model. The workflow has two phases:

**Phase 1 — Define the timeline** (via `content` or `reasoning`):

```
data: {"reasoning": "<!-- bid:agent -->\n1. [pending] Search documents\n2. [pending] Analyze results\n3. [pending] Generate response\n"}
```

The `<!-- bid:agent -->` annotation and `[pending]` status markers live inside the markdown content. This ensures the bid stays associated with its timeline regardless of how the stream is chunked or re-rendered.

**Phase 2 — Update step statuses** (structured event):

```
data: {"timeline": {"bid": "agent", "step": 0, "status": "done"}}
data: {"timeline": {"bid": "agent", "step": 1, "status": "active"}}
```

The frontend parses these events and calls on **`<i-chat>`**:

```javascript
chatEl.updateTimeline(messageId, ev.timeline.step, ev.timeline.status, ev.timeline.bid);
```

For single-timeline messages, `bid` can be omitted in both phases.

### Timeline CSS custom properties

| Property | Derives from | Description |
|----------|--------------|-------------|
| `--chat-timeline-done` | `--chat-success` | Done step indicator color |
| `--chat-timeline-active` | `--chat-primary` | Active step indicator color |
| `--chat-timeline-error` | `--chat-error` | Error step indicator color |
| `--chat-timeline-line` | `--chat-border` | Connector line color |
| `--chat-timeline-pending-border` | `--chat-border` | Pending step border color |
| `--chat-timeline-indicator-size` | `--chat-font-size` | Indicator circle diameter |

## Theming

All visual styles are driven by CSS custom properties. Override them on `:root`, **`<i-chat>`**, or any ancestor to customize the look and feel — no need to touch the source.

### Token architecture

The library uses a **12 base token** system. Every component-specific token (user bubbles, reasoning, timeline, form, input, etc.) automatically derives from these base tokens via `var()` chaining. Most apps only need to set these 12 properties to completely re-theme the UI:

| Token | Light default | Description |
|-------|---------------|-------------|
| `--chat-bg` | ![#f7f7f8](https://placehold.co/14x14/f7f7f8/f7f7f8.png) `#f7f7f8` | Container background |
| `--chat-surface` | ![#ffffff](https://placehold.co/14x14/ffffff/e5e7eb.png) `#ffffff` | Card / bubble surface |
| `--chat-surface-alt` | ![#f0f2f5](https://placehold.co/14x14/f0f2f5/f0f2f5.png) `#f0f2f5` | Alternate surface (table headers, summaries) |
| `--chat-border` | ![#e5e7eb](https://placehold.co/14x14/e5e7eb/e5e7eb.png) `#e5e7eb` | Borders and dividers |
| `--chat-text` | ![#1a1a2e](https://placehold.co/14x14/1a1a2e/1a1a2e.png) `#1a1a2e` | Primary text |
| `--chat-text-secondary` | ![#6b7280](https://placehold.co/14x14/6b7280/6b7280.png) `#6b7280` | Secondary text (labels) |
| `--chat-text-muted` | ![#9ca3af](https://placehold.co/14x14/9ca3af/9ca3af.png) `#9ca3af` | Muted text (timestamps, placeholders) |
| `--chat-primary` | ![#2563eb](https://placehold.co/14x14/2563eb/2563eb.png) `#2563eb` | Accent / brand color |
| `--chat-primary-light` | ![#dbeafe](https://placehold.co/14x14/dbeafe/dbeafe.png) `#dbeafe` | Light tint of primary |
| `--chat-error` | ![#ef4444](https://placehold.co/14x14/ef4444/ef4444.png) `#ef4444` | Error / danger color |
| `--chat-success` | ![#10b981](https://placehold.co/14x14/10b981/10b981.png) `#10b981` | Success color |
| `--chat-warning` | ![#f59e0b](https://placehold.co/14x14/f59e0b/f59e0b.png) `#f59e0b` | Warning color |

### How derivation works

Component-specific tokens chain to base tokens. You can override any component token for fine-grained control, but you don't have to:

| Component token | Derives from |
|----------------|--------------|
| `--chat-user-bg` | `--chat-primary` |
| `--chat-assistant-bg` | `--chat-surface` |
| `--chat-assistant-text` | `--chat-text` |
| `--chat-peer-bg` | `--chat-surface` |
| `--chat-reasoning-bg` | `--chat-primary-light` |
| `--chat-reasoning-text` | `--chat-primary` |
| `--chat-reasoning-border` | `color-mix(--chat-primary, --chat-border)` |
| `--chat-error-color` | `--chat-error` |
| `--chat-error-bg` | `color-mix(--chat-error, --chat-surface)` |
| `--chat-timeline-done` | `--chat-success` |
| `--chat-timeline-error` | `--chat-error` |
| `--chat-kpi-trend-up` | `--chat-success` |
| `--chat-kpi-trend-down` | `--chat-error` |
| `--chat-input-bg` | `--chat-surface` |
| `--chat-input-border` | `--chat-border` |
| `--chat-input-text` | `--chat-text` |
| `--chat-input-primary` | `--chat-primary` |
| `--chat-form-*` | Various `--chat-*` base tokens |

### Quick example — dark theme

With the 12-token architecture, a dark theme only needs the base tokens plus any design-constant overrides (like code block colors):

```css
:root[data-theme="dark"] {
  --chat-bg:            #16213e;
  --chat-surface:       #1e1e3a;
  --chat-surface-alt:   #2d2d44;
  --chat-border:        #404060;
  --chat-text:          #e0e0e0;
  --chat-text-secondary:#a0a0b0;
  --chat-text-muted:    #707080;
  --chat-primary:       #818cf8;
  --chat-primary-light: #312e81;
  --chat-error:         #f87171;
  --chat-success:       #10b981;
  --chat-warning:       #fbbf24;

  /* Design constants (not derived from base) */
  --chat-code-bg:       #0d1117;
  --chat-code-text:     #c9d1d9;
  --chat-shadow-sm:     0 1px 2px rgba(0, 0, 0, 0.3);
  --chat-shadow-md:     0 4px 12px rgba(0, 0, 0, 0.4);
}
```

### CSS custom properties reference

> **Naming convention:** `--chat-<category>-<detail>`. All properties have sensible light-theme defaults; you only need to override what you want to change.

For **avatar colors**, each role uses two CSS levels only: `--chat-avatar-<role>-{bg|text}` then shared `--chat-avatar-{bg|text}`, then built-in defaults. Set `--chat-avatar-bg` once to tint every role, or e.g. `--chat-avatar-user-bg` for `role: self` only.

#### Typography

| Property | Default | Description |
|----------|---------|-------------|
| `--chat-font-family` | system stack | Primary font family |
| `--chat-font-mono` | `SF Mono, Consolas, …` | Monospace font for code |
| `--chat-font-size` | `0.9375rem` | Base font size |
| `--chat-font-size-sm` | `0.8125rem` | Small text (timestamps, labels, code blocks) |
| `--chat-font-size-lg` | `1rem` | Large text (empty state) |
| `--chat-line-height` | `1.6` | Base line height for message text |

#### Colors — 12 Base Tokens

| Property | Default | Description |
|----------|---------|-------------|
| `--chat-bg` | `#f7f7f8` | Container background |
| `--chat-surface` | `#ffffff` | Elevated surface (bubbles, scroll button, cards) |
| `--chat-surface-alt` | `#f0f2f5` | Alternative surface (table headers, charts, action hover) |
| `--chat-border` | `#e5e7eb` | Borders, dividers, scrollbar thumb |
| `--chat-text` | `#1a1a2e` | Primary text color |
| `--chat-text-secondary` | `#6b7280` | Secondary text (labels, blockquote) |
| `--chat-text-muted` | `#9ca3af` | Muted text (timestamps, placeholders) |
| `--chat-primary` | `#2563eb` | Accent / link color, typing cursor |
| `--chat-primary-light` | `#dbeafe` | Light tint of primary (reasoning bg, highlights) |
| `--chat-error` | `#ef4444` | Error / danger color |
| `--chat-success` | `#10b981` | Success color (timeline done, KPI trend up) |
| `--chat-warning` | `#f59e0b` | Warning color |

#### Colors — Self bubble (`role: self`)

| Property | Default | Description |
|----------|---------|-------------|
| `--chat-self-bg` | `= --chat-user-bg` | Self message background |
| `--chat-self-text` | `= --chat-user-text` | Self message text |
| `--chat-user-bg` | `= --chat-primary` | User bubble background (derives from primary) |
| `--chat-user-text` | `#ffffff` | User bubble text (inverted) |
| `--chat-avatar-user-bg` | chain | Self avatar ring (`--chat-avatar-bg` then default) |
| `--chat-self-code-inline-bg` | chain | Inline code inside self bubble |

#### Colors — Peer bubble (`role: peer`)

| Property | Default | Description |
|----------|---------|-------------|
| `--chat-peer-bg` | `= --chat-surface` | Peer message background (via `--chat-assistant-bg`) |
| `--chat-peer-text` | `= --chat-text` | Peer message text (via `--chat-assistant-text`) |
| `--chat-avatar-peer-bg` | chain | Peer avatar ring (`--chat-avatar-bg` then default) |
| `--chat-peer-code-inline-bg` | `= --chat-code-inline-bg` | Inline code inside peer bubble |

#### Colors — Assistant bubble

| Property | Default | Description |
|----------|---------|-------------|
| `--chat-assistant-bg` | `= --chat-surface` | Assistant message background |
| `--chat-assistant-text` | `= --chat-text` | Assistant message text |
| `--chat-avatar-assistant-bg` | chain | Assistant avatar (`--chat-avatar-bg` then default) |

#### Colors — Avatars (system + shared)

| Property | Default | Description |
|----------|---------|-------------|
| `--chat-avatar-system-bg` | chain | System message avatar (`--chat-avatar-bg` then default) |
| `--chat-avatar-system-text` | chain | System avatar glyph color |
| `--chat-avatar-bg` | `= --chat-surface-alt` | Shared avatar background when role token is unset |
| `--chat-avatar-text` | `= --chat-text-secondary` | Shared avatar glyph color when role token is unset |

#### Colors — Reasoning

| Property | Default | Description |
|----------|---------|-------------|
| `--chat-reasoning-bg` | `= --chat-primary-light` | Reasoning block background |
| `--chat-reasoning-border` | derived | Reasoning block border (mix of `--chat-primary` and `--chat-border`) |
| `--chat-reasoning-text` | `= --chat-primary` | Reasoning header text |
| `--chat-reasoning-header-hover-bg` | derived | Reasoning header hover overlay |

#### Colors — Code (design constant)

| Property | Default | Description |
|----------|---------|-------------|
| `--chat-code-bg` | `#1e1e2e` | Code block background |
| `--chat-code-text` | `#cdd6f4` | Code block text |
| `--chat-code-inline-bg` | `rgba(0,0,0,0.06)` | Inline code background |
| `--chat-user-code-inline-bg` | `rgba(255,255,255,0.15)` | Inline code inside self bubble |

#### Colors — Status (derived from base)

| Property | Default | Description |
|----------|---------|-------------|
| `--chat-error-color` | `= --chat-error` | Error text color |
| `--chat-error-bg` | derived | Error background (mix of `--chat-error` and `--chat-surface`) |
| `--chat-timeline-done` | `= --chat-success` | Timeline done step indicator |
| `--chat-timeline-active` | `= --chat-primary` | Timeline active step indicator |
| `--chat-timeline-error` | `= --chat-error` | Timeline error step indicator |
| `--chat-kpi-trend-up` | `= --chat-success` | KPI positive trend color |
| `--chat-kpi-trend-down` | `= --chat-error` | KPI negative trend color |

#### Colors — Misc

| Property | Default | Description |
|----------|---------|-------------|
| `--chat-blockquote-bg` | `rgba(0,0,0,0.02)` | Blockquote background |
| `--chat-chart-bar-track-bg` | `rgba(0,0,0,0.04)` | Chart bar track background |

#### Spacing

| Property | Default | Description |
|----------|---------|-------------|
| `--chat-spacing-xs` | `4px` | Extra-small gap |
| `--chat-spacing-sm` | `8px` | Small gap |
| `--chat-spacing-md` | `16px` | Medium gap (default padding) |
| `--chat-spacing-lg` | `24px` | Large gap (message list padding) |
| `--chat-spacing-xl` | `32px` | Extra-large gap |

#### Border radius

| Property | Default | Description |
|----------|---------|-------------|
| `--chat-radius-sm` | `6px` | Small radius (bubble tail, code, images) |
| `--chat-radius` | `12px` | Medium radius (container, code blocks, reasoning) |
| `--chat-radius-lg` | `18px` | Large radius (message bubbles) |

#### Shadows

| Property | Default | Description |
|----------|---------|-------------|
| `--chat-shadow-sm` | `0 1px 2px rgba(0,0,0,0.05)` | Assistant bubble shadow |
| `--chat-shadow-md` | `0 4px 12px rgba(0,0,0,0.08)` | Scroll-to-bottom button shadow |

#### Transitions

| Property | Default | Description |
|----------|---------|-------------|
| `--chat-transition-fast` | `150ms ease` | Fast hover/press transitions |
| `--chat-transition-normal` | `250ms ease` | Normal transitions (message appear, reasoning toggle) |

#### Layout

| Property | Default | Description |
|----------|---------|-------------|
| `--chat-avatar-size` | `32px` | Avatar width & height |
| `--chat-message-max-width` | `85%` | Max width of a single message row |
| `--chat-messages-max-width` | `100%` | Max width of the message list inner area (fills host; override e.g. `800px` or `min(100%, 48rem)` for a centered reading column) |
| `--chat-scrollbar-width` | `6px` | Scrollbar width (WebKit) |

### Minimal override set

For most themes you only need to set these **12 base tokens** — everything else derives from them automatically:

```css
:root {
  --chat-bg: …;
  --chat-surface: …;
  --chat-surface-alt: …;
  --chat-border: …;
  --chat-text: …;
  --chat-text-secondary: …;
  --chat-text-muted: …;
  --chat-primary: …;
  --chat-primary-light: …;
  --chat-error: …;
  --chat-success: …;
  --chat-warning: …;
}
```

For fine-grained control, override any component-specific token (e.g. `--chat-user-bg`, `--chat-reasoning-text`, `--chat-code-bg`) — these accept the same `var()` chaining pattern and fall back to the relevant base token.

## Development

Clone, install, build, run the static demo:

```bash
npm install
npm run build    # workspace order: chat-messages, chat-input, chat-renderers, chat, demo
npm run dev      # concurrent watch on all packages (see root `package.json`)
npm run demo     # serve repo root — open http://localhost:3000/apps/demo/ (port from `serve`)
```

| Script | Description |
|--------|----------------|
| `npm run build` | Builds all packages in order |
| `npm run dev` | Watch mode for packages (messages, input, renderers, chat, demo) |
| `npm run demo` | `npx serve .` at monorepo root |
| `npm run start` | Alias for `npm run dev` (see root `package.json`) |

Layout:

```text
apps/demo/              
packages/chat-messages/
packages/chat-input/
packages/chat/            # @bndynet/chat — bundles the above + chat-renderers
packages/chat-renderers/  # Fenced blocks; bundled by @bndynet/chat
```

## License

MIT
