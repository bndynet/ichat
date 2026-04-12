<script setup>
import { ElButton } from 'element-plus';
import { nextTick, onMounted, ref } from 'vue';
import '@bndynet/chat';
import {
  addMessage as addChatMessage,
  setStreamingFromDetail,
  reply,
} from '../../composables/demo-data.js';
import ChatToolbar from '../../components/ChatToolbar.vue';

const chatRef = ref(null);

function handleSend(e) {
  const content = e.detail.content;
  reply(chatRef, content);
}

onMounted(async () => {
  await nextTick();
});
</script>

<template>
  <ChatToolbar :streaming="streaming" :chat-ref="chatRef" />
  <i-chat
    ref="chatRef"
    @send="handleSend"
  >
    <div slot="actions">
      <el-button size="small" :icon="Paperclip" text bg @click="onAttachDemo"
        >Attach</el-button
      >
    </div>
  </i-chat>
</template>
