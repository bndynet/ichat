# Scroll To Message / Part

`<i-chat>` exposes `scrollToMessage(id)` and `scrollToPart(partId)` to programmatically scroll a message or part element into view. These methods use the existing `data-message-id` / `data-part-id` DOM attributes.

## scrollToMessage(id)

Scrolls the `<i-chat-message>` element whose `data-message-id` matches `id` into view using `scrollIntoView({ behavior: 'smooth', block: 'nearest' })`.

```js
const chat = document.querySelector("i-chat");

// Scroll to a specific message
const found = chat.scrollToMessage("msg-10");
console.log(found); // true if the message is rendered

// Returns false if the message ID doesn't exist or isn't rendered yet
chat.scrollToMessage("nonexistent"); // → false
```

## scrollToPart(partId)

Scrolls any element inside the messages shadow DOM with a matching `data-part-id` attribute into view.

```js
// Scroll to a specific part within a message
chat.scrollToPart("part-5");

// Returns false if the part isn't found
chat.scrollToPart("nope"); // → false
```

## Vue example

```vue
<script setup>
import "@bndynet/ichat";
import { textPart } from "@bndynet/ichat";
import { ref, onMounted, nextTick } from "vue";

const chatRef = ref(null);

onMounted(async () => {
  await nextTick();
  const chat = chatRef.value;
  if (!chat) return;

  // Add messages with known IDs
  for (let i = 1; i <= 20; i++) {
    chat.addMessage({
      id: `msg-${i}`,
      role: i % 2 ? "self" : "assistant",
      parts: [textPart(`Message ${i}`, { id: `part-${i}` })],
      timestamp: Date.now(),
    });
  }
});

function goToMessage(id) {
  chatRef.value?.scrollToMessage(id);
}

function goToPart(partId) {
  chatRef.value?.scrollToPart(partId);
}
</script>

<template>
  <el-button @click="goToMessage('msg-10')">Go to Message 10</el-button>
  <el-button @click="goToPart('part-5')">Go to Part 5</el-button>
  <i-chat ref="chatRef" />
</template>
```
