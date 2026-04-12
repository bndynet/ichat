<script setup>
import '@bndynet/chat';
import { ref, nextTick, onMounted } from 'vue';
import { responseThinking, nextId } from '../../composables/demo-data';

const chatRef = ref(null);

onMounted(async () => {
  await nextTick();
  chatRef.value.addMessage({
    id: nextId(),
    role: 'self',
    content: 'Hi',
    timestamp: Date.now(),
  });
  chatRef.value.addMessage({
    id: nextId(),
    role: 'assistant',
    content: 'Hover over this message to see the actions',
    timestamp: Date.now(),
  });
});

function handleMessageAction(e) {
  console.log(e);
}

function handleSend(e) {
  const content = e.detail.content;
  chatRef.value.addMessage({
    id: nextId(),
    role: 'self',
    content,
    timestamp: Date.now(),
  });
  responseThinking(chatRef);
}
</script>

<template>
  <i-chat
    ref="chatRef"
    @send="handleSend"
    @message-action="handleMessageAction"
  >
    <div slot="message-actions" style="position: relative; top: -1px;">
      <span data-action="like">Like</span> <span data-action="copy">Copy</span>
    </div>
  </i-chat>
</template>
