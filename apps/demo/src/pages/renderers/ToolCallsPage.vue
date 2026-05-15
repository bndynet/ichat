<script setup>
import '@bndynet/ichat';
import { onMounted, onUnmounted, nextTick, ref } from 'vue'
import { nextId } from '../../composables/demo-data.js'
import ChatToolbar from '../../components/ChatToolbar.vue'

const chatRef = ref(null)
/** Id of the human-in-the-loop demo message, so we can target it from the event handler. */
const approvalMsgId = ref(null)

/** `<i-chat>` ref can lag a tick or two after mount (custom element upgrade). */
async function waitForChatHost(maxTicks = 30) {
  for (let i = 0; i < maxTicks; i++) {
    if (chatRef.value) return chatRef.value
    await nextTick()
  }
  return chatRef.value
}

const timers = []
const after = (ms, fn) => timers.push(setTimeout(fn, ms))

onMounted(async () => {
  const chat = await waitForChatHost()
  if (!chat) return

  // ── Demo 1: assistant message built from structured parts ──────────────────
  // reasoning → two tool calls (streamed through their state machine) → answer.
  const msgId = nextId()
  chat.addMessage({
    id: msgId,
    role: 'assistant',
    streaming: true,
    timestamp: Date.now(),
    parts: [
      { id: 'r1', type: 'reasoning', text: 'I should search the docs, then run the tests before answering.', status: 'complete' },
    ],
  })

  // Tool call A: search_web — pending → executing → success
  after(500, () => {
    chat.appendPart(msgId, {
      id: 'tc-a',
      type: 'tool-call',
      toolCallId: 'call_a',
      toolName: 'search_web',
      args: { q: 'lit 3 web components' },
      state: 'input-available',
    })
  })
  after(1100, () => chat.updateToolCall(msgId, 'tc-a', { state: 'executing' }))
  after(2200, () =>
    chat.updateToolCall(msgId, 'tc-a', {
      state: 'output-available',
      durationMs: 1100,
      resultParts: [
        { id: 'tc-a-r1', type: 'text', text: 'Found **3 results**: `lit.dev`, `github.com/lit/lit`, MDN.' },
      ],
    }),
  )

  // Tool call B: run_tests — streams args, executes, then fails
  after(2600, () => {
    chat.appendPart(msgId, {
      id: 'tc-b',
      type: 'tool-call',
      toolCallId: 'call_b',
      toolName: 'run_tests',
      args: { suite: 'unit' },
      state: 'input-streaming',
    })
  })
  after(3200, () => chat.updateToolCall(msgId, 'tc-b', { state: 'executing' }))
  after(4400, () =>
    chat.updateToolCall(msgId, 'tc-b', {
      state: 'output-error',
      durationMs: 1200,
      error: '1 of 24 tests failed: streaming-controller.test.ts',
    }),
  )

  // Final answer text part
  after(4900, () => {
    chat.appendPart(msgId, {
      id: 'ans',
      type: 'text',
      text: 'Based on the docs, use `@customElement`. Note: one unit test is currently failing — see the tool result above.',
    })
    chat.updateMessage(msgId, { streaming: false })
  })

  // ── Demo 2: human-in-the-loop approval ─────────────────────────────────────
  after(5400, () => {
    const id2 = nextId()
    approvalMsgId.value = id2
    chat.addMessage({
      id: id2,
      role: 'assistant',
      timestamp: Date.now(),
      parts: [
        { id: 't', type: 'text', text: 'This action needs your confirmation:' },
        {
          id: 'tc-c',
          type: 'tool-call',
          toolCallId: 'call_c',
          toolName: 'delete_file',
          title: 'delete_file — remove build cache',
          args: { path: '/tmp/.cache', recursive: true },
          state: 'input-available',
          approval: 'required',
        },
      ],
    })
  })
})

onUnmounted(() => timers.forEach(clearTimeout))

/** `tool-action` from the approval buttons bubbles up to <i-chat>. */
function handleToolAction(e) {
  const { action, part } = e.detail
  console.log('[ToolCallsPage tool-action]', e.detail)
  const chat = chatRef.value
  const msgId = approvalMsgId.value
  if (!chat || !msgId || !part) return
  if (action === 'approve') {
    chat.updateToolCall(msgId, part.id, { approval: 'approved', state: 'executing' })
    setTimeout(
      () =>
        chat.updateToolCall(msgId, part.id, {
          state: 'output-available',
          durationMs: 800,
          result: { removed: true, freedBytes: 1048576 },
        }),
      900,
    )
  } else {
    chat.updateToolCall(msgId, part.id, { approval: 'rejected', state: 'output-error', error: 'Cancelled by user.' })
  }
}
</script>

<template>
  <ChatToolbar :chat-ref="chatRef" />
  <i-chat ref="chatRef" @tool-action="handleToolAction"></i-chat>
</template>
