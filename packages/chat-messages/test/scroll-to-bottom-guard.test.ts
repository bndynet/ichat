import assert from "node:assert/strict";
import test from "node:test";
import { ChatMessages } from "../src/components/chat-messages.js";

const rafQueue: FrameRequestCallback[] = [];

(
  globalThis as unknown as {
    requestAnimationFrame: (callback: FrameRequestCallback) => number;
  }
).requestAnimationFrame = (callback) => rafQueue.push(callback);

type Internals = ChatMessages & {
  _autoScroll: boolean;
  _scrollToBottom(force?: boolean): void;
};

/**
 * `_scrollToBottom` runs a bounded cascade of frames plus one pass gated on the
 * virtualizer's `layoutComplete`, which has no time bound. Both end up in the
 * same frame queue, so `scrollTop` cannot tell them apart — count the frames the
 * unbounded pass adds instead.
 */
async function framesAddedByLatePass(options: {
  autoScroll: boolean;
  force: boolean;
}): Promise<number> {
  const el = new ChatMessages() as Internals;
  // Without this, the first await lets Lit flush an update, and `updated()`
  // re-enters `_scrollToBottom` and enqueues frames of its own.
  Object.defineProperty(el, "requestUpdate", {
    value: () => undefined,
    configurable: true,
  });
  Object.defineProperty(el, "isConnected", { value: true, configurable: true });
  Object.defineProperty(el, "_scrollContainer", {
    value: { scrollTop: 0, scrollHeight: 1000, clientHeight: 300 },
    configurable: true,
  });
  const layoutComplete = Promise.resolve();
  // `_scrollContainer` and `_virtualizer` are both `@query` getters on the
  // prototype, so an own property is the only way to substitute them.
  Object.defineProperty(el, "_virtualizer", {
    value: { layoutComplete },
    configurable: true,
  });

  rafQueue.length = 0;
  el._scrollToBottom(options.force);
  const fromCascade = rafQueue.length;

  // The reader takes over (or a height correction lands) after the call.
  el._autoScroll = options.autoScroll;

  await layoutComplete;
  await Promise.resolve();

  return rafQueue.length - fromCascade;
}

test("the unbounded pass leaves the reader alone once they scroll away", async () => {
  assert.equal(
    await framesAddedByLatePass({ autoScroll: false, force: false }),
    0,
  );
});

test("the unbounded pass still runs while the list follows new content", async () => {
  assert.equal(
    await framesAddedByLatePass({ autoScroll: true, force: false }),
    1,
  );
});

test("an explicit scroll-to-bottom survives autoScroll dropping mid-flight", async () => {
  assert.equal(
    await framesAddedByLatePass({ autoScroll: false, force: true }),
    1,
  );
});

test("the scroll-to-latest button asks for the override", () => {
  // The guard above is only correct if the deliberate entry points opt out of
  // it, and that wiring is a single argument away from being dropped.
  const el = new ChatMessages() as Internals & {
    _handleScrollToBottom(): void;
  };
  Object.defineProperty(el, "requestUpdate", {
    value: () => undefined,
    configurable: true,
  });
  const forces: Array<boolean | undefined> = [];
  Object.defineProperty(el, "_scrollToBottom", {
    value: (force?: boolean) => forces.push(force),
    configurable: true,
  });

  el._handleScrollToBottom();

  assert.deepEqual(forces, [true]);
});
