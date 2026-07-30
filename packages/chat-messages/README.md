# @bndynet/ichat-messages

Core chat message UI as Lit Web Components. Markdown rendering with syntax highlighting, pluggable fenced-block renderers, collapsible reasoning, streaming previews, and tool-call / to-do support.

## Install

```bash
npm install @bndynet/ichat-messages
```

## Components

| Component | Tag |
|---|---|
| `ChatMessages` | `<i-chat-messages>` |
| `ChatMessage` | `<i-chat-message>` |
| `ChatPartHost` | `<i-chat-part>` |
| `ChatTextPart` | `<i-chat-text>` |
| `ChatToolCall` | `<i-chat-tool-call>` |
| `ChatTodo` | `<i-chat-todo>` |
| `ChatReasoning` | `<i-chat-reasoning>` |
| `ChatSpinner` | `<i-chat-spinner>` |

## Extension APIs

- **`registerCodeRenderer(renderer)`** — custom fenced-code-block renderers
- **`registerMarkdownPlugin(plugin)`** — markdown-it plugins with auto CSS injection
- **`registerPartRenderer(type, renderer)`** — custom `parts[]` type renderers (e.g. `file`, `source`, `x-*`)

## Dependencies

All runtime dependencies are auto-installed:

| Package | Purpose |
|---|---|
| `lit` | Web Component framework |
| `markdown-it` | Markdown rendering |
| `dompurify` | HTML sanitization |
| `highlight.js` | Syntax highlighting |
| `morphdom` | DOM patching for streaming |

## License

MIT
