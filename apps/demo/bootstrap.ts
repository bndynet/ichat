import './styles.css'
import '@bndynet/ichat'
import { registerRenderer } from '@bndynet/ichat'
import {
  chartRenderer,
  kpiRenderer,
  kpisRenderer,
  formRenderer,
  mermaidRenderer,
} from '@bndynet/ichat-renderers'

registerRenderer(chartRenderer)
registerRenderer(kpiRenderer)
registerRenderer(kpisRenderer)
registerRenderer(formRenderer)
registerRenderer(mermaidRenderer)