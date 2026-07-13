<script setup>
import '@bndynet/ichat';
import { nextTick, onMounted, ref } from 'vue';
import { textPart } from '@bndynet/ichat';
import { nextId } from '../../composables/demo-data.js';
import ExampleCodeDrawer from '../../components/ExampleCodeDrawer.vue';
import confirmationExample from '../../examples/renderers/confirmation.md?raw';

const chatRef = ref(null);
const draft = ref('');
const useCustomInput = ref(false);
const activeTitle = ref('');
const queueLength = ref(0);
const lastDecision = ref('No confirmation yet');

const chatConfig = {
  locale: 'zh-CN',
};

function addMessage(role, text) {
  const chat = chatRef.value;
  if (!chat) return;
  chat.addMessage({
    id: nextId(),
    role,
    parts: [textPart(text)],
    timestamp: Date.now(),
  });
}

async function waitForChatHost(maxTicks = 30) {
  for (let i = 0; i < maxTicks; i++) {
    if (chatRef.value) return chatRef.value;
    await nextTick();
  }
  return chatRef.value;
}

onMounted(async () => {
  await waitForChatHost();
  addMessage(
    'assistant',
    'Confirmation demo. Use the switch above the chat to compare the default composer with a custom `slot="input"` composer. In both modes, the confirmation panel replaces the input area while active.',
  );
});

function handleSend(e) {
  const content = e.detail.content;
  addMessage('self', content);
  setTimeout(() => {
    addMessage('assistant', `Echo: ${content}`);
  }, 350);
}

function sendDraft() {
  const content = draft.value.trim();
  const chat = chatRef.value;
  if (!content || !chat) return;
  chat.dispatchEvent(
    new CustomEvent('send', {
      detail: { content },
      bubbles: true,
      composed: true,
    }),
  );
  draft.value = '';
}

function handleConfirmationChange(e) {
  activeTitle.value = e.detail.active?.title ?? '';
  queueLength.value = e.detail.queueLength;
}

function handleConfirmationDecision(e) {
  const result = e.detail;
  lastDecision.value = `${result.request.title}: ${result.action}`;
}

async function requestAndReport(label, request) {
  const chat = chatRef.value;
  if (!chat) return;
  const result = await chat.requestConfirmation(request);
  addMessage(
    'assistant',
    `**${label}** was **${result.confirmed ? 'confirmed' : 'cancelled'}**.\n\n\`\`\`json\n${JSON.stringify(result.request.details ?? {}, null, 2)}\n\`\`\``,
  );
}

function requestDefaultConfirmation() {
  void requestAndReport('Data refresh', {
    title: 'Run data refresh?',
    description: 'The app generated this copy from a trusted action schema.',
    details: {
      action: 'refresh_dashboard',
      rows: 1284,
      source: 'warehouse.daily_metrics',
    },
    confirmLabel: 'Run',
    cancelLabel: 'Skip',
  });
}

function requestDangerConfirmation() {
  void requestAndReport('Delete report', {
    title: 'Delete generated report?',
    description: 'This is a destructive action. The primary copy is owned by the app, not the model.',
    details: {
      action: 'delete_file',
      path: '/tmp/reports/q2-draft.pdf',
      irreversible: true,
    },
    confirmLabel: 'Delete',
    variant: 'danger',
  });
}

function requestQueuedConfirmations() {
  void requestAndReport('Archive thread', {
    title: 'Archive old thread?',
    description: 'This is the first queued confirmation.',
    details: { action: 'archive_thread', threadId: 'thread_001' },
    confirmLabel: 'Archive',
  });
  void requestAndReport('Send summary', {
    title: 'Send summary email?',
    description: 'This waits behind the archive confirmation.',
    details: { action: 'send_email', to: 'team@example.com' },
    confirmLabel: 'Send',
  });
  void requestAndReport('Sync files', {
    title: 'Sync files to workspace?',
    description: 'This is the third queued confirmation.',
    details: { action: 'sync_files', count: 6 },
    confirmLabel: 'Sync',
  });
}
</script>

<template>
  <div class="confirmation-demo-bar">
    <div class="confirmation-demo-actions">
      <el-switch
        v-model="useCustomInput"
        size="small"
        active-text="Custom input"
        inactive-text="Default input"
      />
      <el-button size="small" type="primary" @click="requestDefaultConfirmation">
        Normal
      </el-button>
      <el-button size="small" type="danger" @click="requestDangerConfirmation">
        Danger
      </el-button>
      <el-button size="small" @click="requestQueuedConfirmations">
        Queue 3
      </el-button>
    </div>
    <div class="confirmation-demo-status">
      <span>Active: {{ activeTitle || 'none' }}</span>
      <span>Queue: {{ queueLength }}</span>
      <span>Input: {{ useCustomInput ? 'custom slot' : 'default composer' }}</span>
      <span>{{ lastDecision }}</span>
    </div>
  </div>

  <i-chat
    ref="chatRef"
    :config="chatConfig"
    @send="handleSend"
    @confirmation-change="handleConfirmationChange"
    @confirmation-decision="handleConfirmationDecision"
  >
    <div v-if="useCustomInput" slot="input" class="confirmation-composer">
      <div class="confirmation-composer__label">Custom composer</div>
      <textarea
        v-model="draft"
        class="confirmation-composer__textarea"
        rows="1"
        placeholder="This custom input is replaced while confirmation is active."
        @keydown.enter.exact.prevent="sendDraft"
      />
      <div class="confirmation-composer__toolbar">
        <el-button size="small" text bg @click="draft += (draft ? ' ' : '') + '[file]'">
          Attach
        </el-button>
        <el-button
          size="small"
          type="primary"
          :disabled="!draft.trim()"
          @click="sendDraft"
        >
          Send
        </el-button>
      </div>
    </div>
  </i-chat>
  <ExampleCodeDrawer title="Confirmation code example" :content="confirmationExample" />
</template>

<style scoped>
.confirmation-demo-bar {
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

.confirmation-demo-actions,
.confirmation-demo-status {
  display: flex;
  align-items: center;
  gap: 8px;
}

.confirmation-demo-status {
  flex-wrap: wrap;
  color: var(--el-text-color-secondary, #606266);
  font-size: 12px;
}

.confirmation-composer {
  margin: 0 -1rem -1rem -1rem;
  padding: 12px 16px 16px;
  border-top: 1px solid var(--chat-border, #e5e7eb);
  background: var(--el-fill-color-light, #f5f7fa);
}

.confirmation-composer__label {
  margin-bottom: 8px;
  color: var(--el-text-color-secondary, #606266);
  font-size: 12px;
  font-weight: 700;
}

.confirmation-composer__textarea {
  box-sizing: border-box;
  display: block;
  width: 100%;
  min-height: 44px;
  max-height: 150px;
  padding: 10px 12px;
  resize: vertical;
  border: 1px solid var(--chat-border, #e5e7eb);
  border-radius: var(--chat-radius, 8px);
  background: var(--chat-input-bg, var(--chat-surface, #fff));
  color: var(--chat-text, #1a1a2e);
  font: inherit;
  font-size: 14px;
  line-height: 1.45;
}

.confirmation-composer__textarea:focus {
  outline: none;
  border-color: var(--chat-primary, #2563eb);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--chat-primary, #2563eb) 20%, transparent);
}

.confirmation-composer__toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-top: 10px;
}
</style>
