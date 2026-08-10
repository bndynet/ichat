import "../../src/components/chat-messages.js";
import type { ChatMessages } from "../../src/components/chat-messages.js";
import type { ChatMessage, TextPart } from "../../src/types.js";
import type { LitVirtualizer } from "@lit-labs/virtualizer/LitVirtualizer.js";
import { rendererRegistry } from "../../src/renderers/registry.js";
import { MAX_MARKDOWN_CACHE_CHARS } from "../../src/renderers/markdown-cache.js";

type MessageCount = 100 | 1000 | 10000;

interface VirtualScenarioResult {
  messages: MessageCount;
  initialRenderMs: number;
  renderedRows: number;
  budgetMs: number;
  passed: boolean;
  failures: string[];
}

interface VirtualFunctionalValidation {
  passed: boolean;
  defaultPathPreserved: boolean;
  firstMessageScheduled: boolean;
  firstMessageNavigation: boolean;
  partScheduled: boolean;
  partNavigation: boolean;
  modeSwitchAnchorPreserved: boolean;
  anchorMessageId?: string;
  virtualToRegularFirstMessageId?: string;
  regularToVirtualFirstMessageId?: string;
  virtualToRegularAnchorPreserved: boolean;
  regularToVirtualAnchorPreserved: boolean;
  autoScrollBeforeAppend: boolean;
  newContentIndicator: boolean;
  bottomAnchorPreserved: boolean;
  bottomGapBeforePx: number;
  bottomGapAfterPx: number;
  autoScrollBeforeUpdate: boolean;
  failures: string[];
}

interface RowRevisitResult {
  messages: number;
  spanRows: number;
  roundTrips: number;
  cacheBudgetChars: number;
  /** Pipeline runs while the swept rows are seen for the first time. */
  firstPassRenders: number;
  /** Pipeline runs while the same rows are swept again. Zero when cached. */
  revisitRenders: number;
  revisitMs: number;
  passed: boolean;
  failures: string[];
}

interface VirtualBenchmarkReport {
  status: "complete";
  passed: boolean;
  generatedAt: string;
  userAgent: string;
  validation: VirtualFunctionalValidation;
  results: VirtualScenarioResult[];
  rowRevisit: RowRevisitResult;
}

declare global {
  interface Window {
    __ICHAT_VIRTUAL_BENCHMARK__?:
      { status: "running"; progress?: string } | VirtualBenchmarkReport;
  }
}

const COUNTS: MessageCount[] = [100, 1000, 10000];
const BUDGETS: Record<MessageCount, number> = {
  100: 250,
  1000: 400,
  10000: 1000,
};

// A span small enough to stay well inside the cache budget, so a revisit that
// misses means the cache failed rather than that entries were legitimately evicted.
const REVISIT_MESSAGES = 1000;
const REVISIT_SPAN_ROWS = 80;
const REVISIT_STEP_ROWS = 10;
const REVISIT_ROUND_TRIPS = 3;

const stage = requiredElement<HTMLDivElement>("stage");
const statusElement = requiredElement<HTMLSpanElement>("status");
const resultsElement = requiredElement<HTMLTableSectionElement>("results");
const revisitResultsElement =
  requiredElement<HTMLTableSectionElement>("revisit-results");
const jsonElement = requiredElement<HTMLPreElement>("json");

/**
 * Counts Markdown pipeline executions. A fence renderer is the only way to
 * observe this through the public extension API: it runs when markdown-it walks
 * the tokens, and not at all when the cached HTML is reused.
 *
 * Registered at module scope because the registry freezes on first mount.
 */
let pipelineRuns = 0;
rendererRegistry.register({
  name: "bench-pipeline-counter",
  test: (lang) => lang === "benchcount",
  render: (code) => {
    pipelineRuns += 1;
    return `<div class="bench-counter">${code.length}</div>`;
  },
});

function requiredElement<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Missing benchmark element #${id}`);
  return element as T;
}

function messagesOfSize(count: number): ChatMessage[] {
  const timestamp = Date.now();
  return Array.from({ length: count }, (_, index) => ({
    id: `virtual-message-${index}`,
    role: index % 3 === 0 ? "self" : "assistant",
    timestamp,
    parts: [
      {
        id: `virtual-part-${index}`,
        type: "text",
        text: `Message ${index}: virtual scrolling keeps this row lightweight.`,
        status: "complete",
      } satisfies TextPart,
    ],
  }));
}

function nextFrame(): Promise<number> {
  return new Promise((resolve) => requestAnimationFrame(resolve));
}

async function waitForCondition(
  predicate: () => boolean,
  timeoutMs = 5000,
): Promise<boolean> {
  const deadline = performance.now() + timeoutMs;
  while (performance.now() < deadline) {
    if (predicate()) return true;
    await new Promise<void>((resolve) => window.setTimeout(resolve, 20));
  }
  return predicate();
}

async function settleVirtualList(
  element: ChatMessages,
): Promise<LitVirtualizer | undefined> {
  await element.updateComplete;
  const ready = await waitForCondition(() =>
    Boolean(
      element.shadowRoot?.querySelector(
        'lit-virtualizer[data-virtualized="true"]',
      ),
    ),
  );
  if (!ready) return undefined;
  const virtualizer =
    element.shadowRoot?.querySelector<LitVirtualizer>("lit-virtualizer");
  await virtualizer?.updateComplete;
  if (!virtualizer) return undefined;
  const laidOut = await waitForCondition(
    () =>
      virtualizer.clientHeight > 0 &&
      Boolean(element.shadowRoot?.querySelector("i-chat-message")),
  );
  if (!laidOut) return undefined;
  // layoutComplete is advisory here: depending on when the getter is read,
  // there may be no subsequent layout to resolve it. Visible rows are the
  // authoritative activation signal; a short wait only lets pending work land.
  await waitForLayout(virtualizer, 500);
  await nextFrame();
  await nextFrame();
  return virtualizer;
}

function waitForLayout(
  virtualizer: LitVirtualizer,
  timeoutMs = 5000,
): Promise<boolean> {
  return new Promise((resolve) => {
    const layoutComplete = virtualizer.layoutComplete;
    if (!layoutComplete) {
      resolve(false);
      return;
    }
    const timer = window.setTimeout(() => resolve(false), timeoutMs);
    layoutComplete.then(
      () => {
        window.clearTimeout(timer);
        resolve(true);
      },
      () => {
        window.clearTimeout(timer);
        resolve(false);
      },
    );
  });
}

async function waitForMessage(
  element: ChatMessages,
  messageId: string,
): Promise<boolean> {
  const selector = `i-chat-message[data-message-id="${CSS.escape(messageId)}"]`;
  return waitForCondition(() =>
    Boolean(element.shadowRoot?.querySelector(selector)),
  );
}

function queryOpenShadowRoots(
  root: ParentNode,
  selector: string,
): HTMLElement | null {
  const directMatches = Array.from(
    root.querySelectorAll<HTMLElement>(selector),
  );
  const measurable = directMatches.find((element) => {
    const rect = element.getBoundingClientRect();
    return rect.width > 0 || rect.height > 0;
  });
  if (measurable) return measurable;
  if (directMatches[0]) return directMatches[0];
  for (const element of root.querySelectorAll<HTMLElement>("*")) {
    if (element.shadowRoot) {
      const nested = queryOpenShadowRoots(element.shadowRoot, selector);
      if (nested) return nested;
    }
  }
  return null;
}

function firstVisibleMessageId(
  element: ChatMessages,
  scroller: HTMLElement | null | undefined,
): string | undefined {
  if (!scroller) return undefined;
  const scrollerRect = scroller.getBoundingClientRect();
  return Array.from(
    element.shadowRoot?.querySelectorAll<HTMLElement>(
      "i-chat-message[data-message-id]",
    ) ?? [],
  ).find((message) => {
    const rect = message.getBoundingClientRect();
    return rect.bottom > scrollerRect.top && rect.top < scrollerRect.bottom;
  })?.dataset.messageId;
}

function isVisibleWithin(
  target: Element | null,
  scroller: HTMLElement | null,
): boolean {
  if (!target || !scroller) return false;
  const targetRect = target.getBoundingClientRect();
  const scrollerRect = scroller.getBoundingClientRect();
  return (
    targetRect.bottom > scrollerRect.top && targetRect.top < scrollerRect.bottom
  );
}

function createList(
  messages: ChatMessage[],
  virtualScroll: boolean,
): ChatMessages {
  const element = document.createElement("i-chat-messages");
  element.config = { virtualScroll };
  element.messages = messages;
  return element;
}

async function warmUp(): Promise<void> {
  const element = createList(messagesOfSize(20), true);
  stage.replaceChildren(element);
  await settleVirtualList(element);
  element.remove();
}

async function runScenario(
  count: MessageCount,
): Promise<VirtualScenarioResult> {
  const messages = messagesOfSize(count);
  const startedAt = performance.now();
  const element = createList(messages, true);
  stage.replaceChildren(element);
  const virtualizer = await settleVirtualList(element);
  const initialRenderMs = performance.now() - startedAt;
  const renderedRows =
    element.shadowRoot?.querySelectorAll("i-chat-message").length ?? count;
  const failures: string[] = [];

  if (!virtualizer) failures.push("virtualizer activation");
  if (renderedRows >= Math.min(count, 100)) failures.push("bounded DOM window");
  if (initialRenderMs > BUDGETS[count]) failures.push("initial render budget");

  element.remove();
  return {
    messages: count,
    initialRenderMs,
    renderedRows,
    budgetMs: BUDGETS[count],
    passed: failures.length === 0,
    failures,
  };
}

function countedMessagesOfSize(count: number): ChatMessage[] {
  const timestamp = Date.now();
  return Array.from({ length: count }, (_, index) => ({
    id: `revisit-message-${index}`,
    role: index % 3 === 0 ? "self" : "assistant",
    timestamp,
    parts: [
      {
        id: `revisit-part-${index}`,
        type: "text",
        text: `Message ${index} with a counted block.\n\n\`\`\`benchcount\nrow ${index}\n\`\`\``,
        status: "complete",
      } satisfies TextPart,
    ],
  }));
}

async function sweepToRow(element: ChatMessages, index: number): Promise<void> {
  const id = `revisit-message-${index}`;
  element.scrollToMessage(id);
  await waitForMessage(element, id);
  await nextFrame();
  await nextFrame();
}

/** One pass down the span and back up again. */
async function sweepSpan(element: ChatMessages): Promise<void> {
  for (let index = 0; index <= REVISIT_SPAN_ROWS; index += REVISIT_STEP_ROWS) {
    await sweepToRow(element, index);
  }
  for (let index = REVISIT_SPAN_ROWS; index >= 0; index -= REVISIT_STEP_ROWS) {
    await sweepToRow(element, index);
  }
}

/**
 * Rows that leave the viewport are destroyed, so the element instance that comes
 * back has no HTML of its own. It must be served from the per-part cache instead
 * of re-running markdown-it (plus DOMPurify and any fence renderer).
 */
async function measureRowRevisit(): Promise<RowRevisitResult> {
  const failures: string[] = [];
  const element = createList(countedMessagesOfSize(REVISIT_MESSAGES), true);
  stage.replaceChildren(element);
  const virtualizer = await settleVirtualList(element);
  if (!virtualizer) failures.push("revisit virtualizer activation");

  const beforeFirstPass = pipelineRuns;
  await sweepSpan(element);
  const firstPassRenders = pipelineRuns - beforeFirstPass;

  const revisitStartedAt = performance.now();
  for (let trip = 0; trip < REVISIT_ROUND_TRIPS; trip += 1) {
    await sweepSpan(element);
  }
  const revisitMs = performance.now() - revisitStartedAt;
  const revisitRenders = pipelineRuns - beforeFirstPass - firstPassRenders;

  if (firstPassRenders === 0) {
    // Nothing was measured, so a zero revisit count would prove nothing.
    failures.push("counted fence renderer never ran");
  }
  if (revisitRenders !== 0)
    failures.push("revisited rows re-ran the Markdown pipeline");

  element.remove();
  return {
    messages: REVISIT_MESSAGES,
    spanRows: REVISIT_SPAN_ROWS,
    roundTrips: REVISIT_ROUND_TRIPS,
    cacheBudgetChars: MAX_MARKDOWN_CACHE_CHARS,
    firstPassRenders,
    revisitRenders,
    revisitMs,
    passed: failures.length === 0,
    failures,
  };
}

async function validateFunctions(): Promise<VirtualFunctionalValidation> {
  const failures: string[] = [];

  const regular = createList(messagesOfSize(100), false);
  stage.replaceChildren(regular);
  await regular.updateComplete;
  await nextFrame();
  const defaultPathPreserved =
    !regular.shadowRoot?.querySelector("lit-virtualizer") &&
    regular.shadowRoot?.querySelectorAll("i-chat-message").length === 100;
  if (!defaultPathPreserved) failures.push("default regular path");
  regular.remove();

  const messages = messagesOfSize(1000);
  messages[500] = {
    ...messages[500],
    parts: [
      {
        id: "virtual-part-500-tall",
        type: "text",
        text: Array.from(
          { length: 80 },
          (_, index) =>
            `Tall message line ${index}: verifies navigation inside a virtual row.`,
        ).join("\n\n"),
        status: "complete",
      } satisfies TextPart,
      {
        id: "virtual-part-500-target",
        type: "text",
        text: "The target part must finish inside the visible viewport.",
        status: "complete",
      } satisfies TextPart,
    ],
  };
  const virtual = createList(messages, true);
  stage.replaceChildren(virtual);
  const virtualizer = await settleVirtualList(virtual);
  if (!virtualizer) failures.push("functional virtualizer activation");
  let scroller =
    virtual.shadowRoot?.querySelector<HTMLElement>(".chat-messages");

  const firstScheduled = virtual.scrollToMessage("virtual-message-0");
  const firstMessageNavigation =
    firstScheduled && (await waitForMessage(virtual, "virtual-message-0"));
  if (!firstMessageNavigation)
    failures.push("scrollToMessage off-screen target");

  const partScheduled = virtual.scrollToPart("virtual-part-500-target");
  const partNavigation =
    partScheduled &&
    (await waitForCondition(() =>
      isVisibleWithin(
        virtual.shadowRoot
          ? queryOpenShadowRoots(
              virtual.shadowRoot,
              '[data-part-id="virtual-part-500-target"]',
            )
          : null,
        scroller ?? null,
      ),
    ));
  if (!partNavigation) failures.push("scrollToPart target visibility");

  virtual.scrollToMessage("virtual-message-450");
  await waitForMessage(virtual, "virtual-message-450");
  await nextFrame();
  await nextFrame();
  scroller?.dispatchEvent(new Event("scroll"));
  const anchorMessageId = firstVisibleMessageId(virtual, scroller);

  virtual.config = { virtualScroll: false };
  await virtual.updateComplete;
  const virtualToRegularAnchorPreserved =
    Boolean(anchorMessageId) &&
    (await waitForCondition(
      () =>
        firstVisibleMessageId(
          virtual,
          virtual.shadowRoot?.querySelector<HTMLElement>(".chat-messages"),
        ) === anchorMessageId,
    ));
  const virtualToRegularFirstMessageId = firstVisibleMessageId(
    virtual,
    virtual.shadowRoot?.querySelector<HTMLElement>(".chat-messages"),
  );
  if (!virtualToRegularAnchorPreserved)
    failures.push("virtual-to-regular scroll anchor");
  await nextFrame();
  await nextFrame();

  virtual.config = { virtualScroll: true };
  const activeVirtualizer = await settleVirtualList(virtual);
  scroller = virtual.shadowRoot?.querySelector<HTMLElement>(".chat-messages");
  const regularToVirtualAnchorPreserved =
    Boolean(anchorMessageId) &&
    (await waitForCondition(
      () => firstVisibleMessageId(virtual, scroller) === anchorMessageId,
    ));
  const regularToVirtualFirstMessageId = firstVisibleMessageId(
    virtual,
    scroller,
  );
  if (!regularToVirtualAnchorPreserved)
    failures.push("regular-to-virtual scroll anchor");
  const modeSwitchAnchorPreserved =
    virtualToRegularAnchorPreserved && regularToVirtualAnchorPreserved;

  scroller?.dispatchEvent(new Event("scroll"));
  const autoScrollBeforeAppend = (
    virtual as unknown as { _autoScroll: boolean }
  )._autoScroll;
  virtual.messages = [
    ...virtual.messages,
    {
      id: "virtual-message-new",
      role: "assistant",
      timestamp: Date.now(),
      parts: [
        {
          id: "virtual-part-new",
          type: "text",
          text: "New content while the reader is away from the bottom.",
          status: "complete",
        } satisfies TextPart,
      ],
    },
  ];
  await virtual.updateComplete;
  const newContentIndicator = await waitForCondition(() =>
    Boolean(virtual.shadowRoot?.querySelector(".scroll-down-btn")),
  );
  if (!newContentIndicator)
    failures.push("away-from-bottom new-content indicator");

  const currentMessages = virtual.messages;
  const last = currentMessages.at(-1)!;
  virtual.scrollToMessage(last.id);
  await waitForMessage(virtual, last.id);
  await new Promise<void>((resolve) => window.setTimeout(resolve, 500));
  activeVirtualizer
    ?.element(activeVirtualizer.items.length - 1)
    ?.scrollIntoView({ block: "end" });
  if (
    scroller &&
    (await waitForCondition(
      () =>
        scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight < 80,
    ))
  ) {
    scroller.dispatchEvent(new Event("scroll"));
    await nextFrame();
  }
  const bottomGapBeforePx = scroller
    ? scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight
    : Number.POSITIVE_INFINITY;
  const autoScrollBeforeUpdate = (
    virtual as unknown as { _autoScroll: boolean }
  )._autoScroll;
  virtual.messages = [
    ...currentMessages.slice(0, -1),
    {
      ...last,
      parts: [
        {
          ...(last.parts?.[0] as TextPart),
          text:
            "Variable height update.\n\n" +
            "Extra rendered content. ".repeat(160),
        },
      ],
    },
  ];
  await virtual.updateComplete;
  await new Promise<void>((resolve) => window.setTimeout(resolve, 500));
  const bottomGapAfterPx = scroller
    ? scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight
    : Number.POSITIVE_INFINITY;
  const bottomAnchorPreserved = bottomGapAfterPx < 80;
  if (!bottomAnchorPreserved) failures.push("variable-height bottom anchor");

  virtual.remove();
  return {
    passed: failures.length === 0,
    defaultPathPreserved,
    firstMessageScheduled: firstScheduled,
    firstMessageNavigation,
    partScheduled,
    partNavigation,
    modeSwitchAnchorPreserved,
    anchorMessageId,
    virtualToRegularFirstMessageId,
    regularToVirtualFirstMessageId,
    virtualToRegularAnchorPreserved,
    regularToVirtualAnchorPreserved,
    autoScrollBeforeAppend,
    newContentIndicator,
    bottomAnchorPreserved,
    bottomGapBeforePx,
    bottomGapAfterPx,
    autoScrollBeforeUpdate,
    failures,
  };
}

function appendResult(result: VirtualScenarioResult): void {
  const row = document.createElement("tr");
  row.dataset.passed = String(result.passed);
  const values = [
    result.messages.toLocaleString(),
    `${result.initialRenderMs.toFixed(1)} ms`,
    String(result.renderedRows),
    result.passed
      ? `PASS · ≤${result.budgetMs} ms`
      : `FAIL · ${result.failures.join(", ")}`,
  ];
  for (const value of values) {
    const cell = document.createElement("td");
    cell.textContent = value;
    row.appendChild(cell);
  }
  resultsElement.appendChild(row);
}

function appendRevisitResult(result: RowRevisitResult): void {
  const row = document.createElement("tr");
  row.dataset.passed = String(result.passed);
  const values = [
    `${result.spanRows} rows × ${result.roundTrips} round trips`,
    String(result.firstPassRenders),
    String(result.revisitRenders),
    `${result.revisitMs.toFixed(1)} ms`,
    result.passed
      ? "PASS · served from cache"
      : `FAIL · ${result.failures.join(", ")}`,
  ];
  for (const value of values) {
    const cell = document.createElement("td");
    cell.textContent = value;
    row.appendChild(cell);
  }
  revisitResultsElement.appendChild(row);
}

async function run(): Promise<void> {
  window.__ICHAT_VIRTUAL_BENCHMARK__ = {
    status: "running",
    progress: "warm-up",
  };
  await warmUp();
  const results: VirtualScenarioResult[] = [];

  for (const count of COUNTS) {
    statusElement.textContent = `Rendering ${count.toLocaleString()} messages…`;
    window.__ICHAT_VIRTUAL_BENCHMARK__ = {
      status: "running",
      progress: String(count),
    };
    const result = await runScenario(count);
    results.push(result);
    appendResult(result);
  }

  statusElement.textContent =
    "Sweeping rows out of and back into the viewport…";
  window.__ICHAT_VIRTUAL_BENCHMARK__ = {
    status: "running",
    progress: "row-revisit",
  };
  const rowRevisit = await measureRowRevisit();
  appendRevisitResult(rowRevisit);

  statusElement.textContent = "Validating scrolling and dynamic heights…";
  const validation = await validateFunctions();
  const report: VirtualBenchmarkReport = {
    status: "complete",
    passed:
      validation.passed &&
      rowRevisit.passed &&
      results.every((result) => result.passed),
    generatedAt: new Date().toISOString(),
    userAgent: navigator.userAgent,
    validation,
    results,
    rowRevisit,
  };
  window.__ICHAT_VIRTUAL_BENCHMARK__ = report;
  jsonElement.textContent = JSON.stringify(report, null, 2);
  statusElement.dataset.state = report.passed ? "passed" : "failed";
  statusElement.textContent = report.passed
    ? "PASS · virtual list budgets and compatibility checks met"
    : "FAIL · inspect the JSON report";
}

void run().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  statusElement.dataset.state = "failed";
  statusElement.textContent = `Benchmark error: ${message}`;
  jsonElement.textContent = JSON.stringify(
    { status: "error", message },
    null,
    2,
  );
  throw error;
});
