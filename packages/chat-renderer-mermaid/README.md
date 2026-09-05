# @bndynet/ichat-renderer-mermaid

Mermaid diagram fenced-code renderer for iChat. Renders ````mermaid` fence blocks as SVG diagrams with theme-aware dark/light mode support.

## Install

```bash
npm install @bndynet/ichat-renderer-mermaid
```

## Usage

Import **before** the first `<i-chat>` element connects to the DOM — auto-registers on import:

```typescript
import "@bndynet/ichat-renderer-mermaid";
```

Or register manually with custom options:

```typescript
import { registerCodeRenderer } from "@bndynet/ichat";
import { createMermaidRenderer } from "@bndynet/ichat-renderer-mermaid";

registerCodeRenderer(createMermaidRenderer({ codeToggle: false }));
```

The default theme is **`auto`**: official `dark` on dark pages, `default` on light pages. To keep the `--chat-mermaid-*` token workflow instead, opt into `base`:

```typescript
import { setDefaultMermaidTheme } from "@bndynet/ichat-renderer-mermaid";

// Global switch — also refreshes diagrams that are already mounted.
setDefaultMermaidTheme("base");

// Or pin any official theme for a specific renderer.
registerCodeRenderer(createMermaidRenderer({ theme: "forest" }));
```

## Features

- Async rendering — non-blocking, renders on connect
- Theme-aware — auto-refreshes on dark/light mode toggle
- Official themes by default — `auto` follows the host light/dark contract via Mermaid's `default` / `dark`; any official name can be pinned
- Streaming-safe — handles incomplete syntax gracefully
- Code toggle — "view source" button overlay

## API

| Export                          | Description                                    |
| ------------------------------- | ---------------------------------------------- |
| `mermaidRenderer`               | Pre-built `BlockRenderer` (code toggle on)     |
| `createMermaidRenderer(opts?)`  | Factory with `MermaidRendererOptions`          |
| `mermaidPlugin`                 | markdown-it plugin (for `md.use()`)            |
| `ChatMermaid`                   | `<i-chat-mermaid>` custom element class        |
| `MERMAID_THEME_NAMES`           | Supported official theme names                 |
| `DEFAULT_MERMAID_THEME`         | Initial default (`"auto"`)                     |
| `setDefaultMermaidTheme(theme)` | Change the default; refreshes mounted diagrams |
| `getDefaultMermaidTheme()`      | Read the current default                       |

### Theme option

| Value              | Behavior                                                                                                                                         |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `"auto"` (default) | `"dark"` when `<html>` is dark, otherwise `"default"`.                                                                                           |
| `"base"`           | Colors from `--chat-mermaid-*` / `--chat-*` (opt-in).                                                                                            |
| official name      | Full palette from Mermaid (`default`, `dark`, `forest`, `neutral`, `neo`, `neo-dark`, `redux`, `redux-dark`, `redux-color`, `redux-dark-color`). |

Non-`base` themes ignore the `--chat-mermaid-*` tokens — the diagram uses Mermaid's complete palette and will not track the chat chrome unless you pick a compatible theme. `neo*` / `redux*` need a newer Mermaid release; older 11.x versions silently fall back to Mermaid's default palette. All official themes ship in the same Mermaid bundle, so selecting one is a runtime lookup, not a separate download.

## Dependencies

All runtime dependencies are auto-installed (`mermaid`, `markdown-it`). `@bndynet/ichat-messages` is a peer dependency.

The renderer uses the library's audited `trusted: true` path so the
`<i-chat-mermaid>` custom element is preserved. Mermaid source is HTML-escaped
before insertion; consumers do not need to change the renderer security config.

## License

MIT
