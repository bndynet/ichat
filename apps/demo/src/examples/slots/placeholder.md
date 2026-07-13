## Provide an empty-state slot

Append any regular DOM content with `slot="empty"`. `i-chat` displays it when no messages are present.

```js
import '@bndynet/ichat'

const chat = document.querySelector('i-chat')
const emptyState = document.createElement('section')

emptyState.slot = 'empty'
emptyState.innerHTML = `
  <h2>Welcome</h2>
  <p>Type a message below to begin.</p>
`

chat.append(emptyState)
```

## Keep the page empty until the user sends

This page starts with no messages, so the `Welcome` illustration remains visible. It forwards the normal `send` event to the page's reply handler.

```js
chat.addEventListener('send', (event) => {
  console.log('User sent:', event.detail.content)
})
```
