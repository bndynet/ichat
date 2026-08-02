import {
  invalidateMarkdownCache,
  renderMarkdownInto,
} from '../../src/renderers/markdown-morph.js';
import { renderMarkdownLight } from '../../src/renderers/markdown-renderer.js';
import { streamingRenderDelayMs } from '../../src/streaming-render-policy.js';
import '../../src/components/chat-text-part.js';
import type { TextPart } from '../../src/types.js';

type ContentKind = 'plain' | 'markdown';
type SizeKiB = 2 | 10 | 50;
type UpdatesPerSecond = 15 | 30 | 60;

interface Scenario {
  kind: ContentKind;
  sizeKiB: SizeKiB;
  updatesPerSecond: UpdatesPerSecond;
}

interface ScenarioResult extends Scenario {
  sourceUpdates: number;
  renderedUpdates: number;
  updateBudgetMs: number;
  p95ParseMs: number;
  p95DomMs: number;
  p95TotalMs: number;
  withinBudgetPct: number;
  streamingWorkPct: number;
  droppedFramePct: number;
  terminalMs: number;
  longTasks: number;
  passed: boolean;
  failures: string[];
}

interface BrowserBenchmarkReport {
  status: 'complete';
  passed: boolean;
  generatedAt: string;
  userAgent: string;
  budgets: typeof BUDGETS;
  componentValidation: ComponentValidation;
  results: ScenarioResult[];
}

interface ComponentValidation {
  passed: boolean;
  trailingFlushMs: number;
  terminalTransitionMs: number;
  failures: string[];
}

declare global {
  interface Window {
    __ICHAT_BENCHMARK__?:
      | { status: 'idle' | 'running'; progress?: string }
      | BrowserBenchmarkReport;
  }
}

const FRAME_BUDGET_MS = 1000 / 60;
const BUDGETS = {
  p95StreamingUpdateMs: {
    standard: FRAME_BUDGET_MS,
    large: 40,
  },
  updatesWithinBudgetPct: 95,
  streamingWorkPct: 40,
  droppedFramePct: 5,
  terminalRenderMs: {
    small: 50,
    large: 100,
  },
  trailingFlushMs: 150,
  longTasks: {
    standard: 0,
    large: 1,
  },
} as const;

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

const scenarios: Scenario[] = [];
for (const kind of ['plain', 'markdown'] as const) {
  for (const sizeKiB of [2, 10, 50] as const) {
    for (const updatesPerSecond of [15, 30, 60] as const) {
      scenarios.push({ kind, sizeKiB, updatesPerSecond });
    }
  }
}

const stage = requiredElement<HTMLDivElement>('stage');
const runButton = requiredElement<HTMLButtonElement>('run');
const statusElement = requiredElement<HTMLSpanElement>('status');
const resultsElement = requiredElement<HTMLTableSectionElement>('results');
const jsonElement = requiredElement<HTMLPreElement>('json');

function requiredElement<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Missing benchmark element #${id}`);
  return element as T;
}

function contentOfSize(kind: ContentKind, sizeKiB: number): string {
  const targetLength = sizeKiB * 1024;
  const block = kind === 'plain' ? PLAIN_BLOCK : MARKDOWN_BLOCK;
  let value = '';
  while (value.length < targetLength) value += block;
  return value.slice(0, targetLength);
}

function percentile(values: readonly number[], fraction: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * fraction) - 1)];
}

function nextFrame(): Promise<number> {
  return new Promise((resolve) => requestAnimationFrame(resolve));
}

async function warmUpScenario(
  content: string,
  partId: string,
  sourceUpdates: number,
): Promise<void> {
  // Warm the path with the first realistic stream snapshot. Warming with the
  // complete 50 KiB DOM creates a large garbage-collection burst immediately
  // before measurement and makes the benchmark itself the source of a long task.
  const snapshot = content.slice(0, Math.ceil(content.length / sourceUpdates));
  const html = renderMarkdownLight(snapshot);
  stage.innerHTML = html;
  void stage.offsetHeight;
  renderMarkdownInto(stage, snapshot, {
    previousHtml: html,
    partId: `${partId}-warmup`,
  });
  void stage.offsetHeight;
  invalidateMarkdownCache(`${partId}-warmup`);
  stage.replaceChildren();

  // Keep module initialisation, style calculation, and observer delivery out of
  // the measured scenario. The Node benchmark follows the same warm-up rule.
  await nextFrame();
}

async function validateComponentScheduling(): Promise<ComponentValidation> {
  const element = document.createElement('i-chat-text-part');
  const initialContent = `${'streaming content '.repeat(2048)}INITIAL_MARKER`;
  const latestContent = `${initialContent}\nLATEST_STREAM_MARKER`;
  const data: TextPart = {
    id: 'browser-component-validation',
    type: 'text',
    text: latestContent,
    status: 'streaming',
  };
  element.data = data;
  element.content = initialContent;
  stage.replaceChildren(element);
  await element.updateComplete;

  const trailingStartedAt = performance.now();
  const trailingFlushMs = await new Promise<number>((resolve, reject) => {
    const timeout = window.setTimeout(() => reject(new Error('Trailing stream render timed out')), 250);
    element.addEventListener('chat-text-part-updated', () => {
      window.clearTimeout(timeout);
      resolve(performance.now() - trailingStartedAt);
    }, { once: true });
    element.content = latestContent;
  });
  await element.updateComplete;

  const failures: string[] = [];
  if (!element.textContent?.includes('LATEST_STREAM_MARKER')) {
    failures.push('latest streaming content');
  }
  if (trailingFlushMs > BUDGETS.trailingFlushMs) failures.push('trailing flush latency');

  const terminalStartedAt = performance.now();
  element.data = { ...data, text: 'Terminal **safe** marker', status: 'complete' };
  element.content = 'Terminal **safe** marker';
  await element.updateComplete;
  const terminalTransitionMs = performance.now() - terminalStartedAt;
  if (!element.querySelector('strong')?.textContent?.includes('safe')) {
    failures.push('terminal render');
  }
  if (terminalTransitionMs > BUDGETS.terminalRenderMs.small) {
    failures.push('terminal transition latency');
  }

  element.remove();
  return {
    passed: failures.length === 0,
    trailingFlushMs,
    terminalTransitionMs,
    failures,
  };
}

async function runScenario(scenario: Scenario, index: number): Promise<ScenarioResult> {
  const content = contentOfSize(scenario.kind, scenario.sizeKiB);
  const partId = `browser-benchmark-${index}`;
  const parseSamples: number[] = [];
  const domSamples: number[] = [];
  const totalSamples: number[] = [];
  const frameTimes: number[] = [];
  const longTaskEntries: PerformanceEntry[] = [];
  let previousFrame: number | undefined;
  let previousHtml = '';
  let lastRenderedAt = Number.NEGATIVE_INFINITY;

  await warmUpScenario(content, partId, scenario.updatesPerSecond);

  const longTaskObserver = typeof PerformanceObserver !== 'undefined'
    ? new PerformanceObserver((list) => longTaskEntries.push(...list.getEntries()))
    : undefined;
  try {
    longTaskObserver?.observe({ type: 'longtask', buffered: false });
  } catch {
    // Long Task API is optional; unsupported browsers report zero entries.
  }

  const startedAt = performance.now();
  const interval = 1000 / scenario.updatesPerSecond;

  for (let update = 1; update <= scenario.updatesPerSecond; update += 1) {
    const targetTime = startedAt + update * interval;
    let frameTime: number;
    do {
      frameTime = await nextFrame();
      if (previousFrame !== undefined) frameTimes.push(frameTime - previousFrame);
      previousFrame = frameTime;
    } while (frameTime < targetTime - 1);

    const end = Math.ceil((content.length * update) / scenario.updatesPerSecond);
    const snapshot = content.slice(0, end);
    const totalStartedAt = performance.now();
    if (streamingRenderDelayMs(snapshot.length, totalStartedAt, lastRenderedAt) > 1) {
      continue;
    }
    lastRenderedAt = totalStartedAt;
    const parseStartedAt = totalStartedAt;
    const html = renderMarkdownLight(snapshot);
    const parseEndedAt = performance.now();
    stage.innerHTML = html;
    void stage.offsetHeight;
    const domEndedAt = performance.now();

    parseSamples.push(parseEndedAt - parseStartedAt);
    domSamples.push(domEndedAt - parseEndedAt);
    totalSamples.push(domEndedAt - totalStartedAt);
    previousHtml = html;
  }
  const streamingElapsedMs = performance.now() - startedAt;

  const terminalStartedAt = performance.now();
  renderMarkdownInto(stage, content, { previousHtml, partId });
  void stage.offsetHeight;
  const terminalMs = performance.now() - terminalStartedAt;
  await nextFrame();
  await nextFrame();
  longTaskObserver?.disconnect();
  invalidateMarkdownCache(partId);

  const p95ParseMs = percentile(parseSamples, 0.95);
  const p95DomMs = percentile(domSamples, 0.95);
  const p95TotalMs = percentile(totalSamples, 0.95);
  const updateBudgetMs = scenario.sizeKiB === 50
    ? BUDGETS.p95StreamingUpdateMs.large
    : BUDGETS.p95StreamingUpdateMs.standard;
  const withinBudgetPct =
    (totalSamples.filter((sample) => sample <= updateBudgetMs).length / totalSamples.length) * 100;
  const streamingWorkPct =
    (totalSamples.reduce((total, sample) => total + sample, 0) / streamingElapsedMs) * 100;
  const droppedFramePct = frameTimes.length === 0
    ? 0
    : (frameTimes.filter((duration) => duration > FRAME_BUDGET_MS * 1.5).length / frameTimes.length) * 100;
  const terminalBudget = scenario.sizeKiB === 50
    ? BUDGETS.terminalRenderMs.large
    : BUDGETS.terminalRenderMs.small;
  const failures: string[] = [];
  if (p95TotalMs > updateBudgetMs) failures.push('p95 streaming update');
  if (withinBudgetPct < BUDGETS.updatesWithinBudgetPct) failures.push('update-budget coverage');
  if (streamingWorkPct > BUDGETS.streamingWorkPct) failures.push('main-thread occupancy');
  if (droppedFramePct > BUDGETS.droppedFramePct) failures.push('dropped frames');
  if (terminalMs > terminalBudget) failures.push('terminal render');
  const longTaskBudget = scenario.sizeKiB === 50
    ? BUDGETS.longTasks.large
    : BUDGETS.longTasks.standard;
  if (longTaskEntries.length > longTaskBudget) failures.push('long tasks');

  return {
    ...scenario,
    sourceUpdates: scenario.updatesPerSecond,
    renderedUpdates: totalSamples.length,
    updateBudgetMs,
    p95ParseMs,
    p95DomMs,
    p95TotalMs,
    withinBudgetPct,
    streamingWorkPct,
    droppedFramePct,
    terminalMs,
    longTasks: longTaskEntries.length,
    passed: failures.length === 0,
    failures,
  };
}

function appendResult(result: ScenarioResult): void {
  const row = document.createElement('tr');
  row.dataset.passed = String(result.passed);
  const values = [
    `${result.kind} · ${result.sizeKiB} KiB · ${result.updatesPerSecond}/s`,
    `${result.renderedUpdates}/${result.sourceUpdates}`,
    `${result.p95ParseMs.toFixed(2)} ms`,
    `${result.p95DomMs.toFixed(2)} ms`,
    `${result.p95TotalMs.toFixed(2)} ms`,
    `${result.withinBudgetPct.toFixed(1)}% ≤${result.updateBudgetMs.toFixed(1)} ms`,
    `${result.streamingWorkPct.toFixed(1)}%`,
    `${result.droppedFramePct.toFixed(1)}%`,
    `${result.terminalMs.toFixed(2)} ms`,
    String(result.longTasks),
    result.passed ? 'PASS' : `FAIL: ${result.failures.join(', ')}`,
  ];
  for (const value of values) {
    const cell = document.createElement('td');
    cell.textContent = value;
    row.appendChild(cell);
  }
  resultsElement.appendChild(row);
}

async function runBenchmark(): Promise<void> {
  runButton.disabled = true;
  resultsElement.replaceChildren();
  jsonElement.textContent = 'Running…';
  statusElement.dataset.state = 'running';
  statusElement.textContent = 'Running 18 scenarios…';
  window.__ICHAT_BENCHMARK__ = { status: 'running' };
  const results: ScenarioResult[] = [];

  try {
    for (let index = 0; index < scenarios.length; index += 1) {
      const scenario = scenarios[index];
      const progress = `${index + 1}/${scenarios.length}: ${scenario.kind} ${scenario.sizeKiB} KiB @ ${scenario.updatesPerSecond}/s`;
      statusElement.textContent = progress;
      window.__ICHAT_BENCHMARK__ = { status: 'running', progress };
      const result = await runScenario(scenario, index);
      results.push(result);
      appendResult(result);
    }
    // Run the full component smoke check after the isolated matrix so its
    // intentionally large DOM allocation cannot affect scenario GC metrics.
    const componentValidation = await validateComponentScheduling();

    const report: BrowserBenchmarkReport = {
      status: 'complete',
      passed: componentValidation.passed && results.every((result) => result.passed),
      generatedAt: new Date().toISOString(),
      userAgent: navigator.userAgent,
      budgets: BUDGETS,
      componentValidation,
      results,
    };
    window.__ICHAT_BENCHMARK__ = report;
    jsonElement.textContent = JSON.stringify(report, null, 2);
    statusElement.dataset.state = report.passed ? 'passed' : 'failed';
    statusElement.textContent = report.passed
      ? 'PASS · all browser performance budgets met'
      : 'FAIL · one or more browser performance budgets exceeded';
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    statusElement.dataset.state = 'failed';
    statusElement.textContent = `Benchmark error: ${message}`;
    jsonElement.textContent = JSON.stringify({ status: 'error', message }, null, 2);
    throw error;
  } finally {
    runButton.disabled = false;
  }
}

runButton.addEventListener('click', () => void runBenchmark());
window.__ICHAT_BENCHMARK__ = { status: 'idle' };
if (new URLSearchParams(location.search).get('autorun') !== '0') {
  void runBenchmark();
}
