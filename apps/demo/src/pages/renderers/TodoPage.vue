<script setup>
import '@bndynet/ichat'
import { nextTick, onMounted, onUnmounted, ref } from 'vue'
import { textPart, todoPart } from '@bndynet/ichat'
import { nextId } from '../../composables/demo-data.js'

const chatRef = ref(null)
const timers = []
const after = (ms, callback) => timers.push(setTimeout(callback, ms))

async function waitForChatHost(maxTicks = 30) {
  for (let i = 0; i < maxTicks; i++) {
    if (chatRef.value) return chatRef.value
    await nextTick()
  }
  return chatRef.value
}

onMounted(async () => {
  const chat = await waitForChatHost()
  if (!chat) return

  const messageId = nextId()
  chat.addMessage({
    id: messageId,
    role: 'assistant',
    timestamp: Date.now(),
    parts: [
      textPart('I will work through this plan and keep it up to date.'),
      todoPart(
        [
          { id: 'model', title: 'Define the todo data model', status: 'done' },
          { id: 'panel', title: 'Build the collapsible chat panel', status: 'active' },
          { id: 'events', title: 'Connect status update events', status: 'pending' },
          { id: 'docs', title: 'Document the public API', status: 'pending' },
          { id: 'verify', title: 'Verify the production build', status: 'pending' },
        ],
        { id: 'todo-plan', status: 'streaming' },
      ),
    ],
  })

  // Simulate two ordered backend/SSE updates with monotonic revisions.
  after(1200, () => chat.updateTodoItem(messageId, 'todo-plan', 'panel', { status: 'done' }, 1))
  after(1600, () => chat.updateTodoItem(messageId, 'todo-plan', 'events', { status: 'active' }, 2))
})

onUnmounted(() => timers.forEach(clearTimeout))

/** Status-button requests are authoritative only after the host applies them. */
function handleTodoAction(event) {
  const { messageId, part, itemId, status } = event.detail
  chatRef.value?.updateTodoItem(messageId, part.id, itemId, { status })
}
</script>

<template>
  <i-chat ref="chatRef" @todo-action="handleTodoAction"></i-chat>
</template>
