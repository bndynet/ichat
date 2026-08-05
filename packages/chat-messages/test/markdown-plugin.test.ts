import assert from 'node:assert/strict';
import type MarkdownIt from 'markdown-it';
import {
  registerMarkdownPlugin,
  getMarkdownPluginStyles,
  getMarkdownPluginGlobalStyles,
  type MarkdownPlugin,
} from '../src/renderers/markdown-plugins.js';
import { md } from '../src/renderers/markdown-renderer.js';
import { injectGlobalPluginCss, injectPluginCss } from '../src/renderers/plugin-styles.js';
import { rendererRegistry } from '../src/renderers/registry.js';
import { partRendererRegistry } from '../src/renderers/part-registry.js';
import type { BlockRenderer } from '../src/types.js';

function test(name: string, run: () => void): void {
  try {
    run();
  } catch (error) {
    console.error(`not ok - ${name}`);
    throw error;
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function makePlugin(id: string, styles?: string, globalStyles?: string): MarkdownPlugin {
  return {
    id,
    install(_md: MarkdownIt) {
      /* noop */
    },
    styles,
    globalStyles,
  };
}

function captureWarnings(run: () => void): string[] {
  const warnings: string[] = [];
  const originalWarn = console.warn;
  console.warn = (...args: unknown[]) => {
    warnings.push(args.map(String).join(' '));
  };
  try {
    run();
  } finally {
    console.warn = originalWarn;
  }
  return warnings;
}

// NOTE: Module-level plugin state is shared across tests. Each test group uses
// unique plugin IDs to avoid cross-test interference.

test('mounted roots receive CSS from plugins registered later', () => {
  interface FakeStyle {
    textContent: string;
    setAttribute(name: string): void;
    remove(): void;
  }

  let rootStyle: FakeStyle | null = null;
  const parent = {
    firstChild: null,
    querySelector: () => rootStyle,
    insertBefore(style: FakeStyle) {
      rootStyle = style;
    },
  };
  const fakeDocument = {
    createElement: () => ({
      textContent: '',
      setAttribute() {
        /* noop */
      },
      remove() {
        rootStyle = null;
      },
    }),
    head: {
      firstChild: null,
      querySelector: () => null,
      insertBefore() {
        /* noop */
      },
    },
  };
  const globals = globalThis as typeof globalThis & { document?: Document };
  const originalDocument = globals.document;
  globals.document = fakeDocument as unknown as Document;

  try {
    const cleanup = injectPluginCss(parent as unknown as ParentNode);
    assert.ok(rootStyle, 'an empty tracked style should be created on mount');
    assert.equal(rootStyle.textContent, '');

    registerMarkdownPlugin(
      makePlugin('test-runtime-plugin-css', '.runtime-plugin { color: rebeccapurple; }'),
    );
    assert.match(rootStyle.textContent, /runtime-plugin/);

    cleanup();
    assert.equal(rootStyle, null);
  } finally {
    if (originalDocument) globals.document = originalDocument;
    else delete globals.document;
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// 1. Registration
// ═══════════════════════════════════════════════════════════════════════════════

test('registerMarkdownPlugin succeeds', () => {
  const p = makePlugin('test-registration');
  // Should not throw.
  registerMarkdownPlugin(p);
});

test('registerMarkdownPlugin runs install on the markdown-it instance', () => {
  let installed = false;
  const p: MarkdownPlugin = {
    id: 'test-install-runs',
    install(_md: MarkdownIt) {
      installed = true;
    },
  };
  registerMarkdownPlugin(p);
  assert.equal(installed, true);
});

test('plugins are installed in registration order', () => {
  const order: string[] = [];
  registerMarkdownPlugin({
    id: 'test-order-1',
    install() {
      order.push('first');
    },
  });
  registerMarkdownPlugin({
    id: 'test-order-2',
    install() {
      order.push('second');
    },
  });
  assert.deepEqual(order, ['first', 'second']);
});

// ═══════════════════════════════════════════════════════════════════════════════
// 2. CSS collection (styles / globalStyles)
// ═══════════════════════════════════════════════════════════════════════════════

test('styles are collected into combined CSS', () => {
  const before = getMarkdownPluginStyles();
  registerMarkdownPlugin(makePlugin('test-styles', '.foo { color: red; }'));
  const after = getMarkdownPluginStyles();
  assert.ok(after.includes('.foo { color: red; }'), 'should contain .foo');
  assert.ok(after.length >= before.length, 'CSS should accumulate, not replace');
});

test('globalStyles are collected into combined global CSS', () => {
  registerMarkdownPlugin(
    makePlugin('test-global-styles', undefined, '@font-face { font-family: Test; }'),
  );
  const globalCss = getMarkdownPluginGlobalStyles();
  assert.ok(globalCss.includes('@font-face'), 'global CSS should contain @font-face');
});

test('styles and globalStyles are isolated from each other', () => {
  registerMarkdownPlugin(makePlugin('test-isolation', '.shadow { }', '@font-face { }'));
  const styles = getMarkdownPluginStyles();
  const global = getMarkdownPluginGlobalStyles();
  assert.ok(!styles.includes('@font-face'), 'shadow styles should not contain @font-face');
  assert.ok(!global.includes('.shadow'), 'global styles should not contain .shadow');
});

test('plugin without styles or globalStyles does not affect combined CSS', () => {
  const beforeStyles = getMarkdownPluginStyles();
  const beforeGlobal = getMarkdownPluginGlobalStyles();
  registerMarkdownPlugin(makePlugin('test-no-css'));
  assert.equal(getMarkdownPluginStyles().length, beforeStyles.length);
  assert.equal(getMarkdownPluginGlobalStyles().length, beforeGlobal.length);
});

test('multiple plugins with styles have their CSS concatenated', () => {
  registerMarkdownPlugin(makePlugin('test-multi-a', '.a { }'));
  registerMarkdownPlugin(makePlugin('test-multi-b', '.b { }'));
  const css = getMarkdownPluginStyles();
  assert.ok(css.includes('.a { }'), 'should contain first plugin styles');
  assert.ok(css.includes('.b { }'), 'should contain second plugin styles');
});

// ═══════════════════════════════════════════════════════════════════════════════
// 3. Idempotent re-registration (same object)
// ═══════════════════════════════════════════════════════════════════════════════

test('re-registering the same object is idempotent (no throw)', () => {
  const p = makePlugin('test-idempotent');
  registerMarkdownPlugin(p);
  registerMarkdownPlugin(p); // should not throw
});

test('re-registering the same object does not re-run install', () => {
  let count = 0;
  const p: MarkdownPlugin = {
    id: 'test-idempotent-install',
    install() {
      count++;
    },
  };
  registerMarkdownPlugin(p);
  assert.equal(count, 1);
  registerMarkdownPlugin(p); // same object reference
  assert.equal(count, 1, 'install should only run once');
});

// ═══════════════════════════════════════════════════════════════════════════════
// 4. Conflict detection (different object, same id)
// ═══════════════════════════════════════════════════════════════════════════════

test('markdown duplicate id warns and keeps the first registration', () => {
  const p1 = makePlugin('test-conflict');
  registerMarkdownPlugin(p1);

  const p2 = makePlugin('test-conflict'); // different object
  const warnings = captureWarnings(() => registerMarkdownPlugin(p2));
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /Keeping the first registration/);
});

test('duplicate id does not run install twice', () => {
  const id = 'test-dup-install';
  let count = 0;
  registerMarkdownPlugin({
    id,
    install: () => {
      count++;
    },
  });
  captureWarnings(() =>
    registerMarkdownPlugin({
      id,
      install: () => {
        count++;
      },
    }),
  );
  assert.equal(count, 1, 'install should only run once');
});

test('block renderer duplicate name warns and keeps the first registration', () => {
  const name = 'test-block-conflict';
  const first: BlockRenderer = {
    name,
    test: () => true,
    render: () => 'first',
  };
  const second: BlockRenderer = {
    name,
    test: () => true,
    render: () => 'second',
  };
  rendererRegistry.register(first);
  try {
    const warnings = captureWarnings(() => rendererRegistry.register(second));
    assert.equal(warnings.length, 1);
    assert.equal(
      rendererRegistry.list().find((renderer) => renderer.name === name),
      first,
    );
  } finally {
    rendererRegistry.unregister(name);
  }
});

test('part renderer duplicate name warns and keeps the first registration', () => {
  const name = 'test-part-conflict';
  const first = { name, test: () => true, render: () => 'first' };
  const second = { name, test: () => true, render: () => 'second' };
  partRendererRegistry.register(first);
  try {
    const warnings = captureWarnings(() => partRendererRegistry.register(second));
    assert.equal(warnings.length, 1);
    assert.equal(
      partRendererRegistry.list().find((renderer) => renderer.name === name),
      first,
    );
  } finally {
    partRendererRegistry.unregister(name);
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// 5. Runtime registration and removal
// ═══════════════════════════════════════════════════════════════════════════════

test('markdown plugins can register after markdown has already rendered', () => {
  const marker = 'runtime-markdown-plugin';
  const source = `\`${marker}\``;
  assert.doesNotMatch(md.render(source), /runtime-plugin-applied/);

  registerMarkdownPlugin({
    id: 'test-runtime-markdown-plugin',
    install(instance) {
      const previous = instance.renderer.rules.code_inline;
      instance.renderer.rules.code_inline = (tokens, index, options, env, self) => {
        if (tokens[index].content === marker) {
          return '<span class="runtime-plugin-applied">registered</span>';
        }
        return previous
          ? previous(tokens, index, options, env, self)
          : `<code>${instance.utils.escapeHtml(tokens[index].content)}</code>`;
      };
    },
  });

  assert.match(md.render(source), /runtime-plugin-applied/);
});

test('block renderers can register and unregister at runtime', () => {
  const language = 'test-runtime-block';
  const renderer: BlockRenderer = {
    name: 'test-runtime-block-renderer',
    test: (lang: string) => lang === language,
    render: (code: string) => `<pre>${code}</pre>`,
  };

  assert.equal(rendererRegistry.getRenderer(language), undefined);
  rendererRegistry.register(renderer);
  assert.equal(rendererRegistry.getRenderer(language), renderer);
  rendererRegistry.unregister(renderer.name);
  assert.equal(rendererRegistry.getRenderer(language), undefined);
});

test('part renderers can register and unregister at runtime', () => {
  const type = 'x-test-runtime-part';
  const renderer = {
    name: 'test-runtime-part-renderer',
    test: (candidate: string) => candidate === type,
    render: () => 'runtime',
  };

  assert.equal(partRendererRegistry.getRenderer(type), undefined);
  partRendererRegistry.register(renderer);
  assert.equal(partRendererRegistry.getRenderer(type), renderer);
  partRendererRegistry.unregister(renderer.name);
  assert.equal(partRendererRegistry.getRenderer(type), undefined);
});

// ═══════════════════════════════════════════════════════════════════════════════
// 6. CSS injection functions are importable (smoke test)
// ═══════════════════════════════════════════════════════════════════════════════

test('injectPluginCss and injectGlobalPluginCss are importable', () => {
  assert.equal(typeof injectPluginCss, 'function');
  assert.equal(typeof injectGlobalPluginCss, 'function');
});
