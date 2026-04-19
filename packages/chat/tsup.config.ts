import { defineConfig } from 'tsup';
import * as sass from 'sass-embedded';
import * as path from 'path';
import { fileURLToPath } from 'url';
import type { Plugin } from 'esbuild';

const scssPlugin: Plugin = {
  name: 'scss',
  setup(build) {
    build.onLoad({ filter: /\.scss$/ }, (args) => {
      const result = sass.compile(args.path, {
        loadPaths: [path.dirname(args.path), path.resolve('src/styles')],
      });
      const watchFiles = result.loadedUrls
        .filter((url) => url.protocol === 'file:')
        .map((url) => fileURLToPath(url));
      return {
        contents: `export default ${JSON.stringify(result.css)}`,
        loader: 'js',
        watchFiles,
      };
    });
  },
};

export default defineConfig({
  entry: { index: 'src/index.ts' },
  format: ['esm', 'cjs', 'iife'],
  globalName: 'iChat',
  /** Bundle workspace packages + Lit for a single-file drop-in build. */
  noExternal: ['@bndynet/chat-messages', '@bndynet/chat-input', 'lit'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: !process.argv.includes('--watch'),
  treeshake: true,
  esbuildPlugins: [scssPlugin],
});
