import './styles.css'
import '@bndynet/chat'
import { registerRenderer } from '@bndynet/chat'
import {
  chartRenderer,
  kpiRenderer,
  kpisRenderer,
  formRenderer,
  mermaidRenderer,
} from '@bndynet/chat-renderers'

registerRenderer(chartRenderer)
registerRenderer(kpiRenderer)
registerRenderer(kpisRenderer)
registerRenderer(formRenderer)
registerRenderer(mermaidRenderer)