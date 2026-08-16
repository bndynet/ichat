import assert from "node:assert/strict";
import test from "node:test";
import { Chat } from "../src/components/chat.js";
import type {
  ChatComposerInteractionChangeDetail,
  ChatComposerInteractionResult,
  ChatConfirmationChangeDetail,
  ChatConfirmationResult,
} from "../src/components/chat.js";
import type { ConfirmationController } from "../src/controllers/confirmation-controller.js";

function confirmationController(chat: Chat): ConfirmationController {
  return (chat as unknown as { _confirmCtrl: ConfirmationController })
    ._confirmCtrl;
}

test("emits immutable queue snapshots and result before change", async () => {
  const chat = new Chat();
  const changes: ChatComposerInteractionChangeDetail[] = [];
  const results: ChatComposerInteractionResult[] = [];
  const order: string[] = [];

  chat.addEventListener("composer-interaction-change", (event) => {
    assert.equal(event.bubbles, true);
    assert.equal((event as CustomEvent).composed, true);
    changes.push(
      (event as CustomEvent<ChatComposerInteractionChangeDetail>).detail,
    );
    order.push(event.type);
  });
  chat.addEventListener("composer-interaction-result", (event) => {
    assert.equal(event.bubbles, true);
    assert.equal((event as CustomEvent).composed, true);
    results.push((event as CustomEvent<ChatComposerInteractionResult>).detail);
    order.push(event.type);
  });

  const firstPromise = chat.requestComposerInteraction({
    id: "event-first",
    kind: "x-form",
    payload: { step: 1 },
  });
  const firstSnapshot = changes.at(-1);
  assert.ok(firstSnapshot?.active);
  firstSnapshot.active.id = "externally-mutated";
  firstSnapshot.queue.push({ id: "fake", kind: "x-fake" });

  const secondPromise = chat.requestComposerInteraction({
    id: "event-second",
    kind: "x-picker",
  });
  const queuedSnapshot = changes.at(-1);
  assert.equal(chat.activeComposerInteraction?.id, "event-first");
  assert.equal(queuedSnapshot?.active?.id, "event-first");
  assert.deepEqual(
    queuedSnapshot?.queue.map((request) => request.id),
    ["event-second"],
  );
  assert.equal(queuedSnapshot?.queueLength, 1);

  if (queuedSnapshot) queuedSnapshot.queue.length = 0;
  order.length = 0;
  assert.equal(
    chat.completeComposerInteraction("event-first", { submitted: true }),
    true,
  );
  const firstResult = await firstPromise;

  assert.deepEqual(order, [
    "composer-interaction-result",
    "composer-interaction-change",
  ]);
  assert.deepEqual(results.at(-1), firstResult);
  assert.equal(firstResult.status, "completed");
  assert.equal(chat.activeComposerInteraction?.id, "event-second");

  chat.completeComposerInteraction("event-second", "selected");
  await secondPromise;
});

test("emits deterministic cancellation results for cancel, abort, and clear", async () => {
  const chat = new Chat();
  const results: ChatComposerInteractionResult[] = [];
  chat.addEventListener("composer-interaction-result", (event) => {
    results.push((event as CustomEvent<ChatComposerInteractionResult>).detail);
  });

  const cancelledPromise = chat.requestComposerInteraction({
    id: "event-cancelled",
    kind: "x-form",
  });
  assert.equal(chat.cancelComposerInteraction("event-cancelled"), true);
  const cancelled = await cancelledPromise;
  assert.equal(cancelled.status, "cancelled");
  assert.equal(
    cancelled.status === "cancelled" ? cancelled.reason : undefined,
    "cancelled",
  );

  const abortController = new AbortController();
  const abortedPromise = chat.requestComposerInteraction({
    id: "event-aborted",
    kind: "x-picker",
    signal: abortController.signal,
  });
  abortController.abort();
  const aborted = await abortedPromise;
  assert.equal(aborted.status, "cancelled");
  assert.equal(
    aborted.status === "cancelled" ? aborted.reason : undefined,
    "aborted",
  );

  const firstClearedPromise = chat.requestComposerInteraction({
    id: "event-cleared-active",
    kind: "x-form",
  });
  const secondClearedPromise = chat.requestComposerInteraction({
    id: "event-cleared-queued",
    kind: "x-picker",
  });
  assert.equal(chat.clearComposerInteractions(), 2);
  const cleared = await Promise.all([
    firstClearedPromise,
    secondClearedPromise,
  ]);

  assert.deepEqual(
    cleared.map((result) =>
      result.status === "cancelled" ? result.reason : result.status,
    ),
    ["cleared", "cleared"],
  );
  assert.deepEqual(
    results.map((result) => result.id),
    [
      "event-cancelled",
      "event-aborted",
      "event-cleared-active",
      "event-cleared-queued",
    ],
  );
});

test("keeps confirmation events while also emitting generic events", async () => {
  const chat = new Chat();
  const eventOrder: string[] = [];
  const confirmationChanges: ChatConfirmationChangeDetail[] = [];
  const confirmationDecisions: ChatConfirmationResult[] = [];
  const interactionChanges: ChatComposerInteractionChangeDetail[] = [];
  const interactionResults: ChatComposerInteractionResult[] = [];

  chat.addEventListener("confirmation-change", (event) => {
    eventOrder.push(event.type);
    confirmationChanges.push(
      (event as CustomEvent<ChatConfirmationChangeDetail>).detail,
    );
  });
  chat.addEventListener("confirmation-decision", (event) => {
    eventOrder.push(event.type);
    confirmationDecisions.push(
      (event as CustomEvent<ChatConfirmationResult>).detail,
    );
  });
  chat.addEventListener("composer-interaction-change", (event) => {
    eventOrder.push(event.type);
    interactionChanges.push(
      (event as CustomEvent<ChatComposerInteractionChangeDetail>).detail,
    );
  });
  chat.addEventListener("composer-interaction-result", (event) => {
    eventOrder.push(event.type);
    interactionResults.push(
      (event as CustomEvent<ChatComposerInteractionResult>).detail,
    );
  });

  const resultPromise = chat.requestConfirmation({
    id: "event-confirmation",
    title: "Continue?",
  });
  assert.deepEqual(eventOrder, [
    "confirmation-change",
    "composer-interaction-change",
  ]);
  assert.equal(confirmationChanges.at(-1)?.active?.id, "event-confirmation");
  assert.equal(interactionChanges.at(-1)?.active?.kind, "confirmation");

  eventOrder.length = 0;
  confirmationController(chat).settle("confirm");
  const result = await resultPromise;

  assert.equal(result.confirmed, true);
  assert.deepEqual(eventOrder, [
    "confirmation-decision",
    "composer-interaction-result",
    "confirmation-change",
    "composer-interaction-change",
  ]);
  assert.deepEqual(confirmationDecisions, [result]);
  assert.equal(interactionResults.at(-1)?.status, "completed");
  assert.equal(interactionResults.at(-1)?.request.kind, "confirmation");
  assert.equal(confirmationChanges.at(-1)?.active, null);
  assert.equal(interactionChanges.at(-1)?.active, null);

  eventOrder.length = 0;
  const clearedPromise = chat.requestConfirmation({
    id: "event-confirmation-cleared",
    title: "Clear this confirmation",
  });
  eventOrder.length = 0;
  chat.clearConfirmations();
  const cleared = await clearedPromise;

  assert.equal(cleared.action, "cancel");
  assert.deepEqual(eventOrder, [
    "composer-interaction-result",
    "confirmation-change",
    "composer-interaction-change",
  ]);
  assert.equal(confirmationDecisions.length, 1);
  const genericClearResult = interactionResults.at(-1);
  assert.equal(genericClearResult?.status, "cancelled");
  assert.equal(
    genericClearResult?.status === "cancelled"
      ? genericClearResult.reason
      : undefined,
    "cleared",
  );
});

test("keeps duplicate confirmation IDs public in generic queue events", async () => {
  const chat = new Chat();
  const changes: ChatComposerInteractionChangeDetail[] = [];
  const results: ChatComposerInteractionResult[] = [];
  chat.addEventListener("composer-interaction-change", (event) => {
    changes.push(
      (event as CustomEvent<ChatComposerInteractionChangeDetail>).detail,
    );
  });
  chat.addEventListener("composer-interaction-result", (event) => {
    results.push((event as CustomEvent<ChatComposerInteractionResult>).detail);
  });

  const firstPromise = chat.requestConfirmation({
    id: "generic-duplicate",
    title: "First duplicate",
  });
  const secondPromise = chat.requestConfirmation({
    id: "generic-duplicate",
    title: "Second duplicate",
  });

  assert.equal(changes.at(-1)?.active?.id, "generic-duplicate");
  assert.deepEqual(
    changes.at(-1)?.queue.map((request) => request.id),
    ["generic-duplicate"],
  );

  confirmationController(chat).settle("confirm");
  const first = await firstPromise;
  assert.equal(first.id, "generic-duplicate");
  assert.equal(changes.at(-1)?.active?.id, "generic-duplicate");

  confirmationController(chat).settle("cancel");
  const second = await secondPromise;
  assert.equal(second.id, "generic-duplicate");
  assert.deepEqual(
    results.map((result) => ({ id: result.id, requestId: result.request.id })),
    [
      { id: "generic-duplicate", requestId: "generic-duplicate" },
      { id: "generic-duplicate", requestId: "generic-duplicate" },
    ],
  );
});

test("disconnect reports disconnected for confirmations and custom requests", async () => {
  const chat = new Chat();
  const results: ChatComposerInteractionResult[] = [];
  const decisions: ChatConfirmationResult[] = [];
  chat.addEventListener("composer-interaction-result", (event) => {
    results.push((event as CustomEvent<ChatComposerInteractionResult>).detail);
  });
  chat.addEventListener("confirmation-decision", (event) => {
    decisions.push((event as CustomEvent<ChatConfirmationResult>).detail);
  });

  const confirmationPromise = chat.requestConfirmation({
    id: "disconnect-confirmation",
    title: "Disconnect confirmation",
  });
  const customPromise = chat.requestComposerInteraction({
    id: "disconnect-custom",
    kind: "x-disconnect",
  });

  chat.disconnectedCallback();
  const [confirmation, custom] = await Promise.all([
    confirmationPromise,
    customPromise,
  ]);

  assert.equal(confirmation.action, "cancel");
  assert.equal(custom.status, "cancelled");
  assert.equal(
    custom.status === "cancelled" ? custom.reason : undefined,
    "disconnected",
  );
  assert.deepEqual(
    results.map((result) => ({
      id: result.id,
      reason: result.status === "cancelled" ? result.reason : result.status,
    })),
    [
      { id: "disconnect-confirmation", reason: "disconnected" },
      { id: "disconnect-custom", reason: "disconnected" },
    ],
  );
  assert.deepEqual(decisions, []);
  assert.equal(chat.activeComposerInteraction, null);
});
