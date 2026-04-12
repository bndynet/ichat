<script setup>
import { ref, nextTick, onMounted } from 'vue'
import { Link, Paperclip, Promotion } from '@element-plus/icons-vue'
import '@bndynet/chat'
import { useChatDemo } from '../composables/useChatDemo.js'
import DemoChatToolbar from '../components/DemoChatToolbar.vue'

/**
 * For **Vue components** in the left “actions” area of the input region, do not use
 * `slot="actions"`: `i-chat` **cloneNode**s into `<i-chat-input>`, which breaks component instances.
 *
 * Instead: use **`slot="input"`** to replace the default `<i-chat-input>` entirely and lay out in Vue
 * “top: textarea / bottom: left toolbar + right send”—same semantic position as the built-in composer;
 * the left side can host any `<el-button>` or app components.
 *
 * Submit: on the `<i-chat>` element call
 * `dispatchEvent(new CustomEvent('send', { detail: { content } }))`; the parent `@send` receives it
 * (same as the default `<i-chat-input>`).
 */

let msgId = 0
const nextId = () => 'msg-' + ++msgId

const draft = ref('')
const model = ref('')
const textareaRef = ref(null)
const streamingUi = ref(false)

const {
  chatRef,
  streaming,
  runErrorMessage,
  addMessage,
  cancelStreaming,
  clear,
  showErrorBanner,
  onStreamingChange,
} = useChatDemo()

function onNiceChatStreamingChange(e) {
  streamingUi.value = e.detail.streaming
  onStreamingChange(e)
}

function emitSendToHost() {
  const content = draft.value.trim()
  if (!content) return
  const host = chatRef.value
  if (!host) return
  host.dispatchEvent(
    new CustomEvent('send', {
      bubbles: true,
      composed: true,
      detail: { content },
    })
  )
  draft.value = ''
}

function emitCancelToHost() {
  chatRef.value?.dispatchEvent(
    new CustomEvent('cancel', {
      bubbles: true,
      composed: true,
    })
  )
}

/** Left “actions” area: plain Vue, same role as the default i-chat-input left column */
function onAttachDemo() {
  draft.value += (draft.value ? '\n' : '') + '[attachment placeholder]'
  textareaRef.value?.focus()
}

function handleSend(e) {
  const content = e.detail.content
  const chat = chatRef.value
  if (!chat) return
  chat.addMessage({ id: nextId(), role: 'user', content, timestamp: Date.now() })
  const aiId = nextId()
  chat.addMessage({ id: aiId, role: 'assistant', content: '', streaming: true, timestamp: Date.now() })
  const reply = `Echo: *${content}*\n\n(Left buttons come from **Vue + slot="input"**, not \`slot="actions"\`.)`
  let i = 0
  const timer = setInterval(() => {
    i += 4
    if (i >= reply.length) {
      chat.updateMessage(aiId, { content: reply, streaming: false })
      clearInterval(timer)
    } else {
      chat.updateMessage(aiId, { content: reply.slice(0, i), streaming: true })
    }
  }, 25)
}

function onModelChange(e) {
  console.log(e)
}

onMounted(async () => {
  await nextTick()
  clear()
  addMessage({
    role: 'assistant',
    content:
      '### Vue “actions” inside `slot="input"`\n\n' +
      'The input area below is **fully custom**: the **Element buttons** on the left sit in the **same place** as `slot="actions"` on the default `<i-chat-input>`, but they render through Vue without clone.\n\n' +
      'Trade-off: you wire Send / Stop yourself and dispatch `@send` / `cancel` (see script comments).',
    timestamp: Date.now(),
  })
})
</script>

<template>
  <div class="slots-input-page">
    <DemoChatToolbar
      :streaming="streaming"
      @error-message="runErrorMessage"
      @error-banner="showErrorBanner"
      @cancel-stream="cancelStreaming"
      @clear="clear"
    />

    <i-chat
      ref="chatRef"
      class="chat"
      @streaming-change="onNiceChatStreamingChange"
      @send="handleSend"
    >
      <!-- Replace default i-chat-input: bottom-left actions = any Vue components -->
      <div slot="input" class="slots-input">
        <textarea
          ref="textareaRef"
          v-model="draft"
          class="slots-input-textarea"
          placeholder="Say hi…"
          rows="1"
          @keydown.enter.exact.prevent="emitSendToHost"
        />
        <div class="slots-input-toolbar">
          <div class="slots-input-actions">
            <div>
              <el-button size="small" :icon="Paperclip" text bg @click="onAttachDemo">Attach</el-button>
            </div>
            <div>
              <el-select v-model="model" size="small" placeholder="Select Model" @change="onModelChange">
                <el-option value="model1" selected>Model 1</el-option>
                <el-option value="model2">Model 2</el-option>
                <el-option value="model3">Model 3</el-option>
              </el-select>
            </div>
          </div>
          <div class="slots-input-end">
            <el-button
              v-if="streamingUi"
              size="small"
              type="warning"
              @click="emitCancelToHost"
            >
              Stop
            </el-button>
            <el-button
              size="small"
              type="primary"
              :icon="Promotion"
              :disabled="!draft.trim()"
              @click="emitSendToHost"
            >
              Send
            </el-button>
          </div>
        </div>
      </div>
    </i-chat>
  </div>
</template>

<style scoped>
.slots-input-page {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.chat {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  border-radius: 10px;
  --chat-footer-padding: 0;
}

.slots-input {
  padding: var(--chat-spacing-sm, 12px) var(--chat-spacing-md, 16px) var(--chat-spacing-md, 16px);
  background: var(--chat-surface, #fff);
  border-top: 1px solid var(--chat-border, #e5e7eb);
}

.slots-input-textarea {
  width: 100%;
  min-height: 44px;
  max-height: 160px;
  resize: vertical;
  padding: 10px 12px;
  border-radius: var(--chat-radius, 8px);
  border: 1px solid var(--chat-border, #e5e7eb);
  background: var(--chat-input-bg, var(--chat-surface, #fff));
  color: var(--chat-text, #1a1a2e);
  font: inherit;
  font-size: 14px;
  line-height: 1.45;
  box-sizing: border-box;
}

.slots-input-textarea:focus {
  outline: none;
  border-color: var(--chat-primary, #2563eb);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--chat-primary, #2563eb) 20%, transparent);
}

.slots-input-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 10px;
}

.slots-input-actions {
  display: flex;
  gap: 6px;
}

.slots-input-end {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}
</style>
