/**
 * API-surface tests for `<i-chat-input>`.
 *
 * Covers properties, events, submission guards, locale resolution, and
 * the public method contract.  Tests run in Node without a DOM
 * environment — full interaction tests (keyboard, voice lifecycle,
 * auto-resize) need a browser.
 */

import assert from "node:assert/strict";

// Node doesn't have `window`; provide a minimal stub so the module can load.
(globalThis as Record<string, unknown>).window = globalThis;

import "../src/components/chat-input.js";
import { ChatInput } from "../src/components/chat-input.js";
import {
  resolveComposerLabels,
  COMPOSER_LABELS_EN,
  COMPOSER_LABELS_ZH_CN,
} from "../src/i18n.js";

// ── helpers ───────────────────────────────────────────────────────────

const Ctor = customElements.get("i-chat-input")!;

type Input = HTMLElement & {
  placeholder: string;
  locale: string;
  streaming: boolean;
  busy: boolean;
  disabled: boolean;
  showVoiceInput: boolean;
  voiceDiagnostics: boolean;
  voiceLang: string;
  voiceListeningLabel: string;
  labels?: Record<string, string>;
  setValue(value: string): void;
  focus(): void;
  _submit(): void;
  _cancel(): void;
  _toggleVoice(): void;
};

function create(): Input {
  return new Ctor() as Input;
}

// ── Module & registration ─────────────────────────────────────────────

assert.ok(
  customElements.get("i-chat-input"),
  "i-chat-input should be registered",
);
assert.doesNotThrow(() => new Ctor(), "constructor should not throw");

// ── Default property values ────────────────────────────────────────────

{
  const el = create();
  assert.equal(el.placeholder, "");
  assert.equal(el.locale, "");
  assert.equal(el.streaming, false);
  assert.equal(el.busy, false);
  assert.equal(el.disabled, false);
  assert.equal(el.showVoiceInput, true);
  assert.equal(el.voiceDiagnostics, false);
  assert.equal(el.voiceLang, "");
  assert.equal(el.voiceListeningLabel, "");
}

// ── Send event ─────────────────────────────────────────────────────────

// send dispatches when value is non-empty and no guard blocks it
{
  const input = create();
  let content = "";
  input.addEventListener("send", (e) => {
    content = (e as CustomEvent).detail.content;
  });

  input.setValue("hello world");
  input._submit();
  assert.equal(content, "hello world", "send should dispatch with content");
}

// send clears the internal value after dispatch
{
  const input = create();
  let dispatched = "";
  input.addEventListener("send", (e) => {
    dispatched = (e as CustomEvent).detail.content;
  });

  input.setValue("message one");
  input._submit();
  assert.equal(dispatched, "message one");

  // After send + clear, submitting again should not fire
  let secondSend = false;
  input.addEventListener("send", () => {
    secondSend = true;
  });
  input._submit();
  assert.equal(secondSend, false, "empty value after send should not re-fire");
}

// ── Cancel event ───────────────────────────────────────────────────────

// cancel dispatches when _cancel is called (streaming state doesn't block it)
{
  const input = create();
  let cancelled = false;
  input.addEventListener("cancel", () => {
    cancelled = true;
  });

  input._cancel();
  assert.equal(cancelled, true, "_cancel should dispatch cancel event");
}

// ── Submission guards ──────────────────────────────────────────────────

// busy blocks send
{
  const input = create();
  let sends = 0;
  input.addEventListener("send", () => sends++);

  input.setValue("hello");
  input.busy = true;
  input._submit();
  assert.equal(sends, 0, "busy should block send");

  input.busy = false;
  input._submit();
  assert.equal(sends, 1, "send should fire after busy clears");
}

// streaming blocks send
{
  const input = create();
  let sends = 0;
  input.addEventListener("send", () => sends++);

  input.setValue("hello");
  input.streaming = true;
  input._submit();
  assert.equal(sends, 0, "streaming should block send");

  input.streaming = false;
  input._submit();
  assert.equal(sends, 1, "send should fire after streaming clears");
}

// disabled blocks send
{
  const input = create();
  let sends = 0;
  input.addEventListener("send", () => sends++);

  input.setValue("hello");
  input.disabled = true;
  input._submit();
  assert.equal(sends, 0, "disabled should block send");

  input.disabled = false;
  input._submit();
  assert.equal(sends, 1, "send should fire after disabled clears");
}

// empty value blocks send
{
  const input = create();
  let sends = 0;
  input.addEventListener("send", () => sends++);

  input.setValue("   ");
  input._submit();
  assert.equal(sends, 0, "whitespace-only should not send");

  input.setValue("");
  input._submit();
  assert.equal(sends, 0, "empty string should not send");
}

// simultaneous guards: busy + streaming both block
{
  const input = create();
  let sends = 0;
  input.addEventListener("send", () => sends++);

  input.setValue("hello");
  input.busy = true;
  input.streaming = true;
  input._submit();
  assert.equal(sends, 0, "busy+streaming should block send");

  // clearing only one guard still blocks
  input.busy = false;
  input._submit();
  assert.equal(sends, 0, "streaming alone should block send");

  input.streaming = false;
  input._submit();
  assert.equal(sends, 1, "send should fire after both clear");
}

// ── setValue ───────────────────────────────────────────────────────────

// multiple setValue calls replace the value
{
  const input = create();
  let content = "";
  input.addEventListener("send", (e) => {
    content = (e as CustomEvent).detail.content;
  });

  input.setValue("first");
  input.setValue("second");
  input._submit();
  assert.equal(content, "second", "last setValue wins");
}

// ── Locale resolution ──────────────────────────────────────────────────

// en (default)
{
  const labels = resolveComposerLabels({ locale: "en" });
  assert.equal(labels.placeholder, COMPOSER_LABELS_EN.placeholder);
  assert.equal(labels.send, COMPOSER_LABELS_EN.send);
}

// zh-CN
{
  const labels = resolveComposerLabels({ locale: "zh-CN" });
  assert.equal(labels.placeholder, COMPOSER_LABELS_ZH_CN.placeholder);
  assert.equal(labels.send, COMPOSER_LABELS_ZH_CN.send);
}

// zh (without region) resolves to zh-CN
{
  const labels = resolveComposerLabels({ locale: "zh" });
  assert.equal(labels.placeholder, COMPOSER_LABELS_ZH_CN.placeholder);
}

// unknown locale falls back to English
{
  const labels = resolveComposerLabels({ locale: "fr" });
  assert.equal(labels.placeholder, COMPOSER_LABELS_EN.placeholder);
}

// partial label overrides merge with base
{
  const labels = resolveComposerLabels({
    locale: "en",
    labels: { placeholder: "Ask me anything…" },
  });
  assert.equal(labels.placeholder, "Ask me anything…");
  assert.equal(labels.send, COMPOSER_LABELS_EN.send); // untouched
}

// label override with undefined keeps the base value
{
  const labels = resolveComposerLabels({
    locale: "en",
    labels: { placeholder: undefined },
  });
  assert.equal(labels.placeholder, COMPOSER_LABELS_EN.placeholder);
}

// ── Voice input support detection ──────────────────────────────────────

// isVoiceInputSupported is a static boolean — truth depends on runtime
{
  assert.equal(
    typeof ChatInput.isVoiceInputSupported(),
    "boolean",
    "isVoiceInputSupported should return a boolean",
  );
}

// ── Public method existence ────────────────────────────────────────────

{
  const input = create();
  assert.equal(
    typeof input.setValue,
    "function",
    "setValue should be a function",
  );
  assert.equal(typeof input.focus, "function", "focus should be a function");
}

// ── Multiple instances are independent ─────────────────────────────────

{
  const a = create();
  const b = create();
  let aContent = "";
  let bContent = "";
  a.addEventListener("send", (e) => {
    aContent = (e as CustomEvent).detail.content;
  });
  b.addEventListener("send", (e) => {
    bContent = (e as CustomEvent).detail.content;
  });

  a.setValue("from-a");
  b.setValue("from-b");
  a._submit();
  b._submit();

  assert.equal(aContent, "from-a");
  assert.equal(bContent, "from-b");
}

// ── Cancel is always dispatchable (even without streaming) ─────────────

{
  const input = create();
  let count = 0;
  input.addEventListener("cancel", () => count++);

  input._cancel();
  assert.equal(count, 1);

  input.streaming = true;
  input._cancel();
  assert.equal(count, 2, "cancel should dispatch in streaming state too");

  input.streaming = false;
  input._cancel();
  assert.equal(count, 3, "cancel should dispatch outside streaming state");
}
