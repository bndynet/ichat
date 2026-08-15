import assert from "node:assert/strict";
import test from "node:test";
import type { ReactiveController, ReactiveControllerHost } from "lit";
import { ComposerInteractionController } from "../src/controllers/composer-interaction-controller.js";
import type {
  InternalComposerInteractionChangeDetail,
  InternalComposerInteractionResult,
} from "../src/controllers/composer-interaction-types.js";

class MockHost implements ReactiveControllerHost {
  readonly controllers = new Set<ReactiveController>();
  readonly updateComplete = Promise.resolve(true);
  updateRequests = 0;

  addController(controller: ReactiveController): void {
    this.controllers.add(controller);
  }

  removeController(controller: ReactiveController): void {
    this.controllers.delete(controller);
  }

  requestUpdate(): void {
    this.updateRequests += 1;
  }

  disconnect(): void {
    for (const controller of this.controllers) {
      controller.hostDisconnected?.();
    }
  }
}

function createController(): {
  host: MockHost;
  controller: ComposerInteractionController;
} {
  const host = new MockHost();
  return { host, controller: new ComposerInteractionController(host) };
}

function assertCompleted(
  result: InternalComposerInteractionResult,
  id: string,
  value: unknown,
): void {
  assert.equal(result.id, id);
  assert.equal(result.status, "completed");
  if (result.status === "completed") {
    assert.deepEqual(result.value, value);
    assert.equal(result.request.id, id);
  }
}

function assertCancelled(
  result: InternalComposerInteractionResult,
  id: string,
  reason: string,
): void {
  assert.equal(result.id, id);
  assert.equal(result.status, "cancelled");
  if (result.status === "cancelled") {
    assert.equal(result.reason, reason);
    assert.equal(result.request.id, id);
  }
}

test("completes a single active request", async () => {
  const { controller } = createController();
  const resultPromise = controller.request({
    id: "single-complete",
    kind: "x-form",
    payload: { field: "name" },
  });

  assert.equal(controller.active?.id, "single-complete");
  assert.equal(controller.queueLength, 0);
  assert.equal(
    controller.completeActive("single-complete", { name: "Ada" }),
    true,
  );

  assertCompleted(await resultPromise, "single-complete", { name: "Ada" });
  assert.equal(controller.active, null);
  assert.deepEqual(controller.queue, []);
});

test("cancels a single active request", async () => {
  const { controller } = createController();
  const resultPromise = controller.request({
    id: "single-cancel",
    kind: "confirmation",
  });

  assert.equal(controller.cancel("single-cancel", "dismissed"), true);

  assertCancelled(await resultPromise, "single-cancel", "dismissed");
  assert.equal(controller.active, null);
  assert.equal(controller.queueLength, 0);
});

test("services three requests in strict FIFO order", async () => {
  const { controller } = createController();
  const firstPromise = controller.request({ id: "first", kind: "x-form" });
  const secondPromise = controller.request({ id: "second", kind: "x-form" });
  const thirdPromise = controller.request({ id: "third", kind: "x-form" });

  assert.equal(controller.active?.id, "first");
  assert.deepEqual(
    controller.queue.map((request) => request.id),
    ["second", "third"],
  );
  assert.equal(controller.queueLength, 2);

  assert.equal(controller.completeActive("first", 1), true);
  assert.equal(controller.active?.id, "second");
  assert.equal(controller.queueLength, 1);

  assert.equal(controller.completeActive("second", 2), true);
  assert.equal(controller.active?.id, "third");
  assert.equal(controller.queueLength, 0);

  assert.equal(controller.completeActive("third", 3), true);
  const results = await Promise.all([
    firstPromise,
    secondPromise,
    thirdPromise,
  ]);
  assert.deepEqual(
    results.map((result) => result.id),
    ["first", "second", "third"],
  );
  assert.equal(controller.active, null);
});

test("preserves confirmation and custom requests in one FIFO", async () => {
  const { controller } = createController();
  const confirmationPromise = controller.request({
    id: "confirm-first",
    kind: "confirmation",
  });
  const customPromise = controller.request({
    id: "form-second",
    kind: "x-form",
  });
  const finalConfirmationPromise = controller.request({
    id: "confirm-third",
    kind: "confirmation",
  });

  assert.equal(controller.active?.kind, "confirmation");
  assert.deepEqual(
    controller.queue.map((request) => request.kind),
    ["x-form", "confirmation"],
  );

  controller.completeActive("confirm-first", true);
  assert.equal(controller.active?.id, "form-second");
  controller.completeActive("form-second", { answer: 42 });
  assert.equal(controller.active?.id, "confirm-third");
  controller.completeActive("confirm-third", false);

  const results = await Promise.all([
    confirmationPromise,
    customPromise,
    finalConfirmationPromise,
  ]);
  assert.deepEqual(
    results.map((result) => result.request.kind),
    ["confirmation", "x-form", "confirmation"],
  );
});

test("stale IDs leave the active request untouched", async () => {
  const { controller } = createController();
  const resultPromise = controller.request({
    id: "current",
    kind: "x-form",
  });

  assert.equal(controller.completeActive("stale", "ignored"), false);
  assert.equal(controller.cancel("stale", "ignored"), false);
  assert.equal(controller.active?.id, "current");
  assert.equal(controller.queueLength, 0);

  controller.completeActive("current", "accepted");
  assertCompleted(await resultPromise, "current", "accepted");
});

test("rejects duplicate pending IDs", async () => {
  const { controller } = createController();
  const activePromise = controller.request({
    id: "duplicate",
    kind: "confirmation",
  });

  await assert.rejects(
    controller.request({ id: "duplicate", kind: "x-form" }),
    /already pending/,
  );
  assert.equal(controller.active?.id, "duplicate");
  assert.equal(controller.queueLength, 0);

  controller.cancel("duplicate", "cleanup");
  assertCancelled(await activePromise, "duplicate", "cleanup");
});

test("cancels a queued request without disturbing the active request", async () => {
  const { controller } = createController();
  const activePromise = controller.request({ id: "active", kind: "x-form" });
  const queuedPromise = controller.request({ id: "queued", kind: "x-form" });

  assert.equal(controller.cancel("queued", "not-needed"), true);
  assert.equal(controller.active?.id, "active");
  assert.equal(controller.queueLength, 0);
  assertCancelled(await queuedPromise, "queued", "not-needed");

  controller.completeActive("active", "done");
  assertCompleted(await activePromise, "active", "done");
});

test("cancelWhere cancels only matching requests", async () => {
  const { controller } = createController();
  const firstPromise = controller.request({
    id: "confirmation-1",
    kind: "confirmation",
  });
  const secondPromise = controller.request({ id: "form-1", kind: "x-form" });
  const thirdPromise = controller.request({
    id: "confirmation-2",
    kind: "confirmation",
  });
  const fourthPromise = controller.request({ id: "form-2", kind: "x-form" });

  assert.equal(
    controller.cancelWhere(
      (request) => request.kind === "confirmation",
      "filtered",
    ),
    2,
  );
  assert.equal(controller.active?.id, "form-1");
  assert.deepEqual(
    controller.queue.map((request) => request.id),
    ["form-2"],
  );

  assertCancelled(await firstPromise, "confirmation-1", "filtered");
  assertCancelled(await thirdPromise, "confirmation-2", "filtered");
  controller.completeActive("form-1", "first form");
  controller.completeActive("form-2", "second form");
  assertCompleted(await secondPromise, "form-1", "first form");
  assertCompleted(await fourthPromise, "form-2", "second form");
});

test("aborts an active request", async () => {
  const { controller } = createController();
  const abortController = new AbortController();
  const resultPromise = controller.request({
    id: "abort-active",
    kind: "x-form",
    signal: abortController.signal,
  });

  abortController.abort();

  assertCancelled(await resultPromise, "abort-active", "aborted");
  assert.equal(controller.active, null);
  assert.equal(controller.queueLength, 0);
});

test("aborts a queued request without disturbing FIFO", async () => {
  const { controller } = createController();
  const abortController = new AbortController();
  const firstPromise = controller.request({ id: "first", kind: "x-form" });
  const abortedPromise = controller.request({
    id: "aborted",
    kind: "x-form",
    signal: abortController.signal,
  });
  const thirdPromise = controller.request({ id: "third", kind: "x-form" });

  abortController.abort();

  assert.equal(controller.active?.id, "first");
  assert.deepEqual(
    controller.queue.map((request) => request.id),
    ["third"],
  );
  assertCancelled(await abortedPromise, "aborted", "aborted");

  controller.completeActive("first", 1);
  assert.equal(controller.active?.id, "third");
  controller.completeActive("third", 3);
  assertCompleted(await firstPromise, "first", 1);
  assertCompleted(await thirdPromise, "third", 3);
});

test("disconnect cancels the active request and queue", async () => {
  const { host, controller } = createController();
  const activePromise = controller.request({
    id: "disconnect-active",
    kind: "confirmation",
  });
  const queuedPromise = controller.request({
    id: "disconnect-queued",
    kind: "x-form",
  });

  host.disconnect();

  assertCancelled(await activePromise, "disconnect-active", "disconnected");
  assertCancelled(await queuedPromise, "disconnect-queued", "disconnected");
  assert.equal(controller.active, null);
  assert.deepEqual(controller.queue, []);
});

test("settles each request promise only once", async () => {
  const { controller } = createController();
  const abortController = new AbortController();
  let resolutionCount = 0;
  let resultEventCount = 0;
  controller.addEventListener("result", () => {
    resultEventCount += 1;
  });

  const resultPromise = controller
    .request({
      id: "once",
      kind: "x-form",
      signal: abortController.signal,
    })
    .then((result) => {
      resolutionCount += 1;
      return result;
    });

  assert.equal(controller.completeActive("once", "done"), true);
  abortController.abort();
  assert.equal(controller.cancel("once", "late-cancel"), false);
  assert.equal(controller.clear("late-clear"), 0);

  assertCompleted(await resultPromise, "once", "done");
  await Promise.resolve();
  assert.equal(resolutionCount, 1);
  assert.equal(resultEventCount, 1);
});

test("emits result before change when settling", async () => {
  const { controller } = createController();
  const eventOrder: string[] = [];
  let resultDetail: InternalComposerInteractionResult | undefined;
  let changeDetail: InternalComposerInteractionChangeDetail | undefined;
  controller.addEventListener("result", (event) => {
    eventOrder.push(event.type);
    resultDetail = (event as CustomEvent<InternalComposerInteractionResult>)
      .detail;
  });
  controller.addEventListener("change", (event) => {
    eventOrder.push(event.type);
    changeDetail = (
      event as CustomEvent<InternalComposerInteractionChangeDetail>
    ).detail;
  });

  const resultPromise = controller.request({
    id: "ordered",
    kind: "confirmation",
  });
  eventOrder.length = 0;

  controller.completeActive("ordered", true);
  const result = await resultPromise;

  assert.deepEqual(eventOrder, ["result", "change"]);
  assert.deepEqual(resultDetail, result);
  assert.deepEqual(changeDetail, {
    active: null,
    queue: [],
    queueLength: 0,
  });
});
