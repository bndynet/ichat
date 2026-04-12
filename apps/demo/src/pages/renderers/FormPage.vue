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
    content: demoData.form,
    timestamp: Date.now(),
  })
})

function onFormSubmit(e) {
  const md = `Form submitted: \n\`\`\`json\n${JSON.stringify(e.detail, null, 2)}\n\`\`\``;
  console.log(md);
  chatRef.value.addMessage({
    id: nextId(),
    role: 'assistant',
    content: md,
    timestamp: Date.now(),
  })
}
</script>

<template>
  <ChatToolbar :chat-ref="chatRef" />
  <i-chat-messages ref="chatRef" @form-submit="onFormSubmit"></i-chat-messages>
</template>
