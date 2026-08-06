import assert from "node:assert/strict";
import { patchToolCallPart } from "../src/tool-call-state.js";
import type { ToolCallPart } from "../src/types.js";

function test(name: string, run: () => void): void {
  try {
    run();
  } catch (error) {
    console.error(`not ok - ${name}`);
    throw error;
  }
}

function makeToolCallPart(overrides: Partial<ToolCallPart> = {}): ToolCallPart {
  return {
    id: "tc-1",
    type: "tool-call" as const,
    toolCallId: "call-abc123",
    toolName: "read_file",
    state: "input-streaming",
    ...overrides,
  };
}

// ── valid state transitions ────────────────────────────────────────────

test("patchToolCallPart transitions input-streaming → input-available", () => {
  const part = makeToolCallPart({ state: "input-streaming" });
  const result = patchToolCallPart(part, { state: "input-available" });

  assert.ok(result.ok);
  if (result.ok) {
    assert.equal(result.part.state, "input-available");
    assert.equal(result.part.id, part.id);
    assert.equal(result.part.toolCallId, part.toolCallId);
  }
});

test("patchToolCallPart transitions input-available → executing", () => {
  const part = makeToolCallPart({ state: "input-available" });
  const result = patchToolCallPart(part, { state: "executing" });

  assert.ok(result.ok);
  if (result.ok) {
    assert.equal(result.part.state, "executing");
  }
});

test("patchToolCallPart transitions executing → output-available", () => {
  const part = makeToolCallPart({ state: "executing" });
  const result = patchToolCallPart(part, { state: "output-available" });

  assert.ok(result.ok);
  if (result.ok) {
    assert.equal(result.part.state, "output-available");
  }
});

test("patchToolCallPart transitions executing → output-error", () => {
  const part = makeToolCallPart({ state: "executing" });
  const result = patchToolCallPart(part, { state: "output-error" });

  assert.ok(result.ok);
  if (result.ok) {
    assert.equal(result.part.state, "output-error");
  }
});

// ── invalid state transitions ──────────────────────────────────────────

test("patchToolCallPart rejects invalid state", () => {
  const part = makeToolCallPart();
  const result = patchToolCallPart(part, { state: "bogus" as any });

  assert.ok(!result.ok);
  if (!result.ok) {
    assert.equal(result.reason, "invalid-state");
    assert.equal(result.part, part); // original returned
  }
});

// ── id and toolCallId immutability ─────────────────────────────────────

test("patchToolCallPart preserves id and toolCallId", () => {
  const part = makeToolCallPart({ id: "my-id", toolCallId: "my-call-id" });
  const result = patchToolCallPart(part, {
    state: "input-available",
    id: "hijacked" as any,
    toolCallId: "hijacked" as any,
  });

  assert.ok(result.ok);
  if (result.ok) {
    assert.equal(result.part.id, "my-id");
    assert.equal(result.part.toolCallId, "my-call-id");
  }
});

// ── patch other fields ─────────────────────────────────────────────────

test("patchToolCallPart allows patching input", () => {
  const part = makeToolCallPart({ state: "input-available" });
  const result = patchToolCallPart(part, { input: { key: "value" } });

  assert.ok(result.ok);
  if (result.ok) {
    assert.deepEqual(result.part.input, { key: "value" });
  }
});

test("patchToolCallPart allows patching output", () => {
  const part = makeToolCallPart({ state: "output-available" });
  const result = patchToolCallPart(part, { output: "some output" });

  assert.ok(result.ok);
  if (result.ok) {
    assert.equal(result.part.output, "some output");
  }
});

test("patchToolCallPart allows patching error", () => {
  const part = makeToolCallPart({ state: "output-error" });
  const result = patchToolCallPart(part, { error: "something went wrong" });

  assert.ok(result.ok);
  if (result.ok) {
    assert.equal(result.part.error, "something went wrong");
  }
});

// ── immutability ───────────────────────────────────────────────────────

test("patchToolCallPart does not mutate original part", () => {
  const part = makeToolCallPart({ state: "input-streaming" });
  const frozen: ToolCallPart = JSON.parse(JSON.stringify(part));

  patchToolCallPart(part, { state: "input-available" });
  assert.deepEqual(part, frozen);
});

test("patchToolCallPart with empty patch returns new reference", () => {
  const part = makeToolCallPart();
  const result = patchToolCallPart(part, {});

  assert.ok(result.ok);
  if (result.ok) {
    assert.notEqual(result.part, part);
    assert.deepEqual(result.part, part);
  }
});
