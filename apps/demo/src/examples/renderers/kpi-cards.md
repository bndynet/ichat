## Register the KPI renderer

Register the single-card renderer before sending a `kpi` fence.

```js
import '@bndynet/ichat'
import { registerRenderer, textPart } from '@bndynet/ichat'
import { kpiRenderer } from '@bndynet/ichat-renderers'

registerRenderer(kpiRenderer)

const chat = document.querySelector('i-chat-messages')
```

## Send the page's KPI data

The page renders these four cards. `trend` is optional and uses a signed numeric value.

```js
const kpis = [
  { label: 'Revenue', value: '$50,846.90', trend: -12 },
  { label: 'New Users', value: '1,284', trend: 8 },
  { label: 'Churn Rate', value: '3.2%', trend: 0.5, unit: 'pp' },
  { label: 'MRR', value: '$128,400' },
]

const markdown = kpis
  .map((kpi) => `\`\`\`kpi\n${JSON.stringify(kpi, null, 2)}\n\`\`\``)
  .join('\n\n')

chat.addMessage({
  id: crypto.randomUUID(),
  role: 'assistant',
  timestamp: Date.now(),
  parts: [textPart(markdown)],
})
```
