import { createApp } from 'vue'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import 'element-plus/theme-chalk/dark/css-vars.css'
import '../demo.css'
import App from './App.vue'

// Importing registers the <chat-messages> custom element via @customElement decorator
import '@bndynet/chat-messages'

// Register optional fenced-block renderers
import { rendererRegistry } from '@bndynet/chat-messages'
import { chartRenderer, kpiRenderer, kpisRenderer, formRenderer } from '@bndynet/chat-renderers'
rendererRegistry.register(chartRenderer)
rendererRegistry.register(kpiRenderer)
rendererRegistry.register(kpisRenderer)
rendererRegistry.register(formRenderer)

createApp(App).use(ElementPlus).mount('#app')
