/**
 * Demo responses — chart data for @bndynet/icharts via ```chart fence blocks.
 *
 * Each entry in `charts` maps to a ChartInput shape accepted by chart-renderer.ts.
 *
 * XY charts (bar / line / area):
 *   { "type": "bar", "categories": [...], "series": [{ "name": "...", "data": [...] }] }
 *
 * Pie:
 *   { "type": "pie", "data": [{ "name": "...", "value": N }] }
 *
 * Gauge:
 *   { "type": "gauge", "gauge": { "value": 72, "max": 100, "label": "Score" } }
 *
 * Optional fields:
 *   "variant"  — doughnut | half-doughnut | nightingale | horizontal | spark | percentage
 *   "stacked"  — true/false (XY charts)
 *   "theme"    — "dark" or custom registered name
 *   "echarts"  — arbitrary ECharts option passthrough
 */
(function (global) {

  // ── XY charts ──────────────────────────────────────────────────────────────

  var bar = {
    type: 'bar',
    data: {
      categories: ['JavaScript', 'Python', 'TypeScript', 'Java', 'Rust', 'Go'],
      series: [{ name: 'Popularity index', data: [95, 88, 78, 65, 42, 38] }],
    },
    options: { title: 'Most Popular Languages 2025' },
  };

  var barHorizontal = {
    type: 'bar',
    data: {
      categories: ['React', 'Vue', 'Angular', 'Svelte', 'Solid', 'Qwik'],
      series: [{ name: 'GitHub stars', data: [220, 207, 93, 77, 32, 20] }],
    },
    options: { title: 'Top Frameworks — Stars (k)', variant: 'horizontal' },
  };

  var barStacked = {
    type: 'bar',
    data: {
      categories: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      series: [
        { name: 'Organic',  data: [820, 932, 901, 934, 1290, 1330, 1320] },
        { name: 'Paid',     data: [320, 402, 401, 434,  790,  830,  820] },
        { name: 'Referral', data: [120, 132, 101, 134,  190,  230,  210] },
      ],
    },
    options: { title: 'Weekly Traffic by Channel', stacked: true },
  };

  var line = {
    type: 'line',
    data: {
      categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
      series: [
        { name: 'Product A', data: [120, 135, 101, 134, 190, 230] },
        { name: 'Product B', data: [80,  92,  120,  98, 150, 170] },
      ],
    },
    options: { title: 'Monthly Revenue 2025' },
  };

  var area = {
    type: 'area',
    data: {
      categories: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      series: [{ name: 'Visitors', data: [820, 932, 901, 934, 1290, 1330, 1320] }],
    },
    options: { title: 'Website Visitors' },
  };

  var sparkLine = {
    type: 'line',
    data: {
      categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'],
      series: [{ name: 'Trend', data: [5, 8, 3, 9, 6, 11, 7, 13] }],
    },
    options: { variant: 'spark' },
  };

  // ── Pie variants ───────────────────────────────────────────────────────────

  var browserData = [
    { name: 'Chrome',  value: 65 },
    { name: 'Safari',  value: 18 },
    { name: 'Firefox', value: 7  },
    { name: 'Edge',    value: 5  },
    { name: 'Other',   value: 5  },
  ];

  var pie = {
    type: 'pie',
    data: browserData,
    options: { title: 'Browser Market Share' },
  };

  var doughnut = {
    type: 'pie',
    data: browserData,
    options: { title: 'Browser Market Share — Doughnut', variant: 'doughnut' },
  };

  var nightingale = {
    type: 'pie',
    data: browserData,
    options: { title: 'Browser Market Share — Nightingale Rose', variant: 'nightingale' },
  };

  // ── Gauge variants ─────────────────────────────────────────────────────────

  var gauge = {
    type: 'gauge',
    data: { value: 72, max: 100, label: 'Score' },
    options: { title: 'Server Response Score' },
  };

  var gaugePct = {
    type: 'gauge',
    data: { value: 63, label: 'CPU' },
    options: { title: 'CPU Usage', variant: 'percentage' },
  };

  // ── Serialise ──────────────────────────────────────────────────────────────

  var charts = {
    bar, barHorizontal, barStacked,
    line, area, sparkLine,
    pie, doughnut, nightingale,
    gauge, gaugePct,
  };

  var chartJson = {};
  Object.keys(charts).forEach(function (k) {
    chartJson[k] = JSON.stringify(charts[k], null, 2);
  });

  // ── Exports ────────────────────────────────────────────────────────────────

  global.DemoResponses = {
    sse: {
      thinkingDemo: {
        baseDelayMs: 48,
        jitterMs: 28,
        minNetworkChunk: 24,
        maxNetworkChunk: 56,
      },
    },

    userPrompt: 'thinking',

    charts: charts,
    chartJson: chartJson,

    thinkingDemoEvents: [
      {
        reasoning:
          '**Parse intent:** User sent the keyword `thinking`. Treat this as a request to demo extended thinking — streamed reasoning separate from the visible reply.\n\n',
      },
      {
        reasoning:
          '<!-- bid:plan -->\n' +
          '1. [done] **Scope** — Keep reasoning in the collapsible block only; final answer stays in the main bubble (Markdown).\n' +
          '2. [done] **Pace** — Server uses a longer delay between `reasoning` chunks so the \u201cthinking\u201d phase feels deliberate.\n' +
          '3. [done] **Structure** — Outline \u2192 constraints \u2192 verification, then switch to `content` chunks for the user-visible text.\n' +
          '4. [done] **UX** — User can expand 推理过程 to audit steps; default view emphasizes the answer, not the scratchpad.\n' +
          '5. [done] **Contract** — Same SSE line shape as production: optional `reasoning` + `content` per event; `[DONE]` at end.\n' +
          '6. [done] **Edge cases** — If only reasoning streams first, UI should not flash an empty assistant body; show thinking block immediately.\n\n',
      },
      {
        reasoning:
          '**Sanity check:** Reasoning text must not duplicate into the Markdown body unless we intentionally mirror a summary.\n\n',
      },
      {
        content: '## Thinking demo\n\n',
      },
      {
        content:
          'Above, multiple **plan** steps streamed first (parse intent → scope → pace → structure → UX → contract → edge cases → sanity check). The UI shows them in the expandable **thinking** block (推理过程).\n\n',
      },
      {
        content:
          'This paragraph is normal assistant **`content`** — same SSE endpoint as the demo, with optional `reasoning` per chunk.\n\n',
      },
      {
        content:
          '## Markdown in the bubble\n\n' +
          'Unordered list:\n\n' +
          '- **Streaming** — chunks append as they arrive.\n' +
          '- **Reasoning** — optional collapsible block above the fold.\n' +
          '- **Markdown** — headings, lists, tables, and fences.\n\n' +
          'Nested list:\n\n' +
          '- Parent A\n' +
          '  - Child A.1\n' +
          '  - Child A.2\n' +
          '- Parent B\n\n',
      },
      {
        content:
          'Ordered steps:\n\n' +
          '1. Open the demo page.\n' +
          '2. Run **Thinking** — watch reasoning stream first.\n' +
          '3. Scroll the assistant bubble for lists, table, and charts below.\n\n',
      },
      {
        content:
          '> **Blockquote:** Use this for callouts or quoted context. ' +
          'The renderer uses markdown-it with `linkify` and typographic quotes.\n\n' +
          '---\n\n',
      },
      {
        content:
          'GFM-style table:\n\n' +
          '| Feature | Notes |\n' +
          '| --- | --- |\n' +
          '| Lists | `-` / `1.` with optional nesting |\n' +
          '| Tables | Pipe rows + header separator row |\n' +
          '| Code | Indented block or fenced blocks (e.g. `ts`) |\n\n',
      },
      {
        content:
          'Inline code: `registerChartWithRegistry`, `data: [DONE]`, and links like [markdown-it](https://github.com/markdown-it/markdown-it).\n\n',
      },
      {
        content:
          '## Timeline\n\n' +
          'Vertical timeline with status indicators:\n\n' +
          '<!-- bid:dev -->\n' +
          '1. [done] Collect requirements from stakeholders\n' +
          '2. [done] Design system architecture and data models\n' +
          '3. [active] Implement core API endpoints\n' +
          '4. [pending] Write integration tests\n' +
          '5. [error] Deploy to staging (rollback triggered)\n' +
          '6. [skipped] Performance benchmarking\n\n',
      },
    ],
  };
})(typeof window !== 'undefined' ? window : globalThis);
