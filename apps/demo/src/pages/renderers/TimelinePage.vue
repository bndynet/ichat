<script setup>
import '@bndynet/chat';
import { onMounted, nextTick, ref } from 'vue'
import { demoData, nextId } from '../../composables/demo-data.js'
import ChatToolbar from '../../components/ChatToolbar.vue'

const chatRef = ref(null)

onMounted(async () => {
  await nextTick()
  const id = nextId();
  chatRef.value.addMessage({
    id,
    role: 'assistant',
    content: demoData.timeline,
    timestamp: Date.now(),
  })

  const steps = ['active', 'done', 'error'].flatMap((s) =>
    ['build', 'deploy'].flatMap((bid) => [0, 1, 2].map((i) => ({ bid, i, s }))),
  );
  let si = 0;
  const t = setInterval(() => {
    if (si >= steps.length) {
      clearInterval(t);
      return;
    }
    const { bid, i, s } = steps[si++];
    chatRef.value.updateTimeline(id, i, s, bid);
  }, 500);
})
</script>

<template>
  <ChatToolbar :chat-ref="chatRef" />
  <i-chat-messages ref="chatRef"></i-chat-messages>
</template>
