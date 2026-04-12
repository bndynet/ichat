<script setup>
import { ref, nextTick, onMounted } from 'vue'
import { Link, Paperclip, Promotion } from '@element-plus/icons-vue'
import '@bndynet/chat'
import { useChatDemo } from '../composables/useChatDemo.js'
import DemoChatToolbar from '../components/DemoChatToolbar.vue'

/**
 * 「输入区左侧 actions」若要用 **Vue 组件**，不要用 `slot="actions"`：`i-chat` 会
 * **cloneNode** 到 `<i-chat-input>`，组件实例会断掉。
 *
 * 可行做法：用 **`slot="input"`** 整块替换默认 `<i-chat-input>`，自己用 Vue 排版出
 * 「上：输入框 / 下：左侧工具条 + 右侧发送」——与内置 composer 同一语义位置，左侧
 * 可放任意 `<el-button>`、业务组件等。
 *
 * 提交：对 `<i-chat>` 元素 `dispatchEvent(new CustomEvent('send', { detail: { content } }))`，
 * 父级 `@send` 即可收到（与默认 `<i-chat-input>` 一致）。
 */

let msgId = 0
const nextId = () => 'msg-' + ++msgId

const draft = ref('')
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

/** 左侧「actions」区：纯 Vue，与默认 i-chat-input 左栏同角色 */
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
  const reply = `Echo: *${content}*\n\n（左侧按钮来自 **Vue + slot="input"**，不是 \`slot="actions"\`）`
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

onMounted(async () => {
  await nextTick()
  clear()
  addMessage({
    role: 'assistant',
    content:
      '### `slot="input"` 里的 Vue「actions」\n\n' +
      '下面输入区是 **整块自定义**：左侧 **Element 按钮** 与默认 `<i-chat-input>` 里 `slot="actions"` **同一位置**，但走 Vue 渲染，不经过 clone。\n\n' +
      '代价：要自己处理发送 / 取消按钮与 `@send` / `cancel` 的派发（见脚本注释）。',
    timestamp: Date.now(),
  })
})
</script>

<template>
  <div class="vue-outside-page">
    <DemoChatToolbar
      :streaming="streaming"
      @error-message="runErrorMessage"
      @error-banner="showErrorBanner"
      @cancel-stream="cancelStreaming"
      @clear="clear"
    />

    <div class="chat-wrap">
      <i-chat
        ref="chatRef"
        class="chat"
        @streaming-change="onNiceChatStreamingChange"
        @send="handleSend"
      >
        <!-- 替换默认 i-chat-input：左下角 actions = 任意 Vue 组件 -->
        <div slot="input" class="vue-custom-input">
          <div class="vue-custom-input-field">
            <textarea
              ref="textareaRef"
              v-model="draft"
              class="vue-custom-textarea"
              placeholder="Composer 由 Vue 实现；左侧为 Element 按钮…"
              rows="1"
              @keydown.enter.exact.prevent="emitSendToHost"
            />
          </div>
          <div class="vue-custom-input-toolbar">
            <div class="vue-custom-input-actions">
              <el-button size="small" :icon="Paperclip" text bg @click="onAttachDemo">Attach</el-button>
              <el-button size="small" :icon="Link" text bg>Model</el-button>
            </div>
            <div class="vue-custom-input-end">
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
  </div>
</template>

<style scoped>
.vue-outside-page {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.chat-wrap {
  flex: 1 1 auto;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.chat {
  flex: 1;
  min-height: 0;
  border-radius: 10px;
  --chat-footer-padding: 0;
}

.vue-custom-input {
  padding: 0 var(--chat-spacing-md, 16px) var(--chat-spacing-md, 16px);
  box-sizing: border-box;
  background: var(--chat-surface, #fff);
  border-top: 1px solid var(--chat-border, #e5e7eb);
}

.vue-custom-input-field {
  padding-top: var(--chat-spacing-sm, 12px);
}

.vue-custom-textarea {
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

.vue-custom-textarea:focus {
  outline: none;
  border-color: var(--chat-primary, #2563eb);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--chat-primary, #2563eb) 20%, transparent);
}

.vue-custom-input-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 10px;
}

.vue-custom-input-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.vue-custom-input-end {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}
</style>
