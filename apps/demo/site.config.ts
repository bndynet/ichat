import { defineConfig } from '@bndynet/vue-site'

export default defineConfig({
  title: 'Chat Demo',
  nav: [
    { label: 'Home', icon: 'home', page: () => import('../../README.md?raw') },
    { label: 'Chat', icon: 'message-circle', page: () => import('./src/pages/ChatPage.vue') },
    { label: 'Renderers', icon: 'layout-list',  children: [
      { label: 'Timeline', icon: 'git-branch', page: () => import('./src/pages/renderers/TimelinePage.vue') },
      { label: 'Charts', icon: 'bar-chart-3', page: () => import('./src/pages/renderers/ChartsPage.vue') },
      { label: 'Mermaid', icon: 'git-fork', page: () => import('./src/pages/renderers/MermaidPage.vue') },
      { label: 'KPI cards', icon: 'layout-grid', page: () => import('./src/pages/renderers/KpiCardsPage.vue') },
      { label: 'KPI group', icon: 'layers', page: () => import('./src/pages/renderers/KpiGroupPage.vue') },
      { label: 'Form', icon: 'file-text', page: () => import('./src/pages/renderers/FormPage.vue') },
      { label: 'Details (fence)', icon: 'panel-bottom', page: () => import('./src/pages/renderers/DetailsFencePage.vue') },
      { label: 'Details (container)', icon: 'panel-bottom-dashed', page: () => import('./src/pages/renderers/DetailsContainerPage.vue') },
    ]},
    {
      label: 'Slots',
      icon: 'puzzle',
      children: [
        {
          label: 'Placeholder',
          icon: 'clapperboard',
          page: () => import('./src/pages/slots/Placeholder.vue'),
        },
        {
          label: 'Avatar',
          icon: 'circle-user',
          page: () => import('./src/pages/slots/Avatar.vue'),
        },
        {
          label: 'Message Actions',
          icon: 'rectangle-ellipsis',
          page: () => import('./src/pages/slots/Actions.vue'),
        },
        {
          label: 'Input',
          icon: 'panel-top',
          page: () => import('./src/pages/slots/SlotsInput.vue'),
        },
        {
          label: 'Input actions',
          icon: 'banknote',
          page: () => import('./src/pages/slots/SlotsInputActions.vue'),
        },
      ],
    },
  ],
  bootstrap: 'bootstrap.ts',
  env: {
    customElements: ['i-renderers', 'i-chat-input', 'i-chat', 'chat-renderers'],
    watchPackages: [{
      name: '@bndynet/renderers',
      entryPath: '../../packages/renderers/src/index.ts',
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
