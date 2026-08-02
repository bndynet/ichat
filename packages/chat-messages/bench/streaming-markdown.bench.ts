import { renderMarkdownLight } from '../src/renderers/markdown-renderer.js';

interface BenchmarkScenario {
  kind: 'plain' | 'markdown';
  sizeKiB: 2 | 10 | 50;
  updatesPerSecond: 15 | 30 | 60;
}

interface BenchmarkResult extends BenchmarkScenario {
  bytes: number;
  medianBatchMs: number;
  p95BatchMs: number;
  medianRenderMs: number;
  rendersWithinFramePct: number;
}

const WARMUP_RUNS = 2;
const MEASURED_RUNS = 7;
const FRAME_BUDGET_MS = 1000 / 60;

const PLAIN_BLOCK =
  'Streaming chat content should remain responsive while tokens are appended to the current message. ';
const MARKDOWN_BLOCK = [
  '## Streaming response',
  '',
  '- Parse **Markdown** incrementally',
  '- Keep [safe links](https://example.test/docs) interactive',
  '- Preserve `inline code` and lists',
  '',
  '```ts',
  'const next = previous + token;',
  '```',
  '',
].join('\n');

function contentOfSize(kind: BenchmarkScenario['kind'], sizeKiB: number): string {
  const targetBytes = sizeKiB * 1024;
  const block = kind === 'plain' ? PLAIN_BLOCK : MARKDOWN_BLOCK;
  let value = '';

  // Fixtures are ASCII-only, so string length and UTF-8 byte length match.
  while (value.length < targetBytes) value += block;
  return value.slice(0, targetBytes);
}

function percentile(values: readonly number[], fraction: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * fraction) - 1)];
}

function renderBatch(content: string, updates: number): number[] {
  const timings: number[] = [];

  for (let update = 1; update <= updates; update += 1) {
    const end = Math.ceil((content.length * update) / updates);
    const startedAt = performance.now();
    renderMarkdownLight(content.slice(0, end));
    timings.push(performance.now() - startedAt);
  }

  return timings;
}

function measureScenario(scenario: BenchmarkScenario): BenchmarkResult {
  const content = contentOfSize(scenario.kind, scenario.sizeKiB);

  for (let run = 0; run < WARMUP_RUNS; run += 1) {
    renderBatch(content, scenario.updatesPerSecond);
  }

  const batchTimings: number[] = [];
  const renderTimings: number[] = [];
  for (let run = 0; run < MEASURED_RUNS; run += 1) {
    const timings = renderBatch(content, scenario.updatesPerSecond);
    renderTimings.push(...timings);
    batchTimings.push(timings.reduce((total, value) => total + value, 0));
  }

  const withinFrame = renderTimings.filter((value) => value <= FRAME_BUDGET_MS).length;
  return {
    ...scenario,
    bytes: content.length,
    medianBatchMs: percentile(batchTimings, 0.5),
    p95BatchMs: percentile(batchTimings, 0.95),
    medianRenderMs: percentile(renderTimings, 0.5),
    rendersWithinFramePct: (withinFrame / renderTimings.length) * 100,
  };
}

const scenarios: BenchmarkScenario[] = [];
for (const kind of ['plain', 'markdown'] as const) {
  for (const sizeKiB of [2, 10, 50] as const) {
    for (const updatesPerSecond of [15, 30, 60] as const) {
      scenarios.push({ kind, sizeKiB, updatesPerSecond });
    }
  }
}

const results = scenarios.map(measureScenario);
const runtimeProcess = (globalThis as typeof globalThis & {
  process?: { version: string; platform: string; arch: string };
}).process;

if (runtimeProcess) {
  console.log(
    `Node ${runtimeProcess.version} · ${runtimeProcess.platform}/${runtimeProcess.arch}`,
  );
}
console.log(
  'Scope: markdown-it + streaming renderer only; browser DOM patch/layout and terminal DOMPurify are excluded.',
);
console.table(
  results.map((result) => ({
    kind: result.kind,
    size: `${result.sizeKiB} KiB`,
    'updates/s': result.updatesPerSecond,
    'median batch (ms)': result.medianBatchMs.toFixed(2),
    'p95 batch (ms)': result.p95BatchMs.toFixed(2),
    'median render (ms)': result.medianRenderMs.toFixed(3),
    '<=16.7ms': `${result.rendersWithinFramePct.toFixed(1)}%`,
  })),
);
