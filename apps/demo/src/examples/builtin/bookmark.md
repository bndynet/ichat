# Bookmarks (message rail)

Mark selected messages with `bookmark` so they appear in a compact, clickable
rail. The rail is a **standalone** Web Component — `@bndynet/ichat-bookmarks` —
so you can place it anywhere in your layout (a sidebar, a gutter, a toolbar).
In a busy chatroom you mark only the messages worth jumping back to — system
announcements, conclusions, or mentions — while every other message stays out
of the rail.

```bash
npm install @bndynet/ichat-bookmarks
```

```js
import "@bndynet/ichat-bookmarks";
import { textPart } from "@bndynet/ichat";

chat.addMessage({
  id: "a1",
  role: "assistant",
  parts: [textPart("The final answer is 42.")],
  bookmark: true, // default label: the message's text preview
});

chat.addMessage({
  id: "a2",
  role: "system",
  parts: [textPart("…")],
  bookmark: { label: "结论：方案 B 已通过" }, // custom short label
});

// Messages without `bookmark` never appear in the rail.
chat.addMessage({
  id: "a3",
  role: "self",
  parts: [textPart("普通消息，不上榜")],
});
```

## Connect the rail

Bind it to a chat/list element by id with `for` (works in any framework and
native HTML):

```html
<i-chat id="chat-1"></i-chat>
<i-chat-bookmarks for="chat-1"></i-chat-bookmarks>
```

Or set `.source` programmatically:

```js
document.querySelector("i-chat-bookmarks").source =
  document.getElementById("chat-1");
```

## Behaviour

- Only messages with a truthy `bookmark` are shown, in message order.
- Hovering a bar previews the `label` (or a truncated plain-text preview).
- Clicking a bar scrolls to the message (reusing `scrollToMessage`) and
  highlights it.
- Auto-syncs on `messages-change`. After a direct `chat.messages = […]`
  assignment, call `bookmarks.refresh()`.

## Theming

The bar colour is `--chat-bookmark-color`, defaulting to a neutral gray
(`--chat-text-secondary`), so it follows your light/dark theme automatically.

```css
:root {
  --chat-bookmark-color: #f59e0b;
  --chat-bookmarks-gap: 6px; /* spacing between bars */
}
```

## Vue example

```vue
<script setup>
import "@bndynet/ichat";
import "@bndynet/ichat-bookmarks";
import { nextTick, onMounted, ref } from "vue";
import { textPart } from "@bndynet/ichat";

const chatRef = ref(null);
const bookmarksRef = ref(null);

onMounted(async () => {
  await nextTick();
  chatRef.value.messages = [
    {
      id: "msg-1",
      role: "assistant",
      parts: [textPart("The answer is 42.")],
      bookmark: { label: "结论" },
    },
    {
      id: "msg-2",
      role: "self",
      parts: [textPart("A normal message.")],
      // no bookmark → not shown in the rail
    },
  ];
  bookmarksRef.value.refresh(); // after a direct .messages assignment
});
</script>

<template>
  <div style="display: flex; height: 100%">
    <aside style="flex: 0 0 44px; display: flex; justify-content: center">
      <i-chat-bookmarks for="bookmark-chat" ref="bookmarksRef" />
    </aside>
    <i-chat-messages id="bookmark-chat" ref="chatRef" style="flex: 1" />
  </div>
</template>
```
