<script setup>
import "@bndynet/ichat";
import { onMounted, nextTick, ref } from "vue";
import { textPart } from "@bndynet/ichat";
import { demoData, nextId } from "../../composables/demo-data.js";
import ExampleCodeDrawer from "../../components/ExampleCodeDrawer.vue";
import detailsExample from "../../examples/renderers/details.md?raw";

const chatRef = ref(null);

onMounted(async () => {
  await nextTick();
  chatRef.value.addMessage({
    id: nextId(),
    role: "assistant",
    parts: [
      textPart(`${demoData.detailsFence}\n\n${demoData.detailsContainer}`),
    ],
    timestamp: Date.now(),
  });
});
</script>

<template>
  <i-chat-messages ref="chatRef"></i-chat-messages>
  <ExampleCodeDrawer title="Details code example" :content="detailsExample" />
</template>
