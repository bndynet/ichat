# Virtual scrolling

Virtual scrolling is **enabled by default** (`'auto'` mode). It automatically
activates when the message count exceeds 500, keeping the lightweight regular
keyed list for short conversations.

```js
const chat = document.querySelector("i-chat-messages");

// Default: auto (enables at > 500 messages)
chat.config = { ...chat.config };

// Always on
chat.config = { ...chat.config, virtualScroll: true };

// Always off
chat.config = { ...chat.config, virtualScroll: false };
```

When virtual scrolling is active, only the visible rows plus a small buffer
remain mounted in the DOM.

## Vue example

```vue
<script setup>
import "@bndynet/ichat";
import { nextTick, onMounted, ref } from "vue";
import { textPart } from "@bndynet/ichat";

const chatRef = ref(null);

onMounted(async () => {
  await nextTick();
  const chat = chatRef.value;

  // Default 'auto' — no explicit config needed
  chat.config = { ...chat.config };
  chat.messages = Array.from({ length: 10_000 }, (_, index) => ({
    id: `message-${index + 1}`,
    role: index % 4 === 0 ? "self" : "assistant",
    parts: [
      textPart(`Message ${index + 1}`, {
        id: `part-${index + 1}`,
      }),
    ],
    timestamp: Date.now() + index,
  }));
});
</script>

<template>
  <i-chat-messages ref="chatRef" />
</template>
```

Because off-screen elements are recycled, keep durable custom-part state in
message data instead of private DOM state. Existing mutation and streaming APIs
continue to work without a separate virtual-list data model.

## Trade-offs

Keeping off-screen rows out of the DOM is what makes this fast, and it costs a
few browser behaviours that a chat history otherwise gets for free:

- Find-in-page (Ctrl/Cmd+F) only matches the rendered range.
- Text selection and copy cannot span the whole history.
- Printing and "save as PDF" capture only the rendered range.

Set `virtualScroll: false` when these matter more than large-history performance.

`scrollToMessage()` and `scrollToPart()` still reach unmounted rows: they return
`true` to mean _scheduled_, and the scroll settles over the next few frames as the
virtualizer measures the row.
