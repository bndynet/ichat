<script setup>
import '@bndynet/ichat';
import { onMounted, nextTick, ref } from 'vue'
import { textPart } from '@bndynet/ichat'
import { demoData, nextId } from '../../composables/demo-data.js'

const chatRef = ref(null)

onMounted(async () => {
  await nextTick()
  chatRef.value.addMessage({
    id: nextId(),
    role: 'assistant',
    parts: [textPart(demoData.form)],
    timestamp: Date.now(),
  })
})

function onFormSubmit(e) {
  const md = `Form submitted: \n\`\`\`json\n${JSON.stringify(e.detail, null, 2)}\n\`\`\``;
  console.log(md);
  chatRef.value.addMessage({
    id: nextId(),
    role: 'assistant',
    parts: [textPart(md)],
    timestamp: Date.now(),
  })
}
</script>

<template>
  <i-chat-messages ref="chatRef" @form-submit="onFormSubmit"></i-chat-messages>
</template>
