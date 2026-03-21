# BndyNet Chat

Monorepo of npm packages for a **Lit 3** chat message UI: markdown, fenced-block renderers, reasoning blocks, and streaming effects. Message list lives in **`@bndynet/chat-messages`**; optional fenced-block implementations (charts and future plugins) live in **`@bndynet/chat-renderers`**.

## Packages

| Package | Description |
|--------|-------------|
| [`@bndynet/chat-messages`](packages/chat-messages) | Web Components (`<chat-messages>`, …), markdown pipeline, **`BlockRenderer` type**, renderer registry, streaming. **Install this** for the core UI. |
| [`@bndynet/chat-renderers`](packages/chat-renderers) | **Optional.** Built-in chart renderer, `chartPlugin` for `markdown-it`, and future fenced-block extras. Not a dependency of `chat-messages`; add it when you need these features. |

**`@bndynet/chat-renderers` peer dependencies:** `@bndynet/chat-messages` and **`markdown-it` ≥ 14** (match the version used by your app; `chat-messages` already depends on `markdown-it`).

---

## Install

**Core (default):**

```bash
npm install @bndynet/chat-messages
```

**Charts / optional renderers** — install the add-on package alongside core:

```bash
npm install @bndynet/chat-messages @bndynet/chat-renderers
```

## Quick start (ES modules)

```html
<script type="module">
  import '@bndynet/chat-messages';
</script>

<chat-messages id="chat"></chat-messages>

<div class="my-input">
  <textarea id="input"></textarea>
  <button id="send">Send</button>
</div>

<script type="module">
  const chat = document.getElementById('chat');
  const input = document.getElementById('input');
  const send = document.getElementById('send');

  send.addEventListener('click', () => {
    chat.addMessage({
      id: Date.now().toString(),
      role: 'user',
      content: input.value,
      timestamp: Date.now(),
    });
    input.value = '';
  });

  chat.addEventListener('streaming-change', (e) => {
    send.disabled = e.detail.streaming;
  });
</script>
```

## Script tag (IIFE bundles)

For pages without a bundler, load the **`chat-messages`** IIFE; the global is **`NiceChat`**.

```html
<script src="/path/to/chat-messages/dist/index.global.js"></script>
```

**Optional charts** — load **`chat-renderers`** as a second script (global **`BndyChatRenderers`**) and register on the core registry:

```html
<script src="/path/to/chat-messages/dist/index.global.js"></script>
<script src="/path/to/chat-renderers/dist/index.global.js"></script>
<script>
  BndyChatRenderers.registerChartWithRegistry(NiceChat.rendererRegistry);
</script>
```

When developing this monorepo with `npm run demo`, the sample app under `apps/demo/` loads `chat-messages` and `chat-renderers` (for ```chart``` blocks in `demo-responses.js`).

## Features

- **Pure message list** — no built-in input; bring your own composer
- **Lit 3 Web Components** — works with any framework or vanilla HTML
- **Markdown** — `markdown-it` + `highlight.js`, sanitized with DOMPurify
- **Extensible fenced blocks** — `rendererRegistry` + `BlockRenderer` (exported from `@bndynet/chat-messages`)
- **Reasoning blocks** — collapsible “thinking” UI + streaming
- **Streaming typewriter** — progressive reveal and cursor state
- **Slots** — avatars, actions, empty state
- **Theming** — CSS custom properties + SCSS in the library build
- **TypeScript** — declaration files for public API

## Components

### `<chat-messages>`

Main container: list, scroll, streaming flag.

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `messages` | `ChatMessage[]` | `[]` | Message list |
| `config` | `ChatConfig` | `{}` | Options |
| `emptyText` | `string` | `''` | Text when empty and no `empty` slot |
| `streaming` | `boolean` | `false` | Readonly, reflected: any message streaming |

**Methods:** `addMessage`, `updateMessage`, `removeMessage`, `clear`

**Events:** `streaming-change`, `message-action`, `message-complete`

**Slots:** `user-avatar`, `assistant-avatar`, `message-actions`, `empty`

### Streaming surface

```javascript
if (chatEl.streaming) { /* … */ }
chatEl.addEventListener('streaming-change', (e) => {
  sendBtn.disabled = e.detail.streaming;
});
```

```css
chat-messages[streaming] ~ .my-input {
  opacity: 0.5;
  pointer-events: none;
}
```

### `<chat-message>` / `<chat-reasoning>`

Per-message rendering and collapsible reasoning blocks.

## Slots example

```html
<chat-messages id="chat">
  <div slot="user-avatar">
    <img src="user.png" style="width:100%;height:100%;border-radius:50%;object-fit:cover" alt="" />
  </div>
  <div slot="assistant-avatar">
    <div style="background:linear-gradient(135deg,#f093fb,#f5576c);width:100%;height:100%;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;">AI</div>
  </div>
  <div slot="message-actions">
    <button data-action="copy">Copy</button>
    <button data-action="like">👍</button>
    <button data-action="dislike">👎</button>
  </div>
  <div slot="empty">
    <h2>Welcome!</h2>
    <p>Start a conversation below.</p>
  </div>
</chat-messages>
```

## Custom renderers

Use the **`BlockRenderer`** shape from **`@bndynet/chat-messages`** and register with `rendererRegistry`:

```typescript
import { rendererRegistry } from '@bndynet/chat-messages';

rendererRegistry.register({
  name: 'mermaid',
  test: (lang) => lang === 'mermaid',
  render: (code, _lang) => `<div class="mermaid">${code}</div>`,
});
```

### Chart renderer (optional package)

Install **`@bndynet/chat-renderers`**, then register the chart renderer on the shared registry:

```typescript
import { registerChartWithRegistry } from '@bndynet/chat-renderers';
import { rendererRegistry } from '@bndynet/chat-messages';

registerChartWithRegistry(rendererRegistry);
```

`@bndynet/chat-renderers` also re-exports **`BlockRenderer`** (from `chat-messages`) for convenience when you depend on both packages.

Optional **`markdown-it`** plugin (if you customize the shared `md` instance from `chat-messages`):

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

Use `updateTimeline()` on `<chat-messages>` to change a step's status after the message has been rendered:

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

The frontend parses these events and calls:

```javascript
chatEl.updateTimeline(messageId, ev.timeline.step, ev.timeline.status, ev.timeline.bid);
```

For single-timeline messages, `bid` can be omitted in both phases.

### Timeline CSS custom properties

| Property | Default | Description |
|----------|---------|-------------|
| `--chat-timeline-done` | `#22c55e` | Done step indicator color |
| `--chat-timeline-active` | `#3b82f6` | Active step indicator color |
| `--chat-timeline-error` | `#ef4444` | Error step indicator color |
| `--chat-timeline-line` | `= --chat-border` | Connector line color |
| `--chat-timeline-pending-border` | `= --chat-border` | Pending step border color |
| `--chat-timeline-indicator-size` | `= --chat-font-size` | Indicator circle diameter |

## Theming

All visual styles are exposed as CSS custom properties on `<chat-messages>`. Override them on the element (or any ancestor) to customize the look and feel — no need to touch the source.

### Quick example — dark theme

```css
chat-messages {
  --chat-bg: #1a1a2e;
  --chat-surface: #16213e;
  --chat-surface-alt: #2a2a4a;
  --chat-border: #2a2a4a;
  --chat-text: #e0e0e0;
  --chat-text-secondary: #a0a0b0;
  --chat-text-muted: #707080;
  --chat-primary: #6366f1;
  --chat-user-bg: #6366f1;
  --chat-user-text: #ffffff;
  --chat-assistant-bg: #1e1e3a;
  --chat-assistant-text: #e0e0e0;
  --chat-reasoning-bg: #1e1e3a;
  --chat-reasoning-border: #4338ca;
  --chat-reasoning-text: #a5b4fc;
  --chat-code-bg: #0d1117;
  --chat-code-text: #c9d1d9;
  --chat-code-inline-bg: rgba(255, 255, 255, 0.08);
  --chat-blockquote-bg: rgba(255, 255, 255, 0.04);
}
```

### CSS custom properties reference

> **Naming convention:** `--chat-<category>-<detail>`. All properties have sensible light-theme defaults; you only need to override what you want to change.

#### Typography

| Property | Default | Description |
|----------|---------|-------------|
| `--chat-font-family` | system stack | Primary font family |
| `--chat-font-mono` | `SF Mono, Consolas, …` | Monospace font for code |
| `--chat-font-size` | `0.9375rem` | Base font size |
| `--chat-font-size-sm` | `0.8125rem` | Small text (timestamps, labels, code blocks) |
| `--chat-font-size-lg` | `1rem` | Large text (empty state) |
| `--chat-line-height` | `1.6` | Base line height for message text |

#### Colors — Base

| Property | Default | Description |
|----------|---------|-------------|
| `--chat-bg` | `#f7f7f8` | Container background |
| `--chat-surface` | `#ffffff` | Elevated surface (scroll button) |
| `--chat-surface-alt` | `#f0f2f5` | Alternative surface (table headers, charts, action hover) |
| `--chat-border` | `#e5e7eb` | Borders, dividers, scrollbar thumb |
| `--chat-text` | `#1a1a2e` | Primary text color |
| `--chat-text-secondary` | `#6b7280` | Secondary text (assistant avatar, blockquote) |
| `--chat-text-muted` | `#9ca3af` | Muted text (timestamps, action icons) |
| `--chat-primary` | `#2563eb` | Accent/link color, typing cursor |
| `--chat-primary-light` | `#dbeafe` | Light primary (reserved) |

#### Colors — User bubble

| Property | Default | Description |
|----------|---------|-------------|
| `--chat-user-bg` | `#2563eb` | User message background |
| `--chat-user-text` | `#ffffff` | User message text |
| `--chat-user-avatar-bg` | `= --chat-user-bg` | User avatar background |

#### Colors — Assistant bubble

| Property | Default | Description |
|----------|---------|-------------|
| `--chat-assistant-bg` | `#ffffff` | Assistant message background |
| `--chat-assistant-text` | `#1a1a2e` | Assistant message text |
| `--chat-assistant-avatar-bg` | `= --chat-surface-alt` | Assistant avatar background |

#### Colors — Reasoning

| Property | Default | Description |
|----------|---------|-------------|
| `--chat-reasoning-bg` | `#f0f4ff` | Reasoning block background |
| `--chat-reasoning-border` | `#c7d2fe` | Reasoning block border |
| `--chat-reasoning-text` | `#4338ca` | Reasoning header text |
| `--chat-reasoning-header-hover-bg` | `rgba(0,0,0,0.03)` | Reasoning header hover overlay |

#### Colors — Code

| Property | Default | Description |
|----------|---------|-------------|
| `--chat-code-bg` | `#1e1e2e` | Code block background |
| `--chat-code-text` | `#cdd6f4` | Code block text |
| `--chat-code-inline-bg` | `rgba(0,0,0,0.06)` | Inline code background |
| `--chat-user-code-inline-bg` | `rgba(255,255,255,0.15)` | Inline code background inside user bubble |

#### Colors — Misc

| Property | Default | Description |
|----------|---------|-------------|
| `--chat-blockquote-bg` | `rgba(0,0,0,0.02)` | Blockquote background |
| `--chat-error-color` | `#ef4444` | Error text (chart errors) |
| `--chat-error-bg` | `#fef2f2` | Error background |
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
| `--chat-messages-max-width` | `800px` | Max width of the message list inner area |
| `--chat-scrollbar-width` | `6px` | Scrollbar width (WebKit) |

### Minimal override set

For most themes you only need to set these **core 12 properties** — everything else derives from them or has reasonable defaults:

```css
chat-messages {
  --chat-bg: …;
  --chat-surface: …;
  --chat-surface-alt: …;
  --chat-border: …;
  --chat-text: …;
  --chat-text-secondary: …;
  --chat-primary: …;
  --chat-user-bg: …;
  --chat-user-text: …;
  --chat-assistant-bg: …;
  --chat-assistant-text: …;
  --chat-code-bg: …;
}
```

## Development

Clone, install, build, run the static demo:

```bash
npm install
npm run build    # @bndynet/chat-renderers, then @bndynet/chat-messages
npm run dev      # tsup watch (chat-messages)
npm run demo     # serve repo root — open http://localhost:3000/apps/demo/ (port from `serve`)
```

| Script | Description |
|--------|----------------|
| `npm run build` | Builds all packages in order |
| `npm run dev` | Watch mode for `chat-messages` |
| `npm run demo` | `npx serve .` at monorepo root |
| `npm run start` | Build, then dev + demo (see root `package.json`) |

Layout:

```text
apps/demo/              # index.html, demo.js, demo-sse.js (SSE parse + wire simulation), demo-responses.js
packages/chat-messages/
packages/chat-renderers/  # Optional; peer-depends on chat-messages
```

## License

MIT
