# @bndynet/ichat

Complete iChat Web Component — bundles messages + input into a single `<i-chat>` element. Re-exports all extension APIs so you only need one dependency.

## Install

```bash
npm install @bndynet/ichat
```

## Script tag (no bundler)

```html
<script src="https://unpkg.com/@bndynet/ichat/dist/ichat.global.js"></script>
<i-chat></i-chat>
```

The global build (~623KB) is self-contained — no extra `<script>` tags needed.

## Component

| Tag | Description |
|---|---|
| `<i-chat>` | Full chat UI: messages + input in one element |

## Re-exports

All extension APIs are available from `@bndynet/ichat` without installing sub-packages:

```typescript
import {
  registerCodeRenderer,
  registerMarkdownPlugin,
  registerPartRenderer,
  freezeMarkdownPlugins,
} from '@bndynet/ichat';
```

Also re-exports commonly used types (`ChatMessage`, `ChatMessageRole`, `ChatConfig`, etc.) and the SSE streaming helpers from `@bndynet/ichat/sse`.

## Optional add-ons

| Package | Description |
|---|---|
| `@bndynet/ichat-renderers` | KPI cards and interactive forms |
| `@bndynet/ichat-renderer-chart` | Charts (bar, line, area, pie, gauge) via @bndynet/icharts |
| `@bndynet/ichat-renderer-mermaid` | Mermaid diagrams with theme-aware rendering |
| `@bndynet/ichat-renderer-katex` | KaTeX math rendering ($inline$ and $$display$$) |

## License

MIT
