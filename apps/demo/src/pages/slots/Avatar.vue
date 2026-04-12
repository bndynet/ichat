<script setup>
import '@bndynet/chat';
import { ref, nextTick, onMounted } from 'vue';
import { nextId } from '../../composables/demo-data.js';

const chatRef = ref(null);

onMounted(async () => {
  await nextTick();
  chatRef.value.addMessage({
    id: nextId(),
    role: 'assistant',
    content: 'Hello from assistant',
  });
  chatRef.value.addMessage({
    id: nextId(),
    role: 'peer',
    content: 'Hello from peer',
  });
  chatRef.value.addMessage({
    id: nextId(),
    avatar: 'https://static.bndy.net/images/logo_white_blue_circle.svg',
    role: 'peer',
    content: 'Hello from your friend',
  });
  setTimeout(() => {}, 5000);
});

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
  <i-chat ref="chatRef" @send="handleSend" @message-action="handleMessageAction">
    <!-- avatar slots -->
    <div slot="self-avatar">
      <img
        src="https://static.bndy.net/images/logo.png"
        style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover"
        alt=""
      />
    </div>
    <div slot="assistant-avatar">
      <div
        style="
          background: linear-gradient(135deg, #f093fb, #f5576c);
          width: 100%;
          height: 100%;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #fff;
        "
      >
        AI
      </div>
    </div>
    <div slot="peer-avatar">
      <div
        style="
          background: linear-gradient(135deg, #0ea5e9, #06b6d4);
          width: 100%;
          height: 100%;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #fff;
        "
      >
        Peer
      </div>
    </div>

    <!-- empty slots -->
    <div slot="empty" style="text-align: center">
      <h2>Welcome!</h2>
      <p>
        Start a conversation below. You will see your avatar on the right side
        and the other user's avatar on the left side.
      </p>
    </div>
  </i-chat>
</template>
