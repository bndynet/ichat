import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';

const root = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  root,
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
