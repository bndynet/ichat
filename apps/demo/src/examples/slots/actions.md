## Replace message actions

Supply custom content through `slot="message-actions"`. Give every action a `data-action` value so the chat component can report it consistently.

```js
import "@bndynet/ichat";

const chat = document.querySelector("i-chat");
const actions = document.createElement("div");

actions.slot = "message-actions";
actions.innerHTML = `
  <button type="button" data-action="like">Like</button>
  <button type="button" data-action="copy">Copy</button>
`;

chat.append(actions);
```

## Handle the page's action event

The page adds these two messages, then listens for `message-action` on the host.

```js
import { textPart } from "@bndynet/ichat";

for (const message of [
  { role: "self", parts: [textPart("Hi")] },
  {
    role: "assistant",
    parts: [textPart("Hover over this message to see the actions")],
  },
]) {
  chat.addMessage({
    id: crypto.randomUUID(),
    timestamp: Date.now(),
    ...message,
  });
}

chat.addEventListener("message-action", (event) => {
  const { action, message } = event.detail;

  if (action === "copy") {
    navigator.clipboard.writeText(
      message.parts.map((part) => part.text ?? "").join(""),
    );
  }
});
```
