## Register the KPI group renderer

Import the renderer package before rendering a `kpis` fence. It may be loaded from the application entry or lazily with the route.

```js
import '@bndynet/ichat'
import '@bndynet/ichat-renderers' // Auto-registers the KPI renderers
import { textPart } from '@bndynet/ichat'

const chat = document.querySelector('i-chat-messages')
```

## Send a KPI collection

The fence contains an array; each array item is rendered as an individual card in the group.

```js
const kpis = [
  { label: 'Revenue', value: '$50,846.90', trend: -12 },
  { label: 'New Users', value: '1,284', trend: 8 },
  { label: 'MRR', value: '$128,400' },
]

chat.addMessage({
  id: crypto.randomUUID(),
  role: 'assistant',
  timestamp: Date.now(),
  parts: [textPart(`\`\`\`kpis\n${JSON.stringify(kpis, null, 2)}\n\`\`\``)],
})
```
