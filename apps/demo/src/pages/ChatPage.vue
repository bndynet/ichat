<script setup>
import { ref, computed, nextTick, onMounted } from 'vue';
import { reply, nextId } from '../composables/demo-data.js';
import '@bndynet/ichat';
import { textPart, getMessageText, makeDaysAgo } from '@bndynet/ichat';
import ChatToolbar from '../components/ChatToolbar.vue';

const loading = ref(true);
const chatRef = ref(null);

const replyDialogVisible = ref(false);
const replyContent = ref('');
const replyTargetMessage = ref(null);

/**
 * Language switcher demo. `en` / `zh-CN` use built-in dictionaries; `ar` (Arabic)
 * shows full RTL layout + an `Intl.PluralRules`-aware `daysAgo` via `makeDaysAgo`.
 */
const LOCALE_OPTIONS = [
  { value: 'en', label: 'English' },
  { value: 'zh-CN', label: '简体中文' },
  { value: 'ar', label: 'العربية (RTL)' },
];

/** Arabic overrides — no built-in dictionary ships for `ar`, so supply labels here. */
const AR_LABELS = {
  composer: {
    placeholder: 'اكتب رسالة…',
    voiceListening: 'يستمع…',
    send: 'إرسال',
    sendTitle: 'إرسال الرسالة',
  },
  reasoning: { thinking: 'يفكر...', reasoning: 'الاستدلال' },
  toolCall: {
    running: 'قيد التشغيل…',
    success: 'نجاح',
    error: 'خطأ',
    argumentsSection: 'الوسائط',
    resultSection: 'النتيجة',
    approve: 'موافقة',
    reject: 'رفض',
    approved: 'تمت الموافقة',
    rejected: 'تم الرفض',
  },
  messages: { empty: 'لا توجد رسائل بعد. ابدأ محادثة!' },
  dateSeparator: {
    today: 'اليوم',
    yesterday: 'أمس',
    older: 'أقدم',
    // Arabic has multiple plural forms — Intl.PluralRules picks the right one.
    daysAgo: makeDaysAgo('ar', {
      few: (n) => `قبل ${n} أيام`,
      many: (n) => `قبل ${n} يومًا`,
      other: (n) => `قبل ${n} يوم`,
    }),
  },
};

const locale = ref('zh-CN');
const chatConfig = computed(() =>
  locale.value === 'ar' ? { locale: 'ar', labels: AR_LABELS } : { locale: locale.value },
);
const dir = computed(() => (locale.value === 'ar' ? 'rtl' : 'ltr'));

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
      parts: [
        textPart(
          '**Date separators** — this message is **8+ calendar days** old, so the divider shows **Older**. English is the default; set **config.locale** to **zh-CN** for Chinese labels.',
        ),
      ],
      timestamp: timestampDaysAgo(12),
    });
    chat.addMessage({
      id: nextId(),
      role: 'peer',
      parts: [
        textPart(
          '**7 days ago** — dividers update when the day bucket changes (see **7 days ago** label).',
        ),
      ],
      timestamp: timestampDaysAgo(7),
    });
    chat.addMessage({
      id: nextId(),
      role: 'peer',
      parts: [
        textPart(
          '**3 days ago** — between **2** and **7** days the label is **N days ago**.',
        ),
      ],
      timestamp: timestampDaysAgo(3),
    });
    chat.addMessage({
      id: nextId(),
      role: 'peer',
      parts: [textPart('**Yesterday** — previous calendar day.')],
      timestamp: timestampDaysAgo(1),
    });
    chat.addMessage({
      id: nextId(),
      role: 'assistant',
      parts: [
        textPart(
          'Hi there! This is the **complete `<i-chat>`** component. It bundles messages, input, and all renderers in one tag. Try typing a message below!\n\n' +
            'The next **three self rows** demo per-message `avatar`: HTTP URL, `data:image/png;base64,…`, and inline `<svg>`.',
        ),
      ],
      timestamp: Date.now(),
    });
    chat.addMessage({
      id: nextId(),
      role: 'self',
      parts: [textPart('**HTTP URL** — `avatar` is an image URL.')],
      timestamp: Date.now(),
      avatar: 'https://static.bndy.net/images/logo.png',
    });
    chat.addMessage({
      id: nextId(),
      role: 'peer',
      parts: [
        textPart(
          '**Data URL** — `data:image/png;base64,…` (embedded 64×64 person icon).',
        ),
      ],
      timestamp: Date.now(),
      avatar: DEMO_PNG_DATA_URL,
    });
    chat.addMessage({
      id: nextId(),
      role: 'peer',
      parts: [textPart('**Inline SVG** — `avatar` is a full `<svg>…</svg>` string.')],
      timestamp: Date.now(),
      avatar: DEMO_INLINE_SVG_AVATAR,
    });
    chat.addMessage({
      id: nextId(),
      role: 'peer',
      parts: [
        textPart(
          '**Peer** — `role: "peer"` is for another human (left-aligned). Theme with `--chat-peer-*` (defaults match assistant until overridden).',
        ),
      ],
      timestamp: Date.now(),
    });
    chat.addMessage({
      id: nextId(),
      role: 'assistant',
      parts: [
        textPart(
          '**Embedded form** — submit the fields below. The page listens for **`form-submit`** on `<i-chat>` and echoes the payload as the next row.\n\n```form\n{\n  "id": "demo-contact",\n  "title": "Quick feedback",\n  "submitLabel": "Send",\n  "fields": [\n    { "name": "topic", "label": "Topic", "type": "text", "placeholder": "e.g. UI" },\n    { "name": "note", "label": "Note", "type": "textarea" }\n  ]\n}\n```',
        ),
      ],
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

function openReplyDialog(message) {
  replyTargetMessage.value = message;
  replyContent.value = '';
  replyDialogVisible.value = true;
}

function cancelReplyDialog() {
  replyDialogVisible.value = false;
  replyTargetMessage.value = null;
  replyContent.value = '';
}

function confirmReplyDialog() {
  const message = replyTargetMessage.value;
  const content = replyContent.value.trim();
  if (!message || !content) return;

  const isSelf = Math.random() > 0.5;
  chatRef.value.replyMessage(message.id, {
    id: nextId(),
    parts: [textPart(content)],
    avatar: isSelf ? DEMO_PNG_DATA_URL : DEMO_INLINE_SVG_AVATAR,
    role: isSelf ? 'self' : 'peer',
    timestamp: Date.now(),
  });
  cancelReplyDialog();
}

/** `message-action` — `data-action` from the `message-actions` slot. */
function handleMessageAction(e) {
  const { action, message } = e.detail;
  if (action === 'reply') {
    openReplyDialog(message);
  } else if (action === 'copy') {
    navigator.clipboard?.writeText(getMessageText(message));
  } else if (action === 'clear-reply') {
    chatRef.value.clearReplyMessage(message.id);
  }
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
    parts: [
      textPart(
        `**form-submit** — \`${formId}\`${title ? ` — *${title}*` : ''}\n\n**messageId:** \`${messageId}\`${msgMeta}\n\n\`\`\`json\n${preview}\n\`\`\``,
      ),
    ],
    timestamp: Date.now(),
  });
}
</script>

<template>
  <div class="demo-chat-bar">
    <div class="demo-chat-bar__locale">
      <span class="demo-chat-bar__label">Language</span>
      <el-radio-group v-model="locale" size="small">
        <el-radio-button
          v-for="opt in LOCALE_OPTIONS"
          :key="opt.value"
          :value="opt.value"
        >
          {{ opt.label }}
        </el-radio-button>
      </el-radio-group>
    </div>
    <ChatToolbar :chat-ref="chatRef" />
  </div>
  <i-chat
    ref="chatRef"
    :config="chatConfig"
    :dir="dir"
    voice-lang="zh-CN"
    :voice-diagnostics="true"
    @send="handleSend"
    @cancel="handleCancel"
    @form-submit="handleFormSubmit"
    @voice-input="handleVoiceInput"
    @message-action="handleMessageAction"
  >
    <div slot="empty" style="text-align: center">
      <h2 v-if="loading">Fetching history messages...</h2>
      <h2 v-else>Start chatting...</h2>
    </div>
    <div slot="message-actions" style="position: relative; top: -3px;">
      <span data-action="reply" title="Reply">Reply</span>
      <span data-action="copy" title="Copy">Copy</span>
      <span data-action="clear-reply" title="Clear Reply">Clear Reply</span>
    </div>
  </i-chat>

  <el-dialog
    v-model="replyDialogVisible"
    title="Reply"
    width="420px"
    :close-on-click-modal="false"
    @closed="cancelReplyDialog"
  >
    <el-input
      v-model="replyContent"
      type="textarea"
      :rows="4"
      placeholder="Enter reply content…"
      autofocus
      @keydown.ctrl.enter="confirmReplyDialog"
    />
    <template #footer>
      <el-button @click="cancelReplyDialog">Cancel</el-button>
      <el-button
        type="primary"
        :disabled="!replyContent.trim()"
        @click="confirmReplyDialog"
      >
        Send reply
      </el-button>
    </template>
  </el-dialog>
</template>

<style scoped>
.demo-chat-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 8px 12px;
  margin: 0 0 8px 0;
  border-radius: 8px;
  border: 1px dashed var(--el-border-color, #dcdfe6);
  background: var(--el-fill-color-light, #f5f7fa);
}

.demo-chat-bar__locale {
  display: flex;
  align-items: center;
  gap: 10px;
}

.demo-chat-bar__label {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--el-text-color-secondary, #909399);
}
</style>
