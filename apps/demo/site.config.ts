import { defineConfig } from '@bndynet/vue-site'

export default defineConfig({
  title: 'Chat Demo',
  nav: [
    { label: 'Home', icon: 'home', page: () => import('../../README.md?raw') },
    { label: 'Chat', icon: 'message-circle', page: () => import('./src/pages/ChatPage.vue') },
    { label: 'chat-messages', icon: 'layout-list',  children: [
      { label: 'Thinking stream', icon: 'sparkles', page: () => import('./src/pages/ThinkingPage.vue') },
      { label: 'Timeline', icon: 'git-branch', page: () => import('./src/pages/TimelinePage.vue') },
      { label: 'Charts', icon: 'bar-chart-3', page: () => import('./src/pages/ChartsPage.vue') },
      { label: 'KPI cards', icon: 'layout-grid', page: () => import('./src/pages/KpiCardsPage.vue') },
      { label: 'KPI group', icon: 'layers', page: () => import('./src/pages/KpiGroupPage.vue') },
      { label: 'Form', icon: 'file-text', page: () => import('./src/pages/FormPage.vue') },
      { label: 'Details (fence)', icon: 'panel-bottom', page: () => import('./src/pages/DetailsFencePage.vue') },
      { label: 'Details (container)', icon: 'panel-bottom-dashed', page: () => import('./src/pages/DetailsContainerPage.vue') },
    ]},
    {
      label: 'Custom slots',
      icon: 'puzzle',
      children: [
        {
          label: 'chat-messages',
          icon: 'layout-list',
          page: () => import('./src/pages/SlotsChatMessages.vue'),
        },
        {
          label: 'Custom input',
          icon: 'panel-top',
          page: () => import('./src/pages/SlotsInput.vue'),
        },
        {
          label: 'Custom input actions',
          icon: 'message-circle',
          page: () => import('./src/pages/SlotsInputActions.vue'),
        },
      ],
    },
  ],
  bootstrap: 'bootstrap.ts',
  env: {
    customElements: ['i-chat-messages', 'i-chat-input', 'i-chat', 'chat-renderers'],
    watchPackages: [{
      name: '@bndynet/chat-messages',
      entryPath: '../../packages/chat-messages/src/index.ts',
    }, {
      name: '@bndynet/chat-input',
      entryPath: '../../packages/chat-input/src/index.ts',
    }, {
      name: '@bndynet/chat-renderers',
      entryPath: '../../packages/chat-renderers/src/index.ts',
    }, {
      name: '@bndynet/chat',
      entryPath: '../../packages/chat/src/index.ts',
    }],
  },
})
