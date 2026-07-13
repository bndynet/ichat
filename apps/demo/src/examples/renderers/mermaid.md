## Register the Mermaid renderer

Register the renderer once before sending Markdown with Mermaid fences.

```js
import '@bndynet/ichat'
import { registerRenderer, textPart } from '@bndynet/ichat'
import { mermaidRenderer } from '@bndynet/ichat-renderers'

registerRenderer(mermaidRenderer)

const chat = document.querySelector('i-chat-messages')
```

## Send the page's diagrams

The page renders these Flowchart, Sequence, and Graph definitions. The renderer converts each fence to SVG and follows the active theme.

```js
const diagram = `## Flowchart

\`\`\`mermaid
flowchart LR
  A[i-chat] --> B[Markdown]
  B --> C[Mermaid SVG]
\`\`\`

## Sequence

\`\`\`mermaid
sequenceDiagram
  participant U as User
  participant C as Chat
  U->>C: message
  C-->>U: streamed reply
\`\`\`

## Graph

\`\`\`mermaid
graph TD
  A[Enter Chart Definition] --> B(Preview)
  B --> C{decide}
  C --> D[Keep]
  C --> E[Edit Definition]
  E --> B
  D --> F[Save Image and Code]
  F --> B
\`\`\``

chat.addMessage({
  id: crypto.randomUUID(),
  role: 'assistant',
  timestamp: Date.now(),
  parts: [textPart(diagram)],
})
```
