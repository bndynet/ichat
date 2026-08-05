<script setup>
import '@bndynet/ichat';
import '@bndynet/ichat-renderers';
import { onMounted, nextTick, ref } from 'vue'
import { textPart } from '@bndynet/ichat'
import { demoData, nextId } from '../../composables/demo-data.js'
import ExampleCodeDrawer from '../../components/ExampleCodeDrawer.vue'
import formExample from '../../examples/renderers/form.md?raw'

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

function onPartAction(e) {
  if (e.detail?.kind !== 'form') return
  const md = `Form submitted via part-action: \n\`\`\`json\n${JSON.stringify(e.detail.payload, null, 2)}\n\`\`\``;
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
  <i-chat-messages ref="chatRef" @part-action="onPartAction"></i-chat-messages>
  <ExampleCodeDrawer title="Form code example" :content="formExample" />
</template>
