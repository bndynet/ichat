# Virtual scrolling

Enable viewport-based rendering for long message histories with one config flag:

```js
const chat = document.querySelector('i-chat-messages')

chat.config = {
  ...chat.config,
  virtualScroll: true,
}

chat.messages = messages
```

The regular keyed list remains the default. When virtual scrolling is enabled,
only the visible rows plus a small buffer remain mounted in the DOM.

## Vue example

```vue
<script setup>
import '@bndynet/ichat'
import { nextTick, onMounted, ref } from 'vue'
import { textPart } from '@bndynet/ichat'

const chatRef = ref(null)

onMounted(async () => {
  await nextTick()
  const chat = chatRef.value

  chat.config = { ...chat.config, virtualScroll: true }
  chat.messages = Array.from({ length: 10_000 }, (_, index) => ({
    id: `message-${index + 1}`,
    role: index % 4 === 0 ? 'self' : 'assistant',
    parts: [
      textPart(`Message ${index + 1}`, {
        id: `part-${index + 1}`,
      }),
    ],
    timestamp: Date.now() + index,
  }))
})
</script>

<template>
  <i-chat-messages ref="chatRef" />
</template>
```

Because off-screen elements are recycled, keep durable custom-part state in
message data instead of private DOM state. Existing mutation and streaming APIs
continue to work without a separate virtual-list data model.
