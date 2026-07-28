import './styles.css'
import '@bndynet/ichat'
import { registerCodeRenderer, registerPartRenderer } from '@bndynet/ichat'
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

registerCodeRenderer(chartRenderer)
registerCodeRenderer(kpiRenderer)
registerCodeRenderer(kpisRenderer)
registerCodeRenderer(formRenderer)
registerCodeRenderer(mermaidRenderer)

registerPartRenderer(weatherElementRenderer)
registerPartRenderer(weatherStringRenderer)