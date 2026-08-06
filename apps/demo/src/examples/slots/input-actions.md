## Add actions beside the default composer

Use `slot="actions"` when you want to retain the built-in input and add controls to its action area.

```js
import "@bndynet/ichat";

const chat = document.querySelector("i-chat");
const actions = document.createElement("div");
const attach = document.createElement("button");

actions.slot = "actions";
attach.type = "button";
attach.textContent = "Attach";

attach.addEventListener("click", () => {
  console.info("[SlotsInputActions] Attach requested");
});

actions.append(attach);
chat.append(actions);
```

## Keep the normal send flow

The default composer still emits `send`; extra actions do not need to reimplement message submission.

```js
chat.addEventListener("send", (event) => {
  console.log("Send message:", event.detail.content);
});
```
