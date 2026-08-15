/**
 * Characterization tests for the existing confirmation queue contract.
 *
 * These tests intentionally lock down current behavior before the confirmation
 * flow is adapted to a more general composer interaction controller.
 */

import assert from "node:assert/strict";
import test from "node:test";
import type { ReactiveController, ReactiveControllerHost } from "lit";
import { Chat } from "../src/components/chat.js";
import type {
  ChatConfirmationChangeDetail,
  ChatConfirmationResult,
} from "../src/components/chat.js";
import { ComposerInteractionController } from "../src/controllers/composer-interaction-controller.js";
import { ConfirmationController } from "../src/controllers/confirmation-controller.js";

class MockHost extends EventTarget implements ReactiveControllerHost {
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
  composer: ComposerInteractionController;
  controller: ConfirmationController;
} {
  const host = new MockHost();
  const composer = new ComposerInteractionController(host);
  return {
    host,
    composer,
    controller: new ConfirmationController(host, composer),
  };
}

function createChat(): Chat {
  return new Chat();
}

test("request generates IDs, replaces blank IDs, and defaults the variant", async () => {
  const { controller } = createController();

  const generatedPromise = controller.request({ title: "Generated ID" });
  const generated = controller.activeRequest;
  assert.ok(generated);
  assert.match(generated.id, /^confirm-[0-9a-z]+-[0-9a-z]+$/);
  assert.equal(generated.variant, "default");
  controller.settle("cancel");
  await generatedPromise;

  const blankPromise = controller.request({ id: " \t ", title: "Blank ID" });
  const blank = controller.activeRequest;
  assert.ok(blank);
  assert.match(blank.id, /^confirm-[0-9a-z]+-[0-9a-z]+$/);
  assert.notEqual(blank.id, generated.id);
  assert.equal(blank.variant, "default");
  controller.settle("cancel");
  await blankPromise;
});

test("delegates confirmation requests to the shared composer queue", async () => {
  const { composer, controller } = createController();
  const resultPromise = controller.request({
    id: "delegated",
    title: "Delegated confirmation",
  });

  assert.equal(composer.active?.id, "delegated");
  assert.equal(composer.active?.kind, "confirmation");
  assert.deepEqual(composer.active?.payload, controller.activeRequest);

  controller.settle("confirm");
  const result = await resultPromise;
  assert.equal(result.confirmed, true);
  assert.equal(composer.active, null);
});

test("cancelAll leaves custom composer interactions untouched", async () => {
  const { composer, controller } = createController();
  const customPromise = composer.request({ id: "custom", kind: "x-form" });
  const confirmationPromise = controller.request({
    id: "confirmation",
    title: "Queued confirmation",
  });

  assert.equal(composer.active?.id, "custom");
  assert.equal(controller.activeRequest, null);
  assert.equal(controller.queueLength, 1);

  controller.cancelAll();
  const confirmation = await confirmationPromise;
  assert.equal(confirmation.action, "cancel");
  assert.equal(composer.active?.id, "custom");
  assert.equal(composer.queueLength, 0);

  composer.completeActive("custom", "done");
  assert.equal((await customPromise).status, "completed");
});

test("three requests remain strict FIFO and queueLength excludes active", async () => {
  const { host, controller } = createController();
  let latestChange: ChatConfirmationChangeDetail | undefined;
  host.addEventListener("confirmation-change", (event) => {
    latestChange = (event as CustomEvent<ChatConfirmationChangeDetail>).detail;
  });

  const firstPromise = controller.request({ id: "first", title: "First" });
  const secondPromise = controller.request({ id: "second", title: "Second" });
  const thirdPromise = controller.request({ id: "third", title: "Third" });

  assert.equal(controller.activeRequest?.id, "first");
  assert.equal(controller.queueLength, 2);
  assert.deepEqual(
    latestChange?.queue.map((request) => request.id),
    ["second", "third"],
  );

  controller.settle("confirm");
  const first = await firstPromise;
  assert.equal(first.id, "first");
  assert.equal(first.action, "confirm");
  assert.equal(first.confirmed, true);
  assert.equal(first.request.id, "first");
  assert.equal(controller.activeRequest?.id, "second");
  assert.equal(controller.queueLength, 1);

  controller.settle("cancel");
  const second = await secondPromise;
  assert.equal(second.id, "second");
  assert.equal(second.action, "cancel");
  assert.equal(second.confirmed, false);
  assert.equal(second.request.id, "second");
  assert.equal(controller.activeRequest?.id, "third");
  assert.equal(controller.queueLength, 0);

  controller.settle("confirm");
  const third = await thirdPromise;
  assert.equal(third.id, "third");
  assert.equal(third.action, "confirm");
  assert.equal(third.confirmed, true);
  assert.equal(controller.activeRequest, null);
  assert.equal(controller.queueLength, 0);
});

test("settle emits confirmation-decision before confirmation-change", async () => {
  const { host, controller } = createController();
  const eventOrder: string[] = [];
  let decision: ChatConfirmationResult | undefined;

  host.addEventListener("confirmation-decision", (event) => {
    eventOrder.push(event.type);
    decision = (event as CustomEvent<ChatConfirmationResult>).detail;
  });
  host.addEventListener("confirmation-change", (event) => {
    eventOrder.push(event.type);
  });

  const resultPromise = controller.request({ id: "ordered", title: "Ordered" });
  eventOrder.length = 0;

  controller.settle("confirm");
  const result = await resultPromise;

  assert.deepEqual(eventOrder, [
    "confirmation-decision",
    "confirmation-change",
  ]);
  assert.deepEqual(decision, result);
});

test("clearConfirmations cancels active and queued promises without decisions", async () => {
  const chat = createChat();
  const decisions: ChatConfirmationResult[] = [];
  const changes: ChatConfirmationChangeDetail[] = [];

  chat.addEventListener("confirmation-decision", (event) => {
    decisions.push((event as CustomEvent<ChatConfirmationResult>).detail);
  });
  chat.addEventListener("confirmation-change", (event) => {
    changes.push((event as CustomEvent<ChatConfirmationChangeDetail>).detail);
  });

  const promises = [
    chat.requestConfirmation({ id: "clear-1", title: "One" }),
    chat.requestConfirmation({ id: "clear-2", title: "Two" }),
    chat.requestConfirmation({ id: "clear-3", title: "Three" }),
  ];
  changes.length = 0;

  chat.clearConfirmations();
  const results = await Promise.all(promises);

  assert.deepEqual(
    results.map(({ id, action, confirmed }) => ({ id, action, confirmed })),
    [
      { id: "clear-1", action: "cancel", confirmed: false },
      { id: "clear-2", action: "cancel", confirmed: false },
      { id: "clear-3", action: "cancel", confirmed: false },
    ],
  );
  assert.equal(decisions.length, 0);
  assert.equal(changes.length, 1);
  assert.deepEqual(changes[0], {
    active: null,
    queue: [],
    queueLength: 0,
  });
});

test("disconnect clears active and queue and cancels every promise", async () => {
  const { host, controller } = createController();
  const decisions: ChatConfirmationResult[] = [];
  host.addEventListener("confirmation-decision", (event) => {
    decisions.push((event as CustomEvent<ChatConfirmationResult>).detail);
  });

  const firstPromise = controller.request({ id: "disconnect-1", title: "One" });
  const secondPromise = controller.request({
    id: "disconnect-2",
    title: "Two",
  });

  host.disconnect();
  const results = await Promise.all([firstPromise, secondPromise]);

  assert.equal(controller.activeRequest, null);
  assert.equal(controller.queueLength, 0);
  assert.deepEqual(
    results.map((result) => result.action),
    ["cancel", "cancel"],
  );
  assert.equal(decisions.length, 0);
});

test("each request promise resolves only once", async () => {
  const { controller } = createController();
  let firstResolutionCount = 0;
  let secondResolutionCount = 0;

  const firstPromise = controller
    .request({ id: "once-1", title: "One" })
    .then((result) => {
      firstResolutionCount += 1;
      return result;
    });
  const secondPromise = controller
    .request({ id: "once-2", title: "Two" })
    .then((result) => {
      secondResolutionCount += 1;
      return result;
    });

  controller.settle("confirm");
  controller.cancelAll();
  controller.settle("cancel");
  controller.cancelAll();

  const [first, second] = await Promise.all([firstPromise, secondPromise]);
  assert.equal(first.action, "confirm");
  assert.equal(second.action, "cancel");
  assert.equal(firstResolutionCount, 1);
  assert.equal(secondResolutionCount, 1);
});
