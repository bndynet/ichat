## Register the chart renderer

Register the renderer before adding any message that contains a `chart` fence.

```js
import '@bndynet/ichat'
import { registerRenderer, textPart } from '@bndynet/ichat'
import { chartRenderer } from '@bndynet/ichat-renderers'

registerRenderer(chartRenderer)

const chat = document.querySelector('i-chat-messages')
```

## Send the page's chart definitions

The page streams the following seven `chart` fences. Each definition below matches one visible chart in the demo.

```js
const definitions = [
  {
    type: 'bar',
    data: {
      categories: ['JS', 'Python', 'TS', 'Java', 'Rust', 'Go'],
      series: [{ name: 'Popularity', data: [95, 88, 78, 65, 42, 38] }],
    },
    options: { title: 'Most Popular Languages 2025' },
  },
  {
    type: 'bar',
    data: {
      categories: ['React', 'Vue', 'Angular', 'Svelte'],
      series: [{ name: 'Stars (k)', data: [220, 207, 93, 77] }],
    },
    options: { title: 'Framework Stars', variant: 'horizontal' },
  },
  {
    type: 'line',
    data: {
      categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
      series: [{ name: 'Revenue', data: [3200, 4500, 3800, 5100, 4700, 6200] }],
    },
    options: { title: 'Monthly Revenue 2025' },
  },
  {
    type: 'area',
    data: {
      categories: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      series: [{ name: 'Visitors', data: [820, 932, 901, 934, 1290, 1330, 1320] }],
    },
    options: { title: 'Website Visitors' },
  },
  {
    type: 'pie',
    data: [
      { name: 'Chrome', value: 65 }, { name: 'Safari', value: 18 },
      { name: 'Firefox', value: 7 }, { name: 'Edge', value: 5 }, { name: 'Other', value: 5 },
    ],
    options: { title: 'Browser Market Share' },
  },
  {
    type: 'pie',
    data: [
      { name: 'Chrome', value: 65 }, { name: 'Safari', value: 18 },
      { name: 'Firefox', value: 7 }, { name: 'Other', value: 10 },
    ],
    options: { title: 'Browser Share — Doughnut', variant: 'doughnut' },
  },
  {
    type: 'gauge',
    data: { value: 72, max: 100, label: 'Score' },
    options: { title: 'Server Response Score' },
  },
]

const markdown = definitions
  .map((definition) => `\`\`\`chart\n${JSON.stringify(definition, null, 2)}\n\`\`\``)
  .join('\n\n')

chat.addMessage({
  id: crypto.randomUUID(),
  role: 'assistant',
  timestamp: Date.now(),
  parts: [textPart(markdown)],
})
```
