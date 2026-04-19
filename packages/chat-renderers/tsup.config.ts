import { defineConfig } from 'tsup';

export default defineConfig({
  entry: { index: 'src/index.ts' },
  format: ['esm', 'cjs', 'iife'],
  globalName: 'iChatRenderers',
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: !process.argv.includes('--watch'),
  treeshake: true,
  external: ['markdown-it', '@bndynet/chat-messages', 'echarts', 'mermaid'],
});
