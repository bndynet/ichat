<script setup>
import '@bndynet/chat';
import { onMounted, nextTick, ref } from 'vue'
import { demoData, nextId } from '../../composables/demo-data.js'
import ChatToolbar from '../../components/ChatToolbar.vue'

const chatRef = ref(null)

onMounted(async () => {
  await nextTick()
  console.log(demoData.mermaid)
  chatRef.value.addMessage({
    id: nextId(),
    role: 'assistant',
    content: demoData.mermaid,
    timestamp: Date.now(),
  })
})
</script>

<template>
  <p class="mermaid-demo-hint">
    Mermaid colors come from optional <code>--chat-mermaid-*</code> tokens in
    <code>apps/demo/styles.css</code> (teal accent + mint block fills in light, emerald tones in dark).
    Remove that block to fall back to normal <code>--chat-*</code> only.
  </p>
  <ChatToolbar :chat-ref="chatRef" />
  <i-chat-messages ref="chatRef"></i-chat-messages>
</template>

<style scoped>
.mermaid-demo-hint {
  margin: 0 0 0.75rem;
  padding: 0.5rem 0.75rem;
  font-size: 0.8125rem;
  line-height: 1.45;
  color: var(--chat-text-secondary, #64748b);
  background: var(--chat-surface-alt, #f1f5f9);
  border-radius: 6px;
  border: 1px solid var(--chat-border, #e2e8f0);
}
.mermaid-demo-hint code {
  font-size: 0.8em;
}
</style>
