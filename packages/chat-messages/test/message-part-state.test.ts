import assert from "node:assert/strict";
import {
  findMessagePart,
  appendMessagePart,
  replaceMessagePart,
  patchMessagePart,
  applyMessagePartUpdate,
  finalizeMessageParts,
} from "../src/message-part-state.js";
import { textPart, type ChatMessage, type MessagePart } from "../src/types.js";
import type { MessagePartUpdate } from "../src/message-part-events.js";

function test(name: string, run: () => void): void {
  try {
    run();
  } catch (error) {
    console.error(`not ok - ${name}`);
    throw error;
  }
}

function makeMsg(
  id: string,
  parts: MessagePart[] = [textPart(`body-${id}`)],
): ChatMessage {
  return { id, role: "assistant", parts, timestamp: 1000 };
}

// ── findMessagePart ────────────────────────────────────────────────────

test("findMessagePart returns message and part on match", () => {
  const part = textPart("hello");
  const msg = makeMsg("m1", [part]);
  const result = findMessagePart([msg], "m1", part.id);

  assert.ok(result.ok);
  if (result.ok) {
    assert.equal(result.message, msg);
    assert.equal(result.part, part);
  }
});

test("findMessagePart fails with message-not-found", () => {
  const part = textPart("hello");
  const msg = makeMsg("m1", [part]);
  const result = findMessagePart([msg], "missing-msg", part.id);

  assert.ok(!result.ok);
  if (!result.ok) {
    assert.equal(result.reason, "message-not-found");
  }
});

test("findMessagePart fails with part-not-found", () => {
  const msg = makeMsg("m1", [textPart("hello")]);
  const result = findMessagePart([msg], "m1", "missing-part");

  assert.ok(!result.ok);
  if (!result.ok) {
    assert.equal(result.reason, "part-not-found");
  }
});

test("findMessagePart finds correct part among many", () => {
  const p1 = textPart("a");
  const p2 = textPart("b");
  const p3 = textPart("c");
  const msg = makeMsg("m1", [p1, p2, p3]);
  const result = findMessagePart([msg], "m1", p2.id);

  assert.ok(result.ok);
  if (result.ok) {
    assert.equal(result.part, p2);
  }
});

// ── appendMessagePart ──────────────────────────────────────────────────

test("appendMessagePart adds part to correct message", () => {
  const msg = makeMsg("m1", [textPart("existing")]);
  const newPart = textPart("new");
  const next = appendMessagePart([msg], "m1", newPart);

  assert.equal(next.length, 1);
  assert.equal(next[0].parts.length, 2);
  assert.equal(next[0].parts[1], newPart);
  assert.notEqual(next, [msg]); // new array
});

test("appendMessagePart preserves other messages unchanged", () => {
  const msgA = makeMsg("a");
  const msgB = makeMsg("b");
  const arr = [msgA, msgB];
  const newPart = textPart("new");

  const next = appendMessagePart(arr, "a", newPart);

  assert.equal(next.length, 2);
  assert.equal(next[1], msgB); // unchanged reference
  assert.notEqual(next[0], msgA); // target message is new
});

test("appendMessagePart returns copy when message not found", () => {
  const msg = makeMsg("m1");
  const newPart = textPart("new");
  const next = appendMessagePart([msg], "missing", newPart);

  assert.equal(next.length, 1);
  assert.notEqual(next, [msg]); // new array reference
  assert.deepEqual(next[0], msg); // but content unchanged
});

test("appendMessagePart does not mutate input array", () => {
  const msg = makeMsg("m1");
  const arr = [msg];
  const frozen = [...arr];

  appendMessagePart(arr, "m1", textPart("new"));
  assert.deepEqual(arr, frozen);
});

// ── replaceMessagePart ─────────────────────────────────────────────────

test("replaceMessagePart replaces part by id", () => {
  const oldPart = textPart("old");
  const msg = makeMsg("m1", [oldPart]);
  const newPart = textPart("new", oldPart.id); // same id

  const result = replaceMessagePart([msg], "m1", oldPart.id, newPart);

  assert.ok(result.ok);
  if (result.ok) {
    assert.equal(result.part, newPart);
    assert.equal(result.messages[0].parts[0], newPart);
  }
});

test("replaceMessagePart fails with message-not-found", () => {
  const msg = makeMsg("m1");
  const result = replaceMessagePart([msg], "missing", "any-id", textPart("x"));

  assert.ok(!result.ok);
  if (!result.ok) {
    assert.equal(result.reason, "message-not-found");
  }
});

test("replaceMessagePart fails with part-not-found", () => {
  const msg = makeMsg("m1");
  const result = replaceMessagePart([msg], "m1", "missing-part", textPart("x"));

  assert.ok(!result.ok);
  if (!result.ok) {
    assert.equal(result.reason, "part-not-found");
  }
});

test("replaceMessagePart preserves other messages", () => {
  const oldPart = textPart("old");
  const msgA = makeMsg("a", [oldPart]);
  const msgB = makeMsg("b");
  const newPart = textPart("new", oldPart.id);

  const result = replaceMessagePart([msgA, msgB], "a", oldPart.id, newPart);

  assert.ok(result.ok);
  if (result.ok) {
    assert.equal(result.messages[1], msgB);
  }
});

// ── patchMessagePart ───────────────────────────────────────────────────

test("patchMessagePart merges patch into existing part", () => {
  const original = textPart("hello");
  const msg = makeMsg("m1", [original]);

  const result = patchMessagePart([msg], "m1", original.id, { text: "world" });

  assert.ok(result.ok);
  if (result.ok) {
    const patched = result.messages[0].parts[0];
    if (patched.type === "text") {
      assert.equal(patched.text, "world");
    }
    assert.equal(patched.id, original.id);
  }
});

test("patchMessagePart fails with part-not-found", () => {
  const msg = makeMsg("m1");
  const result = patchMessagePart([msg], "m1", "missing", { text: "x" });

  assert.ok(!result.ok);
  if (!result.ok) {
    assert.equal(result.reason, "part-not-found");
  }
});

test("patchMessagePart preserves unpatched fields", () => {
  const original = textPart("hello");
  const msg = makeMsg("m1", [original]);

  const result = patchMessagePart([msg], "m1", original.id, {});

  assert.ok(result.ok);
  if (result.ok) {
    const patched = result.messages[0].parts[0];
    if (patched.type === "text") {
      assert.equal(patched.text, "hello"); // unchanged
    }
  }
});

// ── patchMessagePart validation ────────────────────────────────────────
// `updatePart()` routes through here and discards the result, so anything this
// lets through is committed to the authoritative message array unnoticed.

function captureWarnings(run: () => void): string[] {
  const warnings: string[] = [];
  const original = console.warn;
  console.warn = (...args: unknown[]) => {
    warnings.push(args.map(String).join(" "));
  };
  try {
    run();
  } finally {
    console.warn = original;
  }
  return warnings;
}

test("patchMessagePart refuses to change a part id", () => {
  const original = textPart("hello");
  const msg = makeMsg("m1", [original]);

  const result = patchMessagePart([msg], "m1", original.id, {
    id: "hijacked",
  } as Partial<MessagePart>);

  assert.ok(result.ok);
  if (result.ok) {
    assert.equal(
      result.part.id,
      original.id,
      "keyed rendering depends on a stable part id",
    );
  }
});

test("patchMessagePart refuses to change a part type", () => {
  const original = textPart("hello");
  const msg = makeMsg("m1", [original]);

  const result = patchMessagePart([msg], "m1", original.id, {
    type: "tool-call",
  } as Partial<MessagePart>);

  assert.ok(result.ok);
  if (result.ok) assert.equal(result.part.type, "text");
});

test("patchMessagePart rejects a patch that malforms the part", () => {
  const original = textPart("hello");
  const msg = makeMsg("m1", [original]);

  const result = patchMessagePart([msg], "m1", original.id, {
    text: 42,
  } as unknown as Partial<MessagePart>);

  assert.ok(!result.ok);
  if (!result.ok) assert.equal(result.reason, "invalid-part");
});

test("a rejected patch leaves the messages untouched", () => {
  const original = textPart("hello");
  const msg = makeMsg("m1", [original]);

  const result = patchMessagePart([msg], "m1", original.id, {
    text: 42,
  } as unknown as Partial<MessagePart>);

  const part = result.messages[0].parts[0];
  assert.equal(part.type === "text" && part.text, "hello");
});

test("patchMessagePart rejects an unknown tool-call state", () => {
  const toolCall: MessagePart = {
    id: "tc1",
    type: "tool-call",
    toolCallId: "call_1",
    toolName: "search",
    state: "output-available",
  };
  const msg = makeMsg("m1", [toolCall]);

  const result = patchMessagePart([msg], "m1", "tc1", {
    state: "bogus",
  } as unknown as Partial<MessagePart>);

  assert.ok(!result.ok);
  if (!result.ok) assert.equal(result.reason, "invalid-state");
});

test("an invalid patch is reported, since updatePart cannot return the reason", () => {
  const original = textPart("hello");
  const msg = makeMsg("m1", [original]);

  const warnings = captureWarnings(() => {
    patchMessagePart([msg], "m1", original.id, {
      text: 42,
    } as unknown as Partial<MessagePart>);
  });

  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /invalid-part/);
  assert.match(warnings[0], /tryUpdatePart/);
});

test("a missing target is not reported, because it races with message removal", () => {
  const msg = makeMsg("m1");

  const warnings = captureWarnings(() => {
    patchMessagePart([msg], "m1", "missing", { text: "x" });
    patchMessagePart([msg], "missing-msg", "p1", { text: "x" });
  });

  assert.deepEqual(warnings, []);
});

test("a valid patch is not reported", () => {
  const original = textPart("hello");
  const msg = makeMsg("m1", [original]);

  const warnings = captureWarnings(() => {
    patchMessagePart([msg], "m1", original.id, { text: "world" });
  });

  assert.deepEqual(warnings, []);
});

// ── applyMessagePartUpdate ─────────────────────────────────────────────

test("applyMessagePartUpdate applies patch to text part", () => {
  const part = textPart("old");
  const msg = makeMsg("m1", [part]);
  const update: MessagePartUpdate = {
    messageId: "m1",
    partId: part.id,
    patch: { text: "new" },
  };

  const result = applyMessagePartUpdate([msg], update);

  assert.ok(result.ok);
  if (result.ok) {
    if (result.part.type === "text") {
      assert.equal(result.part.text, "new");
    }
  }
});

test("applyMessagePartUpdate fails with message-not-found", () => {
  const part = textPart("old");
  const msg = makeMsg("m1", [part]);
  const update: MessagePartUpdate = {
    messageId: "missing",
    partId: part.id,
    patch: { text: "new" },
  };

  const result = applyMessagePartUpdate([msg], update);

  assert.ok(!result.ok);
  if (!result.ok) {
    assert.equal(result.reason, "message-not-found");
  }
});

test("applyMessagePartUpdate fails with part-not-found", () => {
  const msg = makeMsg("m1");
  const update: MessagePartUpdate = {
    messageId: "m1",
    partId: "missing",
    patch: { text: "new" },
  };

  const result = applyMessagePartUpdate([msg], update);

  assert.ok(!result.ok);
  if (!result.ok) {
    assert.equal(result.reason, "part-not-found");
  }
});

// ── immutability ───────────────────────────────────────────────────────

test("all reducers never mutate input arrays", () => {
  const part = textPart("hello");
  const msg = makeMsg("m1", [part]);
  const arr = [msg];
  const frozen: ChatMessage[] = JSON.parse(JSON.stringify(arr));

  findMessagePart(arr, "m1", part.id);
  assert.deepEqual(arr, frozen);

  appendMessagePart(arr, "m1", textPart("x"));
  assert.deepEqual(arr, frozen);

  replaceMessagePart(arr, "m1", part.id, textPart("x", part.id));
  assert.deepEqual(arr, frozen);

  patchMessagePart(arr, "m1", part.id, { text: "x" });
  assert.deepEqual(arr, frozen);

  applyMessagePartUpdate(arr, {
    messageId: "m1",
    partId: part.id,
    patch: { text: "x" },
  });
  assert.deepEqual(arr, frozen);
});

// ── finalizeMessageParts ──────────────────────────────────────────────

test("finalizeMessageParts closes out streaming and pending parts", () => {
  const parts = [
    textPart("a", { id: "p1", status: "streaming" }),
    textPart("b", { id: "p2", status: "pending" }),
  ];

  const next = finalizeMessageParts(parts, "complete");

  assert.deepEqual(
    next.map((p) => p.status),
    ["complete", "complete"],
  );
});

test("finalizeMessageParts returns the same reference when nothing changes", () => {
  // Callers fold the result into a patch only when it differs, so an unchanged
  // reference is what keeps a terminal transition from forcing a re-render.
  const parts = [
    textPart("a", { id: "p1", status: "complete" }),
    textPart("b", { id: "p2", status: "error" }),
  ];

  assert.equal(finalizeMessageParts(parts, "complete"), parts);
});

test("finalizeMessageParts treats a missing status as already terminal", () => {
  // `PartStatus` is optional and defaults to `complete`.
  const parts = [textPart("a", { id: "p1" })];

  assert.equal(finalizeMessageParts(parts, "cancelled"), parts);
});

test("finalizeMessageParts keeps terminal siblings by reference", () => {
  const done = textPart("a", { id: "p1", status: "complete" });
  const live = textPart("b", { id: "p2", status: "streaming" });

  const next = finalizeMessageParts([done, live], "cancelled");

  assert.equal(next[0], done);
  assert.notEqual(next[1], live);
  assert.equal(next[1].status, "cancelled");
});

test("finalizeMessageParts preserves part identity and payload", () => {
  const parts = [textPart("hello", { id: "p1", status: "streaming" })];

  const next = finalizeMessageParts(parts, "error");

  assert.equal(next[0].id, "p1");
  assert.equal(next[0].type, "text");
  assert.equal((next[0] as { text: string }).text, "hello");
});

test("finalizeMessageParts does not mutate its input", () => {
  const parts = [textPart("a", { id: "p1", status: "streaming" })];

  finalizeMessageParts(parts, "complete");

  assert.equal(parts[0].status, "streaming");
});
