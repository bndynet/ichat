## Register the KPI renderer

Import the renderer package before rendering a `kpi` fence. It may be loaded from the application entry or lazily with the route.

```js
import '@bndynet/ichat'
import '@bndynet/ichat-renderers' // Auto-registers the KPI renderers
import { textPart } from '@bndynet/ichat'

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
