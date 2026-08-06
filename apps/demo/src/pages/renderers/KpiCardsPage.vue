<script setup>
import "@bndynet/ichat";
import "@bndynet/ichat-renderers";
import { onMounted, nextTick, ref } from "vue";
import { textPart } from "@bndynet/ichat";
import { demoData, nextId } from "../../composables/demo-data.js";
import ExampleCodeDrawer from "../../components/ExampleCodeDrawer.vue";
import kpiCardsExample from "../../examples/renderers/kpi-cards.md?raw";

const chatRef = ref(null);

onMounted(async () => {
  await nextTick();
  chatRef.value.addMessage({
    id: nextId(),
    role: "assistant",
    parts: [textPart(demoData.kpis)],
    timestamp: Date.now(),
  });
});
</script>

<template>
  <i-chat-messages ref="chatRef"></i-chat-messages>
  <ExampleCodeDrawer
    title="KPI cards code example"
    :content="kpiCardsExample"
  />
</template>
