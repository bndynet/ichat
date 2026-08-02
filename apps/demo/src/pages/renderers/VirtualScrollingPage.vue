<script setup>
import '@bndynet/ichat'
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { textPart } from '@bndynet/ichat'
import ExampleCodeDrawer from '../../components/ExampleCodeDrawer.vue'
import virtualScrollingExample from '../../examples/renderers/virtual-scrolling.md?raw'

const MESSAGE_COUNTS = [100, 1000, 10000]
const REGULAR_LIST_LIMIT = 1000
const messageCache = new Map()

const chatRef = ref(null)
const messageCount = ref(1000)
const virtualScroll = ref(true)
const loading = ref(false)
const streaming = ref(false)
const renderedRows = ref(0)
const totalRows = ref(0)
const renderDuration = ref(0)
const activeMode = ref('Virtual')
const lastAction = ref('Ready')

let scenarioRevision = 0
let streamRevision = 0

function buildMessages(count) {
  const cached = messageCache.get(count)
  if (cached) return cached

  const now = Date.now()
  const messages = Array.from({ length: count }, (_, index) => {
    const number = index + 1

    return {
      id: `virtual-msg-${number}`,
      role: number % 4 === 0 ? 'self' : 'assistant',
      parts: [
        textPart(
          `**Message ${number.toLocaleString()}** of ${count.toLocaleString()}`,
          { id: `virtual-part-${number}` },
        ),
      ],
      timestamp: now,
    }
  })

  messageCache.set(count, messages)
  return messages
}

function nextFrame() {
  return new Promise((resolve) => requestAnimationFrame(resolve))
}

async function settleChat(chat, expectVirtual) {
  await chat.updateComplete

  if (expectVirtual) {
    for (let frame = 0; frame < 90; frame += 1) {
      const virtualizer = chat.shadowRoot?.querySelector('lit-virtualizer')
      if (virtualizer) {
        try {
          await virtualizer.layoutComplete
        } catch {
          // The component will fall back to the regular list if loading fails.
        }
        break
      }
      await nextFrame()
    }
  }

  await nextFrame()
  await nextFrame()
}

function refreshMetrics() {
  const chat = chatRef.value
  const root = chat?.shadowRoot
  if (!chat || !root) return

  renderedRows.value = root.querySelectorAll('i-chat-message').length
  totalRows.value = chat.messages.length
  activeMode.value = root.querySelector('lit-virtualizer') ? 'Virtual' : 'Regular'
}

async function applyScenario(reason = 'Scenario updated') {
  const chat = chatRef.value
  if (!chat) return

  const revision = ++scenarioRevision
  streamRevision += 1
  streaming.value = false
  loading.value = true

  await nextTick()
  const startedAt = performance.now()
  chat.config = { ...chat.config, virtualScroll: virtualScroll.value }
  chat.messages = buildMessages(messageCount.value)
  await settleChat(chat, virtualScroll.value)

  if (revision !== scenarioRevision) return
  renderDuration.value = performance.now() - startedAt
  refreshMetrics()
  lastAction.value = reason
  loading.value = false
}

async function handleCountChange(count) {
  if (count > REGULAR_LIST_LIMIT && !virtualScroll.value) {
    virtualScroll.value = true
    lastAction.value = '10,000 messages automatically enables virtual mode to keep this page responsive.'
  }
  await applyScenario(`${count.toLocaleString()} messages loaded`)
}

async function handleModeChange(enabled) {
  await applyScenario(enabled ? 'Virtual scrolling enabled' : 'Regular keyed list enabled')
}

function currentMountedMessageIndex() {
  const mountedIndexes = Array.from(
    chatRef.value?.shadowRoot?.querySelectorAll('i-chat-message[data-message-id]') ?? [],
  ).flatMap((element) => {
    const match = /^virtual-msg-(\d+)$/.exec(element.dataset.messageId ?? '')
    return match ? [Number(match[1])] : []
  })
  if (mountedIndexes.length === 0) return 1
  return Math.round(
    (Math.min(...mountedIndexes) + Math.max(...mountedIndexes)) / 2,
  )
}

async function streamVariableHeightRow() {
  const chat = chatRef.value
  if (!chat || streaming.value) return

  const revision = ++streamRevision
  const rowIndex = currentMountedMessageIndex()
  const messageId = `virtual-msg-${rowIndex}`
  const partId = `virtual-part-${rowIndex}`
  const baseText = `**Message ${rowIndex.toLocaleString()}** of ${messageCount.value.toLocaleString()}`
  const chunks = [
    '\n\n### Streaming variable-height update\n\n',
    'This visible message grows in place. ',
    'The virtual list measures the new height without mounting the full history.\n\n',
    '- First streamed item\n',
    '- Second streamed item with a little more content\n',
    '- Final item confirms the row can grow across multiple updates.',
  ]

  streaming.value = true
  chat.updateMessage(messageId, { streaming: true })

  let content = baseText
  for (const chunk of chunks) {
    await new Promise((resolve) => window.setTimeout(resolve, 140))
    if (revision !== streamRevision) return
    content += chunk
    chat.updatePart(messageId, partId, { text: content, status: 'streaming' })
    refreshMetrics()
  }

  if (revision !== streamRevision) return
  chat.updatePart(messageId, partId, { status: 'complete' })
  chat.updateMessage(messageId, { streaming: false })
  streaming.value = false
  lastAction.value = 'Variable-height stream completed'
  await chat.updateComplete
  refreshMetrics()
}

onMounted(async () => {
  await nextTick()
  await applyScenario('Initial virtual list ready')
})

onBeforeUnmount(() => {
  scenarioRevision += 1
  streamRevision += 1
})
</script>

<template>
  <div class="virtual-scroll-demo">
    <div class="demo-toolbar">
      <div class="toolbar-control">
        <span class="toolbar-label">Messages</span>
        <el-radio-group
          v-model="messageCount"
          size="small"
          :disabled="loading || streaming"
          @change="handleCountChange"
        >
          <el-radio-button
            v-for="count in MESSAGE_COUNTS"
            :key="count"
            :value="count"
          >
            {{ count.toLocaleString() }}
          </el-radio-button>
        </el-radio-group>
      </div>

      <div class="toolbar-control">
        <span class="toolbar-label">Virtual scroll</span>
        <el-switch
          v-model="virtualScroll"
          :disabled="loading || streaming || messageCount > REGULAR_LIST_LIMIT"
          @change="handleModeChange"
        />
      </div>

      <el-button
        size="small"
        type="primary"
        :loading="streaming"
        :disabled="loading"
        @click="streamVariableHeightRow"
      >
        Stream visible row
      </el-button>
    </div>

    <div class="metrics" aria-live="polite">
      <div class="metric">
        <span class="metric-label">Mode</span>
        <strong>{{ activeMode }}</strong>
      </div>
      <div class="metric">
        <span class="metric-label">Data rows</span>
        <strong>{{ totalRows.toLocaleString() }}</strong>
      </div>
      <div class="metric">
        <span class="metric-label">Mounted DOM rows</span>
        <strong>{{ renderedRows.toLocaleString() }}</strong>
      </div>
      <div class="metric">
        <span class="metric-label">Settle time</span>
        <strong>{{ renderDuration.toFixed(1) }} ms</strong>
      </div>
      <p class="metric-status">{{ lastAction }}</p>
    </div>

    <p v-if="messageCount > REGULAR_LIST_LIMIT" class="demo-note">
      Regular mode is capped at 1,000 rows in this interactive page to avoid intentionally blocking
      the browser. The 10,000-row option focuses on bounded DOM rendering; the dedicated benchmark
      covers its performance budget.
    </p>

    <i-chat-messages ref="chatRef" class="message-list" />
  </div>

  <ExampleCodeDrawer
    title="Virtual scrolling code example"
    :content="virtualScrollingExample"
  />
</template>

<style scoped>
.virtual-scroll-demo {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  color: var(--el-text-color-primary, #303133);
}

.demo-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px 20px;
  padding: 10px 64px 10px 12px;
  border-bottom: 1px solid var(--el-border-color-light, #e4e7ed);
  background: var(--el-fill-color-light, #f5f7fa);
}

.toolbar-control {
  display: flex;
  align-items: center;
  gap: 8px;
}

.toolbar-label,
.metric-label {
  color: var(--el-text-color-secondary, #606266);
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
}

.metrics {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-bottom: 1px solid var(--el-border-color-lighter, #ebeef5);
  background: var(--el-bg-color, #fff);
}

.metric {
  display: flex;
  align-items: baseline;
  gap: 6px;
  min-width: 132px;
  padding: 6px 9px;
  border: 1px solid var(--el-border-color-lighter, #ebeef5);
  border-radius: 6px;
  background: var(--el-fill-color-blank, #fff);
  font-size: 13px;
}

.metric strong {
  color: var(--el-color-primary, #409eff);
  font-variant-numeric: tabular-nums;
}

.metric-status {
  flex: 1 1 240px;
  margin: 0;
  color: var(--el-text-color-secondary, #606266);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 11px;
  text-align: right;
}

.demo-note {
  margin: 0;
  padding: 7px 12px;
  color: var(--el-color-warning-dark-2, #b88230);
  background: var(--el-color-warning-light-9, #fdf6ec);
  font-size: 12px;
  line-height: 1.5;
}

.message-list {
  flex: 1;
  min-height: 0;
}

@media (max-width: 760px) {
  .demo-toolbar {
    align-items: flex-start;
    padding-right: 56px;
  }

  .metric-status {
    flex-basis: 100%;
    text-align: left;
  }
}
</style>
