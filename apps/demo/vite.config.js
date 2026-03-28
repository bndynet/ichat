import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [
    vue({
      template: {
        compilerOptions: {
          // Treat Lit web components as native elements
          isCustomElement: tag => tag.startsWith('chat-') || tag.startsWith('i-'),
        },
      },
    }),
  ],
  // Don't pre-bundle workspace packages so Vite picks up tsup rebuilds immediately
  optimizeDeps: {
    exclude: ['@bndynet/chat-messages', '@bndynet/chat-renderers'],
  },
  server: {
    watch: {
      // Don't ignore symlinked workspace packages under node_modules
      ignored: ['!**/node_modules/@bndynet/**'],
    },
  },
})
