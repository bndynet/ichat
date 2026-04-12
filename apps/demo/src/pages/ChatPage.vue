<script setup>
import { ref, nextTick, onMounted } from 'vue'
import '@bndynet/chat'

const chatRef = ref(null)
let msgId = 0
const nextId = () => 'msg-' + ++msgId

onMounted(async () => {
  await nextTick()
  chatRef.value.addMessage({
    id: nextId(),
    role: 'assistant',
    content: 'Hi there! This is the **complete `<i-chat>`** component. It bundles messages, input, and all renderers in one tag. Try typing a message below!',
    timestamp: Date.now(),
  })
})

function handleSend(e) {
  const content = e.detail.content
  const chat = chatRef.value

  chat.addMessage({ id: nextId(), role: 'user', content, timestamp: Date.now() })

  const aiId = nextId()
  chat.addMessage({ id: aiId, role: 'assistant', content: '', streaming: true, timestamp: Date.now() })

  const reply = `You said: *"${content}"*\n\nThis is a simulated streaming reply from the assistant.`
  let i = 0

  const timer = setInterval(() => {
    i += 3
    if (i >= reply.length) {
      chat.updateMessage(aiId, { content: reply, streaming: false })
      clearInterval(timer)
    } else {
      chat.updateMessage(aiId, { content: reply.slice(0, i), streaming: true })
    }
  }, 30)
}

function handleCancel() {
  chatRef.value.cancel('*— Response stopped —*')
}
</script>

<template>
  <div class="complete-chat-page">
    <i-chat
      ref="chatRef"
      placeholder="Type something…"
      @send="handleSend"
      @cancel="handleCancel"
    />
  </div>
</template>

<style scoped>
.complete-chat-page {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  overflow: hidden;
  padding: 0;
  margin: 0 0 1rem 0;
}

i-chat {
  flex: 1;
  min-height: 0;
  border-radius: 10px;
}
</style>
