<script setup>
import '@bndynet/ichat';
import { onMounted, nextTick, ref } from 'vue'
import { textPart } from '@bndynet/ichat'
import { demoData, nextId } from '../../composables/demo-data.js'
import ChatToolbar from '../../components/ChatToolbar.vue'

const chatRef = ref(null)

onMounted(async () => {
  await nextTick()
  chatRef.value.addMessage({
    id: nextId(),
    role: 'assistant',
    parts: [textPart(demoData.kpis)],
    timestamp: Date.now(),
  })
})
</script>

<template>
  <ChatToolbar :chat-ref="chatRef" />
  <i-chat-messages ref="chatRef"></i-chat-messages>
</template>
