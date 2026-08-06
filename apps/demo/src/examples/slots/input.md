## Replace the composer

Add a DOM node with `slot="input"` to replace the built-in composer. Dispatch a bubbling, composed `send` event when the user submits text.

```js
import "@bndynet/ichat";

const chat = document.querySelector("i-chat");
const input = document.createElement("div");

input.slot = "input";
input.innerHTML = `
  <textarea rows="1" placeholder="Say hi…"></textarea>
  <button type="button" data-action="attach">Attach</button>
  <select aria-label="Select Model">
    <option value="gpt-4o">GPT-4o</option>
    <option value="gpt-4o-mini">GPT-4o-mini</option>
    <option value="gpt-4">GPT-4</option>
    <option value="gpt-3.5-turbo">GPT-3.5-turbo</option>
    <option value="gpt-3.5-turbo-mini">GPT-3.5-turbo-mini</option>
  </select>
  <button type="button" data-action="send">Send</button>
`;

const textarea = input.querySelector("textarea");
const sendButton = input.querySelector('[data-action="send"]');
let busy = chat.busy;

chat.addEventListener("busy-change", (event) => {
  busy = event.detail.busy;
  sendButton.disabled = busy;
});

input.querySelector('[data-action="attach"]').addEventListener("click", () => {
  textarea.value += `${textarea.value ? "\n" : ""}[attachment placeholder]`;
  textarea.focus();
});

sendButton.addEventListener("click", () => {
  const content = textarea.value.trim();
  if (!content || busy) return;

  input.dispatchEvent(
    new CustomEvent("send", {
      detail: { content },
      bubbles: true,
      composed: true,
    }),
  );
  textarea.value = "";
});

chat.append(input);
```

## Receive the message

The custom event follows the same host-level `send` contract as the default composer.

```js
chat.addEventListener("send", (event) => {
  console.log("User submitted:", event.detail.content);
});
```
