<script setup>
import { ElButton } from 'element-plus';
import { Paperclip } from '@element-plus/icons-vue';
import { nextTick, onMounted, ref } from 'vue';
import '@bndynet/ichat';
import { reply } from '../../composables/demo-data.js';
import ExampleCodeDrawer from '../../components/ExampleCodeDrawer.vue';
import inputActionsExample from '../../examples/slots/input-actions.md?raw';

const chatRef = ref(null);

function handleSend(e) {
  const content = e.detail.content;
  reply(chatRef, content);
}

function onAttachDemo() {
  console.info('[SlotsInputActions] Attach requested');
}

onMounted(async () => {
  await nextTick();
});
</script>

<template>
  <i-chat ref="chatRef" @send="handleSend">
    <div slot="actions">
      <el-button size="small" :icon="Paperclip" text bg @click="onAttachDemo">Attach</el-button>
    </div>
  </i-chat>
  <ExampleCodeDrawer title="Input actions code example" :content="inputActionsExample" />
</template>
