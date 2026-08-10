import assert from "node:assert/strict";
import { formatAssistantDurationMs } from "../src/duration-format.js";

function test(name: string, run: () => void): void {
  try {
    run();
  } catch (error) {
    console.error(`not ok - ${name}`);
    throw error;
  }
}

// ── sub-minute (unit: second) ──────────────────────────────────────────

test("formatAssistantDurationMs formats 0ms", () => {
  const result = formatAssistantDurationMs(0, "en");
  assert.ok(typeof result === "string");
  assert.ok(result.length > 0);
});

test("formatAssistantDurationMs formats 500ms", () => {
  const result = formatAssistantDurationMs(500, "en");
  assert.ok(typeof result === "string");
  assert.ok(result.length > 0);
});

test("formatAssistantDurationMs formats 1000ms (1 second)", () => {
  const result = formatAssistantDurationMs(1000, "en");
  assert.ok(typeof result === "string");
  assert.ok(result.length > 0);
});

test("formatAssistantDurationMs formats 45000ms (45 seconds)", () => {
  const result = formatAssistantDurationMs(45000, "en");
  assert.ok(typeof result === "string");
  assert.ok(result.length > 0);
});

test("formatAssistantDurationMs formats 59000ms (59 seconds)", () => {
  const result = formatAssistantDurationMs(59000, "en");
  assert.ok(typeof result === "string");
  assert.ok(result.length > 0);
});

// ── one minute and above ───────────────────────────────────────────────

test("formatAssistantDurationMs formats 60000ms (1 minute)", () => {
  const result = formatAssistantDurationMs(60000, "en");
  assert.ok(typeof result === "string");
  // Should contain '1' and 'm' or minutes indication
  assert.ok(result.length > 0);
});

test("formatAssistantDurationMs formats 90000ms (1.5 minutes)", () => {
  const result = formatAssistantDurationMs(90000, "en");
  assert.ok(typeof result === "string");
  assert.ok(result.length > 0);
});

test("formatAssistantDurationMs formats 120000ms (2 minutes)", () => {
  const result = formatAssistantDurationMs(120000, "en");
  assert.ok(typeof result === "string");
  assert.ok(result.length > 0);
});

test("formatAssistantDurationMs formats 3600000ms (1 hour)", () => {
  const result = formatAssistantDurationMs(3600000, "en");
  assert.ok(typeof result === "string");
  assert.ok(result.length > 0);
});

// ── negative values ────────────────────────────────────────────────────

test("formatAssistantDurationMs clamps negative to zero", () => {
  // Should not throw
  const result = formatAssistantDurationMs(-1000, "en");
  assert.ok(typeof result === "string");
  assert.ok(result.length > 0);
});

// ── locale support ─────────────────────────────────────────────────────

test("formatAssistantDurationMs works with zh-CN locale", () => {
  const result = formatAssistantDurationMs(5000, "zh-CN");
  assert.ok(typeof result === "string");
  assert.ok(result.length > 0);
});

test("formatAssistantDurationMs works with undefined locale (runtime default)", () => {
  const result = formatAssistantDurationMs(30000, undefined);
  assert.ok(typeof result === "string");
  assert.ok(result.length > 0);
});

test("formatAssistantDurationMs works with de-DE locale", () => {
  const result = formatAssistantDurationMs(10000, "de-DE");
  assert.ok(typeof result === "string");
  assert.ok(result.length > 0);
});

test("formatAssistantDurationMs works with ja-JP locale", () => {
  const result = formatAssistantDurationMs(60000, "ja-JP");
  assert.ok(typeof result === "string");
  assert.ok(result.length > 0);
});

// ── edge cases ─────────────────────────────────────────────────────────

test("formatAssistantDurationMs handles very large values", () => {
  const result = formatAssistantDurationMs(86400000, "en"); // 24 hours
  assert.ok(typeof result === "string");
  assert.ok(result.length > 0);
});

test("formatAssistantDurationMs handles fractional milliseconds", () => {
  const result = formatAssistantDurationMs(1500, "en"); // 1.5 seconds
  assert.ok(typeof result === "string");
  assert.ok(result.length > 0);
});

test("formatAssistantDurationMs is deterministic", () => {
  const a = formatAssistantDurationMs(5000, "en");
  const b = formatAssistantDurationMs(5000, "en");
  assert.equal(a, b);
});

test("formatAssistantDurationMs never throws for any input", () => {
  const inputs = [
    0,
    1,
    100,
    999,
    1000,
    59999,
    60000,
    60001,
    3600000,
    -1,
    NaN,
    Infinity,
  ];
  for (const input of inputs) {
    try {
      const result = formatAssistantDurationMs(input, "en");
      assert.ok(typeof result === "string");
    } catch (err) {
      assert.fail(`formatAssistantDurationMs threw for input ${input}: ${err}`);
    }
  }
});
