import { defineConfig } from 'tsup';
import { readFileSync } from 'fs';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8')) as {
  version: string;
};

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
  },
  external: ['@bndynet/ichat-messages'],
});
