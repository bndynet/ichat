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

The default theme is **`auto`**: the unified `redux-dark` palette on dark pages, `redux` on light pages. `redux` is used instead of `redux-color` because the color variant changes noticeably between diagram types. To keep the `--chat-mermaid-*` token workflow instead, opt into `base`:

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
- Official themes by default — `auto` follows the host light/dark contract via the unified `redux` / `redux-dark` pair; any official name can be pinned
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
| `"auto"` (default) | `"redux-dark"` when `<html>` is dark, otherwise `"redux"`.                                                                                       |
| `"base"`           | Colors from `--chat-mermaid-*` / `--chat-*` (opt-in).                                                                                            |
| official name      | Full palette from Mermaid (`default`, `dark`, `forest`, `neutral`, `neo`, `neo-dark`, `redux`, `redux-dark`, `redux-color`, `redux-dark-color`). |

Non-`base` themes ignore the `--chat-mermaid-*` tokens — the diagram uses Mermaid's complete palette and will not track the chat chrome unless you pick a compatible theme. All official themes ship in the same Mermaid bundle, so selecting one is a runtime lookup, not a separate download.

Diagrams use Mermaid 12's **ELK** layout and **`neo`** look. The `auto` theme uses the unified **`redux` / `redux-dark`** pair rather than Mermaid's per-diagram default theme, so every diagram type shares one palette. Flowchart, state, class, ER, requirement, and use-case diagrams are therefore laid out and styled by Mermaid itself; there is no iChat-specific layout override.

## Dependencies

All runtime dependencies are auto-installed (`mermaid`, `markdown-it`). `@bndynet/ichat-messages` is a peer dependency.

Mermaid 12 requires **Node.js >= 22.12** to install and an **ES2024-capable browser** (Safari 17.4+). Mermaid is loaded on demand; when it cannot be loaded, the diagram falls back to its source code block.

The renderer uses the library's audited `trusted: true` path so the
`<i-chat-mermaid>` custom element is preserved. Mermaid source is HTML-escaped
before insertion; consumers do not need to change the renderer security config.

## License

MIT
