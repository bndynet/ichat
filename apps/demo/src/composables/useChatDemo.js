import { ref } from 'vue'
import { demoData, thinkingDemoEvents } from '../demo-data.js'

/** Per-chunk delay (ms) before the next SSE event — jitter keeps it from feeling mechanical */
const STREAM_STEP_MS = { min: 280, max: 520 }

export function useChatDemo() {
  const chatRef = ref(null)
  const streaming = ref(false)
  let msgId = 0
  let cancelStream = null

  const nextId = () => 'msg-' + ++msgId

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

    function nextDelay(ev) {
      return ev?.delay ?? STREAM_STEP_MS.min + Math.random() * (STREAM_STEP_MS.max - STREAM_STEP_MS.min)
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
      timer = setTimeout(step, nextDelay(ev))
    }
    step()
  }

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

  /** Add any message (user / assistant / reasoning / streaming flags). */
  function addMessage(partial) {
    chatRef.value.addMessage({
      ...partial,
      id: partial.id ?? nextId(),
      timestamp: partial.timestamp ?? Date.now(),
    })
  }

  function cancelStreaming() {
    if (cancelStream) cancelStream()
    chatRef.value.cancel('*— Response stopped —*')
  }

  function clear() { chatRef.value.clear() }

  function showErrorBanner() {
    chatRef.value.showError('Network lost. Reconnecting…', { duration: 5000 })
  }

  function onStreamingChange(e) { streaming.value = e.detail.streaming }
  function onMessageAction(e) {
    const { action, message } = e.detail
    if (action === 'copy') navigator.clipboard.writeText(message.content)
    else if (action === 'like') console.info('[chat-demo] like', message.id)
  }

  return {
    chatRef,
    streaming,
    demoData,
    runThinkingDemo,
    runErrorMessage,
    runTimeline,
    addStaticMessage,
    addMessage,
    cancelStreaming,
    clear,
    showErrorBanner,
    onStreamingChange,
    onMessageAction,
  }
}
