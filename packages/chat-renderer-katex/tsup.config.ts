import { defineConfig } from 'tsup';
import { readFileSync } from 'fs';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8')) as {
  version: string;
};

// Read the installed katex version so CDN URLs stay in sync with the
// version that markdown-it-katex actually links against.
const katexVersion = (require('katex/package.json') as { version: string }).version;

// Read the original KaTeX CSS, strip @font-face blocks (we provide our own via CDN).
const katexRawCss = readFileSync(require.resolve('katex/dist/katex.min.css'), 'utf-8');
const katexCss = katexRawCss.replace(/@font-face\{[^}]+\}/g, '').trim();

export default defineConfig({
  entry: { index: 'src/index.ts' },
  format: ['esm', 'cjs'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: !process.argv.includes('--watch'),
  treeshake: true,
  define: {
    __PACKAGE_VERSION__: JSON.stringify(pkg.version),
    __KATEX_VERSION__: JSON.stringify(katexVersion),
    __KATEX_CSS__: JSON.stringify(katexCss),
  },
  external: ['markdown-it', '@bndynet/ichat-messages', 'katex', 'markdown-it-katex'],
});
