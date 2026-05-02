<script setup>
import { ref, nextTick, onMounted } from 'vue';
import { reply, nextId } from '../composables/demo-data.js';
import '@bndynet/chat';
import ChatToolbar from '../components/ChatToolbar.vue';

const loading = ref(true);
const chatRef = ref(null);
/** Default English; switch to `{ locale: 'zh-CN' }` to demo Chinese separators */
const chatConfig = { locale: 'zh-CN' };

/** 64×64 PNG (person silhouette) — valid `data:image/png;base64,…` for avatar demo */
const DEMO_PNG_DATA_URL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAA9klEQVR42u3ZQQ6DIBCF4blXb9fj9D69Sre4bZqiKAzO8P6XsBR8nxI1mhFCyI0p71eRKts6ZIsvB9FTPj3CiPJpEUaWT4fgUT4Ngmf5FAjSADPKh0YAAAAAdAFmlgeBLQBADIDH81O+x0yA37UBiAAwC+HfulLbIEz5O+6CUFe/BuCFUFsr3NPAAyFs+T2AUQh784cH6EU4mjvMW+DRiZ6FaJkv1GtwywnXUK4euwRAzwj3MSRdHgAA5iGE/jMEgDqAN4JliDyAF4JlCgDqAKMRLGMAUAcYhWCZA4A6QC+CrRAA1AGuIthKAUAd4CyCEUIIIe7ZAFXVGuWAntoXAAAAAElFTkSuQmCC';

const DEMO_INLINE_SVG_AVATAR =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32"><circle cx="16" cy="16" r="14" fill="#f59e0b"/><text x="16" y="20" text-anchor="middle" font-size="12" fill="#fff" font-family="system-ui,sans-serif">S</text></svg>';

/** Local noon N calendar days before today — stable demo timestamps for date separators */
function timestampDaysAgo(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(12, 0, 0, 0);
  return d.getTime();
}

onMounted(async () => {
  await nextTick();
  const chat = chatRef.value;
  setTimeout(() => {
    chat.addMessage({
      id: nextId(),
      role: 'peer',
      content:
        '**Date separators** — this message is **8+ calendar days** old, so the divider shows **Older**. English is the default; set **config.locale** to **zh-CN** for Chinese labels.',
      timestamp: timestampDaysAgo(12),
    });
    chat.addMessage({
      id: nextId(),
      role: 'peer',
      content:
        '**7 days ago** — dividers update when the day bucket changes (see **7 days ago** label).',
      timestamp: timestampDaysAgo(7),
    });
    chat.addMessage({
      id: nextId(),
      role: 'peer',
      content:
        '**3 days ago** — between **2** and **7** days the label is **N days ago**.',
      timestamp: timestampDaysAgo(3),
    });
    chat.addMessage({
      id: nextId(),
      role: 'peer',
      content: '**Yesterday** — previous calendar day.',
      timestamp: timestampDaysAgo(1),
    });
    chat.addMessage({
      id: nextId(),
      role: 'assistant',
      content:
        'Hi there! This is the **complete `<i-chat>`** component. It bundles messages, input, and all renderers in one tag. Try typing a message below!\n\n' +
        'The next **three self rows** demo per-message `avatar`: HTTP URL, `data:image/png;base64,…`, and inline `<svg>`.',
      timestamp: Date.now(),
    });
    chat.addMessage({
      id: nextId(),
      role: 'self',
      content: '**HTTP URL** — `avatar` is an image URL.',
      timestamp: Date.now(),
      avatar: 'https://static.bndy.net/images/logo.png',
    });
    chat.addMessage({
      id: nextId(),
      role: 'peer',
      content:
        '**Data URL** — `data:image/png;base64,…` (embedded 64×64 person icon).',
      timestamp: Date.now(),
      avatar: DEMO_PNG_DATA_URL,
    });
    chat.addMessage({
      id: nextId(),
      role: 'peer',
      content: '**Inline SVG** — `avatar` is a full `<svg>…</svg>` string.',
      timestamp: Date.now(),
      avatar: DEMO_INLINE_SVG_AVATAR,
    });
    chat.addMessage({
      id: nextId(),
      role: 'peer',
      content:
        '**Peer** — `role: "peer"` is for another human (left-aligned). Theme with `--chat-peer-*` (defaults match assistant until overridden).',
      timestamp: Date.now(),
    });
    chat.addMessage({
      id: nextId(),
      role: 'assistant',
      content:
        '**Embedded form** — submit the fields below. The page listens for **`form-submit`** on `<i-chat>` and echoes the payload as the next row.\n\n```form\n{\n  "id": "demo-contact",\n  "title": "Quick feedback",\n  "submitLabel": "Send",\n  "fields": [\n    { "name": "topic", "label": "Topic", "type": "text", "placeholder": "e.g. UI" },\n    { "name": "note", "label": "Note", "type": "textarea" }\n  ]\n}\n```',
      timestamp: Date.now(),
    });

    loading.value = false;
  }, 3000);
});

function handleSend(e) {
  const content = e.detail.content;
  reply(chatRef, content);
}

function handleCancel() {
  chatRef.value.cancel('*— Response stopped —*');
}

/** Web Speech API diagnostics from `<i-chat-input>` (bubbles + composed). */
function handleVoiceInput(e) {
  console.log('[ChatPage voice-input]', e.detail);
  if (e.detail?.kind === 'error' && e.detail?.code === 'network') {
    console.warn('[ChatPage] Voice `network`:', e.detail.hint ?? 'Cannot reach speech service — check network / VPN / firewall.');
  }
}

/** `form-submit` — `detail` has `formId`, `title`, `values`, `messageId`, `message` (full row). */
function handleFormSubmit(e) {
  console.log('form submit:', e.detail);
  const { formId, title, values, messageId, message } = e.detail;
  const chat = chatRef.value;
  const preview = JSON.stringify(values, null, 2);
  const msgMeta =
    message != null
      ? `\n\n**message** — \`id\`: \`${message.id}\`, \`role\`: \`${message.role}\``
      : '';
  chat.addMessage({
    id: nextId(),
    role: 'assistant',
    content: `**form-submit** — \`${formId}\`${title ? ` — *${title}*` : ''}\n\n**messageId:** \`${messageId}\`${msgMeta}\n\n\`\`\`json\n${preview}\n\`\`\``,
    timestamp: Date.now(),
  });
}
</script>

<template>
  <ChatToolbar :chat-ref="chatRef" />
  <i-chat
    ref="chatRef"
    :config="chatConfig"
    placeholder="Type something…"
    voice-lang="zh-CN"
    :voice-diagnostics="true"
    @send="handleSend"
    @cancel="handleCancel"
    @form-submit="handleFormSubmit"
    @voice-input="handleVoiceInput"
  >
    <div slot="empty" style="text-align: center">
      <h2 v-if="loading">Fetching history messages...</h2>
      <h2 v-else>Start chatting...</h2>
    </div>
  </i-chat>
</template>
