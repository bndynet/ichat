# @bndynet/ichat-bookmarks

A floating **bookmark rail** Web Component for `@bndynet/ichat`. Mark important
messages in a busy chatroom, then render a compact, clickable index of them
**anywhere** in your layout — a sidebar, a gutter, a toolbar. Hover a bar to
preview the message; click to scroll the chat to it.

- Framework-agnostic: a standard custom element, so it works identically in
  native HTML, React, Angular, and Vue.
- Reads bookmarks straight from the chat's `messages`, so it never needs a
  separate data store.
- Reuses the chat's `scrollToMessage(id)`, so virtual scrolling and the
  scroll-highlight animation work out of the box.
- Themed via `--chat-*` tokens (light/dark automatically).

## Install

```bash
npm install @bndynet/ichat-bookmarks
```

This package peers with `@bndynet/ichat-messages` (already pulled in by
`@bndynet/ichat`). Register the element once:

```js
import "@bndynet/ichat-bookmarks";
```

## Marking messages

A message appears in the rail when it has a truthy `bookmark`:

```js
import { textPart } from "@bndynet/ichat";

chat.addMessage({
  id: "a1",
  role: "assistant",
  parts: [textPart("The final answer is 42.")],
  bookmark: true,                              // default label: message text
});

chat.addMessage({
  id: "a2",
  role: "system",
  parts: [textPart("…")],
  bookmark: { label: "结论：方案 B 已通过" }, // custom short label
});

// Messages without `bookmark` never appear in the rail.
```

## Connecting the rail

### 1. `for` attribute (by element id — works everywhere)

```html
<i-chat id="chat-1"></i-chat>
<i-chat-bookmarks for="chat-1"></i-chat-bookmarks>
```

The `for` value is resolved against the element's own root (document or shadow
root), falling back to the global document. Identical markup in every framework:

```html
<!-- React (React 19 renders custom elements natively) -->
<aside><i-chat-bookmarks for="chat-1" /></aside>
<i-chat id="chat-1" />

<!-- Angular (declare CUSTOM_ELEMENTS_SCHEMA) -->
<aside><i-chat-bookmarks for="chat-1"></i-chat-bookmarks></aside>
<i-chat id="chat-1"></i-chat>
```

### 2. `.source` property (programmatic, element reference)

When you already hold the element reference (a template ref, a `ViewChild`,
etc.), assign it directly. It takes precedence over `for`:

```js
document.querySelector("i-chat-bookmarks").source =
  document.getElementById("chat-1");
```

## Syncing

The rail auto-syncs on `messages-change` — every imperative mutation
(`addMessage`, streaming updates, `removeMessage`, …) is picked up without any
glue code. The one exception is a **direct** `chat.messages = […]` assignment,
which (by design) does not emit that event; call `refresh()` after it:

```js
chat.messages = history;
bookmarks.refresh();
```

## Theming

The bar color is `--chat-bookmark-color`, defaulting to `--chat-primary`, so it
follows your light/dark theme automatically. Override it on any ancestor:

```css
:root {
  --chat-bookmark-color: #f59e0b;
  --chat-bookmarks-gap: 6px; /* spacing between bars */
}
```

## API

| Member                 | Type              | Description                                            |
| ---------------------- | ----------------- | ------------------------------------------------------ |
| `for`                  | `string`          | Id of the source chat/list element (attribute).        |
| `source`               | `BookmarkSource`  | Direct element reference; overrides `for`.             |
| `refresh()`            | `() => void`      | Re-read messages after a direct `.messages` assignment. |

`BookmarkSource` is the minimal surface the rail needs — any element exposing
`{ messages: ChatMessage[]; scrollToMessage(id): boolean }` works, including
`<i-chat>` and `<i-chat-messages>`.

## License

MIT
