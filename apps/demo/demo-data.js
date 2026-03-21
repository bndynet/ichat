/**
 * DemoData — content-only scenarios for auto-generated demo buttons.
 *
 * Each entry is [label, assistantMarkdown].
 * demo.js creates one button per entry; clicking it renders the markdown
 * directly as an assistant message — no special logic needed.
 *
 * To add a new scenario: append one line here. That's it.
 *
 * Depends on: demo-responses.js (DemoResponses.chartJson)
 */
(function (global) {
  var cj = (global.DemoResponses && global.DemoResponses.chartJson) || {};

  global.DemoData = [

    ['Charts',
      'Here are the chart types supported by **@bndynet/icharts**.\n\n' +

      '## XY Charts\n\n' +
      '### Bar\n\n' +
      '```chart\n' + (cj.bar || '') + '\n```\n\n' +
      '### Bar — Horizontal\n\n' +
      '```chart\n' + (cj.barHorizontal || '') + '\n```\n\n' +
      '### Bar — Stacked\n\n' +
      '```chart\n' + (cj.barStacked || '') + '\n```\n\n' +
      '### Line\n\n' +
      '```chart\n' + (cj.line || '') + '\n```\n\n' +
      '### Area\n\n' +
      '```chart\n' + (cj.area || '') + '\n```\n\n' +
      '### Spark Line (mini, no axes)\n\n' +
      '```chart\n' + (cj.sparkLine || '') + '\n```\n\n' +

      '## Pie Variants\n\n' +
      '### Pie\n\n' +
      '```chart\n' + (cj.pie || '') + '\n```\n\n' +
      '### Doughnut\n\n' +
      '```chart\n' + (cj.doughnut || '') + '\n```\n\n' +
      '### Nightingale Rose\n\n' +
      '```chart\n' + (cj.nightingale || '') + '\n```\n\n' +

      '## Gauge Variants\n\n' +
      '### Gauge\n\n' +
      '```chart\n' + (cj.gauge || '') + '\n```\n\n' +
      '### Gauge — Percentage\n\n' +
      '```chart\n' + (cj.gaugePct || '') + '\n```'],

    ['KPI Cards',
      'Here is the KPI summary for today:\n\n' +
      '```kpi\n{"label": "Revenue", "value": "$50,846.90", "trend": -12}\n```\n\n' +
      '```kpi\n{"label": "New Users", "value": "1,284", "trend": 8, "unit": ""}\n```\n\n' +
      '```kpi\n{"label": "Churn Rate", "value": "3.2%", "trend": 0.5, "unit": "pp"}\n```\n\n' +
      '```kpi\n{"label": "MRR", "value": "$128,400"}\n```'],

    ['Form',
      'Please fill out the feedback form below:\n\n' +
      '```form\n' +
      '{\n' +
      '  "id": "user-feedback",\n' +
      '  "title": "User Feedback",\n' +
      '  "submitLabel": "Send Feedback",\n' +
      '  "fields": [\n' +
      '    { "name": "name", "label": "Your Name", "type": "text", "required": true, "placeholder": "Enter your name" },\n' +
      '    { "name": "email", "label": "Email", "type": "email", "required": true, "placeholder": "you@example.com" },\n' +
      '    { "name": "period", "label": "Report Period", "type": "date-range", "rangeLabels": ["From", "To"] },\n' +
      '    { "name": "satisfaction", "label": "Satisfaction", "type": "select", "options": ["Very Satisfied", "Satisfied", "Neutral", "Dissatisfied"] },\n' +
      '    { "name": "source", "label": "How did you hear about us?", "type": "radio", "options": ["Search engine", "Social media", "Word of mouth", "Other"] },\n' +
      '    { "name": "subscribe", "label": "Subscribe to newsletter", "type": "checkbox" },\n' +
      '    { "name": "comments", "label": "Additional Comments", "type": "textarea", "placeholder": "Anything else you\'d like to share..." }\n' +
      '  ]\n' +
      '}\n' +
      '```'],

    ['KPI Group',
      'Here is the combined KPI overview:\n\n' +
      '```kpis\n' +
      '[\n' +
      '  {"label": "Revenue", "value": "$50,846.90", "trend": -12},\n' +
      '  {"label": "New Users", "value": "1,284", "trend": 8},\n' +
      '  {"label": "MRR", "value": "$128,400"}\n' +
      ']\n' +
      '```'],

    ['Details (fence)',
      'The following sections use the **fence syntax** (`\`\`\`details Title`) to collapse content.\n\n' +

      '```details 📋 Project Overview\n' +
      'This project aims to build a modern chat interface with rich markdown support.\n\n' +
      '**Goals:**\n\n' +
      '- Streaming assistant messages with typewriter effect\n' +
      '- Collapsible reasoning / thinking blocks\n' +
      '- Custom renderers: charts, KPI cards, timelines, forms\n' +
      '- Collapsible sections via `:::details` or ` ```details `\n' +
      '```\n\n' +

      '```details 🔍 Technical Details\n' +
      'Built on top of **Lit** (web components) and **markdown-it**.\n\n' +
      '| Layer | Technology |\n' +
      '| --- | --- |\n' +
      '| UI components | Lit / Web Components |\n' +
      '| Markdown | markdown-it + custom plugins |\n' +
      '| Sanitisation | DOMPurify |\n' +
      '| Code highlight | highlight.js |\n\n' +
      'Inline code: `renderMarkdown()`, `rendererRegistry`, `collapsiblePlugin`.\n' +
      '```\n\n' +

      '```details 🚧 Deployment Steps\n' +
      '1. [done] Build all packages\n' +
      '2. [done] Run unit tests\n' +
      '3. [active] Deploy to staging environment\n' +
      '4. [pending] QA sign-off\n' +
      '5. [pending] Production release\n' +
      '```'],

    ['Details (container)',
      'The following sections use the **container syntax** (`:::details Title`) for collapsible blocks.\n\n' +

      ':::details 📋 Project Overview\n' +
      'This project aims to build a modern chat interface with rich markdown support.\n\n' +
      '**Goals:**\n\n' +
      '- Streaming assistant messages with typewriter effect\n' +
      '- Collapsible reasoning / thinking blocks\n' +
      '- Custom renderers: charts, KPI cards, timelines, forms\n' +
      '- Collapsible sections via `:::details` or ` ```details `\n' +
      ':::\n\n' +

      ':::details 🔍 Technical Details\n' +
      'Built on top of **Lit** (web components) and **markdown-it**.\n\n' +
      '| Layer | Technology |\n' +
      '| --- | --- |\n' +
      '| UI components | Lit / Web Components |\n' +
      '| Markdown | markdown-it + custom plugins |\n' +
      '| Sanitisation | DOMPurify |\n' +
      '| Code highlight | highlight.js |\n\n' +
      'Inline code: `renderMarkdown()`, `rendererRegistry`, `collapsiblePlugin`.\n' +
      ':::\n\n' +

      ':::details 🚧 Deployment Steps\n' +
      '1. [done] Build all packages\n' +
      '2. [done] Run unit tests\n' +
      '3. [active] Deploy to staging environment\n' +
      '4. [pending] QA sign-off\n' +
      '5. [pending] Production release\n' +
      ':::'],

  ];

})(typeof window !== 'undefined' ? window : globalThis);
