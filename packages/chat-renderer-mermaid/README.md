# @bndynet/ichat-renderer-mermaid

Mermaid diagram fenced-code renderer for iChat. Renders ````mermaid` fence blocks as SVG diagrams with theme-aware dark/light mode support.

## Install

```bash
npm install @bndynet/ichat-renderer-mermaid
```

## Usage

Import **before** the first `<i-chat>` element connects to the DOM — auto-registers on import:

```typescript
import '@bndynet/ichat-renderer-mermaid';
```

Or register manually with custom options:

```typescript
import { registerCodeRenderer } from '@bndynet/ichat';
import { createMermaidRenderer } from '@bndynet/ichat-renderer-mermaid';

registerCodeRenderer(createMermaidRenderer({ codeToggle: false }));
```

## Features

- Async rendering — non-blocking, renders on connect
- Theme-aware — auto-refreshes on dark/light mode toggle
- Streaming-safe — handles incomplete syntax gracefully
- Code toggle — "view source" button overlay

## API

| Export | Description |
|---|---|
| `mermaidRenderer` | Pre-built `BlockRenderer` (code toggle on) |
| `createMermaidRenderer(opts?)` | Factory with customizable `RendererOptions` |
| `mermaidPlugin` | markdown-it plugin (for `md.use()`) |
| `ChatMermaid` | `<i-chat-mermaid>` custom element class |

## Dependencies

All runtime dependencies are auto-installed (`mermaid`, `markdown-it`). `@bndynet/ichat-messages` is a peer dependency.

| Package | Version |
|---|---|
| `@bndynet/ichat-messages` | `^3.1.0` |
| `markdown-it` | `>=14` |

The renderer uses the library's audited `trusted: true` path so the
`<i-chat-mermaid>` custom element is preserved. Mermaid source is HTML-escaped
before insertion; consumers do not need to change the renderer security config.

## License

MIT
