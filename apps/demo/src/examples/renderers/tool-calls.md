## Stream the page's search tool call

The first page message starts with a completed reasoning part, then adds the same `search_web` tool call after streaming begins.

```js
import '@bndynet/ichat'
import { textPart } from '@bndynet/ichat'

const chat = document.querySelector('i-chat')
const messageId = crypto.randomUUID()

chat.addMessage({
  id: messageId,
  role: 'assistant',
  streaming: true,
  timestamp: Date.now(),
  parts: [{
    id: 'r1',
    type: 'reasoning',
    text: 'I should search the docs, then run the tests before answering.',
    status: 'complete',
  }],
})

chat.appendPart(messageId, {
  id: 'tc-a',
  type: 'tool-call',
  toolCallId: 'call_a',
  toolName: 'search_web',
  args: { q: 'lit 3 web components' },
  state: 'input-available',
})
```

## Update the result

Use the part id to advance the tool-call state. The host decides when the message is no longer streaming.

```js
function updateToolCall(partId, patch) {
  const result = chat.tryUpdateToolCall(messageId, partId, patch)
  if (!result.ok) console.warn('Tool update ignored:', result.reason)
}

updateToolCall('tc-a', { state: 'executing' })

setTimeout(() => {
  updateToolCall('tc-a', {
    state: 'output-available',
    durationMs: 1100,
    resultParts: [{ id: 'tc-a-r1', type: 'text', text: 'Found **3 results**: `lit.dev`, `github.com/lit/lit`, MDN.' }],
  })
  chat.appendPart(messageId, {
    id: 'ans',
    type: 'text',
    text: 'Based on the docs, use `@customElement`. Note: one unit test is currently failing — see the tool result above.',
  })
  chat.updateMessage(messageId, { streaming: false })
}, 1100)
```

## Add the page's failed test run

The same streaming message later adds a `run_tests` call and reports the error state.

```js
chat.appendPart(messageId, {
  id: 'tc-b', type: 'tool-call', toolCallId: 'call_b',
  toolName: 'run_tests', args: { suite: 'unit' }, state: 'input-streaming',
})

updateToolCall('tc-b', { state: 'executing' })
updateToolCall('tc-b', {
  state: 'output-error',
  durationMs: 1200,
  error: '1 of 24 tests failed: streaming-controller.test.ts',
})
```

## Handle approval

The second page message requests approval to remove the build cache. Listen for `part-action` and apply the decision in your application.

```js
const approvalMessageId = crypto.randomUUID()

chat.addMessage({
  id: approvalMessageId,
  role: 'assistant',
  timestamp: Date.now(),
  parts: [
    textPart('This action needs your confirmation:'),
    {
      id: 'tc-c', type: 'tool-call', toolCallId: 'call_c',
      toolName: 'delete_file', title: 'delete_file — remove build cache',
      args: { path: '/tmp/.cache', recursive: true },
      state: 'input-available', approval: 'required',
    },
  ],
})

chat.addEventListener('part-action', (event) => {
  if (event.detail?.kind !== 'tool-call') return

  const { action, messageId, part } = event.detail.detail
  if (action === 'approve') {
    chat.tryUpdateToolCall(messageId, part.id, { approval: 'approved', state: 'executing' })
  } else if (action === 'reject') {
    chat.tryUpdateToolCall(messageId, part.id, {
      approval: 'rejected', state: 'output-error', error: 'Cancelled by user.',
    })
  }
})
```
