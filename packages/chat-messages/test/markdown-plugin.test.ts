import assert from 'node:assert/strict';
import type MarkdownIt from 'markdown-it';
import {
  registerMarkdownPlugin,
  freezeMarkdownPlugins,
  getMarkdownPluginStyles,
  getMarkdownPluginGlobalStyles,
  type MarkdownPlugin,
} from '../src/renderers/markdown-plugins.js';
import { rendererRegistry } from '../src/renderers/registry.js';
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
    install(_md: MarkdownIt) { /* noop */ },
    styles,
    globalStyles,
  };
}

// NOTE: Module-level state (registeredPlugins, frozen flag) is shared across
// tests. Each test group uses unique plugin IDs to avoid cross-test interference.
// The freeze tests run last since they permanently lock the registry.

// ═══════════════════════════════════════════════════════════════════════════════
// 1. Registration before mount succeeds
// ═══════════════════════════════════════════════════════════════════════════════

test('registerMarkdownPlugin succeeds before freeze', () => {
  const p = makePlugin('test-pre-freeze');
  // Should not throw.
  registerMarkdownPlugin(p);
});

test('registerMarkdownPlugin runs install on the markdown-it instance', () => {
  let installed = false;
  const p: MarkdownPlugin = {
    id: 'test-install-runs',
    install(_md: MarkdownIt) { installed = true; },
  };
  registerMarkdownPlugin(p);
  assert.equal(installed, true);
});

test('plugins are installed in registration order', () => {
  const order: string[] = [];
  registerMarkdownPlugin({
    id: 'test-order-1',
    install() { order.push('first'); },
  });
  registerMarkdownPlugin({
    id: 'test-order-2',
    install() { order.push('second'); },
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
  registerMarkdownPlugin(makePlugin('test-global-styles', undefined, '@font-face { font-family: Test; }'));
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
    install() { count++; },
  };
  registerMarkdownPlugin(p);
  assert.equal(count, 1);
  registerMarkdownPlugin(p); // same object reference
  assert.equal(count, 1, 'install should only run once');
});

// ═══════════════════════════════════════════════════════════════════════════════
// 4. Conflict detection (different object, same id)
// ═══════════════════════════════════════════════════════════════════════════════

test('re-registering a different object with the same id throws', () => {
  const p1 = makePlugin('test-conflict');
  registerMarkdownPlugin(p1);

  const p2 = makePlugin('test-conflict'); // different object
  assert.throws(
    () => registerMarkdownPlugin(p2),
    /already registered with a different object/,
  );
});

test('conflict error message includes the plugin id', () => {
  const id = 'test-conflict-msg';
  registerMarkdownPlugin(makePlugin(id));
  assert.throws(
    () => registerMarkdownPlugin(makePlugin(id)),
    new RegExp(id),
  );
});

// ═══════════════════════════════════════════════════════════════════════════════
// 5. Registration after freeze throws
// ═══════════════════════════════════════════════════════════════════════════════

test('registerMarkdownPlugin throws after freezeMarkdownPlugins', () => {
  freezeMarkdownPlugins();
  assert.throws(
    () => registerMarkdownPlugin(makePlugin('test-after-freeze')),
    /must be registered before iChat is mounted/,
  );
});

test('rendererRegistry.register throws after freeze', () => {
  rendererRegistry.freeze();
  assert.throws(
    () => rendererRegistry.register({
      name: 'test-after-freeze',
      test: (lang: string) => lang === 'test',
      render: (code: string) => `<pre>${code}</pre>`,
    }),
    /must be registered before iChat is mounted/,
  );
});

// ═══════════════════════════════════════════════════════════════════════════════
// 6. freezeMarkdownPlugins is idempotent
// ═══════════════════════════════════════════════════════════════════════════════

test('freezeMarkdownPlugins is idempotent', () => {
  freezeMarkdownPlugins();
  freezeMarkdownPlugins();
  freezeMarkdownPlugins();
  // After multiple freezes, registration should still throw.
  assert.throws(
    () => registerMarkdownPlugin(makePlugin('test-multi-freeze')),
    /must be registered before iChat is mounted/,
  );
});

// ═══════════════════════════════════════════════════════════════════════════════
// 7. CSS injection functions are importable (smoke test)
// ═══════════════════════════════════════════════════════════════════════════════

test('injectPluginCss and injectGlobalPluginCss are importable', async () => {
  const mod = await import('../src/renderers/plugin-styles.js');
  assert.equal(typeof mod.injectPluginCss, 'function');
  assert.equal(typeof mod.injectGlobalPluginCss, 'function');
});
