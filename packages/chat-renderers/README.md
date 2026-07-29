# @bndynet/ichat-renderers

Optional fenced-code-block renderers for iChat. Register them via `registerCodeRenderer()` from `@bndynet/ichat` or `@bndynet/ichat-messages`.

## Install

```bash
npm install @bndynet/ichat-renderers
```

Also install the required peer dependencies for the renderers you use:

```bash
npm install echarts mermaid
```

## Usage

Register renderers **before** the first `<i-chat>` element connects to the DOM:

```typescript
import { registerCodeRenderer } from '@bndynet/ichat';
import {
  chartRenderer,
  kpiRenderer,
  kpisRenderer,
  formRenderer,
  mermaidRenderer,
} from '@bndynet/ichat-renderers';

registerCodeRenderer(chartRenderer);
registerCodeRenderer(kpiRenderer);
registerCodeRenderer(kpisRenderer);
registerCodeRenderer(formRenderer);
registerCodeRenderer(mermaidRenderer);
```

## Built-in renderers

| Renderer | Fence language | Description |
|---|---|---|
| `chartRenderer` | `chart` | Bar, line, area, pie, gauge charts via ECharts |
| `kpiRenderer` | `kpi` | Single KPI card |
| `kpisRenderer` | `kpis` | KPI card group |
| `formRenderer` | `form` | Interactive forms |
| `mermaidRenderer` | `mermaid` | Mermaid diagrams with theme-aware rendering |

## Peer dependencies

| Package | Version | Required for |
|---|---|---|
| `@bndynet/ichat-messages` | `^2.1.1` | — |
| `echarts` | `>=6` | Chart, KPI |
| `mermaid` | `>=11` | Mermaid |

## License

MIT
