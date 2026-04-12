<script setup>
import { ref, nextTick, onMounted } from 'vue'
import {
  runThinkingDemo,
  runTimeline,
  showErrorMessage,
  addStaticMessage as addStaticAssistantMessage,
  cancelStreaming,
  clearChat,
  showErrorBanner,
  setStreamingFromDetail,
  handleDemoMessageAction,
} from '../composables/demo-data.js'
import ChatToolbar from './ChatToolbar.vue'

const props = defineProps({
  /** Called after chat is mounted; use to seed messages or run demos */
  init: {
    type: Function,
    default: undefined,
  },
})

const chatRef = ref(null)
const streaming = ref(false)

const onStreamingChange = (e) => setStreamingFromDetail(streaming, e)
const onMessageAction = handleDemoMessageAction

const runErrorMessage = () => showErrorMessage(chatRef)
const runThinkingDemoFn = () => runThinkingDemo(chatRef)
const runTimelineFn = () => runTimeline(chatRef)
const addStaticMessage = (content) => addStaticAssistantMessage(chatRef, content)
const cancelStreamingFn = () => cancelStreaming(chatRef)
const clear = () => clearChat(chatRef)
const showErrorBannerFn = () => showErrorBanner(chatRef)

onMounted(async () => {
  await nextTick()
  if (props.init) {
    props.init({
      runThinkingDemo: runThinkingDemoFn,
      runTimeline: runTimelineFn,
      runErrorMessage,
      addStaticMessage,
      clear,
    })
  }
})
</script>

<template>
  <div class="chat-demo-layout">
    <ChatToolbar
      :streaming="streaming"
      @error-message="runErrorMessage"
      @error-banner="showErrorBannerFn"
      @cancel-stream="cancelStreamingFn"
      @clear="clear"
    />
    <div class="chat-wrapper">
      <i-chat-messages
        ref="chatRef"
        class="chat"
        @streaming-change="onStreamingChange"
        @message-action="onMessageAction"
      />
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
  flex: 1 1 auto;
  overflow: hidden;
  min-height: 0;
  padding: 0;
  margin: 0 0 1rem 0;
  box-sizing: border-box;
}

.chat {
  height: 100%;
  border-radius: 10px;
}
</style>
