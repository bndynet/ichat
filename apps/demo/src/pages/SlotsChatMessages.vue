<script setup>
import { nextTick, onMounted } from 'vue'
import { useChatDemo } from '../composables/useChatDemo.js'
import DemoChatToolbar from '../components/DemoChatToolbar.vue'

/**
 * Vue's template compiler does not emit valid codegen for `v-slot` on native
 * custom elements (`<i-chat-messages>`). We append slotted light-DOM nodes in
 * onMounted — same mechanism Lit uses (see chat-messages.ts _readLightDomSlots).
 *
 * Slot HTML is copied into shadow roots; use inline styles so content is visible
 * inside closed shadow trees.
 */
function runInit({ clear, addMessage }) {
  clear()
  addMessage({
    role: 'user',
    content: 'Demonstrating `user-avatar` and bubbles.',
  })
  addMessage({
    role: 'assistant',
    reasoning:
      'The reasoning header comes from the `reasoning-header` slot; collapse behaviour and body content are still handled by the component.',
    content:
      '## Customizable slots on `<i-chat-messages>`\n\n' +
      '| Slot | Purpose |\n' +
      '| --- | --- |\n' +
      '| `user-avatar` | User message avatar (HTML template) |\n' +
      '| `assistant-avatar` | Assistant message avatar (HTML template) |\n' +
      '| `message-actions` | Footer actions on assistant messages; use `data-action` on children to fire `message-action` |\n' +
      '| `reasoning-header` | HTML for the reasoning block title area |\n' +
      '| `empty` | Empty state when there are no messages (override default copy with the `empty-text` attribute) |\n\n' +
      'The **Like** and **Copy** icon buttons below come from the `message-actions` slot (shown for assistant messages after streaming finishes).',
  })
}

function installChatSlots(host) {
  const slots = [
    [
      'user-avatar',
      `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;border-radius:999px;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;font-size:12px;font-weight:700">You</div>`,
    ],
    [
      'assistant-avatar',
      `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;border-radius:999px;background:#0f766e;color:#ecfdf5" aria-hidden="true"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a2 2 0 012 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 017 7h1v2h-1v1a2 2 0 01-2 2H5a2 2 0 01-2-2v-1H2v-2h1a7 7 0 017-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 012-2zM7.5 13a1.5 1.5 0 100 3 1.5 1.5 0 000-3zm9 0a1.5 1.5 0 100 3 1.5 1.5 0 000-3z"/></svg></div>`,
    ],
    [
      'reasoning-header',
      '<span style="display:inline-flex;align-items:center;gap:0.35em"><span style="opacity:0.9">◆</span>Reasoning (custom title)</span>',
    ],
    [
      'message-actions',
      '<button type="button" data-action="like" aria-label="Like" title="Like" style="display:inline-flex;align-items:center;justify-content:center;width:2rem;height:2rem;padding:0;border-radius:6px;border:1px solid var(--chat-border,#e5e7eb);background:var(--chat-surface-alt,#f0f2f5);color:var(--chat-text-secondary,#6b7280);cursor:pointer"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 10v12"/><path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z"/></svg></button>' +
        '<button type="button" data-action="copy" aria-label="Copy" title="Copy" style="display:inline-flex;align-items:center;justify-content:center;width:2rem;height:2rem;padding:0;margin-left:0.35rem;border-radius:6px;border:1px solid var(--chat-border,#e5e7eb);background:var(--chat-surface,#fff);color:var(--chat-text-secondary,#6b7280);cursor:pointer"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg></button>',
    ],
    [
      'empty',
      '<div style="padding:2rem 1.25rem;text-align:center;color:var(--chat-text-muted,#9ca3af);font-size:14px;line-height:1.5"><div style="font-size:32px;line-height:1;margin-bottom:0.5rem" aria-hidden="true">📋</div><div>No messages yet — this page customizes the empty state via the <code style="font-size:0.9em">empty</code> slot</div></div>',
    ],
  ]
  for (const [name, html] of slots) {
    const el = document.createElement('div')
    el.setAttribute('slot', name)
    el.innerHTML = html
    host.appendChild(el)
  }
}

const {
  chatRef,
  streaming,
  runErrorMessage,
  addMessage,
  cancelStreaming,
  clear,
  showErrorBanner,
  onStreamingChange,
  onMessageAction,
} = useChatDemo()

onMounted(async () => {
  await nextTick()
  const host = chatRef.value
  if (host) installChatSlots(host)
  runInit({ clear, addMessage })
})
</script>

<template>
  <div class="chat-demo-layout">
    <DemoChatToolbar
      :streaming="streaming"
      @error-message="runErrorMessage"
      @error-banner="showErrorBanner"
      @cancel-stream="cancelStreaming"
      @clear="clear"
    />
    <div class="chat-wrapper">
      <i-chat-messages
        ref="chatRef"
        class="chat"
        @streaming-change="onStreamingChange"
        @message-action="onMessageAction"
      />
    </div>
  </div>
</template>

<style scoped>
.chat-demo-layout {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.chat-wrapper {
  flex: 1 1 auto;
  overflow: hidden;
  min-height: 0;
  padding: 0;
  margin: 0 0 1rem 0;
  box-sizing: border-box;
}

.chat {
  height: 100%;
  border-radius: 10px;
}
</style>
