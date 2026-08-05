import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';

const root = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  root,
  resolve: {
    alias: [
      // Map @bndynet/ichat-messages to source so we don't load a stale dist.
      {
        find: /^@bndynet\/ichat-messages$/,
        replacement: resolve(root, '../../../chat-messages/src/index.ts'),
      },
      {
        find: /^@bndynet\/ichat-input$/,
        replacement: resolve(root, '../../../chat-input/src/index.ts'),
      },
    ],
  },
  plugins: [
    {
      name: 'ichat-test-scss-as-text',
      enforce: 'pre',
      resolveId(source, importer) {
        if (!source.endsWith('.scss') || !importer) return undefined;
        const path = resolve(dirname(importer), source);
        return `\0ichat-scss-text:${encodeURIComponent(path)}.js`;
      },
      load(id) {
        const prefix = '\0ichat-scss-text:';
        if (!id.startsWith(prefix)) return undefined;
        const encodedPath = id.slice(prefix.length, -'.js'.length);
        const source = readFileSync(decodeURIComponent(encodedPath), 'utf8');
        return `export default ${JSON.stringify(source)};`;
      },
    },
  ],
  server: {
    host: '127.0.0.1',
    port: 4179,
    strictPort: true,
  },
  build: {
    target: 'es2021',
    outDir: fileURLToPath(
      new URL('../../../../../node_modules/.cache/ichat-browser-tests', import.meta.url),
    ),
    emptyOutDir: true,
  },
});
