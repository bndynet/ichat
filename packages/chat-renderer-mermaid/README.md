# @bndynet/ichat-renderer-mermaid

Mermaid diagram fenced-code renderer for iChat. Renders ````mermaid` fence blocks as SVG diagrams with theme-aware dark/light mode support.

## Install

```bash
npm install @bndynet/ichat-renderer-mermaid
```

## Usage

Register **before** the first `<i-chat>` element connects to the DOM:

```typescript
import { registerCodeRenderer } from '@bndynet/ichat';
import { mermaidRenderer } from '@bndynet/ichat-renderer-mermaid';

registerCodeRenderer(mermaidRenderer);
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

## Peer dependencies

| Package | Version |
|---|---|
| `@bndynet/ichat-messages` | `^2.1.1` |
| `markdown-it` | `>=14` |
| `mermaid` | `>=11` |

## License

MIT
