<script setup>
import '@bndynet/ichat'
import { nextTick, onMounted, ref } from 'vue'
import { textPart } from '@bndynet/ichat'
import ExampleCodeDrawer from '../../components/ExampleCodeDrawer.vue'
import scrollToExample from '../../examples/renderers/scroll-to.md?raw'

const chatRef = ref(null)
const customMsgId = ref('')
const customPartId = ref('')
const lastResult = ref('')

const TOTAL_MSGS = 20

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

  // Add many messages so the list overflows — each with a known message ID
  // and a text part that carries a known part ID.
  for (let i = 1; i <= TOTAL_MSGS; i++) {
    chat.addMessage({
      id: `msg-${i}`,
      role: i % 2 === 0 ? 'assistant' : 'self',
      parts: [
        textPart(
          `**Message ${i}**  \n${'Lorem ipsum dolor sit amet consectetur adipiscing elit. '.repeat((i % 3) + 1)}`,
          { id: `part-${i}` },
        ),
      ],
      timestamp: Date.now() - (TOTAL_MSGS - i) * 60000,
    })
  }
})

function scrollToMessage(id) {
  const ok = chatRef.value?.scrollToMessage(id)
  lastResult.value = `scrollToMessage("${id}") → ${ok ? '✅ found' : '❌ not found'}`
}

function scrollToPart(partId) {
  const ok = chatRef.value?.scrollToPart(partId)
  lastResult.value = `scrollToPart("${partId}") → ${ok ? '✅ found' : '❌ not found'}`
}

function scrollToCustomMessage() {
  const id = customMsgId.value.trim()
  if (!id) return
  scrollToMessage(id)
}

function scrollToCustomPart() {
  const id = customPartId.value.trim()
  if (!id) return
  scrollToPart(id)
}
</script>

<template>
  <div class="scroll-to-demo">
    <div class="demo-toolbar">
      <div class="toolbar-group">
        <span class="toolbar-label">Message:</span>
        <el-button size="small" @click="scrollToMessage('msg-1')">#1</el-button>
        <el-button size="small" @click="scrollToMessage('msg-5')">#5</el-button>
        <el-button size="small" @click="scrollToMessage('msg-10')">#10</el-button>
        <el-button size="small" @click="scrollToMessage('msg-15')">#15</el-button>
        <el-button size="small" type="primary" @click="scrollToMessage('msg-20')">#20 (last)</el-button>
      </div>
      <div class="toolbar-group">
        <span class="toolbar-label">Part:</span>
        <el-button size="small" @click="scrollToPart('part-3')">Part #3</el-button>
        <el-button size="small" @click="scrollToPart('part-8')">Part #8</el-button>
        <el-button size="small" type="primary" @click="scrollToPart('part-18')">Part #18</el-button>
      </div>
      <div class="toolbar-group">
        <span class="toolbar-label">Custom:</span>
        <el-input
          v-model="customMsgId"
          size="small"
          placeholder="msg-7"
          style="width:100px"
          @keyup.enter="scrollToCustomMessage"
        />
        <el-button size="small" @click="scrollToCustomMessage">Scroll to msg</el-button>
        <el-input
          v-model="customPartId"
          size="small"
          placeholder="part-12"
          style="width:100px"
          @keyup.enter="scrollToCustomPart"
        />
        <el-button size="small" @click="scrollToCustomPart">Scroll to part</el-button>
      </div>
      <div v-if="lastResult" class="toolbar-result">{{ lastResult }}</div>
    </div>
    <i-chat ref="chatRef"></i-chat>
  </div>
  <ExampleCodeDrawer title="Scroll To code example" :content="scrollToExample" />
</template>

<style scoped>
.scroll-to-demo {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.demo-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 16px;
  padding: 8px 12px;
  background: var(--el-fill-color-light, #f5f5f5);
  border-bottom: 1px solid var(--el-border-color-light, #e0e0e0);
  font-size: 13px;
}

.toolbar-group {
  display: flex;
  align-items: center;
  gap: 4px;
}

.toolbar-label {
  font-weight: 600;
  color: var(--el-text-color-secondary, #666);
  margin-right: 2px;
  white-space: nowrap;
}

.toolbar-result {
  margin-left: auto;
  font-family: var(--el-font-family-mono, monospace);
  font-size: 12px;
  color: var(--el-color-success, #67c23a);
}
</style>
