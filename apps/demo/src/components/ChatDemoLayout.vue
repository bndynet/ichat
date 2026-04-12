<script setup>
import { nextTick, onMounted } from 'vue'
import { useChatDemo } from '../composables/useChatDemo.js'
import DemoChatToolbar from './DemoChatToolbar.vue'

const props = defineProps({
  /** Called after chat is mounted; use to seed messages or run demos */
  init: {
    type: Function,
    default: undefined,
  },
})

const {
  chatRef,
  streaming,
  runErrorMessage,
  runTimeline,
  runThinkingDemo,
  addStaticMessage,
  cancelStreaming,
  clear,
  showErrorBanner,
  onStreamingChange,
  onMessageAction,
} = useChatDemo()

onMounted(async () => {
  await nextTick()
  if (props.init) {
    props.init({
      runThinkingDemo,
      runTimeline,
      runErrorMessage,
      addStaticMessage,
      clear,
    })
  }
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
