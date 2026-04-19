<script setup>
import { computed, unref } from 'vue'
import {
  Warning,
  Bell,
  Delete,
  CircleClose,
} from '@element-plus/icons-vue'
import { cancelPendingStreamPlayback } from '../composables/demo-data.js'

const CANCEL_HINT = '*— Response stopped —*'

const props = defineProps({
  streaming: { type: Boolean, default: false },
  /**
   * Parent’s `<i-chat>` / `<i-chat-messages>` instance.
   * Pass `ref(chat)` from template as `:chat-ref="chatRef"` — Vue unwraps refs there, so before
   * mount you get `null`; after mount, the host element/instance. `unref()` also accepts a Ref.
   */
  chatRef: {
    required: false,
    default: null,
    validator: (v) => v == null || typeof v === 'object',
  },
})

/** Resolved host element (template `:chat-ref="r"` unwraps `r`, so it is not `r.value`). */
const chatEl = computed(() => unref(props.chatRef))

let msgSeq = 0
function nextMsgId() {
  return `msg-${++msgSeq}`
}

function onErrorMessage() {
  const chat = chatEl.value
  if (!chat) return
  chat.addMessage({
    id: nextMsgId(),
    role: 'self',
    content: 'Tell me about quantum computing',
    timestamp: Date.now(),
  })
  setTimeout(() => {
    chat.addMessage({
      id: nextMsgId(),
      role: 'assistant',
      content: '',
      error: 'Service temporarily unavailable. Please try again later.',
      timestamp: Date.now(),
    })
  }, 500)
}

function onErrorBanner() {
  chatEl.value?.showError('Network lost. Reconnecting…', {
    duration: 5000,
  })
}

function onCancelStream() {
  cancelPendingStreamPlayback()
  chatEl.value?.cancel(CANCEL_HINT)
}

function onClear() {
  chatEl.value?.clear()
}
</script>

<template>
  <div class="demo-chat-toolbar">
    <el-button
      size="small"
      :disabled="streaming"
      :icon="Warning"
      @click="onErrorMessage"
    >
      Error Message
    </el-button>

    <el-button
      size="small"
      :icon="Bell"
      @click="onErrorBanner"
    >
      Error Banner
    </el-button>

    <el-button
      size="small"
      type="danger"
      :icon="CircleClose"
      :disabled="!streaming"
      @click="onCancelStream"
    >
      Cancel
    </el-button>

    <el-button
      size="small"
      type="danger"
      plain
      :icon="Delete"
      @click="onClear"
    >
      Clear
    </el-button>
  </div>
</template>

<style scoped>
.demo-chat-toolbar {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  margin: 0 0 8px 0;
  border-radius: 8px;
  border: 1px dashed var(--el-border-color, #dcdfe6);
  background: var(--el-fill-color-light, #f5f7fa);
}
</style>
