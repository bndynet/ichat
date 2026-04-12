<script setup>
import { ref } from 'vue'
import { demoData, thinkingDemoEvents } from './demo-data.js'
import {
  VideoPlay,
  Clock,
  Delete,
  Warning,
  Bell,
  CircleClose,
} from '@element-plus/icons-vue'

const chatRef = ref(null)
const streaming = ref(false)
let msgId = 0
let cancelStream = null

const nextId = () => 'msg-' + ++msgId

// ── Streaming simulation ───────────────────────────────────────────────────
/** Per-chunk delay (ms) before the next SSE event — jitter keeps it from feeling mechanical */
const STREAM_STEP_MS = { min: 280, max: 520 }

function playEvents(messageId, events) {
  const acc = { reasoning: undefined, content: '' }
  let i = 0
  let cancelled = false
  let timer = null

  cancelStream = () => {
    cancelled = true
    clearTimeout(timer)
    cancelStream = null
  }

  function nextDelay() {
    return STREAM_STEP_MS.min + Math.random() * (STREAM_STEP_MS.max - STREAM_STEP_MS.min)
  }

  function step() {
    if (cancelled) return
    if (i >= events.length) {
      chatRef.value.updateMessage(messageId, { ...acc, streaming: false })
      cancelStream = null
      return
    }
    const ev = events[i++]
    if (typeof ev.reasoning === 'string') acc.reasoning = (acc.reasoning ?? '') + ev.reasoning
    if (typeof ev.content === 'string') acc.content += ev.content
    chatRef.value.updateMessage(messageId, { ...acc, streaming: true })
    timer = setTimeout(step, nextDelay())
  }
  step()
}

// ── Scenarios ──────────────────────────────────────────────────────────────

function runThinkingDemo() {
  const chat = chatRef.value
  chat.addMessage({ id: nextId(), role: 'user', content: 'thinking', timestamp: Date.now() })
  setTimeout(() => {
    const aiId = nextId()
    chat.addMessage({ id: aiId, role: 'assistant', content: '', reasoning: '', streaming: true, timestamp: Date.now() })
    playEvents(aiId, thinkingDemoEvents)
  }, 400)
}

function runErrorMessage() {
  const chat = chatRef.value
  chat.addMessage({ id: nextId(), role: 'user', content: 'Tell me about quantum computing', timestamp: Date.now() })
  setTimeout(() => {
    chat.addMessage({ id: nextId(), role: 'assistant', content: '', error: 'Service temporarily unavailable. Please try again later.', timestamp: Date.now() })
  }, 500)
}

function runTimeline() {
  const chat = chatRef.value
  const id = nextId()
  chat.addMessage({
    id, role: 'assistant', timestamp: Date.now(),
    content:
      '## Deployment Pipeline\n\n' +
      '### BUILD\n<!-- bid:build -->\n1. [pending] Build Docker image\n2. [pending] Run test suite\n3. [pending] Push to registry\n\n' +
      '### DEPLOY\n<!-- bid:deploy -->\n1. [pending] Deploy to staging\n2. [pending] Run smoke tests\n3. [pending] Promote to production\n',
  })
  const steps = ['active', 'done', 'error'].flatMap(s =>
    ['build', 'deploy'].flatMap(bid => [0, 1, 2].map(i => ({ bid, i, s })))
  )
  let si = 0
  const t = setInterval(() => {
    if (si >= steps.length) { clearInterval(t); return }
    const { bid, i, s } = steps[si++]
    chat.updateTimeline(id, i, s, bid)
  }, 500)
}

function addStaticMessage(content) {
  chatRef.value.addMessage({ id: nextId(), role: 'assistant', content, timestamp: Date.now() })
}

function cancelStreaming() {
  if (cancelStream) cancelStream()
  chatRef.value.cancel('*— Response stopped —*')
}

function clear() { chatRef.value.clear() }

function onStreamingChange(e) { streaming.value = e.detail.streaming }
function onMessageAction(e) {
  if (e.detail.action === 'copy') navigator.clipboard.writeText(e.detail.message.content)
}
</script>

<template>
  <div class="layout">

    <!-- ── Top Bar ───────────────────────────────────────────────────────── -->
    <header class="topbar">
      <div class="topbar-brand">
        <span class="brand-name"></span>
      </div>

      <div class="topbar-actions">
        <el-button
          size="small"
          :disabled="streaming"
          :icon="Warning"
          @click="runErrorMessage"
        >
          Error Message
        </el-button>

        <el-button
          size="small"
          :icon="Bell"
          @click="chatRef.showError('Network lost. Reconnecting…', { duration: 5000 })"
        >
          Error Banner
        </el-button>

        <el-button
          size="small"
          type="danger"
          :icon="CircleClose"
          :disabled="!streaming"
          @click="cancelStreaming"
        >
          Cancel
        </el-button>

        <el-button
          size="small"
          type="danger"
          plain
          :icon="Delete"
          @click="clear"
        >
          Clear
        </el-button>
      </div>
    </header>

    <div class="body">
      <!-- ── Left Sidebar ─────────────────────────────────────────────────── -->
      <aside class="sidebar">
        <el-scrollbar class="sidebar-scroll">
          <div class="sidebar-nav">
            <el-button
              class="nav-item"
              type="primary"
              plain
              :icon="VideoPlay"
              :disabled="streaming"
              @click="runThinkingDemo"
            >
              Run Demo
            </el-button>
            <el-button
              class="nav-item"
              type="primary"
              plain
              :icon="Clock"
              :disabled="streaming"
              @click="runTimeline"
            >
              Timeline
            </el-button>
            <el-button
              v-for="[label, content] in demoData"
              :key="label"
              class="nav-item"
              type="primary"
              plain
              :disabled="streaming"
              @click="addStaticMessage(content)"
            >
              {{ label }}
            </el-button>
          </div>
        </el-scrollbar>
      </aside>

      <!-- ── Right Content ─────────────────────────────────────────────────── -->
      <div class="content">
        <div class="chat-wrapper">
          <chat-messages
            ref="chatRef"
            class="chat"
            @streaming-change="onStreamingChange"
            @message-action="onMessageAction"
          />
        </div>
      </div>
    </div>

  </div>
</template>

<style scoped>
/* ── Layout root ──────────────────────────────────────────────────────── */
.layout {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
}

/* ── Top bar ──────────────────────────────────────────────────────────── */
.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 52px;
  padding: 0 16px;
  flex-shrink: 0;
  gap: 12px;
}

.topbar-brand {
  display: flex;
  align-items: center;
}

.brand-name {
  font-size: 15px;
  font-weight: 700;
  letter-spacing: -0.2px;
}

.topbar-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* ── Body (sidebar + content) ─────────────────────────────────────────── */
.body {
  flex: 1;
  display: flex;
  overflow: hidden;
  min-height: 0;
}

/* ── Sidebar ──────────────────────────────────────────────────────────── */
.sidebar {
  width: 200px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
}

.sidebar-scroll {
  flex: 1;
  overflow: hidden;
  overflow-x: hidden;
}

/* Single column: every button shares the same width (full sidebar inner width) */
.sidebar-nav {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 6px;
  padding: 10px;
  box-sizing: border-box;
}

/* Sidebar nav buttons: full-width column (appearance from global Element theme) */
.sidebar-nav .nav-item {
  display: inline-flex;
  justify-content: flex-start;
  width: 100%;
  min-width: 0;
  margin: 0;
  box-sizing: border-box;
}
.sidebar-nav .nav-item + .nav-item {
  margin-left: 0;
}

/* ── Right panel ──────────────────────────────────────────────────────── */
.content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-width: 0;
}

/* ── Chat panel ───────────────────────────────────────────────────────── */
.chat-wrapper {
  flex: 1;
  overflow: hidden;
  padding: 12px;
}

.chat {
  height: 100%;
  border-radius: 10px;
}
</style>
