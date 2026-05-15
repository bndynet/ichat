<script setup>
import '@bndynet/ichat';
import { onMounted, onUnmounted, nextTick, ref } from 'vue'
import { textPart } from '@bndynet/ichat'
import { demoData, nextId } from '../../composables/demo-data.js'
import ChatToolbar from '../../components/ChatToolbar.vue'

const chatRef = ref(null)
let cancelled = false

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

onMounted(async () => {
  await nextTick()
  const chat = chatRef.value
  const id = nextId()

  // Start an empty streaming text part, then feed chunks (simulated SSE).
  chat.addMessage({
    id,
    role: 'assistant',
    parts: [textPart('', { id: 'body', status: 'streaming' })],
    streaming: true,
    timestamp: Date.now(),
  })

  // Split on blank lines so each ```chart``` fence arrives as one chunk and
  // renders the moment it closes; morphdom keeps <i-chart> alive afterwards.
  const chunks = demoData.chart.split(/\n{2,}/)
  let acc = ''
  for (let i = 0; i < chunks.length; i++) {
    if (cancelled) return
    acc += (i ? '\n\n' : '') + chunks[i]
    chat.updatePart(id, 'body', { text: acc })
    await sleep(220)
  }

  // Stream ended → finalize. No event listener needed: you already know when
  // your own stream is done.
  if (cancelled) return
  chat.updatePart(id, 'body', { status: 'complete' })
  chat.updateMessage(id, { streaming: false })
})

onUnmounted(() => {
  cancelled = true
})
</script>

<template>
  <ChatToolbar :chat-ref="chatRef" />
  <i-chat-messages ref="chatRef"></i-chat-messages>
</template>
