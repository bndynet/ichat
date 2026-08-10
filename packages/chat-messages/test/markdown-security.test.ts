import assert from "node:assert/strict";
import test from "node:test";
import { isAllowedLinkHref } from "../src/link-protocols.js";
import { renderMarkdownLight } from "../src/renderers/markdown-renderer.js";
import { rendererRegistry } from "../src/renderers/registry.js";
import {
  rawHtmlFixtures,
  rendererInjectionFixture,
  safeLinkFixtures,
  unsafeLinkFixtures,
} from "./fixtures/markdown-security-fixtures.js";

test("link policy accepts common links and rejects unsafe protocols by default", () => {
  for (const markdown of safeLinkFixtures) {
    const href = /\(([^)]+)\)/.exec(markdown)?.[1];
    if (!href) throw new Error(`fixture must contain a link: ${markdown}`);
    assert.equal(isAllowedLinkHref(href), true, `${href} should be allowed`);
    assert.match(
      renderMarkdownLight(markdown),
      /<a href=/,
      `${href} should remain clickable`,
    );
  }

  for (const fixture of unsafeLinkFixtures) {
    assert.equal(
      isAllowedLinkHref(`${fixture.protocol}:payload`),
      false,
      `${fixture.name} should be rejected`,
    );
  }
});

test("raw HTML from markdown content remains escaped during streaming", () => {
  for (const markdown of rawHtmlFixtures) {
    const html = renderMarkdownLight(markdown);
    assert.doesNotMatch(html, /<(?:img|script|svg)\b/i, markdown);
    assert.match(html, /&lt;/, markdown);
  }
});

test("streaming markdown strips unsafe link protocols", () => {
  for (const fixture of unsafeLinkFixtures) {
    const html = renderMarkdownLight(fixture.markdown);
    assert.doesNotMatch(
      html,
      new RegExp(`href=["']${fixture.protocol}:`, "i"),
      fixture.name,
    );
  }
});

test("streaming markdown supports explicitly allowed custom protocols", () => {
  const markdown = "[open app](myapp://conversation/123)";
  assert.doesNotMatch(renderMarkdownLight(markdown), /href=["']myapp:/i);
  assert.match(
    renderMarkdownLight(markdown, { allowedLinkProtocols: ["myapp"] }),
    /href=["']myapp:\/\/conversation\/123["']/i,
  );
});

test("untrusted custom renderer output is deferred during streaming", () => {
  let renderCalls = 0;
  rendererRegistry.register({
    name: rendererInjectionFixture.language,
    test: (language) => language === rendererInjectionFixture.language,
    render: () => {
      renderCalls += 1;
      return rendererInjectionFixture.html;
    },
  });

  try {
    const html = renderMarkdownLight(rendererInjectionFixture.markdown);
    assert.equal(renderCalls, 0);
    assert.doesNotMatch(html, /\sonerror=/i);
    assert.doesNotMatch(html, /href=["']javascript:/i);
    assert.match(html, /untrusted renderer payload/);
  } finally {
    rendererRegistry.unregister(rendererInjectionFixture.language);
  }
});

test("trusted custom renderer output remains available during streaming", () => {
  const language = "security-fixture-trusted";
  rendererRegistry.register({
    name: language,
    trusted: true,
    test: (candidate) => candidate === language,
    render: (code) => `<div class="trusted-fixture">${code.trim()}</div>`,
  });

  try {
    const html = renderMarkdownLight(
      `\`\`\`${language}\nsafe renderer payload\n\`\`\``,
    );
    assert.match(html, /class="trusted-fixture"/);
    assert.match(html, /safe renderer payload/);
  } finally {
    rendererRegistry.unregister(language);
  }
});

test("untrusted async renderers do not start during streaming", () => {
  const language = "security-fixture-async";
  let asyncCalls = 0;
  rendererRegistry.register({
    name: language,
    test: (candidate) => candidate === language,
    renderAsync: async () => {
      asyncCalls += 1;
      return rendererInjectionFixture.html;
    },
  });

  try {
    const html = renderMarkdownLight(`\`\`\`${language}\npayload\n\`\`\``);
    assert.equal(asyncCalls, 0);
    assert.doesNotMatch(html, /\sonerror=/i);
    assert.match(html, /payload/);
  } finally {
    rendererRegistry.unregister(language);
  }
});
