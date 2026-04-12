// Chart JSON helpers
const chart = obj => '```chart\n' + JSON.stringify(obj, null, 2) + '\n```'

const charts = {
  bar: chart({ type: 'bar', data: { categories: ['JS', 'Python', 'TS', 'Java', 'Rust', 'Go'], series: [{ name: 'Popularity', data: [95, 88, 78, 65, 42, 38] }] }, options: { title: 'Most Popular Languages 2025' } }),
  barH: chart({ type: 'bar', data: { categories: ['React', 'Vue', 'Angular', 'Svelte'], series: [{ name: 'Stars (k)', data: [220, 207, 93, 77] }] }, options: { title: 'Framework Stars', variant: 'horizontal' } }),
  line: chart({ type: 'line', data: { categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'], series: [{ name: 'Revenue', data: [3200, 4500, 3800, 5100, 4700, 6200] }] }, options: { title: 'Monthly Revenue 2025' } }),
  area: chart({ type: 'area', data: { categories: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], series: [{ name: 'Visitors', data: [820, 932, 901, 934, 1290, 1330, 1320] }] }, options: { title: 'Website Visitors' } }),
  pie: chart({ type: 'pie', data: [{ name: 'Chrome', value: 65 }, { name: 'Safari', value: 18 }, { name: 'Firefox', value: 7 }, { name: 'Edge', value: 5 }, { name: 'Other', value: 5 }], options: { title: 'Browser Market Share' } }),
  doughnut: chart({ type: 'pie', data: [{ name: 'Chrome', value: 65 }, { name: 'Safari', value: 18 }, { name: 'Firefox', value: 7 }, { name: 'Other', value: 10 }], options: { title: 'Browser Share — Doughnut', variant: 'doughnut' } }),
  gauge: chart({ type: 'gauge', data: { value: 72, max: 100, label: 'Score' }, options: { title: 'Server Response Score' } }),
}

/** @type {Array<[string, string]>} Each entry is [buttonLabel, markdownContent] */
export const demoData = [

  ['Charts',
    'Here are the chart types supported by **@bndynet/icharts**.\n\n' +
    '## XY Charts\n\n### Bar\n\n' + charts.bar + '\n\n### Bar — Horizontal\n\n' + charts.barH + '\n\n' +
    '### Line\n\n' + charts.line + '\n\n### Area\n\n' + charts.area + '\n\n' +
    '## Pie\n\n' + charts.pie + '\n\n### Doughnut\n\n' + charts.doughnut + '\n\n' +
    '## Gauge\n\n' + charts.gauge],

  ['KPI Cards',
    'Here is the KPI summary for today:\n\n' +
    '```kpi\n{"label": "Revenue", "value": "$50,846.90", "trend": -12}\n```\n\n' +
    '```kpi\n{"label": "New Users", "value": "1,284", "trend": 8}\n```\n\n' +
    '```kpi\n{"label": "Churn Rate", "value": "3.2%", "trend": 0.5, "unit": "pp"}\n```\n\n' +
    '```kpi\n{"label": "MRR", "value": "$128,400"}\n```'],

  ['KPI Group',
    'Here is the combined KPI overview:\n\n' +
    '```kpis\n[\n  {"label": "Revenue", "value": "$50,846.90", "trend": -12},\n  {"label": "New Users", "value": "1,284", "trend": 8},\n  {"label": "MRR", "value": "$128,400"}\n]\n```'],

  ['Form',
    'Please fill out the feedback form below:\n\n' +
    '```form\n' +
    '{\n' +
    '  "id": "user-feedback",\n' +
    '  "title": "User Feedback",\n' +
    '  "submitLabel": "Send Feedback",\n' +
    '  "fields": [\n' +
    '    {"name": "name", "label": "Your Name", "type": "text", "required": true},\n' +
    '    {"name": "email", "label": "Email", "type": "email"},\n' +
    '    {"name": "satisfaction", "label": "Satisfaction", "type": "select", "options": ["Very Satisfied", "Satisfied", "Neutral", "Dissatisfied"]},\n' +
    '    {"name": "source", "label": "How did you find us?", "type": "radio", "options": ["Search", "Social media", "Word of mouth", "Other"]},\n' +
    '    {"name": "subscribe", "label": "Subscribe to newsletter", "type": "checkbox"},\n' +
    '    {"name": "comments", "label": "Additional Comments", "type": "textarea"}\n' +
    '  ]\n' +
    '}\n' +
    '```'],

  ['Details (fence)',
    'The following use the **fence syntax** (` ```details Title `) to collapse content.\n\n' +
    '```details 📋 Project Overview\n' +
    'A modern chat interface with rich markdown support.\n\n' +
    '**Features:**\n- Streaming messages with typewriter effect\n- Collapsible reasoning blocks\n- Charts, KPI cards, timelines, forms\n' +
    '```\n\n' +
    '```details 🔍 Tech Stack\n' +
    '| Layer | Technology |\n| --- | --- |\n| UI | Lit / Web Components |\n| Markdown | markdown-it |\n| Charts | ECharts via @bndynet/icharts |\n| Sanitisation | DOMPurify |\n' +
    '```'],

  ['Details (container)',
    'The following use the **container syntax** (`:::details Title`) for collapsible blocks.\n\n' +
    ':::details 📋 Project Overview\n' +
    'A modern chat interface with rich markdown support.\n\n' +
    '**Features:**\n- Streaming messages\n- Collapsible reasoning blocks\n- Custom renderers\n' +
    ':::\n\n' +
    ':::details 🔍 Tech Stack\n' +
    '| Layer | Technology |\n| --- | --- |\n| UI | Lit / Web Components |\n| Markdown | markdown-it |\n| Charts | ECharts |\n' +
    ':::'],

]

/** Streaming thinking demo — reuses `demoData` markdown so one stream shows charts, KPI, form, details, and timeline. */
export const thinkingDemoEvents = [
  { reasoning: '**Parse intent:** User sent `thinking`. Demo **all-in-one** — same SSE shape as production (`reasoning` + `content`), but the reply body pulls in every preset from `demoData`: Charts → KPI cards → KPI group → Form → Details (fence + container) → Markdown notes → dev timeline.\n\n' },
  { reasoning: '<!-- bid:plan -->\n1. [done] **Scope** — Reasoning stays in the collapsible block; body streams preset content by reference.\n2. [done] **Charts** — `charts.*` fences via preset `demoData[0]`.\n3. [done] **KPI** — `kpi` / `kpis` blocks from presets `[1]` and `[2]`.\n4. [done] **Form** — JSON form fence from preset `[3]`.\n5. [done] **Details** — Fence + container variants from presets `[4]` and `[5]`.\n6. [done] **Pace** — Chunked `content` events so streaming stays visible.\n7. [done] **UX** — Expand thinking (推理过程); answer emphasizes widgets + timeline.\n8. [done] **Contract** — Optional `reasoning` + `content` per event.\n\n' },
  { reasoning: '**Sanity check:** Reasoning must not duplicate into the Markdown body; preset strings are appended only under `content`.\n\n', delay: 8000 },
  { content: '## All-in-one streaming demo\n\n' },
  { content: 'Plan steps above streamed as **reasoning**; below, the same markdown as the sidebar presets (single pass).\n\n' },
  { content: demoData[0][1] + '\n\n' },
  { content: demoData[1][1] + '\n\n' },
  { content: demoData[2][1] + '\n\n' },
  { content: demoData[3][1] + '\n\n' },
  { content: demoData[4][1] + '\n\n' },
  { content: demoData[5][1] + '\n\n' },
  { content: '## Markdown in the bubble\n\nUnordered list:\n\n- **Streaming** — chunks append as they arrive.\n- **Reasoning** — optional collapsible block above the fold.\n- **Markdown** — headings, lists, tables, and fences.\n\n' },
  { content: 'GFM-style table:\n\n| Feature | Notes |\n| --- | --- |\n| Lists | `-` / `1.` with optional nesting |\n| Tables | Pipe rows + header separator row |\n| Code | Indented block or fenced blocks |\n\n' },
  { content: '## Timeline\n\nVertical timeline with status indicators:\n\n<!-- bid:dev -->\n1. [done] Collect requirements from stakeholders\n2. [done] Design system architecture\n3. [active] Implement core API endpoints\n4. [pending] Write integration tests\n5. [error] Deploy to staging (rollback triggered)\n6. [skipped] Performance benchmarking\n\n' },
]
