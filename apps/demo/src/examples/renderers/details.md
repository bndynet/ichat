## Use fenced details blocks

Wrap Markdown in a `details` fence to render a collapsible section with a title.

```js
import '@bndynet/ichat'
import { textPart } from '@bndynet/ichat'

const chat = document.querySelector('i-chat-messages')

const content = `\`\`\`details 📋 Project Overview
A modern chat interface with rich Markdown support.

**Features:**
- Streaming messages with typewriter effect
- Collapsible reasoning blocks
- Charts, KPI cards, timelines, forms

\`\`\`

\`\`\`details 🔍 Tech Stack
| Layer | Technology |
| --- | --- |
| UI | Lit / Web Components |
| Markdown | markdown-it |
| Charts | ECharts via @bndynet/icharts |
| Sanitisation | DOMPurify |
\`\`\``

chat.addMessage({
  id: crypto.randomUUID(),
  role: 'assistant',
  timestamp: Date.now(),
  parts: [textPart(content)],
})
```

## Use container syntax

`:::details` is an alternative syntax for the same collapsible UI.

```js
const content = `:::details 📋 Project Overview
A modern chat interface with rich markdown support.

**Features:**
- Streaming messages
- Collapsible reasoning blocks
- Custom renderers
:::

:::details 🔍 Tech Stack
| Layer | Technology |
| --- | --- |
| UI | Lit / Web Components |
| Markdown | markdown-it |
| Charts | ECharts |
:::`

chat.addMessage({
  id: crypto.randomUUID(),
  role: 'assistant',
  timestamp: Date.now(),
  parts: [textPart(content)],
})
```
