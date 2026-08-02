import assert from 'node:assert/strict';
import test from 'node:test';
import { isAllowedLinkHref } from '../src/link-protocols.js';
import { renderMarkdownLight } from '../src/renderers/markdown-renderer.js';
import {
  rawHtmlFixtures,
  rendererInjectionFixture,
  safeLinkFixtures,
  unsafeLinkFixtures,
} from './fixtures/markdown-security-fixtures.js';

test('link policy accepts common links and rejects unsafe protocols by default', () => {
  for (const markdown of safeLinkFixtures) {
    const href = /\(([^)]+)\)/.exec(markdown)?.[1];
    if (!href) throw new Error(`fixture must contain a link: ${markdown}`);
    assert.equal(isAllowedLinkHref(href), true, `${href} should be allowed`);
  }

  for (const fixture of unsafeLinkFixtures) {
    assert.equal(
      isAllowedLinkHref(`${fixture.protocol}:payload`),
      false,
      `${fixture.name} should be rejected`,
    );
  }
});

test('raw HTML from markdown content remains escaped during streaming', () => {
  for (const markdown of rawHtmlFixtures) {
    const html = renderMarkdownLight(markdown);
    assert.doesNotMatch(html, /<(?:img|script|svg)\b/i, markdown);
    assert.match(html, /&lt;/, markdown);
  }
});

test('renderer injection fixture covers executable HTML and unsafe links', () => {
  assert.match(rendererInjectionFixture.html, /\sonerror=/i);
  assert.match(rendererInjectionFixture.html, /href=["']javascript:/i);
  assert.match(rendererInjectionFixture.markdown, /security-fixture-renderer/);
});

test.todo('PR2: streaming markdown strips unsafe link protocols');
test.todo('PR2: custom renderer output is sanitized unless explicitly trusted');
