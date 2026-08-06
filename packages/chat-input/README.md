# @bndynet/ichat-input

Lit Web Component for chat text input. Auto-resize textarea, send button, streaming cancel, and keyboard shortcuts.

## Install

```bash
npm install @bndynet/ichat-input
```

## Component

| Tag              | Description                                              |
| ---------------- | -------------------------------------------------------- |
| `<i-chat-input>` | Multi-line auto-resize textarea with send/cancel buttons |

## Features

- Auto-resize textarea
- Enter to send, Shift+Enter for newline
- Send / Cancel buttons
- Streaming stop support
- `busy` state that blocks send and voice input while preserving draft editing
- i18n-ready

## Busy and streaming

Use `busy` for the submission lock and `streaming` to select the Cancel button:

```js
const input = document.querySelector("i-chat-input");

input.busy = true; // send/voice are locked; textarea remains editable
input.streaming = true; // Cancel replaces Send
```

When `<i-chat-input>` is bundled inside `<i-chat>`, these properties are wired automatically.

## License

MIT
