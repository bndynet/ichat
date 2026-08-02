import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';

const root = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  root,
  plugins: [
    {
      name: 'ichat-benchmark-scss-as-text',
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
    port: 4178,
    strictPort: true,
  },
  build: {
    target: 'es2021',
    outDir: fileURLToPath(
      new URL('../../../../node_modules/.cache/ichat-browser-benchmark', import.meta.url),
    ),
    emptyOutDir: true,
  },
});
