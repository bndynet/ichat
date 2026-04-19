<script setup>
import '@bndynet/chat';
import { onMounted, onUnmounted, nextTick, ref } from 'vue'
import { demoData, nextId } from '../../composables/demo-data.js'
import ChatToolbar from '../../components/ChatToolbar.vue'

const chatRef = ref(null)

/** `<i-chat-messages>` ref can lag one or more ticks after mount (custom element upgrade). */
async function waitForChatHost(maxTicks = 30) {
  for (let i = 0; i < maxTicks; i++) {
    const el = chatRef.value
    if (el) return el
    await nextTick()
  }
  return chatRef.value
}

let timelineTimer

onMounted(async () => {
  const host = await waitForChatHost()
  if (!host) return

  const id = nextId()
  host.addMessage({
    id,
    role: 'assistant',
    content: demoData.timeline,
    timestamp: Date.now(),
  })

  const steps = ['active', 'done', 'error'].flatMap((s) =>
    ['build', 'deploy'].flatMap((bid) => [0, 1, 2].map((i) => ({ bid, i, s }))),
  )
  let si = 0
  timelineTimer = setInterval(() => {
    if (si >= steps.length) {
      clearInterval(timelineTimer)
      timelineTimer = undefined
      return
    }
    const current = chatRef.value
    if (!current) {
      clearInterval(timelineTimer)
      timelineTimer = undefined
      return
    }
    const { bid, i, s } = steps[si++]
    current.updateTimeline(id, i, s, bid)
  }, 500)
})

onUnmounted(() => {
  if (timelineTimer != null) clearInterval(timelineTimer)
})
</script>

<template>
  <ChatToolbar :chat-ref="chatRef" />
  <i-chat-messages ref="chatRef"></i-chat-messages>
</template>
