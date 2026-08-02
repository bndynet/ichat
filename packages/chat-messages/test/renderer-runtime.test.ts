import assert from 'node:assert/strict';
import test from 'node:test';
import type { RendererErrorDetail } from '../src/types.js';
import {
  md,
  renderMarkdownLight,
  resolveAsyncBlocks,
} from '../src/renderers/markdown-renderer.js';
import { rendererRegistry } from '../src/renderers/registry.js';
import { partRendererRegistry } from '../src/renderers/part-registry.js';

interface Deferred<T> {
  promise: Promise<T>;
  resolve(value: T): void;
  reject(error: unknown): void;
}

interface FakePlaceholder {
  outerHTML: string;
}

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((onResolve, onReject) => {
    resolve = onResolve;
    reject = onReject;
  });
  return { promise, resolve, reject };
}

function placeholderId(html: string): string {
  const match = /id="(_br_\d+_\d+)"/.exec(html);
  if (!match) throw new Error(`Missing async placeholder in: ${html}`);
  return match[1];
}

function fakeContainer(id: string): {
  container: HTMLElement;
  placeholder: FakePlaceholder;
} {
  const placeholder: FakePlaceholder = { outerHTML: '' };
  const container = {
    querySelector(selector: string) {
      return selector === `#${id}` ? placeholder : null;
    },
  } as unknown as HTMLElement;
  return { container, placeholder };
}

test('sync block renderer errors fall back without breaking markdown', () => {
  const name = 'runtime-sync-error';
  const errors: RendererErrorDetail[] = [];
  rendererRegistry.register({
    name,
    trusted: true,
    test: (language) => language === name,
    render: () => {
      throw new Error('sync failure');
    },
  });

  try {
    const html = renderMarkdownLight(`\`\`\`${name}\nsafe source\n\`\`\``, {
      onRendererError: (detail) => errors.push(detail),
    });
    assert.match(html, /safe source/);
    assert.match(html, /ichat-code-block/);
    assert.equal(errors.length, 1);
    assert.equal(errors[0].renderer, name);
    assert.equal(errors[0].phase, 'render');
  } finally {
    rendererRegistry.unregister(name);
  }
});

test('throwing matcher is isolated and matching continues', () => {
  const throwingName = 'runtime-match-error';
  const succeedingName = 'runtime-match-success';
  const language = 'runtime-match-language';
  const errors: RendererErrorDetail[] = [];
  rendererRegistry.register({
    name: throwingName,
    test: (candidate) => {
      if (candidate === language) throw new Error('match failure');
      return false;
    },
  });
  rendererRegistry.register({
    name: succeedingName,
    trusted: true,
    test: (candidate) => candidate === language,
    render: () => '<div class="match-success">ok</div>',
  });

  try {
    const html = renderMarkdownLight(`\`\`\`${language}\nsource\n\`\`\``, {
      onRendererError: (detail) => errors.push(detail),
    });
    assert.match(html, /match-success/);
    assert.equal(errors.length, 1);
    assert.equal(errors[0].renderer, throwingName);
    assert.equal(errors[0].phase, 'match');
  } finally {
    rendererRegistry.unregister(throwingName);
    rendererRegistry.unregister(succeedingName);
  }
});

test('async renderer work is deferred until terminal render', () => {
  const name = 'runtime-streaming-async';
  let asyncCalls = 0;
  rendererRegistry.register({
    name,
    trusted: true,
    test: (language) => language === name,
    render: () => '<div class="safe-placeholder">loading</div>',
    renderAsync: async () => {
      asyncCalls += 1;
      return '<div>done</div>';
    },
  });

  try {
    const html = renderMarkdownLight(`\`\`\`${name}\nsource\n\`\`\``);
    assert.match(html, /safe-placeholder/);
    assert.equal(asyncCalls, 0);
  } finally {
    rendererRegistry.unregister(name);
  }
});

test('async blocks are container-scoped and receive lifecycle signals', async () => {
  const name = 'runtime-async-scope';
  const first = deferred<string>();
  const second = deferred<string>();
  let calls = 0;
  rendererRegistry.register({
    name,
    trusted: true,
    test: (language) => language === name,
    renderAsync: () => {
      calls += 1;
      return calls === 1 ? first.promise : second.promise;
    },
  });

  const firstController = new AbortController();
  const secondController = new AbortController();
  try {
    const firstHtml = md.render(`\`\`\`${name}\nfirst\n\`\`\``);
    const secondHtml = md.render(`\`\`\`${name}\nsecond\n\`\`\``);
    const firstTarget = fakeContainer(placeholderId(firstHtml));
    const secondTarget = fakeContainer(placeholderId(secondHtml));

    const firstResolution = resolveAsyncBlocks(firstTarget.container, {
      signal: firstController.signal,
    });
    const secondResolution = resolveAsyncBlocks(secondTarget.container, {
      signal: secondController.signal,
    });
    firstController.abort();
    first.resolve('<div class="stale">old</div>');
    second.resolve('<div class="fresh">new</div>');

    const [firstResult, secondResult] = await Promise.all([firstResolution, secondResolution]);
    assert.equal(firstResult.changed, false);
    assert.equal(firstTarget.placeholder.outerHTML, '');
    assert.equal(secondResult.resolved, 1);
    assert.match(secondTarget.placeholder.outerHTML, /class="fresh"/);
    assert.notEqual(placeholderId(firstHtml), placeholderId(secondHtml));
  } finally {
    first.resolve('');
    second.resolve('');
    rendererRegistry.unregister(name);
  }
});

test('async rejection restores an escaped source fallback', async () => {
  const name = 'runtime-async-reject';
  rendererRegistry.register({
    name,
    trusted: true,
    test: (language) => language === name,
    renderAsync: async () => {
      throw new Error('async failure');
    },
  });

  try {
    const html = md.render(`\`\`\`${name}\nfallback <script>source</script>\n\`\`\``);
    const target = fakeContainer(placeholderId(html));
    const result = await resolveAsyncBlocks(target.container);
    assert.equal(result.failed, 1);
    assert.match(target.placeholder.outerHTML, /fallback &lt;script&gt;source&lt;\/script&gt;/);
    assert.doesNotMatch(target.placeholder.outerHTML, /Render failed/);
  } finally {
    rendererRegistry.unregister(name);
  }
});

test('part renderer matcher errors are isolated', () => {
  const throwingName = 'runtime-part-match-error';
  const succeedingName = 'runtime-part-match-success';
  const type = 'x-runtime-part';
  const errors: string[] = [];
  partRendererRegistry.register({
    name: throwingName,
    test: (candidate) => {
      if (candidate === type) throw new Error('part match failure');
      return false;
    },
  });
  partRendererRegistry.register({
    name: succeedingName,
    test: (candidate) => candidate === type,
    render: () => '<div>ok</div>',
  });

  try {
    const renderer = partRendererRegistry.getRenderer(type, (candidate) => {
      errors.push(candidate.name);
    });
    assert.equal(renderer?.name, succeedingName);
    assert.deepEqual(errors, [throwingName]);
  } finally {
    partRendererRegistry.unregister(throwingName);
    partRendererRegistry.unregister(succeedingName);
  }
});
