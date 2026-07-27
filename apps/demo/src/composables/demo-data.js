import { textPart, reasoningPart, getMessageText } from '@bndynet/ichat';

// Chart JSON helpers
const chart = (obj) => '```chart\n' + JSON.stringify(obj, null, 2) + '\n```';

const charts = {
  bar: chart({
    type: 'bar',
    data: {
      categories: ['JS', 'Python', 'TS', 'Java', 'Rust', 'Go'],
      series: [{ name: 'Popularity', data: [95, 88, 78, 65, 42, 38] }],
    },
    options: { title: 'Most Popular Languages 2025' },
  }),
  barH: chart({
    type: 'bar',
    data: {
      categories: ['React', 'Vue', 'Angular', 'Svelte'],
      series: [{ name: 'Stars (k)', data: [220, 207, 93, 77] }],
    },
    options: { title: 'Framework Stars', variant: 'horizontal' },
  }),
  line: chart({
    type: 'line',
    data: {
      categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
      series: [{ name: 'Revenue', data: [3200, 4500, 3800, 5100, 4700, 6200] }],
    },
    options: { title: 'Monthly Revenue 2025' },
  }),
  area: chart({
    type: 'area',
    data: {
      categories: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      series: [
        { name: 'Visitors', data: [820, 932, 901, 934, 1290, 1330, 1320] },
      ],
    },
    options: { title: 'Website Visitors' },
  }),
  pie: chart({
    type: 'pie',
    data: [
      { name: 'Chrome', value: 65 },
      { name: 'Safari', value: 18 },
      { name: 'Firefox', value: 7 },
      { name: 'Edge', value: 5 },
      { name: 'Other', value: 5 },
    ],
    options: { title: 'Browser Market Share' },
  }),
  doughnut: chart({
    type: 'pie',
    data: [
      { name: 'Chrome', value: 65 },
      { name: 'Safari', value: 18 },
      { name: 'Firefox', value: 7 },
      { name: 'Other', value: 10 },
    ],
    options: { title: 'Browser Share — Doughnut', variant: 'doughnut' },
  }),
  gauge: chart({
    type: 'gauge',
    data: { value: 72, max: 100, label: 'Score' },
    options: { title: 'Server Response Score' },
  }),
};

/** @type {Record<string, string>} Keys match sidebar / preset labels; values are markdown bodies. */
export const demoData = {
  mermaid:
    'Diagrams use the **`mermaid`** fence. Theme follows `data-theme` on `<html>` (light / dark).\n\n' +
      '## Flowchart\n\n' +
      '```mermaid\n' +
      'flowchart LR\n' +
      '  A[i-chat] --> B[Markdown]\n' +
      '  B --> C[Mermaid SVG]\n' +
      '```\n\n' +
      '## Sequence\n\n' +
      '```mermaid\n' +
      'sequenceDiagram\n' +
      '  participant U as User\n' +
      '  participant C as Chat\n' +
      '  U->>C: message\n' +
      '  C-->>U: streamed reply\n' +
      '```\n\n' +
      '## Graph\n\n' +
      '```mermaid\n' +
      'graph TD\n' +
      '  A[Enter Chart Definition] --> B(Preview)\n' +
      '  B --> C{decide}\n' +
      '  C --> D[Keep]\n' +
      '  C --> E[Edit Definition]\n' +
      '  E --> B\n' +
      '  D --> F[Save Image and Code]\n' +
      '  F --> B\n' +
      '```\n',

  chart:
    'Here are the chart types supported by **@bndynet/icharts**.\n\n' +
      '## XY Charts\n\n### Bar\n\n' +
      charts.bar +
      '\n\n### Bar — Horizontal\n\n' +
      charts.barH +
      '\n\n' +
      '### Line\n\n' +
      charts.line +
      '\n\n### Area\n\n' +
      charts.area +
      '\n\n' +
      '## Pie\n\n' +
      charts.pie +
      '\n\n### Doughnut\n\n' +
      charts.doughnut +
      '\n\n' +
      '## Gauge\n\n' +
      charts.gauge,

  kpis:
    'Here is the KPI summary for today:\n\n' +
      '```kpi\n{"label": "Revenue", "value": "$50,846.90", "trend": -12}\n```\n\n' +
      '```kpi\n{"label": "New Users", "value": "1,284", "trend": 8}\n```\n\n' +
      '```kpi\n{"label": "Churn Rate", "value": "3.2%", "trend": 0.5, "unit": "pp"}\n```\n\n' +
      '```kpi\n{"label": "MRR", "value": "$128,400"}\n```',

  kpiGroup:
    'Here is the combined KPI overview:\n\n' +
      '```kpis\n[\n  {"label": "Revenue", "value": "$50,846.90", "trend": -12},\n  {"label": "New Users", "value": "1,284", "trend": 8},\n  {"label": "MRR", "value": "$128,400"}\n]\n```',

  progress:
    '## Deployment Pipeline\n\n' +
    '### BUILD\n<!-- bid:build -->\n1. [done] Build Docker image\n2. [error] Run test suite\n3. [active] Push to registry\n\n' +
    '### DEPLOY\n<!-- bid:deploy -->\n1. [done] Deploy to staging\n2. [error] Run smoke tests\n3. [pending] Promote to production\n',

  form:
    'Please fill out the feedback form below:\n\n' +
      '```form\n' +
      '{\n' +
      '  "id": "user-feedback",\n' +
      '  "title": "User Feedback",\n' +
      '  "submitLabel": "Send Feedback",\n' +
      '  "fields": [\n' +
      '    {"name": "name", "label": "Your Name", "type": "text", "required": true},\n' +
      // '    {"name": "email", "label": "Email", "type": "email"},\n' +
      '    {"name": "satisfaction", "label": "Satisfaction", "type": "select", "options": ["Very Satisfied", "Satisfied", "Neutral", "Dissatisfied"]},\n' +
      '    {"name": "source", "label": "How did you find us?", "type": "radio", "options": ["Search", "Social media", "Word of mouth", "Other"]},\n' +
      '    {"name": "subscribe", "label": "Subscribe to newsletter", "type": "checkbox"},\n' +
      '    {"name": "comments", "label": "Additional Comments", "type": "textarea"}\n' +
      '  ]\n' +
      '}\n' +
      '```',

  detailsFence:
    'The following use the **fence syntax** (` ```details Title `) to collapse content.\n\n' +
      '```details 📋 Project Overview\n' +
      'A modern chat interface with rich markdown support.\n\n' +
      '**Features:**\n- Streaming messages with typewriter effect\n- Collapsible reasoning blocks\n- Charts, KPI cards, progress, forms\n' +
      '```\n\n' +
      '```details 🔍 Tech Stack\n' +
      '| Layer | Technology |\n| --- | --- |\n| UI | Lit / Web Components |\n| Markdown | markdown-it |\n| Charts | ECharts via @bndynet/icharts |\n| Sanitisation | DOMPurify |\n' +
      '```',

  detailsContainer:
    'The following use the **container syntax** (`:::details Title`) for collapsible blocks.\n\n' +
      ':::details 📋 Project Overview\n' +
      'A modern chat interface with rich markdown support.\n\n' +
      '**Features:**\n- Streaming messages\n- Collapsible reasoning blocks\n- Custom renderers\n' +
      ':::\n\n' +
      ':::details 🔍 Tech Stack\n' +
      '| Layer | Technology |\n| --- | --- |\n| UI | Lit / Web Components |\n| Markdown | markdown-it |\n| Charts | ECharts |\n' +
      ':::',
};

/** Streaming thinking demo — reuses `demoData` markdown so one stream shows charts, KPI, form, details, and progress. */
const thinkingDemoEvents = [
  {
    reasoning:
      '**Summary:** The user asked for the `thinking` demo, so I will keep the thought stream compact and use the answer body for the heavy markdown/rendering examples.\n\n',
  },
  {
    reasoning:
      '<!-- bid:plan -->\n1. [done] **Classify** — Treat `thinking` as a showcase request.\n2. [active] **Prepare** — Stream a short thought summary while the answer gathers charts, KPI, form, details, and progress examples.\n3. [pending] **Answer** — Put the user-facing result in the main bubble.\n4. [pending] **Finish** — Collapse the summary when generation completes.\n\n',
  },
  {
    reasoning:
      '**Check:** Keep the summary useful but secondary; avoid duplicating the final answer.\n\n' +
      '> Thought summaries may be brief, missing, or redacted depending on the model provider. The UI should still feel stable.\n\n',
    delay: 8000,
  },
  { content: '## All-in-one streaming demo\n\n' },
  {
    content:
      'The compact **thought summary** above streams separately; below, the answer body renders the same markdown as the sidebar presets in one pass.\n\n',
  },
  { content: demoData.chart + '\n\n' },
  { content: demoData.kpiGroup + '\n\n' },
  { content: demoData.kpis + '\n\n' },
  { content: demoData.progress + '\n\n' },
  { content: demoData.form + '\n\n' },
  { content: demoData.detailsFence + '\n\n' },
  { content: demoData.detailsContainer + '\n\n' },
  {
    content:
      '## Markdown in the bubble\n\nUnordered list:\n\n- **Streaming** — chunks append as they arrive.\n- **Thought summary** — optional collapsible context above the answer.\n- **Markdown** — headings, lists, tables, and fences.\n\n',
  },
  {
    content:
      '> **Note:** This is a blockquote inside the message content — compare its spacing with the one in the reasoning body.\n>\n> It can span multiple lines too.\n\n' +
      '> **Second quote (content):** Another blockquote to check spacing between two consecutive quotes.\n\n',
  },
  {
    content:
      'GFM-style table:\n\n| Feature | Notes |\n| --- | --- |\n| Lists | `-` / `1.` with optional nesting |\n| Tables | Pipe rows + header separator row |\n| Code | Indented block or fenced blocks |\n\n',
  },
  {
    content:
      '## Progress\n\nVertical progress block with status indicators:\n\n<!-- bid:dev -->\n1. [done] Collect requirements from stakeholders\n2. [done] Design system architecture\n3. [active] Implement core API endpoints\n4. [pending] Write integration tests\n5. [error] Deploy to staging (rollback triggered)\n6. [skipped] Performance benchmarking\n\n',
  },
];

/** Per-chunk delay (ms) before the next SSE event — jitter keeps it from feeling mechanical */
const STREAM_STEP_MS = { min: 280, max: 520 };

let msgId = 0;
/** @type {null | (() => void)} */
let cancelStream = null;

export const nextId = () => 'msg-' + ++msgId;

// Fixed part ids within a streaming assistant message.
const REASONING_PART_ID = 'reasoning';
const CONTENT_PART_ID = 'content';

function playEvents(chatRef, messageId, events) {
  const chat = chatRef.value;
  let reasoningText = '';
  let contentText = '';
  let hasContentPart = false;
  let i = 0;
  let cancelled = false;
  let timer = null;

  cancelStream = () => {
    cancelled = true;
    clearTimeout(timer);
    cancelStream = null;
  };

  function nextDelay(ev) {
    return (
      ev?.delay ??
      STREAM_STEP_MS.min +
        Math.random() * (STREAM_STEP_MS.max - STREAM_STEP_MS.min)
    );
  }

  function step() {
    if (cancelled) return;
    if (i >= events.length) {
      chat.updatePart(messageId, REASONING_PART_ID, { status: 'complete' });
      if (hasContentPart)
        chat.updatePart(messageId, CONTENT_PART_ID, { status: 'complete' });
      chat.updateMessage(messageId, { streaming: false });
      cancelStream = null;
      return;
    }
    const ev = events[i++];
    if (typeof ev.reasoning === 'string') {
      reasoningText += ev.reasoning;
      chat.updatePart(messageId, REASONING_PART_ID, {
        text: reasoningText,
        status: 'streaming',
      });
    }
    if (typeof ev.content === 'string') {
      contentText += ev.content;
      if (!hasContentPart) {
        chat.appendPart(
          messageId,
          textPart(contentText, { id: CONTENT_PART_ID, status: 'streaming' }),
        );
        hasContentPart = true;
      } else {
        chat.updatePart(messageId, CONTENT_PART_ID, {
          text: contentText,
          status: 'streaming',
        });
      }
    }
    timer = setTimeout(step, nextDelay(ev));
  }
  step();
}

function responseThinking(chatRef) {
  const chat = chatRef.value;
  const aiId = nextId();
  chat.addMessage({
    id: aiId,
    role: 'assistant',
    parts: [reasoningPart('', { id: REASONING_PART_ID, status: 'streaming' })],
    streaming: true,
    timestamp: Date.now(),
  });

  const startTimer = setTimeout(() => {
    if (cancelStream !== cancelBeforeStart) return;
    cancelStream = null;
    playEvents(chatRef, aiId, thinkingDemoEvents);
  }, 3000);

  const cancelBeforeStart = () => {
    clearTimeout(startTimer);
    if (cancelStream === cancelBeforeStart) cancelStream = null;
  };
  cancelStream = cancelBeforeStart;
}

/** Add any message (self / peer / assistant / reasoning / streaming flags). */
export function addMessage(chatRef, partial) {
  chatRef.value.addMessage({
    ...partial,
    id: partial.id ?? nextId(),
    timestamp: partial.timestamp ?? Date.now(),
  });
}

/** Stop the synthetic `playEvents` timer (thinking / streaming demo). Call before `i-chat` / `i-chat-messages` `.cancel()`. */
export function cancelPendingStreamPlayback() {
  if (cancelStream) cancelStream();
}

export function setStreamingFromDetail(streamingRef, e) {
  streamingRef.value = e.detail.streaming;
}

export function handleDemoMessageAction(e) {
  const { action, message } = e.detail;
  if (action === 'copy') navigator.clipboard.writeText(getMessageText(message));
  else if (action === 'like') console.info('[chat-demo] like', message.id);
}

export function reply(chatRef, question) {
  const chat = chatRef.value;
  chat.addMessage({
    id: nextId(),
    role: 'self',
    parts: [textPart(question)],
    timestamp: Date.now(),
  });

  const q = question.toLowerCase();
  const result = Object.entries(demoData).find(([label]) =>
    label.toLowerCase().includes(q),
  )?.[1];
  if (result) {
    chat.addMessage({
      id: nextId(),
      role: 'assistant',
      parts: [textPart(result)],
      timestamp: Date.now(),
      streaming: false,
    });
    return false;
  }

  responseThinking(chatRef);
  return true;
}
