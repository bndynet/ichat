## Render progress

The progress renderer reads a Markdown list with status markers. Use a block id when you plan to update a specific progress block later.

```js
import "@bndynet/ichat";
import { textPart } from "@bndynet/ichat";

const chat = document.querySelector("i-chat-messages");
const messageId = crypto.randomUUID();

chat.addMessage({
  id: messageId,
  role: "assistant",
  timestamp: Date.now(),
  parts: [
    textPart(`## Deployment Pipeline

### BUILD
<!-- bid:build -->
1. [done] Build Docker image
2. [error] Run test suite
3. [active] Push to registry

### DEPLOY
<!-- bid:deploy -->
1. [done] Deploy to staging
2. [error] Run smoke tests
3. [pending] Promote to production`),
  ],
});
```

## Update an item

Use the message id, one-based step number, next status, and block id to apply a live update.

```js
chat.updateProgressStep(messageId, 1, "active", "build");
chat.updateProgressStep(messageId, 2, "done", "build");
chat.updateProgressStep(messageId, 1, "active", "deploy");
```
