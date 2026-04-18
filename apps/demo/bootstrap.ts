import './styles.css'
// Importing registers the <i-chat-messages> custom element via @customElement decorator
import '@bndynet/chat-messages'

// Register optional fenced-block renderers
import { rendererRegistry } from '@bndynet/chat-messages'
import {
  chartRenderer,
  kpiRenderer,
  kpisRenderer,
  formRenderer,
  mermaidRenderer,
} from '@bndynet/chat-renderers'
rendererRegistry.register(chartRenderer)
rendererRegistry.register(kpiRenderer)
rendererRegistry.register(kpisRenderer)
rendererRegistry.register(formRenderer)
rendererRegistry.register(mermaidRenderer)