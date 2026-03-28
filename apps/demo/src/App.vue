<script setup>
import { ref, onMounted } from 'vue'
import { demoData, thinkingDemoEvents } from './demo-data.js'

const chatRef = ref(null)
const streaming = ref(false)
const isDark = ref(false)
let msgId = 0
let cancelStream = null

const nextId = () => 'msg-' + ++msgId

// ── Theme ──────────────────────────────────────────────────────────────────

function applyTheme(dark) {
  document.documentElement.classList.toggle('dark', dark)
  document.documentElement.setAttribute('data-theme', dark ? 'dark' : '')
  localStorage.setItem('chat-demo-theme', dark ? 'dark' : 'light')
}

onMounted(() => {
  const stored = localStorage.getItem('chat-demo-theme')
  isDark.value = stored === 'dark' || (!stored && matchMedia('(prefers-color-scheme: dark)').matches)
  applyTheme(isDark.value)
})

// ── Streaming simulation ───────────────────────────────────────────────────

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
    timer = setTimeout(step, 80 + Math.random() * 60)
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

    <!-- ── Left Sidebar ─────────────────────────────────────────────────── -->
    <aside class="sidebar">
      <div class="sidebar-brand">
        <span class="brand-name">Chat</span>
      </div>

      <el-scrollbar class="sidebar-scroll">
        <div class="nav-section">
          <div class="nav-label">Demo</div>
          <button class="nav-item" :class="{ disabled: streaming }" :disabled="streaming" @click="runThinkingDemo">
            <span class="nav-icon">▶</span> Run demo
          </button>
          <button class="nav-item" :class="{ disabled: streaming }" :disabled="streaming" @click="runErrorMessage">
            <span class="nav-icon">⚠</span> Error message
          </button>
          <button class="nav-item" @click="chatRef.showError('Network lost. Reconnecting…', { duration: 5000 })">
            <span class="nav-icon">📣</span> Error banner
          </button>
          <button class="nav-item" :class="{ disabled: streaming }" :disabled="streaming" @click="runTimeline">
            <span class="nav-icon">⏱</span> Timeline
          </button>
        </div>

        <el-divider class="nav-divider" />

        <div class="nav-section">
          <div class="nav-label">Content</div>
          <button
            v-for="[label, content] in demoData"
            :key="label"
            class="nav-item"
            :class="{ disabled: streaming }"
            :disabled="streaming"
            @click="addStaticMessage(content)"
          >
            {{ label }}
          </button>
        </div>
      </el-scrollbar>

      <div class="sidebar-footer">
        <div class="footer-actions">
          <el-button type="danger" size="small" :disabled="!streaming" @click="cancelStreaming">Cancel</el-button>
          <el-button type="primary" size="small" @click="clear">Clear</el-button>
        </div>
        <div class="footer-theme">
          <span class="footer-label">Dark</span>
          <el-switch v-model="isDark" size="small" @change="applyTheme" />
        </div>
      </div>
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
</template>

<style scoped>
.layout {
  display: flex;
  height: 100vh;
  overflow: hidden;
  background: var(--demo-page-bg);
  color: var(--demo-text);
}

/* ── Sidebar ──────────────────────────────────────────────────────────── */
.sidebar {
  width: 220px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  background: var(--demo-sidebar-bg);
  border-right: 1px solid var(--demo-border);
}

.sidebar-brand {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 0 16px;
  height: 52px;
  border-bottom: 1px solid var(--demo-border);
  flex-shrink: 0;
}

.brand-name {
  font-size: 14px;
  font-weight: 700;
  letter-spacing: -0.2px;
  color: var(--demo-text);
}

.sidebar-scroll { flex: 1; overflow: hidden; }
.sidebar-scroll :deep(.el-scrollbar__view) { overflow-x: hidden; }

.nav-section { padding: 8px 6px; }

.nav-label {
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.7px;
  color: var(--demo-text-muted);
  padding: 6px 10px 4px;
}

.nav-item {
  display: flex;
  align-items: center;
  width: 100%;
  padding: 7px 10px;
  margin-bottom: 1px;
  gap: 8px;
  font-size: 13px;
  color: var(--demo-text);
  background: transparent;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  text-align: left;
  transition: background 0.12s, color 0.12s;
  position: relative;
}
.nav-item::before {
  content: '';
  position: absolute;
  left: 0;
  top: 20%;
  height: 60%;
  width: 3px;
  border-radius: 0 2px 2px 0;
  background: var(--demo-accent);
  opacity: 0;
  transition: opacity 0.12s;
}
.nav-item:hover:not(.disabled) {
  background: var(--demo-nav-hover);
}
.nav-item:hover:not(.disabled)::before {
  opacity: 1;
}
.nav-item.disabled {
  opacity: 0.35;
  cursor: not-allowed;
}
.nav-icon {
  font-size: 12px;
  width: 16px;
  text-align: center;
  flex-shrink: 0;
  color: var(--demo-text-muted);
}

.nav-divider {
  margin: 2px 10px !important;
  border-color: var(--demo-border) !important;
}

.sidebar-footer {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px 16px;
  border-top: 1px solid var(--demo-border);
  flex-shrink: 0;
}


.footer-actions {
  display: flex;
  gap: 6px;
}
.footer-actions :deep(.el-button) {
  flex: 1;
}

.footer-theme {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.footer-label {
  font-size: 12px;
  color: var(--demo-text-muted);
}

/* ── Right panel ──────────────────────────────────────────────────────── */
.content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-width: 0;
  background: var(--demo-page-bg);
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
  box-shadow: var(--demo-shadow);
}

/* ── Sync Element Plus accent to --demo-accent ────────────────────────── */
.sidebar {
  --el-color-primary: var(--demo-accent);
  --el-switch-on-color: var(--demo-accent);
  --el-border-color: var(--demo-border);
  --el-border-color-light: var(--demo-border);
  --el-fill-color-blank: var(--demo-sidebar-bg);
  --el-text-color-regular: var(--demo-text);
  --el-text-color-secondary: var(--demo-text-muted);
  --el-bg-color: var(--demo-sidebar-bg);
  --el-button-bg-color: var(--demo-sidebar-bg);
  --el-button-border-color: var(--demo-border);
  --el-button-text-color: var(--demo-text);
  --el-button-hover-bg-color: var(--demo-nav-hover);
  --el-button-hover-border-color: var(--demo-accent);
  --el-button-hover-text-color: var(--demo-accent);
}
</style>
