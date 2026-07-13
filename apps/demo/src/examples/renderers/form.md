## Register the form renderer

Register the renderer once, then send a JSON form definition in a `form` fence.

```js
import '@bndynet/ichat'
import { registerRenderer, textPart } from '@bndynet/ichat'
import { formRenderer } from '@bndynet/ichat-renderers'

registerRenderer(formRenderer)

const chat = document.querySelector('i-chat-messages')
```

## Send the definition

The renderer creates native form controls from the field definitions.

```js
const form = {
  id: 'user-feedback',
  title: 'User Feedback',
  submitLabel: 'Send Feedback',
  fields: [
    { name: 'name', label: 'Your Name', type: 'text', required: true },
    { name: 'satisfaction', label: 'Satisfaction', type: 'select', options: ['Very Satisfied', 'Satisfied', 'Neutral', 'Dissatisfied'] },
    { name: 'source', label: 'How did you find us?', type: 'radio', options: ['Search', 'Social media', 'Word of mouth', 'Other'] },
    { name: 'subscribe', label: 'Subscribe to newsletter', type: 'checkbox' },
    { name: 'comments', label: 'Additional Comments', type: 'textarea' },
  ],
}

chat.addMessage({
  id: crypto.randomUUID(),
  role: 'assistant',
  timestamp: Date.now(),
  parts: [textPart(`\`\`\`form\n${JSON.stringify(form, null, 2)}\n\`\`\``)],
})
```

## Handle submission

Form submission is emitted as a `part-action`; validate and persist its data in your host application.

```js
chat.addEventListener('part-action', (event) => {
  if (event.detail?.kind !== 'form') return

  const submission = event.detail.detail
  console.log('Submitted form:', submission)
})
```
