/**
 * Browser-level Store × ownership lifecycle tests for `<i-chat>`.
 *
 * Runs in a real browser DOM via Vite dev server.  Verifies rendered
 * component behaviour: uncontrolled/controlled mutations, child-component
 * state synchronisation, event contracts, and busy-state reflection.
 *
 * Results are rendered into the page DOM and also exposed as
 * `window.__ICHAT_STORE_TESTS__`.
 */

import "../../src/components/chat.js";
import type {
  Chat,
  ChatConfirmationResult,
} from "../../src/components/chat.js";
import type { ChatConfirmation } from "../../src/components/chat-confirmation.js";
import type {
  ChatMessage,
  MessagesChangeDetail,
  TextPart,
} from "@bndynet/ichat-messages";

// ── Test harness ──────────────────────────────────────────────────────────

interface TestResult {
  name: string;
  passed: boolean;
  detail?: string;
}

const results: TestResult[] = [];
let testChain: Promise<void> = Promise.resolve();

function test(name: string, fn: () => void | Promise<void>): void {
  results.push({ name, passed: false, detail: "pending" });
  const idx = results.length - 1;

  testChain = testChain.then(async () => {
    try {
      await fn();
      results[idx] = { name, passed: true };
    } catch (err) {
      results[idx] = { name, passed: false, detail: String(err) };
    }
    renderResults();
  });
}

function assert(
  condition: unknown,
  msg = "assertion failed",
): asserts condition {
  if (!condition) throw new Error(msg);
}

function assertEqual<T>(actual: T, expected: T, msg?: string): void {
  if (actual !== expected) {
    throw new Error(
      msg ??
        `expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`,
    );
  }
}

function assertDeepEqual<T>(actual: T, expected: T, msg?: string): void {
  const a = JSON.stringify(actual);
  const b = JSON.stringify(expected);
  if (a !== b) {
    throw new Error(msg ?? `expected ${b}, got ${a}`);
  }
}

function renderResults(): void {
  const statusEl = document.getElementById("status")!;
  const resultsEl = document.getElementById("results")!;
  const allDone = results.every(
    (r) => r.passed !== undefined && r.detail !== "pending",
  );
  const anyFail = results.some((r) => !r.passed && r.detail !== "pending");

  if (!allDone) {
    statusEl.dataset.state = "running";
    statusEl.textContent = `Running… (${results.filter((r) => r.passed || r.detail !== "pending").length}/${results.length})`;
  } else if (anyFail) {
    statusEl.dataset.state = "failed";
    statusEl.textContent = `FAILED — ${results.filter((r) => !r.passed).length}/${results.length} failures`;
  } else {
    statusEl.dataset.state = "passed";
    statusEl.textContent = `PASSED — ${results.length}/${results.length}`;
  }

  resultsEl.innerHTML = results
    .map(
      (r) =>
        `<div class="result ${r.passed ? "pass" : "fail"}">` +
        `<span class="icon">${r.passed ? "✓" : "✗"}</span>` +
        `<span class="name">${r.name}</span>` +
        (r.detail && r.detail !== "pending"
          ? `<span class="detail">${r.detail}</span>`
          : "") +
        `</div>`,
    )
    .join("");

  (window as any).__ICHAT_STORE_TESTS__ = {
    passed: allDone && !anyFail,
    results,
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────

function createChat(): Chat {
  const host = document.getElementById("chat-host")!;
  host.innerHTML = "";
  const el = document.createElement("i-chat") as Chat;
  host.appendChild(el);
  return el;
}

function waitForUpdate(el: HTMLElement): Promise<void> {
  return new Promise((resolve) => {
    el.updateComplete?.then(resolve) ?? requestAnimationFrame(() => resolve());
  });
}

function textMsg(id: string, text: string): ChatMessage {
  return {
    id,
    role: "assistant",
    parts: [{ type: "text", id: `t-${id}`, text }],
    streaming: false,
  };
}

function nextFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

async function withIsolatedChat(
  fn: (chat: Chat) => void | Promise<void>,
): Promise<void> {
  const container = document.createElement("div");
  container.style.cssText = [
    "position: fixed",
    "left: -10000px",
    "top: 0",
    "width: 400px",
    "height: 600px",
  ].join(";");
  document.body.appendChild(container);

  const chat = document.createElement("i-chat") as Chat;
  container.appendChild(chat);

  try {
    await waitForUpdate(chat);
    await fn(chat);
  } finally {
    container.remove();
  }
}

async function activeConfirmation(chat: Chat): Promise<ChatConfirmation> {
  await waitForUpdate(chat);
  const confirmation = chat.shadowRoot?.querySelector(
    "i-chat-confirmation",
  ) as ChatConfirmation | null;
  assert(confirmation, "i-chat-confirmation should be rendered");
  await waitForUpdate(confirmation);
  await nextFrame();
  return confirmation;
}

function confirmationButton(
  confirmation: ChatConfirmation,
  action: "confirm" | "cancel",
): HTMLButtonElement {
  const button = confirmation.shadowRoot?.querySelector(
    `.chat-confirmation__btn--${action}`,
  ) as HTMLButtonElement | null;
  assert(button, `${action} button should be rendered`);
  return button;
}

function confirmationTitle(confirmation: ChatConfirmation): string {
  return (
    confirmation.shadowRoot?.querySelector(".chat-confirmation__title")
      ?.textContent ?? ""
  ).trim();
}

function isVisuallyHidden(element: HTMLElement | null): boolean {
  if (!element || !element.isConnected) return true;
  if (element.hidden || element.closest("[hidden]")) return true;
  const style = getComputedStyle(element);
  return (
    style.display === "none" ||
    style.visibility === "hidden" ||
    element.getClientRects().length === 0
  );
}

function invokeSend(chat: Chat, content: string): Promise<void> {
  return (
    chat as unknown as {
      _handleSend(event: CustomEvent<{ content: string }>): Promise<void>;
    }
  )._handleSend(
    new CustomEvent("send", {
      detail: { content },
      bubbles: true,
      composed: true,
    }),
  );
}

function deferred(): { promise: Promise<void>; resolve: () => void } {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

// ── Test suites ───────────────────────────────────────────────────────────

// 1. Uncontrolled mode — rendered DOM
test("uncontrolled: addMessage renders in child messages", async () => {
  const chat = createChat();
  await waitForUpdate(chat);

  chat.addMessage(textMsg("m1", "hello"));
  await waitForUpdate(chat);

  const messagesEl = chat.shadowRoot?.querySelector("i-chat-messages");
  assert(messagesEl, "i-chat-messages should be in shadow DOM");
  // The child messages component should have received the message
  assertEqual(chat.messages.length, 1);
  assertEqual(chat.messages[0]?.id, "m1");
});

test("uncontrolled: messages array visible after external assignment", async () => {
  const chat = createChat();
  await waitForUpdate(chat);

  chat.messages = [textMsg("ext1", "external")];
  await waitForUpdate(chat);

  assertEqual(chat.messages.length, 1);
  assertEqual(chat.messages[0]?.id, "ext1");
});

test("uncontrolled: multiple mutations chain correctly", async () => {
  const chat = createChat();
  await waitForUpdate(chat);

  chat.addMessage(textMsg("a", "first"));
  chat.addMessage(textMsg("b", "second"));
  chat.updateMessage("a", { streaming: true });
  await waitForUpdate(chat);

  assertEqual(chat.messages.length, 2);
  assertEqual(chat.messages[0]?.streaming, true);
});

test("uncontrolled: appendPart adds to message parts", async () => {
  const chat = createChat();
  await waitForUpdate(chat);

  chat.addMessage({ id: "m", role: "assistant", parts: [] });
  chat.appendPart("m", { type: "text", id: "p1", text: "added" });
  await waitForUpdate(chat);

  assertEqual(chat.messages[0]?.parts.length, 1);
  const part = chat.messages[0]?.parts[0] as TextPart;
  assertEqual(part.type, "text");
  assertEqual(part.text, "added");
});

test("uncontrolled: clear empties messages", async () => {
  const chat = createChat();
  chat.addMessage(textMsg("a", "first"));
  await waitForUpdate(chat);
  assertEqual(chat.messages.length, 1);

  chat.clear();
  await waitForUpdate(chat);
  assertEqual(chat.messages.length, 0);
});

test("uncontrolled: removeMessage deletes by id", async () => {
  const chat = createChat();
  chat.messages = [textMsg("a", "first"), textMsg("b", "second")];
  await waitForUpdate(chat);

  chat.removeMessage("a");
  await waitForUpdate(chat);
  assertEqual(chat.messages.length, 1);
  assertEqual(chat.messages[0]?.id, "b");
});

// 2. Controlled mode — proposal flow
test("controlled: addMessage does not commit until accepted", async () => {
  const chat = createChat();
  chat.messageMode = "controlled";
  await waitForUpdate(chat);

  let eventFired = false;
  chat.addEventListener("messages-change", (e) => {
    eventFired = true;
    assert(
      (e as CustomEvent).cancelable,
      "controlled event should be cancelable",
    );
    // Accept by writing back
    chat.messages = (e as CustomEvent<MessagesChangeDetail>).detail.messages;
  });

  chat.addMessage(textMsg("proposed", "hello"));
  await waitForUpdate(chat);

  assert(eventFired, "messages-change should have fired");
  assertEqual(chat.messages.length, 1);
  assertEqual(chat.messages[0]?.id, "proposed");
});

test("controlled: rejecting a proposal keeps previous state", async () => {
  const chat = createChat();
  chat.messageMode = "controlled";
  chat.messages = [textMsg("original", "keep")];
  await waitForUpdate(chat);

  chat.addEventListener("messages-change", (e) => {
    e.preventDefault(); // reject
  });

  chat.addMessage(textMsg("rejected", "nope"));
  await waitForUpdate(chat);

  assertEqual(chat.messages.length, 1);
  assertEqual(chat.messages[0]?.id, "original");
});

test("controlled: rejecting the run placeholder leaves the run idle", async () => {
  const chat = createChat();
  chat.messageMode = "controlled";
  await waitForUpdate(chat);

  chat.addEventListener("messages-change", (e) => {
    e.preventDefault();
  });

  const run = chat.createRunController();
  const outcome = run.start([{ type: "text", id: "body", text: "" }]);
  await waitForUpdate(chat);

  assertEqual(outcome.accepted, false);
  assertEqual(run.status, "idle");
  assertEqual(chat.messages.length, 0);
  assertEqual(run.appendText("body", "hi").ok, false);
  assert(!chat.busy, "a rejected placeholder must not leave the host busy");
});

test("controlled: rejecting completion keeps the run streaming", async () => {
  const chat = createChat();
  chat.messageMode = "controlled";
  await waitForUpdate(chat);

  let reject = false;
  chat.addEventListener("messages-change", (e) => {
    if (reject) {
      e.preventDefault();
      return;
    }
    chat.messages = (e as CustomEvent<MessagesChangeDetail>).detail.messages;
  });

  const run = chat.createRunController();
  run.start([{ type: "text", id: "body", text: "hi" }]);
  await waitForUpdate(chat);
  assertEqual(run.status, "streaming");

  reject = true;
  const outcome = run.complete();
  await waitForUpdate(chat);

  assertEqual(outcome.accepted, false);
  assertEqual(run.status, "streaming");
  assertEqual(chat.messages[0]?.streaming, true);
  assert(chat.busy, "host stays busy while the message is still streaming");
  assertEqual(run.signal.aborted, false);

  reject = false;
  assertEqual(run.complete().accepted, true);
  await waitForUpdate(chat);
  assertEqual(run.status, "completed");
  assertEqual(chat.messages[0]?.streaming, false);
});

test("controlled: busy state reflects accepted messages", async () => {
  const chat = createChat();
  chat.messageMode = "controlled";
  await waitForUpdate(chat);

  chat.addEventListener("messages-change", (e) => {
    chat.messages = (e as CustomEvent<MessagesChangeDetail>).detail.messages;
  });

  chat.addMessage({
    id: "stream",
    role: "assistant",
    parts: [],
    streaming: true,
  });
  await waitForUpdate(chat);

  assert(chat.busy, "should be busy when streaming message is accepted");
  assert(chat.hasAttribute("busy"), "should reflect busy attribute");

  chat.updateMessage("stream", { streaming: false });
  await waitForUpdate(chat);

  assert(!chat.busy, "should not be busy after streaming ends");
});

// 3. Child component sync
test("child: i-chat-messages receives messages binding", async () => {
  const chat = createChat();
  await waitForUpdate(chat);

  chat.messages = [textMsg("sync", "synced")];
  await waitForUpdate(chat);

  const messagesEl = chat.shadowRoot?.querySelector("i-chat-messages") as any;
  assert(messagesEl, "i-chat-messages should be present");
  // The child's messages property should mirror the parent's
  assertEqual(messagesEl?.messages?.length, 1);
  assertEqual(messagesEl?.messages?.[0]?.id, "sync");
});

test("child: i-chat-input receives streaming state", async () => {
  const chat = createChat();
  await waitForUpdate(chat);

  chat.addMessage({ id: "s", role: "assistant", parts: [], streaming: true });
  await waitForUpdate(chat);

  const inputEl = chat.shadowRoot?.querySelector("i-chat-input") as any;
  assert(inputEl, "i-chat-input should be present");
  assertEqual(inputEl?.streaming, true);

  chat.updateMessage("s", { streaming: false });
  await waitForUpdate(chat);

  assertEqual(inputEl?.streaming, false);
});

// 4. Event contracts
test("events: messages-change bubbles from i-chat", async () => {
  const chat = createChat();
  await waitForUpdate(chat);

  let bubbled = false;
  chat.addEventListener("messages-change", () => {
    bubbled = true;
  });

  chat.addMessage(textMsg("event", "test"));
  await waitForUpdate(chat);
  assert(bubbled, "messages-change should bubble");
});

test("events: busy-change fires on streaming transitions", async () => {
  const chat = createChat();
  await waitForUpdate(chat);

  const states: boolean[] = [];
  chat.addEventListener("busy-change", (e) => {
    states.push((e as CustomEvent<{ busy: boolean }>).detail.busy);
  });

  chat.addMessage({ id: "bs", role: "assistant", parts: [], streaming: true });
  await waitForUpdate(chat);
  assertDeepEqual(states, [true]);

  chat.updateMessage("bs", { streaming: false });
  await waitForUpdate(chat);
  assertDeepEqual(states, [true, false]);
});

// 5. Disabled state
test("state: disabled reflects on input", async () => {
  const chat = createChat();
  chat.disabled = true;
  await waitForUpdate(chat);

  assert(chat.hasAttribute("disabled"), "should have disabled attribute");
  const inputEl = chat.shadowRoot?.querySelector("i-chat-input") as any;
  assertEqual(inputEl?.disabled, true);
});

// 6. Confirmation lifecycle
test("confirmation: renders panel and hides the default input", async () => {
  await withIsolatedChat(async (chat) => {
    const input = chat.shadowRoot?.querySelector(
      "i-chat-input",
    ) as HTMLElement | null;
    assert(input, "default input should render before confirmation");
    assert(
      !isVisuallyHidden(input),
      "default input should initially be visible",
    );

    const resultPromise = chat.requestConfirmation({
      id: "render-default",
      title: "Render default",
    });
    const confirmation = await activeConfirmation(chat);

    assertEqual(confirmationTitle(confirmation), "Render default");
    const activeInput = chat.shadowRoot?.querySelector(
      "i-chat-input",
    ) as HTMLElement | null;
    assert(
      isVisuallyHidden(activeInput),
      "default input should be hidden while confirmation is active",
    );

    chat.clearConfirmations();
    await resultPromise;
  });
});

test("confirmation: hides a custom input slot", async () => {
  await withIsolatedChat(async (chat) => {
    const customInput = document.createElement("button");
    customInput.slot = "input";
    customInput.textContent = "Custom input";
    chat.appendChild(customInput);
    await nextFrame();
    await waitForUpdate(chat);

    assert(
      !isVisuallyHidden(customInput),
      "custom input should initially be visible",
    );

    const resultPromise = chat.requestConfirmation({
      id: "render-custom",
      title: "Render custom",
    });
    await activeConfirmation(chat);

    assert(
      isVisuallyHidden(customInput),
      "custom input should be hidden while confirmation is active",
    );

    chat.clearConfirmations();
    await resultPromise;
  });
});

test("confirmation: Confirm and Cancel resolve the correct results", async () => {
  await withIsolatedChat(async (chat) => {
    const confirmPromise = chat.requestConfirmation({
      id: "decision-confirm",
      title: "Confirm this",
    });
    let confirmation = await activeConfirmation(chat);
    confirmationButton(confirmation, "confirm").click();
    const confirmed = await confirmPromise;
    assertDeepEqual(
      {
        id: confirmed.id,
        action: confirmed.action,
        confirmed: confirmed.confirmed,
      },
      { id: "decision-confirm", action: "confirm", confirmed: true },
    );

    const cancelPromise = chat.requestConfirmation({
      id: "decision-cancel",
      title: "Cancel this",
    });
    confirmation = await activeConfirmation(chat);
    confirmationButton(confirmation, "cancel").click();
    const cancelled = await cancelPromise;
    assertDeepEqual(
      {
        id: cancelled.id,
        action: cancelled.action,
        confirmed: cancelled.confirmed,
      },
      { id: "decision-cancel", action: "cancel", confirmed: false },
    );
  });
});

test("confirmation: Escape resolves the active request as cancel", async () => {
  await withIsolatedChat(async (chat) => {
    const resultPromise = chat.requestConfirmation({
      id: "escape",
      title: "Escape",
    });
    const confirmation = await activeConfirmation(chat);
    const section = confirmation.shadowRoot?.querySelector("section");
    assert(section, "confirmation section should be rendered");

    section.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Escape",
        bubbles: true,
        cancelable: true,
      }),
    );

    const result = await resultPromise;
    assertEqual(result.action, "cancel");
    assertEqual(result.confirmed, false);
  });
});

test("confirmation: Confirm button receives initial focus", async () => {
  await withIsolatedChat(async (chat) => {
    const resultPromise = chat.requestConfirmation({
      id: "focus",
      title: "Focus",
    });
    const confirmation = await activeConfirmation(chat);
    const confirmButton = confirmationButton(confirmation, "confirm");

    assertEqual(confirmation.shadowRoot?.activeElement, confirmButton);

    chat.clearConfirmations();
    await resultPromise;
  });
});

test("confirmation: Tab and Shift+Tab remain inside the dialog", async () => {
  await withIsolatedChat(async (chat) => {
    const resultPromise = chat.requestConfirmation({
      id: "focus-trap",
      title: "Focus trap",
    });
    const confirmation = await activeConfirmation(chat);
    const cancelButton = confirmationButton(confirmation, "cancel");
    const confirmButton = confirmationButton(confirmation, "confirm");

    confirmButton.focus();
    confirmButton.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Tab",
        bubbles: true,
        cancelable: true,
      }),
    );
    assertEqual(
      confirmation.shadowRoot?.activeElement,
      cancelButton,
      "Tab from the last control should wrap to the first control",
    );

    cancelButton.focus();
    cancelButton.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Tab",
        shiftKey: true,
        bubbles: true,
        cancelable: true,
      }),
    );
    assertEqual(
      confirmation.shadowRoot?.activeElement,
      confirmButton,
      "Shift+Tab from the first control should wrap to the last control",
    );

    chat.clearConfirmations();
    await resultPromise;
  });
});

test("confirmation: three requests render in strict FIFO order", async () => {
  await withIsolatedChat(async (chat) => {
    const firstPromise = chat.requestConfirmation({
      id: "fifo-1",
      title: "One",
    });
    const secondPromise = chat.requestConfirmation({
      id: "fifo-2",
      title: "Two",
    });
    const thirdPromise = chat.requestConfirmation({
      id: "fifo-3",
      title: "Three",
    });

    let confirmation = await activeConfirmation(chat);
    assertEqual(confirmationTitle(confirmation), "One");
    confirmationButton(confirmation, "confirm").click();
    const first = await firstPromise;

    confirmation = await activeConfirmation(chat);
    assertEqual(confirmationTitle(confirmation), "Two");
    confirmationButton(confirmation, "cancel").click();
    const second = await secondPromise;

    confirmation = await activeConfirmation(chat);
    assertEqual(confirmationTitle(confirmation), "Three");
    confirmationButton(confirmation, "confirm").click();
    const third = await thirdPromise;

    assertDeepEqual(
      [first, second, third].map(({ id, action }) => ({ id, action })),
      [
        { id: "fifo-1", action: "confirm" },
        { id: "fifo-2", action: "cancel" },
        { id: "fifo-3", action: "confirm" },
      ],
    );
  });
});

test("confirmation: an active request blocks ordinary send", async () => {
  await withIsolatedChat(async (chat) => {
    const sends: string[] = [];
    chat.addEventListener("send", (event) => {
      sends.push((event as CustomEvent<{ content: string }>).detail.content);
    });

    const resultPromise = chat.requestConfirmation({
      id: "block-send",
      title: "Block send",
    });
    await activeConfirmation(chat);

    await invokeSend(chat, "must not send");
    assertDeepEqual(sends, []);

    chat.clearConfirmations();
    await resultPromise;
  });
});

test("confirmation: opening and closing does not change busy", async () => {
  await withIsolatedChat(async (chat) => {
    const busyChanges: boolean[] = [];
    chat.addEventListener("busy-change", (event) => {
      busyChanges.push((event as CustomEvent<{ busy: boolean }>).detail.busy);
    });

    const resultPromise = chat.requestConfirmation({
      id: "busy-independent",
      title: "Busy independent",
    });
    const confirmation = await activeConfirmation(chat);
    assertEqual(chat.busy, false);

    confirmationButton(confirmation, "cancel").click();
    await resultPromise;
    await waitForUpdate(chat);

    assertEqual(chat.busy, false);
    assertDeepEqual(busyChanges, []);
  });
});

test("confirmation: async beforeSend rechecks active request", async () => {
  await withIsolatedChat(async (chat) => {
    const entered = deferred();
    const release = deferred();
    const sends: string[] = [];
    const busyChanges: boolean[] = [];

    chat.use({
      name: "confirmation-before-send",
      async beforeSend(content) {
        entered.resolve();
        await release.promise;
        return content;
      },
    });
    chat.addEventListener("send", (event) => {
      sends.push((event as CustomEvent<{ content: string }>).detail.content);
    });
    chat.addEventListener("busy-change", (event) => {
      busyChanges.push((event as CustomEvent<{ busy: boolean }>).detail.busy);
    });

    const sendPromise = invokeSend(chat, "pending");
    await entered.promise;
    assertEqual(chat.busy, true);

    const confirmationPromise = chat.requestConfirmation({
      id: "during-before-send",
      title: "Opened while waiting",
    });
    await activeConfirmation(chat);

    release.resolve();
    await sendPromise;

    assertDeepEqual(sends, []);
    assertEqual(chat.busy, false);
    assertDeepEqual(busyChanges, [true, false]);

    chat.clearConfirmations();
    const result: ChatConfirmationResult = await confirmationPromise;
    assertEqual(result.action, "cancel");
  });
});

// 7. DOM attributes
test("dom: data-message-id and data-part-id are present", async () => {
  const chat = createChat();
  chat.addMessage({
    id: "attr-test",
    role: "assistant",
    parts: [{ type: "text", id: "attr-part", text: "hi" }],
  });
  await waitForUpdate(chat);
  // Give the nested shadow DOM time to render
  await new Promise((r) => setTimeout(r, 100));

  const messagesEl = chat.shadowRoot?.querySelector(
    "i-chat-messages",
  ) as HTMLElement | null;
  assert(messagesEl, "i-chat-messages should be present");

  const msgEl = messagesEl?.shadowRoot?.querySelector(
    '[data-message-id="attr-test"]',
  ) as HTMLElement | null;
  assert(msgEl, "message element should have data-message-id");
});

// 8. Streaming → terminal render
//
// Regression: the shared `partId` markdown cache used to short-circuit the
// terminal render and morph the caller's `previousHtml` back into the DOM.
// During streaming that baseline is the light render of the text revealed so
// far, so a second message with the same part id and identical text stayed
// pinned to the truncated typewriter output.

const TERMINAL_TAIL = "TAIL-MARKER-END";

/** Long enough that the typewriter is still far behind when the run completes. */
const TERMINAL_BODY =
  Array.from(
    { length: 120 },
    (_, i) => `Paragraph ${i} with enough text to outpace the typewriter.`,
  ).join("\n\n") + `\n\n${TERMINAL_TAIL}`;

function createDetachedChat(): Chat {
  const container = document.createElement("div");
  container.style.display = "none";
  document.body.appendChild(container);
  const el = document.createElement("i-chat") as Chat;
  container.appendChild(el);
  return el;
}

/** Walk nested shadow roots — the text part lives several levels deep. */
function deepQuery(
  root: Document | ShadowRoot | Element,
  selector: string,
): Element | null {
  const direct = root.querySelector(selector);
  if (direct) return direct;
  for (const el of root.querySelectorAll("*")) {
    const shadow = (el as Element & { shadowRoot?: ShadowRoot | null })
      .shadowRoot;
    if (!shadow) continue;
    const found = deepQuery(shadow, selector);
    if (found) return found;
  }
  return null;
}

function renderedPartText(
  chat: Chat,
  messageId: string,
  partId: string,
): string {
  const msgEl = deepQuery(chat.shadowRoot!, `[data-message-id="${messageId}"]`);
  assert(msgEl, `message ${messageId} should be rendered`);
  const contentEl = deepQuery(
    msgEl!.shadowRoot ?? msgEl!,
    `div.content[data-part-id="${partId}"]`,
  );
  assert(contentEl, `text part ${partId} of ${messageId} should be rendered`);
  return contentEl!.textContent ?? "";
}

async function streamThenComplete(
  chat: Chat,
  messageId: string,
  partId: string,
): Promise<void> {
  chat.addMessage({
    id: messageId,
    role: "assistant",
    streaming: true,
    parts: [
      { type: "text", id: partId, text: TERMINAL_BODY, status: "streaming" },
    ],
  });
  await waitForUpdate(chat);
  // Let the typewriter reveal only a few characters, so the streaming light
  // render in the DOM is a strict prefix of the full body.
  await new Promise((r) => setTimeout(r, 60));

  chat.updatePart(messageId, partId, { status: "complete" });
  chat.updateMessage(messageId, { streaming: false });
  await waitForUpdate(chat);
  await new Promise((r) => setTimeout(r, 60));
}

test("render: terminal render replaces the partial streaming output", async () => {
  const chat = createDetachedChat();
  await waitForUpdate(chat);

  // First run populates the shared markdown cache for this part id.
  await streamThenComplete(chat, "terminal-1", "terminal-content");
  const first = renderedPartText(chat, "terminal-1", "terminal-content");
  assert(
    first.includes(TERMINAL_TAIL),
    `first message should render the full body, got ${first.length} chars`,
  );

  // Second run reuses the part id with byte-identical text — the cache hits.
  await streamThenComplete(chat, "terminal-2", "terminal-content");
  const second = renderedPartText(chat, "terminal-2", "terminal-content");
  assert(
    second.includes(TERMINAL_TAIL),
    `second message should render the full body, got ${second.length} chars`,
  );
});

// ── Mock ReactiveControllerHost ──────────────────────────────────────────

// Report when all tests are queued
setTimeout(() => {
  if (results.length > 0 && results.every((r) => r.detail !== "pending")) {
    // Already done
  }
}, 5000);
