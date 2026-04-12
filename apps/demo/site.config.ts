import { defineConfig } from '@bndynet/vue-site'

export default defineConfig({
  title: 'Chat Demo',
  nav: [
    { label: 'Home', icon: 'home', page: () => import('../../README.md?raw') },
    { label: 'Demo', icon: 'book-open', page: () => import('./src/App.vue') },
  ],
  bootstrap: 'bootstrap.ts',
  env: {
    customElements: ['chat-messages', 'chat-renderers'],
    watchPackages: [{
      name: '@bndynet/chat-messages',
      entryPath: '../../packages/chat-messages/src/index.ts',
    }, {
      name: '@bndynet/chat-renderers',
      entryPath: '../../packages/chat-renderers/src/index.ts',
    }],
  },
})