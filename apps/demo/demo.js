(function () {
  var R = window.DemoResponses;
  var DemoSSE = window.DemoSSE;
  var DemoData = window.DemoData;
  if (!R || !DemoSSE) {
    console.error('demo-responses.js and demo-sse.js must load before demo.js');
    return;
  }
  if (!DemoData) {
    console.error('demo-data.js must load before demo.js');
    return;
  }
  if (!window.ssep) {
    console.error('@bndynet/sse-parser (window.ssep) not found — load index.global.js before demo.js');
    return;
  }

  if (typeof BndyChatRenderers !== 'undefined') {
    if (typeof NiceChat !== 'undefined' && NiceChat.rendererRegistry) {
      if (BndyChatRenderers.chartRenderer) {
        NiceChat.rendererRegistry.register(BndyChatRenderers.chartRenderer);
      }
      if (BndyChatRenderers.kpiRenderer) {
        NiceChat.rendererRegistry.register(BndyChatRenderers.kpiRenderer);
      }
      if (BndyChatRenderers.kpisRenderer) {
        NiceChat.rendererRegistry.register(BndyChatRenderers.kpisRenderer);
      }
      if (BndyChatRenderers.formRenderer) {
        NiceChat.rendererRegistry.register(BndyChatRenderers.formRenderer);
      }
    } else {
      console.warn(
        'NiceChat (chat-messages IIFE) not found — build packages/chat-messages and load dist/index.global.js before demo.js; chart and kpi fences will be plain code.'
      );
    }
  }

  var chatEl = document.getElementById('chat');
  chatEl.config = { streamingSpeed: 0 };
  var cancelBtn = document.getElementById('btn-cancel');
  var msgIdCounter = 0;
  var cancelCurrentStream = null;

  // All buttons that should be disabled while streaming (special + dynamic).
  var scenarioButtons = [
    document.getElementById('btn-run'),
    document.getElementById('btn-real-sse'),
    document.getElementById('btn-error-msg'),
    document.getElementById('btn-error-banner'),
    document.getElementById('btn-timeline'),
  ];

  function sseOpts() {
    return R.sse || {};
  }

  function nextId() {
    return 'msg-' + ++msgIdCounter;
  }

  function buildThinkingDemoWire() {
    var evs = R.thinkingDemoEvents;
    var w = evs
      .map(function (ev) {
        return 'data: ' + JSON.stringify(ev) + '\n\n';
      })
      .join('');
    return w + 'data: [DONE]\n\n';
  }

  function applyStreamEvent(acc, ev) {
    if (!ev || ev.done) return;
    if (typeof ev.reasoning === 'string') {
      acc.reasoning = (acc.reasoning || '') + ev.reasoning;
    }
    if (typeof ev.content === 'string') {
      acc.content = (acc.content || '') + ev.content;
    }
    if (ev.reasoning && typeof ev.reasoning === 'object' && ev.reasoning.delta != null) {
      acc.reasoning = (acc.reasoning || '') + String(ev.reasoning.delta);
    }
    if (ev.message && ev.message.delta != null) {
      acc.content = (acc.content || '') + String(ev.message.delta);
    }
    if (ev.timeline) {
      acc.timeline = ev.timeline;
    }
  }

  function playSSEWire(messageId, wire, delayOverride) {
    var o = Object.assign({}, sseOpts(), delayOverride || {});
    var minC = o.minNetworkChunk != null ? o.minNetworkChunk : 28;
    var maxC = o.maxNetworkChunk != null ? o.maxNetworkChunk : 72;
    var baseDelay = o.baseDelayMs != null ? o.baseDelayMs : 22;
    var jitter = o.jitterMs != null ? o.jitterMs : 20;

    var chunks = DemoSSE.splitIntoNetworkChunks(wire, minC, maxC);
    var parser = DemoSSE.createParser();
    var acc = { reasoning: undefined, content: '' };
    var ci = 0;
    var cancelled = false;
    var timerId = null;

    // Expose a cancel handle so the Cancel button can stop this loop.
    cancelCurrentStream = function () {
      cancelled = true;
      if (timerId !== null) {
        clearTimeout(timerId);
        timerId = null;
      }
      cancelCurrentStream = null;
    };

    function step() {
      if (cancelled) return;
      if (ci >= chunks.length) {
        chatEl.updateMessage(messageId, {
          reasoning: acc.reasoning,
          content: acc.content,
          streaming: false,
        });
        cancelCurrentStream = null;
        return;
      }
      var batch = parser.push(chunks[ci++]);
      var finished = false;
      batch.forEach(function (ev) {
        if (ev && ev.done) {
          finished = true;
          return;
        }
        applyStreamEvent(acc, ev);
        chatEl.updateMessage(messageId, {
          reasoning: acc.reasoning,
          content: acc.content || '',
          streaming: true,
        });
      });
      if (finished) {
        chatEl.updateMessage(messageId, {
          reasoning: acc.reasoning,
          content: acc.content,
          streaming: false,
        });
        cancelCurrentStream = null;
        return;
      }
      timerId = setTimeout(step, baseDelay + Math.random() * jitter);
    }

    step();
  }

  function runThinkingDemo() {
    if (chatEl.streaming) return;
    chatEl.addMessage({
      id: nextId(),
      role: 'user',
      content: R.userPrompt,
      timestamp: Date.now(),
    });
    setTimeout(function () {
      var aiId = nextId();
      chatEl.addMessage({
        id: aiId,
        role: 'assistant',
        content: '',
        reasoning: '',
        streaming: true,
        timestamp: Date.now(),
      });
      playSSEWire(aiId, buildThinkingDemoWire(), R.sse.thinkingDemo || {});
    }, 400);
  }

  async function runRealSSE() {
    if (chatEl.streaming) return;

    var userContent = R.userPrompt || 'thinking';
    chatEl.addMessage({
      id: nextId(),
      role: 'user',
      content: userContent,
      timestamp: Date.now(),
    });

    await new Promise(function (resolve) { setTimeout(resolve, 400); });

    var aiId = nextId();
    chatEl.addMessage({
      id: aiId,
      role: 'assistant',
      content: '',
      reasoning: '',
      streaming: true,
      timestamp: Date.now(),
    });

    var acc = { reasoning: undefined, content: '', timeline: undefined };
    var abortCtrl = new AbortController();

    // Register so the Cancel button can abort this fetch.
    cancelCurrentStream = function () {
      abortCtrl.abort();
      cancelCurrentStream = null;
    };

    try {
      var response = await fetch('http://localhost:5173/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userContent + ' -i' }),
        signal: abortCtrl.signal,
      });

      for await (var sseEvent of ssep.readSSEStream(response)) {
        var parsed = JSON.parse(sseEvent.data);
        applyStreamEvent(acc, parsed);
        if (acc.timeline) {
          chatEl.updateTimeline(aiId, acc.timeline.step, acc.timeline.status, acc.timeline.bid);
        } else {
          chatEl.updateMessage(aiId, {
            reasoning: acc.reasoning,
            content: acc.content || '',
            streaming: true,
          });
        }
      }

      chatEl.updateMessage(aiId, {
        reasoning: acc.reasoning,
        content: acc.content,
        streaming: false,
      });
    } catch (err) {
      if (abortCtrl.signal.aborted) {
        // Component state + hint already handled by chatEl.cancel() in the button handler.
      } else {
        chatEl.updateMessage(aiId, {
          reasoning: acc.reasoning,
          content: acc.content,
          error: err.message || 'Request failed',
          streaming: false,
        });
      }
    } finally {
      cancelCurrentStream = null;
    }
  }

  // ── Special button handlers ───────────────────────────────────────────────

  document.getElementById('btn-run').addEventListener('click', runThinkingDemo);

  document.getElementById('btn-real-sse').addEventListener('click', runRealSSE);

  document.getElementById('btn-error-msg').addEventListener('click', function () {
    chatEl.addMessage({ id: nextId(), role: 'user', content: 'Tell me about quantum computing', timestamp: Date.now() });
    setTimeout(function () {
      chatEl.addMessage({ id: nextId(), role: 'assistant', content: '', error: 'Service temporarily unavailable. Please try again later.', timestamp: Date.now() });
    }, 500);
    setTimeout(function () {
      chatEl.addMessage({ id: nextId(), role: 'assistant', content: 'The request was partially processed before the connection was lost.', error: 'Request timeout — the server did not respond within 30 seconds.', timestamp: Date.now() });
    }, 1200);
  });

  document.getElementById('btn-error-banner').addEventListener('click', function () {
    chatEl.showError('Network connection lost. Attempting to reconnect…', { duration: 5000 });
  });

  document.getElementById('btn-timeline').addEventListener('click', function () {
    var timelineId = nextId();
    chatEl.addMessage({
      id: timelineId,
      role: 'assistant',
      content:
        '## Deployment Pipeline\n\n' +
        '### BUILD\n<!-- bid:build -->\n' +
        '1. [pending] Build Docker image\n2. [pending] Run test suite\n3. [pending] Push to registry\n\n' +
        '### DEPLOY\n<!-- bid:deploy -->\n' +
        '1. [pending] Deploy to staging\n2. [pending] Run smoke tests\n3. [pending] Promote to production\n',
      timestamp: Date.now(),
    });
    var bids = ['build', 'deploy'];
    var statuses = ['active', 'skipped', 'done', 'error'];
    var steps = [];
    statuses.forEach(function (status) {
      bids.forEach(function (bid) {
        for (var i = 0; i < 3; i++) steps.push({ bid: bid, index: i, status: status });
      });
    });
    var si = 0;
    var timer = setInterval(function () {
      if (si >= steps.length) { clearInterval(timer); return; }
      var s = steps[si++];
      chatEl.updateTimeline(timelineId, s.index, s.status, s.bid);
    }, 500);
  });

  // ── DemoData buttons (auto-generated from [label, content] array) ─────────

  var sidebarEl = document.getElementById('demo-sidebar');
  DemoData.forEach(function (item) {
    var label = item[0], content = item[1];
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = label;
    sidebarEl.appendChild(btn);
    btn.addEventListener('click', function () {
      chatEl.addMessage({ id: nextId(), role: 'assistant', content: content, timestamp: Date.now() });
    });
    scenarioButtons.push(btn);
  });

  // ── Utility button handlers ───────────────────────────────────────────────

  cancelBtn.addEventListener('click', function () {
    if (cancelCurrentStream) cancelCurrentStream();
    chatEl.cancel('*— Response stopped —*');
  });

  document.getElementById('btn-clear').addEventListener('click', function () {
    chatEl.clear();
  });

  // ── Chat component events ─────────────────────────────────────────────────

  chatEl.addEventListener('streaming-change', function (e) {
    scenarioButtons.forEach(function (btn) { btn.disabled = e.detail.streaming; });
    cancelBtn.disabled = !e.detail.streaming;
  });

  chatEl.addEventListener('message-cancel', function (e) {
    console.log('[demo] message-cancel fired, id:', e.detail.id);
  });

  chatEl.addEventListener('message-action', function (e) {
    var action = e.detail.action;
    var msg = e.detail.message;
    if (action === 'copy') {
      navigator.clipboard.writeText(msg.content).then(function () {
        console.log('Copied message:', msg);
      });
    } else {
      console.log('Action:', action, 'on message:', msg);
    }
  });

  chatEl.addEventListener('error', function (e) {
    console.log('Chat error event:', e.detail.message);
  });

  chatEl.addEventListener('form-submit', function (e) {
    var d = e.detail;
    console.log('[demo] form-submit — id:', d.formId, '| title:', d.title, '| values:', d.values);
  });
})();
