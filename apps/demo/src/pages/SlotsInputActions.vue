<script setup>
import { ElButton } from 'element-plus'
import { Search } from '@element-plus/icons-vue'
import { nextTick, onMounted } from 'vue'
import '@bndynet/chat'
import { useChatDemo } from '../composables/useChatDemo.js'
import DemoChatToolbar from '../components/DemoChatToolbar.vue'

/**
 * Light-DOM slots on `<i-chat>` (`slot="…"` in the template).
 *
 * Message-related slots (`user-avatar`, `empty`, …) are cloned and their `outerHTML` is
 * rendered inside `<i-chat-messages>` / `<i-chat-message>` via Lit `unsafeHTML` — i.e. inside
 * **Shadow DOM**. Document styles (including Vue `scoped`) do **not** cross that boundary,
 * so those slots need **inline `style="…"`** on the markup you author.
 *
 * `slot="actions"` is projected with a native `<slot>` on `<i-chat-input>` (light DOM);
 * scoped CSS in this SFC **does** apply to `.nc-slot-actions-*`.
 */
let msgId = 0
const nextId = () => 'msg-' + ++msgId

function runInit({ clear, addMessage }) {
  clear()
  addMessage({
    role: 'user',
    content: 'Demonstrating `user-avatar` and bubbles on `<i-chat>`.',
  })
  addMessage({
    role: 'assistant',
    reasoning:
      'The reasoning header comes from the `reasoning-header` slot; collapse behaviour and body content are still handled by the inner message list.',
    content:
      '## Customizable slots on `<i-chat>` (`@bndynet/chat`)\n\n' +
      'Message-related slots are **forwarded** to the inner `<i-chat-messages>` (same names as using `i-chat-messages` alone).\n\n' +
      '| Slot | Purpose |\n' +
      '| --- | --- |\n' +
      '| `user-avatar` | User message avatar |\n' +
      '| `assistant-avatar` | Assistant message avatar |\n' +
      '| `message-actions` | Footer actions; `data-action` on children → `message-action` |\n' +
      '| `reasoning-header` | Reasoning block title area |\n' +
      '| `empty` | Empty state (or use `empty-text` on the element) |\n' +
      '| `actions` | Bottom-left toolbar **inside** the default `<i-chat-input>` (attach, model picker, etc.) |\n' +
      '| `input` | **Replaces** the entire default `<i-chat-input>` — supply your own control and dispatch `send` / listen for streaming |\n\n' +
      'The **Like** and **Copy** buttons use `message-actions`. The composer shows a sample **`actions`** row (+ and label). Type and send to try it.',
  })
}

const {
  chatRef,
  streaming,
  runErrorMessage,
  addMessage,
  cancelStreaming,
  clear,
  showErrorBanner,
  onStreamingChange,
  onMessageAction,
} = useChatDemo()

function handleSend(e) {
  const content = e.detail.content
  const chat = chatRef.value
  if (!chat) return
  chat.addMessage({ id: nextId(), role: 'user', content, timestamp: Date.now() })
  const aiId = nextId()
  chat.addMessage({ id: aiId, role: 'assistant', content: '', streaming: true, timestamp: Date.now() })
  const reply =
    `You said: *"${content}"*\n\n` +
    'This reply is simulated on `<i-chat>` with the same forwarded slots as the **i-chat-messages** demo.'
  let i = 0
  const timer = setInterval(() => {
    i += 3
    if (i >= reply.length) {
      chat.updateMessage(aiId, { content: reply, streaming: false })
      clearInterval(timer)
    } else {
      chat.updateMessage(aiId, { content: reply.slice(0, i), streaming: true })
    }
  }, 30)
}

function handleCancel() {
  chatRef.value?.cancel('*— Response stopped —*')
}

onMounted(async () => {
  await nextTick()
  runInit({ clear, addMessage })
})
</script>

<template>
  <div class="chat-demo-layout">
    <DemoChatToolbar
      :streaming="streaming"
      @error-message="runErrorMessage"
      @error-banner="showErrorBanner"
      @cancel-stream="cancelStreaming"
      @clear="clear"
    />
    <div class="chat-wrapper">
      <i-chat
        ref="chatRef"
        class="chat"
        placeholder="Try the slotted i-chat + default input…"
        @streaming-change="onStreamingChange"
        @message-action="onMessageAction"
        @send="handleSend"
        @cancel="handleCancel"
      >
        <!-- <div slot="actions" class="nc-slot-actions">
          <el-button type="primary" size="small" icon="Plus" @click="handleAdd">Add</el-button>
          <button type="button" class="nc-slot-actions-btn" title="Search scope" aria-label="Search scope">
            <span aria-hidden="true">🌐</span>
          </button>
          <span class="nc-slot-actions-hint">5.4 Thinking</span>
        </div> -->
        <el-button slot="actions" :icon="Search" circle />
      </i-chat>
    </div>
  </div>
</template>

<style scoped>
.chat-demo-layout {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.chat-wrapper {
  height: 100%;
}
</style>
