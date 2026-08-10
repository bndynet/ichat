## Register the Mermaid renderer

Import the renderer package before rendering a Mermaid fence. It may be loaded from the application entry or lazily with the route.

```js
import "@bndynet/ichat";
import "@bndynet/ichat-renderer-mermaid"; // Auto-registers the Mermaid renderer
import { textPart } from "@bndynet/ichat";

const chat = document.querySelector("i-chat-messages");
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
\`\`\``;

chat.addMessage({
  id: crypto.randomUUID(),
  role: "assistant",
  timestamp: Date.now(),
  parts: [textPart(diagram)],
});
```
