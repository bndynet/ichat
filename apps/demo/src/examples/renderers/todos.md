## Create the plan

Place an `<i-chat>` element on the page, then create a message containing a text part and a `todoPart`. Each item needs a stable `id`, a `title`, and a `status`.

```js
import '@bndynet/ichat'
import { textPart, todoPart } from '@bndynet/ichat'

const chat = document.querySelector('i-chat')
const messageId = crypto.randomUUID()

chat.addMessage({
  id: messageId,
  role: 'assistant',
  timestamp: Date.now(),
  parts: [
    textPart('I will work through this plan and keep it up to date.'),
    todoPart(
      [
        { id: 'model', title: 'Define the todo data model', status: 'done' },
        { id: 'panel', title: 'Build the collapsible chat panel', status: 'active' },
        { id: 'events', title: 'Connect status update events', status: 'pending' },
        { id: 'docs', title: 'Document the public API', status: 'pending' },
        { id: 'verify', title: 'Verify the production build', status: 'pending' },
      ],
      { id: 'todo-plan', status: 'streaming' },
    ),
  ],
})
```

## Apply ordered updates

Use `tryUpdateTodoItem()` when a server event reports progress. Pass a monotonically increasing `revision` for every update; stale or duplicate events are rejected safely.

```js
function updateTodo(itemId, patch, revision) {
  const result = chat.tryUpdateTodoItem(
    messageId,
    'todo-plan',
    itemId,
    patch,
    revision,
  )

  if (!result.ok) {
    console.warn('To-do update ignored:', result.reason)
  }
}

updateTodo('panel', { status: 'done' }, 1)
updateTodo('events', { status: 'active' }, 2)
```

## Respond to user actions

`i-chat` emits `part-action` when a user changes a to-do item. The host decides whether to persist and apply that request.

```js
chat.addEventListener('part-action', (event) => {
  if (event.detail?.kind !== 'todo') return

  const { messageId, part, itemId, status } = event.detail.detail
  const result = chat.tryUpdateTodoItem(
    messageId,
    part.id,
    itemId,
    { status },
  )

  if (!result.ok) {
    console.warn('User-requested update ignored:', result.reason)
  }
})
```
