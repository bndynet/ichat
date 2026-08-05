<script setup>
import '@bndynet/ichat';
import '@bndynet/ichat-renderers';
import { onMounted, nextTick, ref } from 'vue'
import { textPart } from '@bndynet/ichat'
import { demoData, nextId } from '../../composables/demo-data.js'
import ExampleCodeDrawer from '../../components/ExampleCodeDrawer.vue'
import kpiGroupExample from '../../examples/renderers/kpi-group.md?raw'

const chatRef = ref(null)

onMounted(async () => {
  await nextTick()
  chatRef.value.addMessage({
    id: nextId(),
    role: 'assistant',
    parts: [textPart(demoData.kpiGroup)],
    timestamp: Date.now(),
  })
})
</script>

<template>
  <i-chat-messages ref="chatRef"></i-chat-messages>
  <ExampleCodeDrawer title="KPI group code example" :content="kpiGroupExample" />
</template>
