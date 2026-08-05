## Register the form renderer

Import the renderer package before rendering a `form` fence. It may be loaded from the application entry or lazily with the route.

```js
import '@bndynet/ichat'
import '@bndynet/ichat-renderers' // Auto-registers the form renderer
import { textPart } from '@bndynet/ichat'

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

  const submission = event.detail.payload
  console.log('Submitted form:', submission)
})
```

## History replay with submitted values

For history records (previously submitted forms), include `"submittedValues"` in the schema to render the summary view instead of an interactive form.

```js
const form = {
  id: 'user-feedback',
  title: 'User Feedback',
  fields: [
    { name: 'name', label: 'Your Name', type: 'text' },
    { name: 'satisfaction', label: 'Satisfaction', type: 'select', options: ['Very Satisfied', 'Satisfied', 'Neutral'] },
    { name: 'source', label: 'How did you find us?', type: 'radio', options: ['Search', 'Social media', 'Other'] },
    { name: 'subscribe', label: 'Subscribe to newsletter', type: 'checkbox' },
    { name: 'comments', label: 'Additional Comments', type: 'textarea' },
  ],
  submittedValues: {
    name: 'Alice',
    satisfaction: 'Very Satisfied',
    source: 'Social media',
    subscribe: true,
    comments: 'Great product!',
  },
}

chat.addMessage({
  id: crypto.randomUUID(),
  role: 'assistant',
  timestamp: Date.now(),
  parts: [textPart(`\`\`\`form\n${JSON.stringify(form, null, 2)}\n\`\`\``)],
})
```
