<script setup>
import '@bndynet/chat';
import { onMounted, nextTick, ref } from 'vue'
import { demoData, nextId } from '../../composables/demo-data.js'
import ChatToolbar from '../../components/ChatToolbar.vue'

const chatRef = ref(null)

onMounted(async () => {
  await nextTick()
  chatRef.value.addMessage({
    id: nextId(),
    role: 'assistant',
    content: demoData.detailsFence,
    timestamp: Date.now(),
  })
})
</script>

<template>
  <ChatToolbar :chat-ref="chatRef" />
  <i-chat-messages ref="chatRef"></i-chat-messages>
</template>
