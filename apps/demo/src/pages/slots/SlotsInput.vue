<script setup>
import { ref, nextTick, onMounted } from 'vue';
import { Paperclip, Promotion } from '@element-plus/icons-vue';
import '@bndynet/ichat';
import { cancelPendingStreamPlayback, reply } from '../../composables/demo-data.js';
import ExampleCodeDrawer from '../../components/ExampleCodeDrawer.vue';
import inputExample from '../../examples/slots/input.md?raw';

const draft = ref('');
const model = ref('');
const inputRootRef = ref(null);
const textareaRef = ref(null);
const busyUi = ref(false);
const streamingUi = ref(false);
const chatRef = ref(null);

function onBusyChange(e) {
  busyUi.value = e.detail.busy;
}

function onStreamingChange(e) {
  streamingUi.value = e.detail.streaming;
}

function emitSendToHost() {
  const content = draft.value.trim();
  if (!content || busyUi.value) return;
  const inputRoot = inputRootRef.value;
  if (!inputRoot) return;
  inputRoot.dispatchEvent(
    new CustomEvent('send', {
      bubbles: true,
      composed: true,
      detail: { content },
    }),
  );
  draft.value = '';
}

function handleCancel() {
  const hint = '*— Response stopped —*';
  if (!cancelPendingStreamPlayback(hint)) chatRef.value.cancel(hint);
}

/** Left “actions” area: plain Vue, same role as the default i-chat-input left column */
function onAttachDemo() {
  draft.value += (draft.value ? '\n' : '') + '[attachment placeholder]';
  textareaRef.value?.focus();
}

function handleSend(e) {
  const content = e.detail.content;
  reply(chatRef, content);
}

function onModelChange(e) {
  console.log(e);
}

onMounted(async () => {
  await nextTick();
});
</script>

<template>
  <i-chat
    ref="chatRef"
    @busy-change="onBusyChange"
    @streaming-change="onStreamingChange"
    @send="handleSend"
  >
    <!-- Replace default i-chat-input: bottom-left actions = any Vue components -->
    <div ref="inputRootRef" slot="input" class="slots-input">
      <textarea
        ref="textareaRef"
        v-model="draft"
        class="slots-input-textarea"
        placeholder="Say hi…"
        rows="1"
        @keydown.enter.exact.prevent="emitSendToHost"
      />
      <div class="slots-input-toolbar">
        <div class="slots-input-actions">
          <div>
            <el-button
              size="small"
              :icon="Paperclip"
              text
              bg
              :disabled="busyUi"
              @click="onAttachDemo"
              >Attach</el-button
            >
          </div>
          <div style="width: 180px">
            <el-select
              v-model="model"
              size="small"
              placeholder="Select Model"
              :disabled="busyUi"
              @change="onModelChange"
            >
              <el-option value="gpt-4o" label="GPT-4o" />
              <el-option value="gpt-4o-mini" label="GPT-4o-mini" />
              <el-option value="gpt-4" label="GPT-4" />
              <el-option value="gpt-3.5-turbo" label="GPT-3.5-turbo" />
              <el-option value="gpt-3.5-turbo-mini" label="GPT-3.5-turbo-mini" />
            </el-select>
          </div>
        </div>
        <div class="slots-input-end">
          <el-button v-if="streamingUi" size="small" type="warning" @click="handleCancel">
            Stop
          </el-button>
          <el-button
            v-else
            size="small"
            type="primary"
            :icon="Promotion"
            :disabled="busyUi || !draft.trim()"
            @click="emitSendToHost"
          >
            Send
          </el-button>
        </div>
      </div>
    </div>
  </i-chat>
  <ExampleCodeDrawer title="Custom input code example" :content="inputExample" />
</template>

<style scoped>
.slots-input {
  margin: 0 -1rem -1rem -1rem;
  padding: var(--chat-spacing-sm, 12px) var(--chat-spacing-md, 16px)
    var(--chat-spacing-md, 16px);
  background: var(--el-fill-color-light);
  border-top: 1px solid var(--chat-border, #e5e7eb);
}

.slots-input-textarea {
  width: 100%;
  min-height: 44px;
  max-height: 160px;
  resize: vertical;
  padding: 10px 12px;
  border-radius: var(--chat-radius, 8px);
  border: 1px solid var(--chat-border, #e5e7eb);
  background: var(--chat-input-bg, var(--chat-surface, #fff));
  color: var(--chat-text, #1a1a2e);
  font: inherit;
  font-size: 14px;
  line-height: 1.45;
  box-sizing: border-box;
}

.slots-input-textarea:focus {
  outline: none;
  border-color: var(--chat-primary, #2563eb);
  box-shadow: 0 0 0 2px
    color-mix(in srgb, var(--chat-primary, #2563eb) 20%, transparent);
}

.slots-input-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 10px;
}

.slots-input-actions {
  display: flex;
  gap: 6px;
}

.slots-input-end {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}
</style>
