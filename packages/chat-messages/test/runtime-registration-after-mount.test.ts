import assert from 'node:assert/strict';
import { ChatMessages } from '../src/components/chat-messages.js';
import { registerMarkdownPlugin } from '../src/renderers/markdown-plugins.js';
import { rendererRegistry } from '../src/renderers/registry.js';
import { md } from '../src/renderers/markdown-renderer.js';
import type { BlockRenderer } from '../src/types.js';

function test(name: string, run: () => void): void {
  try {
    run();
  } catch (error) {
    console.error(`not ok - ${name}`);
    throw error;
  }
}

// ── Minimal DOM for `connectedCallback` ──────────────────────────────────────
// `injectPluginCss` / `injectGlobalPluginCss` need `document` and a root to
// insert a <style> element into. Node has neither.

interface FakeStyle {
  textContent: string;
  setAttribute(name: string): void;
  remove(): void;
}

function makeFakeRoot(): ShadowRoot {
  let style: FakeStyle | null = null;
  return {
    firstChild: null,
    querySelector: () => style,
    insertBefore(node: FakeStyle) {
      style = node;
      return node;
    },
    appendChild(node: FakeStyle) {
      return node;
    },
  } as unknown as ShadowRoot;
}

function installFakeDocument(): void {
  const globals = globalThis as typeof globalThis & { document?: Document };
  if (globals.document) return;
  globals.document = {
    createElement: () => ({
      textContent: '',
      setAttribute() {
        /* noop */
      },
      remove() {
        /* noop */
      },
    }),
    head: {
      firstChild: null,
      querySelector: () => null,
      insertBefore() {
        /* noop */
      },
    },
  } as unknown as Document;
}

installFakeDocument();

/** Mount a list the way the browser does when `<i-chat-messages>` enters the DOM. */
function mountMessages(): ChatMessages {
  const el = new ChatMessages();
  const root = makeFakeRoot();
  // Lit skips `createRenderRoot()` when a render root already exists, and
  // rendering the template into it needs a DOM Node does not have. Neither is
  // what these tests cover — only the side effects of `connectedCallback`.
  Object.defineProperty(el, 'renderRoot', { value: root, writable: true, configurable: true });
  Object.defineProperty(el, 'shadowRoot', { value: root, configurable: true });
  Object.defineProperty(el, 'performUpdate', {
    value: () => {
      /* noop */
    },
    configurable: true,
  });
  el.connectedCallback();
  return el;
}

// ── The contract ─────────────────────────────────────────────────────────────
// README, docs/component-api.md, and docs/renderers.md all promise that
// renderers and markdown plugins may be registered at runtime, and recommend
// lazy-loading renderer packages from a route. Both are only true if a mounted
// component leaves the registries writable.

test('block renderers can register after i-chat-messages has mounted', () => {
  mountMessages();

  const language = 'test-lazy-block';
  const renderer: BlockRenderer = {
    name: 'test-lazy-block-renderer',
    test: (lang: string) => lang === language,
    render: (code: string) => `<pre>${code}</pre>`,
  };

  rendererRegistry.register(renderer);
  assert.equal(rendererRegistry.getRenderer(language), renderer);
});

test('markdown plugins can register after i-chat-messages has mounted', () => {
  mountMessages();

  const marker = 'lazy-markdown-plugin';
  const source = `\`${marker}\``;
  assert.doesNotMatch(md.render(source), /lazy-plugin-applied/);

  registerMarkdownPlugin({
    id: 'test-lazy-markdown-plugin',
    install(instance) {
      const previous = instance.renderer.rules.code_inline;
      instance.renderer.rules.code_inline = (tokens, index, options, env, self) => {
        if (tokens[index].content === marker) {
          return '<span class="lazy-plugin-applied">registered</span>';
        }
        return previous
          ? previous(tokens, index, options, env, self)
          : `<code>${instance.utils.escapeHtml(tokens[index].content)}</code>`;
      };
    },
  });

  assert.match(md.render(source), /lazy-plugin-applied/);
});

test('block renderers can unregister after i-chat-messages has mounted', () => {
  mountMessages();

  const language = 'test-lazy-unregister';
  const renderer: BlockRenderer = {
    name: 'test-lazy-unregister-renderer',
    test: (lang: string) => lang === language,
    render: (code: string) => `<pre>${code}</pre>`,
  };

  rendererRegistry.register(renderer);
  rendererRegistry.unregister(renderer.name);
  assert.equal(rendererRegistry.getRenderer(language), undefined);
});
