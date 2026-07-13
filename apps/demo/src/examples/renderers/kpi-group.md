## Register the KPI group renderer

Register `kpisRenderer` once to render a group of KPI cards from a single fence.

```js
import '@bndynet/ichat'
import { registerRenderer, textPart } from '@bndynet/ichat'
import { kpisRenderer } from '@bndynet/ichat-renderers'

registerRenderer(kpisRenderer)

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
