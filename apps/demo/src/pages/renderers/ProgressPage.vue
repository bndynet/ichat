<script setup>
import '@bndynet/ichat';
import { onMounted, onUnmounted, nextTick, ref } from 'vue'
import { textPart } from '@bndynet/ichat'
import { demoData, nextId } from '../../composables/demo-data.js'
import ExampleCodeDrawer from '../../components/ExampleCodeDrawer.vue'
import progressExample from '../../examples/renderers/progress.md?raw'

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

let progressTimer

onMounted(async () => {
  const host = await waitForChatHost()
  if (!host) return

  const id = nextId()
  host.addMessage({
    id,
    role: 'assistant',
    parts: [textPart(demoData.progress)],
    timestamp: Date.now(),
  })

  const steps = ['active', 'done', 'error'].flatMap((s) =>
    ['build', 'deploy'].flatMap((bid) => [1, 2, 3].map((step) => ({ bid, step, s }))),
  )
  let si = 0
  progressTimer = setInterval(() => {
    if (si >= steps.length) {
      clearInterval(progressTimer)
      progressTimer = undefined
      return
    }
    const current = chatRef.value
    if (!current) {
      clearInterval(progressTimer)
      progressTimer = undefined
      return
    }
    const { bid, step, s } = steps[si++]
    current.updateProgressStep(id, step, s, bid)
  }, 500)
})

onUnmounted(() => {
  if (progressTimer != null) clearInterval(progressTimer)
})
</script>

<template>
  <i-chat-messages ref="chatRef"></i-chat-messages>
  <ExampleCodeDrawer title="Progress code example" :content="progressExample" />
</template>
