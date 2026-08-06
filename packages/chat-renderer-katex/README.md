# @bndynet/ichat-renderer-katex

KaTeX math rendering for [iChat](https://github.com/bndynet/ichat). Auto-registers `markdown-it-katex` on import so `$...$` (inline) and `$$...$$` (display) LaTeX math renders inside chat messages.

## Install

```bash
npm install @bndynet/ichat-renderer-katex
```

## Usage

Import **before** any `<i-chat>` or `<i-chat-messages>` element connects to the DOM:

```typescript
import "@bndynet/ichat-renderer-katex";
```

That's it — no manual `registerMarkdownPlugin` call needed. Inline (`$x^2$`) and display (`$$...$$`) math now render automatically.

## What's included

- **`markdown-it-katex`** plugin registered on the shared markdown-it instance
- **Chat-friendly CSS** — scrollable display math, no overflow breakage in chat bubbles
- **KaTeX fonts** via `@font-face` (served from jsDelivr CDN)

## Peer dependencies

| Package                   | Version  |
| ------------------------- | -------- |
| `@bndynet/ichat-messages` | `^2.1.1` |
| `markdown-it`             | `>=14`   |

## License

MIT
