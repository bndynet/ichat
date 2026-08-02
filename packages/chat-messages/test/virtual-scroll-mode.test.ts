import assert from 'node:assert/strict';
import { AUTO_VIRTUAL_THRESHOLD, ChatMessages } from '../src/components/chat-messages.js';
import { textPart, type ChatMessage } from '../src/types.js';

function test(name: string, run: () => void): void {
  try {
    run();
  } catch (error) {
    console.error(`not ok - ${name}`);
    throw error;
  }
}

/** `scrollToMessage` builds a selector with `CSS.escape`, which node lacks. */
function installCSSShim(): void {
  if ('CSS' in globalThis) return;
  (globalThis as unknown as { CSS: { escape(value: string): string } }).CSS = {
    escape: (value: string) => value.replace(/[^\w-]/g, (ch) => `\\${ch}`),
  };
}

installCSSShim();

type MessagesInternals = ChatMessages & {
  _virtualScrollEnabled(): boolean;
  _virtualRequested(): boolean;
  _virtualActive(): boolean;
  _virtualizerReady: boolean;
  _virtualizerFailed: boolean;
  _modeScrollRestoreSeq: number;
  willUpdate(changed: Map<PropertyKey, unknown>): void;
};

function makeMessages(count: number): ChatMessage[] {
  return Array.from({ length: count }, (_unused, index) => ({
    id: `m${index}`,
    role: 'assistant' as const,
    parts: [textPart('body')],
    timestamp: 1000,
  }));
}

function makeElement(config: ChatMessages['config'], messageCount: number): MessagesInternals {
  const el = new ChatMessages() as MessagesInternals;
  el.config = config;
  el.messages = makeMessages(messageCount);
  return el;
}

/**
 * Simulate the Lit update a property assignment schedules. Lit puts the
 * *previous* value in `changedProperties`, so callers must pass it — otherwise
 * assertions about mode-switch detection are vacuous.
 */
function flushWillUpdate(
  el: MessagesInternals,
  changed: Array<[PropertyKey, unknown]> = [['messages', undefined]],
): void {
  el.willUpdate(new Map<PropertyKey, unknown>(changed));
}

// ---------- resolution of `virtualScroll` ----------

test("omitted virtualScroll falls back to the 'auto' default", () => {
  // The default lives in DEFAULT_CONFIG, so resolution must read the *merged*
  // config. Reading `this.config` directly leaves the feature permanently off.
  assert.equal(makeElement({}, AUTO_VIRTUAL_THRESHOLD + 1)._virtualScrollEnabled(), true);
  assert.equal(makeElement({}, AUTO_VIRTUAL_THRESHOLD)._virtualScrollEnabled(), false);
});

test("'auto' switches at the message-count threshold", () => {
  const config = { virtualScroll: 'auto' as const };
  assert.equal(makeElement(config, AUTO_VIRTUAL_THRESHOLD)._virtualScrollEnabled(), false);
  assert.equal(makeElement(config, AUTO_VIRTUAL_THRESHOLD + 1)._virtualScrollEnabled(), true);
});

test('explicit booleans ignore the threshold', () => {
  assert.equal(makeElement({ virtualScroll: true }, 1)._virtualScrollEnabled(), true);
  assert.equal(
    makeElement({ virtualScroll: false }, AUTO_VIRTUAL_THRESHOLD + 1)._virtualScrollEnabled(),
    false,
  );
});

// ---------- the truthy `'auto'` string must not leak ----------

test("'auto' below the threshold is not treated as enabled", () => {
  // `'auto'` is a truthy string: any check that reads the raw config value as a
  // boolean would report virtual scrolling as active here.
  const el = makeElement({ virtualScroll: 'auto' }, 10);
  el._virtualizerReady = true;
  assert.equal(el._virtualRequested(), false);
  assert.equal(el._virtualActive(), false);
});

test('scrollToMessage reports failure when the regular list has not rendered', () => {
  // Message exists in data but no element exists yet (no `updateComplete`
  // await). In regular mode there is no virtualizer to schedule through, so the
  // call must not claim success.
  const el = makeElement({ virtualScroll: 'auto' }, 10);
  assert.equal(el.scrollToMessage('m3'), false);
  assert.equal(el.scrollToPart('m3'), false);
});

test('a failed virtualizer load keeps virtual paths disabled', () => {
  const el = makeElement({ virtualScroll: true }, 10);
  el._virtualizerFailed = true;
  assert.equal(el._virtualScrollEnabled(), true);
  assert.equal(el._virtualRequested(), false);
  assert.equal(el._virtualActive(), false);
  assert.equal(el.scrollToMessage('m3'), false);
});

test('_virtualActive requires the module to be loaded', () => {
  const el = makeElement({ virtualScroll: true }, 10);
  assert.equal(el._virtualRequested(), true);
  assert.equal(el._virtualActive(), false);
  el._virtualizerReady = true;
  assert.equal(el._virtualActive(), true);
});

// ---------- mode-switch detection ----------

test('first update is not a mode switch', () => {
  const el = makeElement({ virtualScroll: true }, 10);
  flushWillUpdate(el);
  assert.equal(el._modeScrollRestoreSeq, 0);
});

test("'auto' crossing the threshold is detected as a mode switch", () => {
  // Deriving the previous mode from the old config value misses this entirely,
  // because only `messages` changed.
  const el = makeElement({ virtualScroll: 'auto' }, AUTO_VIRTUAL_THRESHOLD);
  flushWillUpdate(el);
  assert.equal(el._modeScrollRestoreSeq, 0);

  el.messages = makeMessages(AUTO_VIRTUAL_THRESHOLD + 1);
  flushWillUpdate(el);
  assert.equal(el._modeScrollRestoreSeq, 1);

  el.messages = makeMessages(AUTO_VIRTUAL_THRESHOLD);
  flushWillUpdate(el);
  assert.equal(el._modeScrollRestoreSeq, 2);
});

test('staying on the same side of the threshold is not a mode switch', () => {
  const el = makeElement({ virtualScroll: 'auto' }, 10);
  flushWillUpdate(el);
  el.messages = makeMessages(20);
  flushWillUpdate(el);
  assert.equal(el._modeScrollRestoreSeq, 0);
});

test("'auto' below threshold to explicit true is detected", () => {
  // Both the old and new config values are truthy (`'auto'` is a non-empty
  // string), so comparing raw config values reports no change here.
  const previousConfig = { virtualScroll: 'auto' as const };
  const el = makeElement(previousConfig, 10);
  flushWillUpdate(el);
  assert.equal(el._modeScrollRestoreSeq, 0);

  el.config = { virtualScroll: true };
  flushWillUpdate(el, [['config', previousConfig]]);
  assert.equal(el._modeScrollRestoreSeq, 1);
});

test('config change that does not alter the resolved mode is not a switch', () => {
  const previousConfig = { virtualScroll: false };
  const el = makeElement(previousConfig, 10);
  flushWillUpdate(el);
  el.config = { virtualScroll: false, streamingSpeed: 10 };
  flushWillUpdate(el, [['config', previousConfig]]);
  assert.equal(el._modeScrollRestoreSeq, 0);
});

console.log('ok - virtual-scroll-mode');
