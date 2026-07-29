# @bndynet/ichat

Complete iChat Web Component — bundles messages + input into a single `<i-chat>` element. Re-exports all extension APIs so you only need one dependency.

## Install

```bash
npm install @bndynet/ichat
```

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
| `@bndynet/ichat-renderers` | Chart, KPI, form, and Mermaid fenced-code renderers |
| `@bndynet/ichat-renderer-katex` | KaTeX math rendering ($inline$ and $$display$$) |

## License

MIT
