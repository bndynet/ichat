import assert from "node:assert/strict";
import test from "node:test";
import { renderMarkdownLight } from "../src/renderers/markdown-renderer.js";

test("ordinary ordered lists keep native list markup", () => {
  const html = renderMarkdownLight("1. Alpha\n2. Beta");

  assert.match(html, /^<ol>\n<li>Alpha<\/li>\n<li>Beta<\/li>\n<\/ol>\n$/);
  assert.doesNotMatch(html, /chat-progress/);
});

test("unordered lists remain native list markup", () => {
  const html = renderMarkdownLight("- Alpha\n- Beta");

  assert.match(html, /^<ul>\n<li>Alpha<\/li>\n<li>Beta<\/li>\n<\/ul>\n$/);
  assert.doesNotMatch(html, /chat-progress/);
});

test("status-prefixed ordered lists render as progress", () => {
  const html = renderMarkdownLight(
    "1. [done] Alpha\n2. [active] Beta\n3. Gamma",
  );

  assert.match(html, /class="chat-progress"/);
  assert.match(html, /data-progress-steps="3"/);
  assert.match(html, /data-step="0" data-status="done"/);
  assert.match(html, /data-step="1" data-status="active"/);
  assert.match(html, /data-step="2" data-status="pending"/);
  assert.doesNotMatch(html, /\[(?:done|active)\]/);
});

test("a bid explicitly opts an ordered list into progress rendering", () => {
  const html = renderMarkdownLight("<!-- bid:build -->\n\n1. Alpha\n2. Beta");

  assert.match(html, /class="chat-progress"/);
  assert.match(html, /data-bid="build"/);
  assert.match(html, /data-progress-steps="2"/);
  assert.match(html, /data-step="0" data-status="pending"/);
  assert.match(html, /data-step="1" data-status="pending"/);
});

test("nested ordinary ordered lists keep native list markup", () => {
  const html = renderMarkdownLight(
    "1. Parent\n   1. Child one\n   2. Child two\n2. Sibling",
  );

  assert.equal((html.match(/<ol>/g) ?? []).length, 2);
  assert.equal((html.match(/<li>/g) ?? []).length, 4);
  assert.doesNotMatch(html, /chat-progress/);
});
