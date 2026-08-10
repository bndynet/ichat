import assert from "node:assert/strict";
import test from "node:test";
import {
  streamingRenderDelayMs,
  streamingRenderIntervalMs,
} from "../src/streaming-render-policy.js";

test("streaming render cadence stays full-rate for ordinary messages", () => {
  assert.equal(streamingRenderIntervalMs(0), 0);
  assert.equal(streamingRenderIntervalMs(12 * 1024), 0);
});

test("streaming render cadence coalesces large message updates", () => {
  assert.ok(streamingRenderIntervalMs(12 * 1024 + 1) >= 1000 / 30);
  assert.equal(streamingRenderIntervalMs(32 * 1024 + 1), 100);
});

test("streaming render delay permits the first and every due update", () => {
  assert.equal(
    streamingRenderDelayMs(50 * 1024, 10, Number.NEGATIVE_INFINITY),
    0,
  );
  assert.equal(streamingRenderDelayMs(50 * 1024, 50, 10), 60);
  assert.equal(streamingRenderDelayMs(50 * 1024, 110, 10), 0);
});
