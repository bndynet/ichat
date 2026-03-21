import { defineConfig } from 'tsup';

export default defineConfig({
  entry: { index: 'src/index.ts' },
  format: ['esm', 'cjs', 'iife'],
  globalName: 'BndyChatRenderers',
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  treeshake: true,
  external: ['markdown-it', '@bndynet/chat-messages', 'echarts'],
});
