import './styles.css'
import '@bndynet/ichat'
import { registerCodeRenderer, registerPartRenderer } from '@bndynet/ichat'
import {
  kpiRenderer,
  kpisRenderer,
  formRenderer,
} from '@bndynet/ichat-renderers'
import { chartRenderer } from '@bndynet/ichat-renderer-chart'
import { mermaidRenderer } from '@bndynet/ichat-renderer-mermaid'
// Demo-local custom part renderers — example of external usage. The library
// only ships the `registerPartRenderer` capability, not these renderers.
import { weatherElementRenderer, weatherStringRenderer } from './src/renderers/weather'

registerCodeRenderer(chartRenderer)
registerCodeRenderer(kpiRenderer)
registerCodeRenderer(kpisRenderer)
registerCodeRenderer(formRenderer)
registerCodeRenderer(mermaidRenderer)

registerPartRenderer(weatherElementRenderer)
registerPartRenderer(weatherStringRenderer)