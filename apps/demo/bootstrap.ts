import './styles.css'
import '@bndynet/ichat'
import { registerRenderer, registerPartRenderer } from '@bndynet/ichat'
import {
  chartRenderer,
  kpiRenderer,
  kpisRenderer,
  formRenderer,
  mermaidRenderer,
} from '@bndynet/ichat-renderers'
// Demo-local custom part renderers — example of external usage. The library
// only ships the `registerPartRenderer` capability, not these renderers.
import { weatherElementRenderer, weatherStringRenderer } from './src/renderers/weather'

registerRenderer(chartRenderer)
registerRenderer(kpiRenderer)
registerRenderer(kpisRenderer)
registerRenderer(formRenderer)
registerRenderer(mermaidRenderer)

registerPartRenderer(weatherElementRenderer)
registerPartRenderer(weatherStringRenderer)